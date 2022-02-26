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
    gnatconf = Application.fetch_env!(:amps, :gnat)

    gnat_supervisor_settings = %{
      # (required) the registered named you want to give the Gnat connection
      name: :gnat,
      # number of milliseconds to wait between consecutive reconnect attempts (default: 2_000)
      backoff_period: 4_000,
      connection_settings: [
        %{host: gnatconf[:host], port: gnatconf[:port]}
      ]
    }

    IO.inspect(gnat_supervisor_settings)

    children = [
      # Start the PubSub system
      {Phoenix.PubSub, name: Amps.PubSub},
      Supervisor.Spec.worker(Gnat.ConnectionSupervisor, [gnat_supervisor_settings, []]),
      {
        Mnesiac.Supervisor,
        [
          [name: Amps.MnesiacSupervisor]
        ]
      },
      {Pow.Store.Backend.MnesiaCache, extra_db_nodes: {Node, :list, []}},
      # Recover from netsplit
      Pow.Store.Backend.MnesiaCache.Unsplit,

      # {Mongo,
      #  [
      #    name: :mongo,
      #    database: "amps",
      #    url: Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:mongo_addr],
      #    pool_size: 1
      #  ]},
      {Amps.Cluster, []},
      {Amps.Startup, []},
      AmpsWeb.Vault,
      Amps.SvcHandler,
      Amps.SvcSupervisor,
      Amps.SvcManager,
      Amps.Scheduler,
      {Amps.HistoryHandler,
       %{
         "name" => "event_handler",
         "subs_count" => 4,
         "topic" => "amps.events.*"
       }},

      # add this to db config...

      # worker pool to run python actions
      :poolboy.child_spec(:worker, Application.get_env(:amps, :pyworker)[:config])
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: Amps.Supervisor)
  end
end
