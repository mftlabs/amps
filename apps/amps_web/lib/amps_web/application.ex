defmodule AmpsWeb.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    _gnat_supervisor_settings = %{
      # (required) the registered named you want to give the Gnat connection
      name: :gnat,
      # number of milliseconds to wait between consecutive reconnect attempts (default: 2_000)
      backoff_period: 4_000,
      connection_settings: [
        %{
          host: String.to_charlist(System.get_env("AMPS_NATS_HOST", "0.0.0.0")),
          port: String.to_integer(System.get_env("AMPS_NATS_PORT", "4222"))
        }
      ]
    }

    children = [
      # Start the Telemetry supervisor
      AmpsWeb.Telemetry,
      # Start the PubSub system
      {Phoenix.PubSub, name: AmpsDashboard.PubSub},
      # {Mongo,
      #  [
      #    name: :mongo,
      #    url: Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:mongo_addr],
      #    timeout: 25000,
      #    pool_timeout: 8000,
      #    pool_size: 10,
      #    type: :single
      #  ]},
      # Start the Endpoint (http/https)
      AmpsWeb.Endpoint,
      # AmpsWeb.Minio,

      # Start a worker by calling: AmpsDashboard.Worker.start_link(arg)
      # {AmpsDashboard.Worker, arg}

      # Supervisor.Spec.worker(Gnat.ConnectionSupervisor, [
      #   gnat_supervisor_settings,
      #   [name: :my_connection_supervisor]
      # ]),
      # {Task.Supervisor, name: AmpsWeb.S3Supervisor},
      # this worker starts, does its thing and dies
      {AmpsWeb.Startup, []}
      # AmpsWeb.Stream
      # Start a worker by calling: AmpsWeb.Worker.start_link(arg)
      # {AmpsWeb.Worker, arg}
    ]

    children =
      if Application.get_env(:amps, :use_ssl) and Application.get_env(:amps, :gen_certs) do
        children ++ [{AmpsWeb.SSL, AmpsWeb.Proxy}]
      else
        children ++ [AmpsWeb.Proxy]
      end

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: AmpsWeb.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    AmpsWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
