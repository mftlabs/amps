defmodule Amps.EnvSvcHandler do
  use GenServer
  require Logger
  alias Amps.SvcManager
  alias Amps.DB

  def start_link(env) do
    GenServer.start_link(__MODULE__, env, name: :"#{env}-svchdlr")
  end

  def init(env) do
    # Process.link(connection_pid)
    Logger.info("Starting Service Handler for Environment: ")
    listening_topic = "_CON.#{nuid()}"

    connection_pid = Process.whereis(:gnat)
    topic = "amps.#{env}.events.svcs.handler.>"
    {:ok, _sid} = Gnat.sub(connection_pid, self(), topic)

    state = %{
      listening_topic: topic,
      env: env
    }

    {:ok, state}
  end

  def start_monitor(pid) do
    IO.inspect("Calling Start")
    GenServer.call(__MODULE__, {:monitor, pid})
  end

  def get_data(body) do
    IO.inspect(body)

    try do
      Poison.decode!(body)
    rescue
      error ->
        Logger.warning("action failed #{inspect(error)}")
        Logger.error(Exception.format_stacktrace())
        {:error, error}
    end
  end

  def parse_topic(topic, env) do
    topic =
      topic
      |> String.replace("amps.#{env}.events.svcs.handler.", "")
      |> String.split(".")

    IO.inspect(topic)

    {Enum.at(topic, 0), Enum.at(topic, 1), Enum.at(topic, 2, nil)}
  end

  def handle_service({name, action, parm}, env) do
    IO.inspect(action)

    resp =
      case action do
        "skip" ->
          Logger.info("Skipping #{parm} for #{name}")
          Amps.EventHandler.skip(:"#{env}-#{name}", parm)

        "start" ->
          if parm == nil || String.to_atom(parm) == node() do
            Logger.info("Starting #{name}")
            start_service(name, env)
          end

        "stop" ->
          if parm == nil || String.to_atom(parm) == node() do
            Logger.info("Stopping #{name}")
            stop_service(name, env)
          end

        "restart" ->
          if parm == nil || String.to_atom(parm) == node() do
            Logger.info("Restarting #{name}")
            restart_service(name, env)
          end

        _ ->
          Logger.error("Unsupported action #{action}")
      end

    resp
  end

  def restart_service(svcname, env) do
    case GenServer.call(:"#{env}-svcmgr", {:stop_service, svcname}) do
      {:ok, res} ->
        res

      {:error, reason} ->
        reason
    end

    svc = DB.find_one(AmpsUtil.index(env, "services"), %{"name" => svcname})

    if svc["active"] do
      case GenServer.call(:"#{env}-svcmgr", {:start_service, svcname}) do
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

  def start_service(svcname, env) do
    case GenServer.call(:"#{env}-svcmgr", {:start_service, svcname}) do
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

  def stop_service(svcname, env) do
    IO.inspect(env)

    case GenServer.call(:"#{env}-svcmgr", {:stop_service, svcname}) do
      {:ok, res} ->
        DB.find_one_and_update(AmpsUtil.index(env, "services"), %{"name" => svcname}, %{
          "active" => false
        })

        res

      {:error, reason} ->
        reason
    end
  end

  def handle_info({:msg, message}, state) do
    Logger.info("Service Event Received in Environment #{state.env} on Topic #{message.topic}")

    {name, action, msgid} = parse_topic(message.topic, state.env)
    handle_service({name, action, msgid}, state.env)

    {:noreply, state}
  end

  def handle_info({:DOWN, ref, :process, pid, reason}, state) do
    IO.inspect(Process.info(pid))

    Logger.info("Process ended: #{reason}")
    {:noreply, state}
  end

  def handle_info(other, state) do
    require Logger
    IO.puts("handle info #(inspect(other)) #{inspect(state)}")

    Logger.error(
      "#{__MODULE__} for #{state.stream_name}.#{state.consumer_name} received unexpected message: #{inspect(other)}"
    )

    {:noreply, state}
  end

  def handle_call({:monitor, pid}, _from, state) do
    IO.inspect(Process.info(pid))
    Logger.info("Monitoring #{inspect(pid)}")
    Process.monitor(pid)
    {:reply, :ok, state}
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
