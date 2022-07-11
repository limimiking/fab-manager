# frozen_string_literal: true

# API Controller for resources of type Availability
class API::AvailabilitiesController < API::ApiController
  before_action :authenticate_user!, except: [:public]
  before_action :set_availability, only: %i[show update reservations lock]
  before_action :set_operator_role, only: %i[machine spaces]
  before_action :set_customer, only: %i[machine spaces trainings]
  respond_to :json

  def index
    authorize Availability
    display_window = window
    @availabilities = Availability.includes(:machines, :tags, :trainings, :spaces)
                                  .where('start_at >= ? AND end_at <= ?', display_window[:start], display_window[:end])

    @availabilities = @availabilities.where.not(available_type: 'event') unless Setting.get('events_in_calendar')

    @availabilities = @availabilities.where.not(available_type: 'space') unless Setting.get('spaces_module')
  end

  def public
    # FIXME, use AvailabilitiesService
    display_window = window
    @reservations = Reservation.includes(:slots, :statistic_profile)
                               .references(:slots)
                               .where('slots.start_at >= ? AND slots.end_at <= ?', display_window[:start], display_window[:end])

    machine_ids = params[:m] || []
    service = Availabilities::PublicAvailabilitiesService.new(current_user)
    @availabilities = service.public_availabilities(
      display_window[:start],
      display_window[:end],
      @reservations,
      machines: machine_ids, spaces: params[:s]
    )

    @title_filter = { machine_ids: machine_ids.map(&:to_i) }
    @availabilities = filter_availabilites(@availabilities)
  end

  def show
    authorize Availability
  end

  def create
    authorize Availability
    @availability = Availability.new(availability_params)
    if @availability.save
      if params[:availability][:occurrences]
        service = Availabilities::CreateAvailabilitiesService.new
        service.create(@availability, params[:availability][:occurrences])
      end
      render :show, status: :created, location: @availability
    else
      render json: @availability.errors, status: :unprocessable_entity
    end
  end

  def update
    authorize Availability
    if @availability.update(availability_params)
      render :show, status: :ok, location: @availability
    else
      render json: @availability.errors, status: :unprocessable_entity
    end
  end

  def destroy
    authorize Availability
    service = Availabilities::DeleteAvailabilitiesService.new
    res = service.delete(params[:id], params[:mode])
    if res.all? { |r| r[:status] }
      render json: { deleted: res.length, details: res }, status: :ok
    else
      render json: { total: res.length, deleted: res.select { |r| r[:status] }.length, details: res }, status: :unprocessable_entity
    end
  end

  def machine
    service = Availabilities::AvailabilitiesService.new(current_user)
    @machine = Machine.friendly.find(params[:machine_id])
    @slots = service.machines(@machine, @customer, window)
  end

  def trainings
    service = Availabilities::AvailabilitiesService.new(current_user)
    @trainings = if training_id.is_number? || (training_id.length.positive? && training_id != 'all')
                   [Training.friendly.find(training_id)]
                 else
                   Training.all
                 end
    @slots = service.trainings(@trainings, @customer, window)
  end

  def spaces
    service = Availabilities::AvailabilitiesService.new(current_user)
    @space = Space.friendly.find(space_id)
    @slots = service.spaces(@space, @customer, window)
  end

  def reservations
    authorize Availability
    @reservation_slots = @availability.slots
                                      .includes(slots_reservations: [reservations: [statistic_profile: [user: [:profile]]]])
                                      .order('slots.start_at ASC')
  end

  def export_availabilities
    authorize :export

    export = Export.where(category: 'availabilities', export_type: 'index')
                   .where('created_at > ?', Availability.maximum('updated_at')).last
    if export.nil? || !FileTest.exist?(export.file)
      @export = Export.new(category: 'availabilities', export_type: 'index', user: current_user)
      if @export.save
        render json: { export_id: @export.id }, status: :ok
      else
        render json: @export.errors, status: :unprocessable_entity
      end
    else
      send_file File.join(Rails.root, export.file),
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                disposition: 'attachment'
    end
  end

  def lock
    authorize @availability
    if @availability.update_attributes(lock: lock_params)
      render :show, status: :ok, location: @availability
    else
      render json: @availability.errors, status: :unprocessable_entity
    end
  end

  private

  def window
    start_date = ActiveSupport::TimeZone[params[:timezone]]&.parse(params[:start])
    end_date = ActiveSupport::TimeZone[params[:timezone]]&.parse(params[:end])&.end_of_day
    { start: start_date, end: end_date }
  end

  def set_customer
    @customer = if params[:member_id]
                  User.find(params[:member_id])
                else
                  current_user
                end
  end

  def set_operator_role
    @current_user_role = current_user.role
  end

  def set_availability
    @availability = Availability.find(params[:id])
  end

  def availability_params
    params.require(:availability).permit(:start_at, :end_at, :available_type, :machine_ids, :training_ids, :nb_total_places,
                                         :is_recurrent, :period, :nb_periods, :end_date, :slot_duration,
                                         machine_ids: [], training_ids: [], space_ids: [], tag_ids: [], plan_ids: [],
                                         machines_attributes: %i[id _destroy], plans_attributes: %i[id _destroy])
  end

  def lock_params
    params.require(:lock)
  end

  def filter_availabilites(availabilities)
    availabilities_filtered = []
    availabilities.to_ary.each do |a|
      # machine slot
      if !a.try(:available_type)
        availabilities_filtered << a
      else
        availabilities_filtered << a if filter_training?(a)
        availabilities_filtered << a if filter_space?(a)
        availabilities_filtered << a if filter_machine?(a)
        availabilities_filtered << a if filter_event?(a)
      end
    end
    availabilities_filtered.delete_if(&method(:remove_full?))
  end

  def filter_training?(availability)
    params[:t] && availability.available_type == 'training' && params[:t].include?(availability.trainings.first.id.to_s)
  end

  def filter_space?(availability)
    params[:s] && availability.available_type == 'space' && params[:s].include?(availability.spaces.first.id.to_s)
  end

  def filter_machine?(availability)
    params[:m] && availability.available_type == 'machines' && (params[:m].map(&:to_i) & availability.machine_ids).any?
  end

  def filter_event?(availability)
    params[:evt] && params[:evt] == 'true' && availability.available_type == 'event'
  end

  def remove_full?(availability)
    params[:dispo] == 'false' && (availability.is_reserved || (availability.try(:full?) && availability.full?))
  end
end
