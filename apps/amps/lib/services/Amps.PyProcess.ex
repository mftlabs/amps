# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.PyProcess.Logger do
  require Logger

  def start_link(args) do
    parms = Enum.into(args, %{})

    parms =
      case parms[:env] do
        nil ->
          Map.put(parms, :env, "")

        _ ->
          parms
      end

    IO.puts("starting event listener #{inspect(parms)}")
    GenServer.start_link(__MODULE__, parms)
  end

  def init(state) do
    {:ok, state}
  end

  def handle_info({:log, {level, message}}, state) do
    Logger.log(level, message)
    {:noreply, state}
  end

  def handle_info(_other, state) do
    {:noreply, state}
  end
end

defmodule Amps.PyProcess.New do
  require Logger

  def start_link(args) do
    parms = Enum.into(args, %{})

    parms =
      case parms[:env] do
        nil ->
          Map.put(parms, :env, "")

        _ ->
          parms
      end

    IO.puts("starting event listener #{inspect(parms)}")
    GenServer.start_link(__MODULE__, parms)
  end

  def init(state) do
    {:ok, state}
  end

  def handle_info({:new, msg}, state) do
    parms = state.parms
    Logger.debug("Handling new message in service #{parms["name"]}")
    msg = Jason.decode!(msg)

    {msg, sid} =
      AmpsEvents.start_session(
        msg,
        %{"service" => parms["name"]},
        state.env
      )

    env = state.env

    msg = Map.merge(msg, %{"service" => parms["name"]})

    msg =
      if msg["user"] do
        msg
      else
        Map.put(msg, "user", "#{parms["name"]} generated")
      end

    IO.inspect(msg)
    IO.inspect(parms)
    IO.inspect(env)

    if parms["send_output"] do
      AmpsEvents.send(
        msg,
        parms,
        %{},
        env
      )
    else
      Logger.warn(
        "Attempted to Send Message in Service #{parms["name"]} when \"Send Output\" disabled."
      )
    end

    AmpsEvents.end_session(sid, env)

    {:noreply, state}
  end

  def handle_info(_other, state) do
    {:noreply, state}
  end
end

