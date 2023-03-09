defmodule Amps.Heartbeat do
  # use GenServer
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
    node = Atom.to_string(node)

    Gnat.pub(
      :gnat,
      "amps.events.system.heartbeat.#{String.replace(node, ".", "_")}",
      ""
    )

    Amps.DB.insert("heartbeat", %{"node" => node, "etime" => AmpsUtil.gettime()})
  end

  def schedule_heartbeat() do
    Process.send_after(self(), :heartbeat, Amps.Defaults.get("heartbeat", 30000))
  end

  def handle_info(:heartbeat, state) do
    schedule_heartbeat()
    # send(state)
    {:noreply, state}
  end

  def services() do
    Enum.each(Amps.DB.find("services"), fn environ ->
      env = environ["name"]

      Enum.each(Amps.DB.find("#{env}-services"), fn svc ->
        name = svc["name"]
        active = Amps.EnvSvcManager.service_active?(name, env) !== nil

        Gnat.pub(
          :gnat,
          AmpsUtil.env_topic("amps.events.svcs.heartbeat.#{name}", env),
          Jason.encode!(%{
            "active" => to_string(active),
            "node" => Atom.to_string(node())
          })
        )
      end)
    end)

    Enum.each(Amps.DB.find("services"), fn svc ->
      name = svc["name"]
      active = Amps.SvcManager.service_active?(name) !== nil

      Gnat.pub(
        :gnat,
        "amps.events.svcs.heartbeat.#{name}",
        Jason.encode!(%{
          "active" => to_string(active),
          "node" => Atom.to_string(node())
        })
      )
    end)
  end
end
