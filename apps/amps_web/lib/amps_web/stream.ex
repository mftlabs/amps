defmodule AmpsWeb.Stream do
  use GenServer
  require Logger

  # Client
  def start_link(arg) do
    GenServer.start_link(__MODULE__, arg, name: :jetstream)
  end

  # Server
  def init(_) do
    {:ok, gnat} =
      Gnat.start_link(%{
        # (required) the registered named you want to give the Gnat connection
        # number of milliseconds to wait between consecutive reconnect attempts (default: 2_000)
        backoff_period: 4_000,
        connection_settings: [
          %{host: '0.0.0.0', port: 4222}
        ]
      })

    {:ok, _subscription} = Gnat.sub(gnat, self(), "AMPS.Messages")
    # get_status()
    {:ok, nil}
  end

  def handle_info({:msg, message}, state) do
    IO.puts(message.topic <> " message received")
    _data = JSON.decode!(message.body)
    {:noreply, state}
  end

  def handle_info(:status, state) do
    case Jetstream.API.Consumer.info(:gnat, "AMPS", "AMPS") do
      {:ok, res} ->
        IO.puts("Stream Consumer: ")
        IO.inspect(res)
    end

    get_status()
    {:noreply, state}
  end

  def handle_info(other, state) do
    require Logger

    Logger.warning("received unexpected message: #{inspect(other)}")

    {:noreply, state}
  end

  defp get_status() do
    # In 2 hours
    Process.send_after(self(), :status, 5000)
  end
end
