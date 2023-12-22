defmodule Amps.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    gnatconf = Application.fetch_env!(:amps, :gnat)
    Application.put_env(:amps_logger, :initialized, false)

    gnat_supervisor_settings = %{
      # (required) the registered named you want to give the Gnat connection
      name: :gnat,
      # number of milliseconds to wait between consecutive reconnect attempts (default: 2_000)
      backoff_period: 4_000,
      connection_settings: [
        %{host: gnatconf[:host], port: gnatconf[:port]}
      ]
    }

    task = Task.async(Amps.Startup, :startup, [])
    Task.await(task, 300_000)

    children =
      [
        # Start the PubSub system
        {Phoenix.PubSub, name: Amps.PubSub},
        {
          Mnesiac.Supervisor,
          [
            [name: Amps.MnesiacSupervisor]
          ]
        },
        {Pow.Store.Backend.MnesiaCache, extra_db_nodes: {Node, :list, []}},
        # Recover from netsplit
        Pow.Store.Backend.MnesiaCache.Unsplit,
        # {Amps.SSL,
        #  [
        #    :svc_host,
        #    {Amps.CowboySupervisor,
        #     [http: [port: 80], https: [port: 443], ref: :svc_host, plug: Amps.SSLRouter, opts: []]}
        #  ]},
        Supervisor.Spec.worker(Gnat.ConnectionSupervisor, [
          gnat_supervisor_settings,
          []
        ]),
        Amps.DB.get_db(),
        #      AmpsWeb.Vault,
        Amps.SvcHandler,
        Amps.SystemHandler,
        Amps.SchedHandler,
        Amps.ScriptHandler,
        Amps.SvcSupervisor,
        Amps.SvcManager,
        Amps.EnvHandler,
        Amps.EnvSupervisor,
        Amps.EnvManager,
        {Highlander, {Amps.Scheduler, []}},
        Amps.SystemScheduler
      ] ++
        Enum.reduce(
          [
            %{
              "name" => "event_handler",
              "subs_count" => 3,
              "topic" => "amps.events.*"
            },
            %{
              "name" => "action_handler",
              "subs_count" => 3,
              "topic" => "amps.actions.>",
              "receipt" => true,
              "index" => "message_events"
            },
            %{
              "name" => "service_handler",
              "subs_count" => 3,
              "topic" => "amps.svcs.>",
              "receipt" => true,
              "index" => "message_events"
            },
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
            },
            %{
              "name" => "data_handler",
              "subs_count" => 3,
              "topic" => "amps.data.>",
              "receipt" => true,
              "index" => "message_events"
            },
            %{
              "name" => "object_handler",
              "subs_count" => 3,
              "topic" => "amps.objects.>",
              "receipt" => true,
              "index" => "message_events"
            },
            %{
              "name" => "service_logs",
              "subs_count" => 3,
              "topic" => "amps.events.svcs.*.logs"
            },
            %{
              "name" => "ufa_logs",
              "subs_count" => 3,
              "topic" => "amps.events.ufa.*.logs"
            }
          ],
          [],
          fn conf, acc ->
            acc ++
              [
                %{
                  id: conf["name"],
                  start:
                    {Amps.HistoryHandler, :start_link,
                     [
                       conf
                     ]}
                },
                {Highlander,
                 %{
                   id: conf["name"] <> "_bulk",
                   start:
                     {Amps.HistoryBulker, :start_link,
                      [
                        conf
                      ]}
                 }}
              ]
          end
        ) ++
        [
          Amps.ArchiveSupervisor,
          Amps.ArchiveManager,
          Amps.Files,

          # add this to db config...

          # worker pool to run python actions
          :poolboy.child_spec(
            :worker,
            Application.get_env(:amps, :pyworker)[:config]
          ),
          Supervisor.child_spec({Task, fn -> synchronize() end}, id: :synch),
          {Highlander, {Amps.Archive, []}}
        ]

    res =
      Supervisor.start_link(children,
        strategy: :one_for_one,
        name: Amps.Supervisor
      )

    Application.put_env(:amps_logger, :initialized, true)
    res
  end

  defp synchronize do
    AmpsUtil.check_util()
    AmpsUtil.check_scripts()
    AmpsUtil.load_system_parms(Atom.to_string(node()))
  end
end
