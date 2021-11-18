defmodule AmpsPortal.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start the Telemetry supervisor
      AmpsPortal.Telemetry,
      # Start the Endpoint (http/https)
      AmpsPortal.Endpoint,
      {Phoenix.PubSub, name: AmpsPortal.PubSub}
      # Start a worker by calling: AmpsPortal.Worker.start_link(arg)
      # {AmpsPortal.Worker, arg}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: AmpsPortal.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    AmpsPortal.Endpoint.config_change(changed, removed)
    :ok
  end
end
