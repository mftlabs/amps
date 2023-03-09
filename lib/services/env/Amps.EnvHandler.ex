defmodule Amps.EnvHandler do
  use GenServer
  require Logger
  alias Amps.EnvManager
  alias Amps.DB

  def start_link(args) do
    GenServer.start_link(__MODULE__, args, name: __MODULE__)
  end

  def init(args) do
    # Process.link(connection_pid)
    Logger.info("Starting Service Handler")
    listening_topic = "_CON.#{nuid()}"

    connection_pid = Process.whereis(:gnat)

    {:ok, _sid} = Gnat.sub(connection_pid, self(), "amps.events.env.handler.>")

    state = %{
      listening_topic: "amps.events.env.handler.>"
    }

    {:ok, state}
  end

  def start_monitor(pid) do
    GenServer.call(__MODULE__, {:monitor, pid})
  end

  def get_data(body) do
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
      |> String.replace("amps.events.env.handler.", "")
      |> String.split(".")

    {Enum.at(topic, 0), Enum.at(topic, 1)}
  end

  def handle_service({name, action}) do
    resp =
      case action do
        "start" ->
          Logger.info("Starting #{name}")
          start_env(name)

        "stop" ->
          Logger.info("Stopping #{name}")
          stop_env(name)

        "restart" ->
          Logger.info("Restarting #{name}")
          restart_env(name)

        "destroy" ->
          AmpsUtil.delete_env(name)

        _ ->
          Logger.error("Unsupported action #{action}")
      end

    resp
  end

  def restart_env(name) do
    case EnvManager.stop_env(name) do
      {:ok, res} ->
        res

      {:error, reason} ->
        reason
    end

    env = DB.find_one("services", %{"name" => name})

    if env["active"] do
      case EnvManager.start_env(name) do
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

  def start_env(name) do
    case EnvManager.start_env(name) do
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

  def stop_env(name) do
    case Amps.EnvSupervisor.stop_child(name) do
      {:ok, res} ->
        DB.find_one_and_update("environments", %{"name" => name}, %{
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
    Logger.info("Process ended: #{reason}")
    {:noreply, state}
  end

  def handle_info(other, state) do
    require Logger
    Logger.info("handle info #(inspect(other)) #{inspect(state)}")

    Logger.error(
      "#{__MODULE__} for #{state.stream_name}.#{state.consumer_name} received unexpected message: #{inspect(other)}"
    )

    {:noreply, state}
  end

  def handle_call({:monitor, pid}, _from, state) do
    Logger.info("Monitoring #{inspect(pid)}")
    Process.monitor(pid)
    {:reply, :ok, state}
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
