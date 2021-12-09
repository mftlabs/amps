defmodule Amps.Application do
  defimpl Poison.Encoder, for: BSON.ObjectId do
    def encode(id, options) do
      BSON.ObjectId.encode!(id) |> Poison.Encoder.encode(options)
    end
  end

  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start the PubSub system
      {Phoenix.PubSub, name: Amps.PubSub},
      {Mongo, [name: :mongo, database: "amps", pool_size: 1]},
      Amps.SvcSupervisor,
      Amps.SvcManager,
      {Amps.Startup, []},

      # add this to db config...

      # worker pool to run python actions
      :poolboy.child_spec(:worker, Application.get_env(:amps, :pyworker)[:config])
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: Amps.Supervisor)
  end
end
