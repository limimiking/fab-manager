# frozen_string_literal: true

# API Controller for resources of type Child
# Children are used to provide a way to manage multiple users in the family account
class API::ChildrenController < API::APIController
  before_action :authenticate_user!
  before_action :set_child, only: %i[show update destroy]

  def index
    @children = policy_scope(Child)
  end

  def show
    authorize @child
  end

  def create
    @child = Child.new(child_params)
    authorize @child
    if @child.save
      render status: :created
    else
      render json: @child.errors.full_messages, status: :unprocessable_entity
    end
  end

  def update
    authorize @child

    if @child.update(child_params)
      render status: :ok
    else
      render json: @child.errors.full_messages, status: :unprocessable_entity
    end
  end

  def destroy
    authorize @child
    @child.destroy
    head :no_content
  end

  private

  def set_child
    @child = Child.find(params[:id])
  end

  def child_params
    params.require(:child).permit(:first_name, :last_name, :email, :phone, :birthday, :user_id)
  end
end
