defmodule Amps.Heartbeat do
  require Logger

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(opts) do
    state = Enum.into(opts, %{})

    Amps.DB.insert("heartbeat", %{"node" => Atom.to_string(node()), "etime" => AmpsUtil.gettime()})

    schedule_heartbeat()
    {:ok, state}
  end

  def send() do
    node = node()

    Logger.info("Heartbeat on node #{node}")

    Amps.DB.insert("heartbeat", %{"node" => Atom.to_string(node), "etime" => AmpsUtil.gettime()})
  end

  def schedule_heartbeat() do
    Process.send_after(self(), :heartbeat, Amps.Defaults.get("heartbeat", 30000))
  end

  def handle_info(:heartbeat, state) do
    schedule_heartbeat()
    {:noreply, state}
  end
end