defmodule Amps.PyProcess do
  use GenServer
  require Logger

  def start_link(args) do
    parms = Enum.into(args, %{})

    parms =
      case parms[:env] do
        nil ->
          Map.put(parms, :env, "")

        _ ->
          parms
      end

    IO.puts("starting event listener #{inspect(parms)}")
    name = parms[:name]
    {:ok, pid} = GenServer.start_link(__MODULE__, parms)
    Process.register(pid, name)
    {:ok, pid}
  end

  def init(%{
        parms: parms,
        env: env
      }) do
    listening_topic =
      if parms["receive"] do
        listening_topic = "_CON.#{nuid()}"
        group = String.replace(parms["name"], " ", "_")
        IO.puts("group #{group}")
        {stream, consumer} = AmpsUtil.get_names(parms, env)

        {:ok, _sid} = Gnat.sub(:gnat, self(), listening_topic, queue_group: group)

        IO.inspect(stream)
        IO.inspect(consumer)

        :ok =
          Gnat.pub(
            :gnat,
            "$JS.API.CONSUMER.MSG.NEXT.#{stream}.#{consumer}",
            "1",
            reply_to: listening_topic
          )

        listening_topic
      end

    path = AmpsUtil.get_mod_path(env, [parms["service"]])

    {:ok, pid} =
      :pythra.start_link([String.to_charlist(path)], [
        {:cd, String.to_charlist(path)}
      ])

    IO.inspect("pyservice")
    IO.inspect(pid)

    svc = String.to_atom(parms["service"])
    {:ok, new_handler} = Amps.PyProcess.New.start_link(parms: parms, env: env)
    {:ok, log_handler} = Amps.PyProcess.Logger.start_link(parms: parms, env: env)

    IO.inspect(new_handler)
    IO.inspect(log_handler)

    service =
      :pythra.init(pid, svc, svc, [], [
        {:parms, Jason.encode!(parms)},
        {:sysparms, Jason.encode!(%{"tempdir" => AmpsUtil.get_env(:storage_temp)})},
        {:pid, self()},
        {:env, env},
        {:handler, new_handler},
        {:lhandler, log_handler}
      ])

    process = %{
      pid: pid,
      service: service
    }

    state = %{
      parms: parms,
      process: process,
      listening_topic: listening_topic,
      new_handler: new_handler,
      log_handler: log_handler,
      env: env,
      sid: nil
    }

    {:ok, state}
  end

  def get_consumer(parms, name) do
    action_id = parms["handler"]
    aparms = AmpsDatabase.get_action_parms(action_id)
    _type = aparms["type"]

    name
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

  def set_session(pid, sid) do
    GenServer.call(pid, {:sid, sid})
  end

  def clear_session(pid) do
    GenServer.call(pid, {:sid, nil})
  end

  def handle_info({:sid, sid}, state) do
    {:noreply, Map.put(state, :sid, sid)}
  end

  def handle_info({:log, {level, message}}, state) do
    Logger.log(level, message)
    {:noreply, state}
  end

  def handle_info({:msg, message}, state) do
    msg = Jason.decode!(message.body)["msg"]
    evtopic = AmpsUtil.env_topic("amps.events.action", state.env)
    topic = state.parms["topic"]

    {msg, sid} =
      AmpsEvents.start_session(
        msg,
        %{"service" => state.parms["name"]},
        state.env
      )

    AmpsEvents.send_history(
      evtopic,
      "message_events",
      msg,
      %{
        "status" => "started",
        "topic" => topic,
        "action" => state.parms["name"] <> " Message Handler"
      }
    )

    AmpsUtil.local_file(msg, state.env)

    resp =
      :pythra.method(state.process.pid, state.process.service, :__receive__, [
        Jason.encode!(msg)
      ])

    case resp do
      {:ok, status} ->
        AmpsEvents.send_history(
          evtopic,
          "message_events",
          msg,
          %{
            "status" => to_string(status),
            "topic" => topic,
            "action" => state.parms["name"] <> " Message Handler"
          }
        )

      {:error, error} ->
        AmpsEvents.send_history(
          evtopic,
          "message_events",
          msg,
          %{
            "status" => "failed",
            "topic" => topic,
            "service" => state.parms["name"],
            "reason" => inspect(error),
            "action" => state.parms["name"] <> " Message Handler"
          }
        )
    end

    AmpsEvents.end_session(sid, state.env)
    Jetstream.ack_next(message, state.listening_topic)
    {:noreply, state}
  end

  def handle_info({:new, msg}, state) do
    msg = Jason.decode!(msg)

    parms = state.parms

    env = state.env
    IO.inspect(msg)
    IO.inspect(parms)
    IO.inspect(env)

    {msg, sid} =
      AmpsEvents.start_session(
        msg,
        %{"service" => parms["name"]},
        env
      )

    if parms["send_output"] do
      Logger.warn(
        "Attempted to Send Message in Service #{parms["name"]} when \"Send Output\" disabled."
      )
    else
      AmpsEvents.send(
        msg,
        parms,
        %{},
        env
      )
    end

    AmpsEvents.end_session(sid, env)

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


  def log(level, message, md) do
    Logger.log(
      level,
      message,
      Enum.map(md, fn {k, v} ->
        {k, List.to_string(v)}
      end)
    )
  end

  def send_message(msg, parms, env) do
    IO.puts("SENDING MESSAGE")
    msg = Jason.decode!(msg)
    parms = Jason.decode!(parms)

    if parms["send_output"] do
      AmpsEvents.send(
        msg,
        parms,
        %{},
        env
      )
    else
      Logger.warn(
        "Attempted to Send Message in Service #{parms["name"]} when \"Send Output\" disabled."
      )
    end
  end

  def new_message(msg, parms, env) do
    IO.inspect("new")
    msg = Jason.decode!(msg)

    parms = Jason.decode!(parms)

    env = List.to_string(env)
    IO.inspect(msg)
    IO.inspect(parms)
    IO.inspect(env)

    {msg, sid} =
      AmpsEvents.start_session(
        msg,
        %{"service" => parms["name"]},
        env
      )

    if parms["send_output"] do
      AmpsEvents.send(
        msg,
        parms,
        %{},
        env
      )
    else
      Logger.warn(
        "Attempted to Send Message in Service #{parms["name"]} when \"Send Output\" disabled."
      )
    end

    AmpsEvents.end_session(sid, env)
  end

  def handle_call(parms, _from, state) do
    IO.puts("handler call called #{inspect(parms)}")
    {:reply, :ok, state}
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
