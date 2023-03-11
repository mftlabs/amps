defmodule Amps.SystemHandler do
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

    {:ok, _sid} = Gnat.sub(connection_pid, self(), "amps.events.system.handler.>")

    state = %{
      listening_topic: "amps.events.system.handler.>"
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
      |> String.replace("amps.events.system.handler.", "")
      |> String.split(".")

    {Enum.at(topic, 0), Enum.at(topic, 1)}
  end

  def handle_action({action, node}) do
    node =
      if node do
        String.replace(node, "_", ".")
      else
        nil
      end

    Logger.info("Received action #{action} on node #{node || "all"}")

    resp =
      case action do
        "startup" ->
          Amps.SvcManager.load_system_parms()
          Amps.SvcManager.check_util()

        "parms" ->
          AmpsUtil.load_system_parms()

        _ ->
          Logger.error("Unsupported action #{action} on node #{node}")
      end

    resp
  end

  def handle_info({:msg, message}, state) do
    Logger.info("System Event Received on Topic #{message.topic}")

    {action, node} = parse_topic(message.topic)
    handle_action({action, node})

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
