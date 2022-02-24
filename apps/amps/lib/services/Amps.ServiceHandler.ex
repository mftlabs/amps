defmodule Amps.ServiceHandler do
  use GenServer
  require Logger
  alias Amps.SvcManager
  alias Amps.DB

  def start_link(args) do
    GenServer.start_link(__MODULE__, args)
  end

  def init(args) do
    # Process.link(connection_pid)
    Logger.info("Starting Service Handler")
    listening_topic = "_CON.#{nuid()}"

    connection_pid = Process.whereis(:gnat)

    cons = %Jetstream.API.Consumer{
      durable: false,
      stream_name: "EVENTS",
      deliver_policy: :new,
      filter_subject: "amps.events.svcs.handler.>",
      deliver_subject: "amps.test"
    }

    {:ok, config} = Jetstream.API.Consumer.create(:gnat, cons)
    consumer_name = config.name

    {:ok, _sid} = Gnat.sub(connection_pid, self(), "amps.test")

    # :ok =
    #   Gnat.pub(connection_pid, "$JS.API.CONSUMER.MSG.NEXT.EVENTS.#{consumer_name}", "1",
    #     reply_to: listening_topic
    #   )

    state = %{
      stream_name: "EVENTS",
      consumer_name: consumer_name,
      listening_topic: "amps.test"
    }

    {:ok, state}
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
        res

      {:error, reason} ->
        reason
    end
  end

  def handle_info({:msg, message}, state) do
    Logger.info("Service Event Received on Topic #{message.topic}")

    {name, action} = parse_topic(message.topic)
    handle_service({name, action})

    Jetstream.ack(message)
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

  def handle_call(parms, _from, state) do
    IO.puts("handler call called #{inspect(parms)}")
    {:reply, :ok, state}
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
