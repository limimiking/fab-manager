# frozen_string_literal: true

# confirm payment of a pre-registration reservation
class ReservationConfirmPaymentService
  def initialize(reservation, operator, coupon, offered)
    @reservation = reservation
    @operator = operator
    @offered = offered
    @coupon = CartItem::Coupon.new(
      customer_profile: @reservation.user.invoicing_profile,
      operator_profile: @operator.invoicing_profile,
      coupon: Coupon.find_by(code: coupon)
    )
  end

  def total
    slots_reservations = @reservation.slots_reservations.map do |sr|
      {
        slot_id: sr.slot_id,
        offered: @offered
      }
    end
    event_reservation = CartItem::EventReservation.new(customer_profile: @reservation.user.invoicing_profile,
                                                       operator_profile: @operator.invoicing_profile,
                                                       event: @reservation.reservable,
                                                       cart_item_reservation_slots_attributes: slots_reservations,
                                                       normal_tickets: @reservation.nb_reserve_places,
                                                       cart_item_event_reservation_tickets_attributes: @reservation.tickets.to_a,
                                                       cart_item_event_reservation_booking_users_attributes: @reservation.booking_users.to_a)

    all_elements = {
      slots: @reservation.slots_reservations.map do |sr|
        { start_at: sr.slot.start_at, end_at: sr.slot.end_at, price: event_reservation.price[:amount] }
      end
    }

    total_amount = event_reservation.price[:amount]

    coupon_info = @coupon.price(total_amount)

    # return result
    {
      elements: all_elements,
      total: coupon_info[:total_with_coupon].to_i,
      before_coupon: coupon_info[:total_without_coupon].to_i,
      coupon: @coupon.coupon
    }
  end

  def call
    price = total
    invoice = InvoicesService.create(
      price,
      @operator.invoicing_profile.id,
      [@reservation],
      @reservation.user
    )
    return invoice if Setting.get('prevent_invoices_zero') && price[:total].zero?

    ActiveRecord::Base.transaction do
      WalletService.debit_user_wallet(invoice, @reservation.user)

      invoice.save
      invoice.post_save
    end
    invoice
  end
end
