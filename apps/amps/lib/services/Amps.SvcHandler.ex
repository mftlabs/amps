defmodule Amps.SvcHandler do
  use GenServer
  require Logger
  alias Amps.SvcManager
  alias Amps.DB

  def start_link(args) do
    GenServer.start_link(__MODULE__, args, name: __MODULE__)
  end

  def init(args) do
    # Process.link(connection_pid)
    Logger.info("Starting Service Handler")
    listening_topic = "_CON.#{nuid()}"

    connection_pid = Process.whereis(:gnat)

    {:ok, _sid} = Gnat.sub(connection_pid, self(), "amps.events.svcs.handler.>")

    state = %{
      listening_topic: "amps.events.svcs.handler.>"
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

  def parse_topic(topic) do
    topic =
      topic
      |> String.replace("amps.events.svcs.handler.", "")
      |> String.split(".")

    {Enum.at(topic, 0), Enum.at(topic, 1)}
  end

  def handle_service({name, action}) do
    resp =
      case action do
        "start" ->
          Logger.info("Starting #{name}")
          start_service(name)

        "stop" ->
          Logger.info("Stopping #{name}")
          stop_service(name)

        "restart" ->
          Logger.info("Restarting #{name}")
          restart_service(name)

        _ ->
          Logger.error("Unsupported action #{action}")
      end

    resp
  end

  def restart_service(svcname) do
    case SvcManager.stop_service(svcname) do
      {:ok, res} ->
        res

      {:error, reason} ->
        reason
    end

    svc = DB.find_one("services", %{"name" => svcname})

    if svc["active"] do
      case SvcManager.start_service(svcname) do
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

  def start_service(svcname) do
    case SvcManager.start_service(svcname) do
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

  def stop_service(svcname) do
    case SvcManager.stop_service(svcname) do
      {:ok, res} ->
        DB.find_one_and_update("services", %{"name" => svcname}, %{
          "active" => false
        })

        res

      {:error, reason} ->
        reason
    end
  end

  def handle_info({:msg, message}, state) do
    Logger.info("Service Event Received on Topic #{message.topic}")

    {name, action} = parse_topic(message.topic)
    handle_service({name, action})

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
