defmodule Amps.ArchiveManager do
  use GenServer
  require Logger
  alias Amps.DB

  def start_link() do
    Logger.info("starting archive manager")
    GenServer.start_link(__MODULE__, name: :"archive-mgr")
  end

  def init(env) do
    Process.send_after(self(), :initial_connect, 0)
    {:ok, %{}}
  end

  def child_spec(env) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, env}
    }
  end

  def get_archive_spec(env) do
    children = [
      %{
        "name" => "action_archiver",
        "subs_count" => 3,
        "topic" => "amps.actions.>",
        "receipt" => true,
        "index" => "archive_events"
      },
      %{
        "name" => "service_archiver",
        "subs_count" => 3,
        "topic" => "amps.svcs.>",
        "receipt" => true,
        "index" => "archive_events"
      },
      %{
        "name" => "mailbox_archiver",
        "subs_count" => 3,
        "topic" => "amps.mailbox.>",
        "receipt" => true,
        "index" => ["archive_events", "mailbox"]
      },
      %{
        "name" => "data_archiver",
        "subs_count" => 3,
        "topic" => "amps.data.>",
        "receipt" => true,
        "index" => "archive_events"
      }
    ]

    children =
      Enum.reduce(children, [], fn child, acc ->
        child =
          child
          |> Map.put("name", env <> "_" <> child["name"])

        [
          %{
            id: child["name"],
            start:
              {Amps.ArchiveHandler, :start_link,
               [
                 child,
                 env
               ]}
          }
          | acc
        ]
      end)

    %{
      id: :"#{env}-archive",
      start: {Supervisor, :start_link, [children, [strategy: :one_for_one]]}
    }
  end

  # GenServer callbacks
  def handle_info(:initial_connect, state) do
    connection_pid = Process.whereis(:gnat)

    {:ok, _sid} = Gnat.sub(connection_pid, self(), "amps.events.archive.handler.>")

    load_archivers()
    {:noreply, state}
  end

  def handle_service({action, name}) do
    resp =
      case action do
        "start" ->
          Logger.info("Starting #{name}")

          case name do
            nil ->
              load_archivers()

            name ->
              start_archive(name)
          end

        "stop" ->
          Logger.info("Stopping #{name}")

          case name do
            nil ->
              stop_archivers()

            name ->
              stop_archive(name)
          end

        "restart" ->
          Logger.info("Restarting #{name}")
          stop_archivers()
          load_archivers()

        _ ->
          Logger.error("Unsupported action #{action}")
      end

    resp
  end

  def parse_topic(topic) do
    topic =
      topic
      |> String.replace("amps.events.archive.handler.", "")
      |> String.split(".")

    {Enum.at(topic, 0), Enum.at(topic, 1, nil)}
  end

  def restart_archive(name) do
    case Amps.ArchiveSupervisor.stop_child(name) do
      {:ok, res} ->
        res

      {:error, reason} ->
        reason
    end

    env = DB.find_one("environments", %{"name" => name})

    if env["active"] do
      case load_archive(name) do
        {:ok, res} ->
          %{
            "success" => true
          }

        {:error, reason} ->
          %{
            "success" => false,
            "reason" => reason
          }
      end
    end
  end

  def start_archive(name) do
    case load_archive(name) do
      {:ok, res} ->
        %{
          "success" => true
        }

      {:error, reason} ->
        %{
          "success" => false,
          "reason" => reason
        }
    end
  end

  def stop_archive(name) do
    case Amps.ArchiveSupervisor.stop_child(name) do
      {:ok, res} ->
        env = DB.find_one("environments", %{"name" => name})

        if env do
          DB.find_one_and_update("environments", %{"name" => name}, %{
            "archive" => false
          })
        end

        res

      {:error, reason} ->
        reason
    end
  end

  def handle_info({:msg, message}, state) do
    Logger.info("Archive Event Received on Topic #{message.topic}")

    {name, action} = parse_topic(message.topic)
    handle_service({name, action})

    {:noreply, state}
  end

  # def start_service(svcname) do
  #   GenServer.call(Amps.SvcManager, {:start_service, svcname})
  # end

  # def stop_service(svcname) do
  #   GenServer.call(Amps.SvcManager, {:stop_service, svcname})
  # end

  def handle_call({:stop_service, name}, _from, state) do
    AmpsEvents.send_history(
      AmpsUtil.env_topic("amps.events.svcs.#{name}.logs", state),
      "service_logs",
      %{
        "name" => name,
        "status" => "stopping"
      }
    )

    IO.inspect(state)

    res =
      case archive_active?(name) do
        nil ->
          IO.inspect("not running")
          {:error, "Service Not Running"}

        pids ->
          Enum.each(pids, fn pid ->
            IO.inspect(pid)

            DynamicSupervisor.terminate_child(
              String.to_atom("#{state}-svcspvsr"),
              pid
            )
          end)

          AmpsEvents.send_history(
            AmpsUtil.env_topic("amps.events.svcs.#{name}.logs", state),
            "service_logs",
            %{
              "name" => name,
              "status" => "stopped"
            }
          )

          {:ok, true}
      end

    {:reply, res, state}
  end

  def handle_call({:start_archive, name}, _from, state) do
    res =
      case archive_active?(name) do
        nil ->
          res = load_archive(name)
          IO.inspect(res)
          res

          DB.find_one_and_update(
            AmpsUtil.index(state, "services"),
            %{"name" => name},
            %{
              "active" => true
            }
          )

        pid ->
          {:error, "Service Already Running #{inspect(pid)}"}
      end

    {:reply, res, state}
  end

  def handle_update() do
    archive = Amps.Defaults.get("archive")

    if archive do
    end
  end

  def service_types do
    list = AmpsUtil.get_env(:services)
    IO.inspect(list)
    Enum.into(list, %{})
  end

  def load_archivers() do
    Logger.info("Loading Archivers")

    archive = Amps.Defaults.get("archive")

    if archive do
      Amps.ArchiveSupervisor.start_child(:archive, get_archive_spec(""))

      case Amps.DB.find("environments", %{active: true, archive: true}) do
        [] ->
          :ok

        envs ->
          Enum.each(envs, fn env ->
            Logger.info("loading env archive #{env["name"]}")
            load_archive(env["name"])
          end)
      end
    end

    Logger.info("Done loading archivers")
  end

  def stop_archivers() do
    Logger.info("Loading Archivers")

    Amps.ArchiveSupervisor.stop_child("")

    case Amps.DB.find("environments") do
      [] ->
        :ok

      envs ->
        Enum.each(envs, fn env ->
          Logger.info("Stopping env archive #{env["name"]}")
          Amps.ArchiveSupervisor.stop_child(env["name"])
        end)
    end

    Logger.info("Done stopping archivers")
  end

  def load_archive(env) do
    # Logger.info("Loading service in environment #{svcname}")

    # AmpsEvents.send_history(
    #   AmpsUtil.env_topic("amps.events.svcs.#{svcname}.logs", env),
    #   "service_logs",
    #   %{
    #     "name" => svcname,
    #     "status" => "starting"
    #   }
    # )

    if Amps.Defaults.get("archive") do
      case Amps.DB.find_one("environments", %{name: env, archive: true}) do
        nil ->
          Logger.info("Environment not found #{env}")
          {:error, "Environment not found"}

        parms ->
          try do
            Logger.info("Starting archiver for environment #{parms["name"]}")
            name = String.to_atom("#{env}-archive")

            case archive_active?(parms["name"]) do
              nil ->
                Amps.ArchiveSupervisor.start_child(
                  name,
                  get_archive_spec(parms["name"])
                )

                {:ok, "Started #{parms["name"]}"}

              pid ->
                {:ok, "Already Running"}
            end
          rescue
            e ->
              error = "#{inspect(e)}"

              # AmpsEvents.send_history(
              #   AmpsUtil.env_topic("amps.events.svcs.#{svcname}.logs", env),
              #   "service_logs",
              #   %{
              #     "name" => svcname,
              #     "status" => "failed",
              #     "reason" => error
              #   }
              # )

              {:error, e}
          end
      end
    else
      {:error, "Archiving Disabled"}
    end
  end

  def archive_active?(name) do
    if name == "" do
      case Process.whereis(:archive) do
        nil ->
          nil

        pid ->
          pid
      end
    else
      case Amps.DB.find_one("environments", %{"name" => name}) do
        nil ->
          Logger.info("Archiver not found for environment #{name}")
          nil

        parms ->
          case Process.whereis(:"#{name}-archive") do
            nil ->
              nil

            pid ->
              pid
          end
      end
    end
  end
end
