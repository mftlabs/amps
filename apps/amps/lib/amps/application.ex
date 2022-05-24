defmodule Amps.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    gnatconf = Application.fetch_env!(:amps, :gnat)
    Application.put_env(:amps, :initialized, false)

    gnat_supervisor_settings = %{
      # (required) the registered named you want to give the Gnat connection
      name: :gnat,
      # number of milliseconds to wait between consecutive reconnect attempts (default: 2_000)
      backoff_period: 4_000,
      connection_settings: [
        %{host: gnatconf[:host], port: gnatconf[:port]}
      ]
    }

    # task = Task.async(Amps.Startup, :startup, [])
    # Task.await(task, 300_000)

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
      Amps.DB.get_db(),
      AmpsWeb.Vault,
      Amps.SvcHandler,
      Amps.SvcSupervisor,
      Amps.SvcManager,
      Amps.EnvHandler,
      Amps.EnvSupervisor,
      Amps.EnvManager,
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
               "index" => ["message_events", "mailbox"],
               "doc" => fn topic, data ->
                 pieces =
                   String.split(topic, ".")
                   |> Enum.take(-2)

                 Map.merge(data, %{
                   "recipient" => Enum.at(pieces, 0),
                   "status" => "mailboxed",
                   "mailbox" => Enum.at(pieces, 1),
                   "mtime" => DateTime.utc_now() |> DateTime.to_iso8601()
                 })
               end
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
        id: "object_handler",
        start:
          {Amps.HistoryHandler, :start_link,
           [
             %{
               "name" => "object_handler",
               "subs_count" => 3,
               "topic" => "amps.objects.>",
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
      Amps.ArchiveSupervisor,
      Amps.ArchiveManager,

      # add this to db config...

      # worker pool to run python actions
      :poolboy.child_spec(
        :worker,
        Application.get_env(:amps, :pyworker)[:config]
      )
    ]

    res =
      Supervisor.start_link(children,
        strategy: :one_for_one,
        name: Amps.Supervisor
      )

    Application.put_env(:amps, :initialized, true)

    res
  end
end
