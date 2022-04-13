defmodule Amps.EnvSupervisor do
  use DynamicSupervisor
  require Logger

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(name, config) do
    Logger.info("Starting Environment #{name}")
    # mod = String.to_atom("Elixir." <> args["module"])
    # spec = {mod, name: name, parms: args}
    env = config["name"]
    # {Plug.Cowboy, scheme: :http, plug: MyApp, options: [port: 4040]}
    history = history_children(env)
    IO.inspect(history)

    children = [
      Supervisor.child_spec({Amps.EnvSvcSupervisor, [env]}, restart: :transient),
      Supervisor.child_spec({Amps.EnvSvcManager, [env]}, restart: :transient),
      Supervisor.child_spec({Amps.EnvSvcHandler, env}, restart: :transient),
      %{
        id: :"#{env}-history",
        start: {Supervisor, :start_link, [history, [strategy: :one_for_one]]}
      },
      Supervisor.child_spec(
        {Amps.EnvScheduler, [env: env, id: :"#{env}-sched", name: :"#{env}-sched"]},
        id: :"#{env}-sched"
      )
    ]

    spvsr = %{
      id: name,
      start: {Supervisor, :start_link, [children, [strategy: :one_for_one]]}
    }

    spvsr = Supervisor.child_spec(spvsr, restart: :transient)

    IO.inspect(spvsr)

    case DynamicSupervisor.start_child(
           __MODULE__,
           spvsr
         ) do
      {:ok, pid} ->
        Process.register(pid, name)
        File.mkdir_p!(Path.join(Amps.Defaults.get("python_path"), env))

      # AmpsEvents.send_history(
      #   "amps.events.svcs.#{config["name"]}.logs",
      #   "service_logs",
      #   %{
      #     "name" => config["name"],
      #     "status" => "started"
      #   }
      # )

      # Amps.SvcHandler.start_monitor(pid)

      {:error, error} ->
        Logger.error("Could not start #{name} - Error: #{inspect(error)}")

        # This match pattern worked for kafka errors in my local testing, but I worry it is too specific.

        {:shutdown, {:failed_to_start_child, module, {{:badmatch, {:error, {e, stacktrace}}}, _}}} =
          error

        error =
          if e.message do
            e.message
          else
            "#{inspect(error)}"
          end

        AmpsEvents.send_history(
          "amps.events.svcs.#{config["name"]}.logs",
          "service_logs",
          %{
            "name" => config["name"],
            "status" => "failed",
            "reason" => error
          }
        )
    end
  end

  def stop_child(env) do
    case Process.whereis(:"env-#{env}") do
      nil ->
        Logger.info("Environment #{env} not running")

      pid ->
        DynamicSupervisor.terminate_child(__MODULE__, pid)
    end
  end

  def history_children(env) do
    children = [
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
        "name" => "service_logs",
        "subs_count" => 3,
        "topic" => "amps.events.svcs.*.logs"
      },
      %{
        "name" => "ufa_logs",
        "subs_count" => 3,
        "topic" => "amps.events.ufa.*.logs"
      }
    ]

    Enum.reduce(children, [], fn child, acc ->
      child =
        child
        |> Map.put("name", env <> "_" <> child["name"])

      [
        %{
          id: child["name"],
          start:
            {Amps.HistoryHandler, :start_link,
             [
               child,
               env
             ]}
        }
        | acc
      ]
    end)
  end

  @impl true
  def init(_init_arg) do
    Logger.info("dynamic supervisor started")

    DynamicSupervisor.init(
      strategy: :one_for_one
      #      extra_arguments: [init_arg]
    )
  end
end
