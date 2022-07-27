# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.NATS do
  use GenServer
  require Logger

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  def child_spec(opts) do
    name = opts[:name]

    %{
      id: name,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  def init(args) do
    parms = args[:parms]
    opts = Enum.into(args, %{})
    #env = args[:env] || ""
    #provider = Amps.DB.find_by_id("providers", parms["provider"])
    IO.inspect(parms)
    Gnat.sub(:gnat, self(), parms["topic"])
    {:ok, opts}
  end

  def handle_info({:msg, message}, state) do
    msg = %{
      "data" => message.body
    }

    event =
      Map.merge(msg, %{
        "service" => state.parms["name"],
        "msgid" => AmpsUtil.get_id(),
        "ftime" => DateTime.to_iso8601(DateTime.utc_now())
      })

    IO.inspect(event)

    {event, sid} = AmpsEvents.start_session(event, %{"service" => state.parms["name"]}, state.env)

    fname =
      if not AmpsUtil.blank?(state.parms["format"]) do
        try do
          AmpsUtil.format(state.parms["format"], event)
        rescue
          _e ->
            state.parms["name"] <> "_" <> AmpsUtil.get_id()
#            state.parms["name"] <>
#              "_" <> AmpsUtil.format("{YYYY}_{MM}_{DD}_{HH}_{mm}_{SS}", event)
        end
      else
        state.parms["name"] <> "_" <> AmpsUtil.get_id()
#        state.parms["name"] <> "_" <> AmpsUtil.format("{YYYY}_{MM}_{DD}_{HH}_{mm}_{SS}", event)
      end

    event = Map.merge(event, %{"fname" => fname})

    ntopic = Regex.replace(~r/[.>* -]/, message.topic, "_")

    topic = "amps.svcs.#{state.parms["name"]}.#{ntopic}"

    AmpsEvents.send(event, %{"output" => topic}, %{}, state.env)

    AmpsEvents.end_session(sid, state.env)

    {:noreply, state}
  end
end
