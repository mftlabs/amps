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
      Supervisor.Spec.worker(Gnat.ConnectionSupervisor, [
        gnat_supervisor_settings,
        []
      ]),
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
      %{
        id: "event_handler",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "event_handler",
               "subs_count" => 3,
               "topic" => "amps.events.*"
             }
           ]}
      },
      %{
        id: "action_handler",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "action_handler",
               "subs_count" => 3,
               "topic" => "amps.actions.>",
               "receipt" => true,
               "index" => "message_events"
             }
           ]}
      },
      %{
        id: "service_handler",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "service_handler",
               "subs_count" => 3,
               "topic" => "amps.svcs.>",
               "receipt" => true,
               "index" => "message_events"
             }
           ]}
      },
      %{
        id: "mailbox_handler",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "mailbox_handler",
               "subs_count" => 3,
               "topic" => "amps.mailbox.>",
               "receipt" => true,
               "index" => "message_events"
             }
           ]}
      },
      %{
        id: "data_handler",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "data_handler",
               "subs_count" => 3,
               "topic" => "amps.data.>",
               "receipt" => true,
               "index" => "message_events"
             }
           ]}
      },
      %{
        id: "service_logs",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "service_logs",
               "subs_count" => 3,
               "topic" => "amps.events.svcs.*.logs"
             }
           ]}
      },
      %{
        id: "ufa_logs",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "ufa_logs",
               "subs_count" => 3,
               "topic" => "amps.events.ufa.*.logs"
             }
           ]}
      },

      # add this to db config...

      # worker pool to run python actions
      :poolboy.child_spec(
        :worker,
        Application.get_env(:amps, :pyworker)[:config]
      )
    ]

    Supervisor.start_link(children,
      strategy: :one_for_one,
      name: Amps.Supervisor
    )
  end
end
