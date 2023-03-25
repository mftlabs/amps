defmodule Amps.ScriptHandler do
  use GenServer
  require Logger
  alias Amps.SvcManager
  alias Amps.DB

  def start_link(args) do
    env =
      case args do
        [] ->
          ""

        [env] ->
          env
      end

    GenServer.start_link(__MODULE__, %{env: env}, name: :"#{env}-scripthdlr")
  end

  def init(args) do
    # Process.link(connection_pid)
    Logger.info("Starting Service Handler")
    listening_topic = "_CON.#{nuid()}"

    connection_pid = Process.whereis(:gnat)

    listening_topic = AmpsUtil.env_topic("amps.events.scripts.handler.>", args[:env])

    {:ok, _sid} = Gnat.sub(connection_pid, self(), listening_topic)

    state = %{
      listening_topic: listening_topic,
      env: args[:env]
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
      |> String.replace(AmpsUtil.env_topic("amps.events.scripts.handler.", env), "")
      |> String.split(".")

    {Enum.at(topic, 0), Enum.at(topic, 1), Enum.at(topic, 2)}
  end

  @spec handle_action({any, any, any}, any) :: :ok | {:error, atom}
  def handle_action({action, name, node}, env) do
    Logger.info("Received script action #{action} on node #{node || "all"}")

    resp =
      case action do
        "update" ->
          AmpsUtil.update_script(name, env)

        "updateutil" ->
          AmpsUtil.update_util(name, env)

        _ ->
          Logger.error("Unsupported action #{action} on node #{node}")
      end

    resp
  end

  def handle_info({:msg, message}, state) do
    Logger.info("Script Event Received on Topic #{message.topic}")

    {action, name, node} = parse_topic(message.topic, state.env)
    handle_action({action, name, node}, state.env)

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
