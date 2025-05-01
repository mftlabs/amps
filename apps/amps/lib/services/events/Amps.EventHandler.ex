defmodule Amps.EventHandler do
  @behaviour Amps.Handler
  use Amps.Handler

  #  @impl Amps.Handler

  def initialize(state) do
    state
  end

  # @impl Amps.Handler
  def create_subscribers(_) do
    true
  end
end
