defmodule Amps.NatsPullConsumer do
  use Jetstream.PullConsumer
  use GenServer
  require Logger
  alias Amps.DB

  def start_link(arg) do
    IO.inspect(arg)
    Jetstream.PullConsumer.start_link(__MODULE__, arg, name: arg[:name], id: arg[:name])
  end

  @impl true
  def init(arg) do
    Logger.info("arg #{inspect(arg)}")
    Logger.info("stream #{arg.stream}")
    Logger.info("stream #{arg.consumer}")

    {:ok, arg, connection_name: :gnat, stream_name: arg.stream, consumer_name: arg.consumer}
  end

  def get_data(body) do
    # IO.inspect(body)

    try do
      Poison.decode!(body)
    rescue
      error ->
        Logger.warning("action failed #{inspect(error)}")
        Logger.error(Exception.format_stacktrace())
        {:error, error}
    end
  end

  @impl true
  def handle_message(message, state) do
    parms = state[:parms]
    name = parms["name"]
    id = parms["id"]
    # info = Process.info(self()))
    Logger.info("got message #{state.name} #{name}: #{message.topic} / #{message.body}")

    case get_data(message.body) do
      {:error, _error} ->
        Logger.error("ack next message after data error")

        {:ack, state}

      data ->
        msg = data["msg"]
        msg = Map.merge(msg, %{sub: Process.info(self())[:registered_name]})

        {msg, sid, skip} =
          case Amps.EventHandler.is_registered(state.handler, msg["msgid"]) do
            :new ->
              {msg, sid} =
                AmpsEvents.start_session(
                  data["msg"],
                  %{"service" => parms["name"]},
                  state.env
                )

              Amps.EventHandler.register(
                state.handler,
                message,
                msg["msgid"],
                sid
              )

              {msg, sid, false}

            :skip ->
              {msg, sid} =
                AmpsEvents.start_session(
                  data["msg"],
                  %{
                    "service" =>
                      parms["name"] <>
                        " (Skipped)"
                  },
                  state.env
                )

              # Amps.EventHandler.process(state.handler, message, msg["msgid"])
              {msg, sid, true}

            info ->
              {msg, sid} =
                AmpsEvents.start_session(
                  data["msg"],
                  %{
                    "service" =>
                      parms["name"] <>
                        " (Retry " <> Integer.to_string(info.failures) <> ")"
                  },
                  state.env
                )

              Amps.EventHandler.process(state.handler, message, msg["msgid"])
              {msg, sid, false}
          end

        mstate = data["state"] || %{}

        status =
          try do
            mctx = {mstate, state.env}
            action_id = parms["handler"]

            actparms = Amps.DB.find_by_id(AmpsUtil.index(state.env, "actions"), action_id)

            if skip do
              AmpsEvents.send_history(
                AmpsUtil.env_topic("amps.events.action", state.env),
                "message_events",
                msg,
                %{
                  "status" => "skipped",
                  "topic" => parms["topic"],
                  "action" => actparms["name"],
                  "subscriber" => name
                }
              )

              {:term, state}
            else
              AmpsEvents.send_history(
                AmpsUtil.env_topic("amps.events.action", state.env),
                "message_events",
                msg,
                %{
                  "status" => "started",
                  "topic" => parms["topic"],
                  "action" => actparms["name"],
                  "subscriber" => name
                }
              )

              # IO.puts("action parms #{inspect(actparms)}")

              handler = AmpsUtil.get_env_parm(:actions, String.to_atom(actparms["type"]))

              # IO.puts("opts after lookup #{inspect(actparms)}")

              case handler.run(msg, actparms, mctx) do
                {:ok, result} ->
                  Logger.info("Action Completed #{inspect(result)}")
                  # IO.puts("ack next message")

                  if mstate["return"] do
                    Amps.AsyncResponder.put_response(
                      mstate["return"],
                      mstate["contextid"] <> parms["name"],
                      {actparms["name"], msg["msgid"], result}
                    )
                  end

                  # IO.inspect(state)

                  status =
                    if is_map(result) do
                      if Map.has_key?(result, "status") do
                        result["status"]
                      else
                        "completed"
                      end
                    else
                      "completed"
                    end

                  AmpsEvents.send_history(
                    AmpsUtil.env_topic("amps.events.action", state.env),
                    "message_events",
                    msg,
                    %{
                      "topic" => AmpsUtil.env_topic(parms["topic"], state.env),
                      "status" => status,
                      "action" => actparms["name"],
                      "subscriber" => name
                    }
                  )

                {:send, events} ->
                  Enum.each(events, fn event ->
                    AmpsEvents.send(event, actparms, mstate, state.env)
                  end)

                  if mstate["return"] do
                    Amps.AsyncResponder.resolve_message(
                      mstate["return"],
                      mstate["contextid"] <> parms["name"]
                    )
                  end

                  Logger.info("Action Completed #{parms["name"]}")

                  # IO.puts("ack next message")

                  AmpsEvents.send_history(
                    AmpsUtil.env_topic("amps.events.action", state.env),
                    "message_events",
                    msg,
                    %{
                      "topic" => parms["topic"],
                      "status" => "completed",
                      "action" => actparms["name"],
                      "subscriber" => name
                    }
                  )
              end

              Amps.EventHandler.deregister(state.handler, msg["msgid"])
              Jetstream.ack(message)
              {:ack, state}
            end
          rescue
            error ->
              Logger.error(Exception.format(:error, error, __STACKTRACE__))
              action_id = parms["handler"]

              actparms =
                Amps.DB.find_by_id(
                  AmpsUtil.index(state.env, "actions"),
                  action_id
                )

              failures = Amps.EventHandler.add_failure(state.handler, msg["msgid"])

              # IO.inspect(failures)

              msg =
                if is_map(msg) do
                  msg
                else
                  %{}
                end

              # IO.inspect(parms)

              retry = fn ->
                AmpsEvents.send_history(
                  AmpsUtil.env_topic("amps.events.action", state.env),
                  "message_events",
                  msg,
                  %{
                    status: "retrying",
                    topic: parms["topic"],
                    action: actparms["name"],
                    reason: inspect(error),
                    subscriber: name
                  }
                )

                Process.sleep(parms["backoff"] * 1000)
                Amps.EventHandler.stop_process(state.handler, msg["msgid"])

                {:nack, state}
              end

              fail = fn ->
                if mstate["return"] do
                  Amps.AsyncResponder.put_response(
                    mstate["return"],
                    mstate["contextid"] <> parms["name"],
                    {actparms["name"], msg["msgid"], Exception.message(error)}
                  )
                end

                _mctx = data["state"]

                # IO.puts("ack next message after action error")

                Logger.error(
                  "Action Failed\n" <>
                    Exception.format(:error, error, __STACKTRACE__)
                )

                AmpsEvents.send_history(
                  AmpsUtil.env_topic("amps.events.action", state.env),
                  "message_events",
                  msg,
                  %{
                    status: "failed",
                    topic: parms["topic"],
                    action: actparms["name"],
                    reason: inspect(error),
                    subscriber: name
                  }
                )

                Amps.EventHandler.deregister(state.handler, msg["msgid"])
                {:ack, state}
              end

              case parms["rmode"] do
                "limit" ->
                  if failures <= parms["rlimit"] do
                    retry.()
                  else
                    fail.()
                  end

                "always" ->
                  retry.()

                _ ->
                  fail.()
              end
          end

        AmpsEvents.end_session(sid, state.env)
        status
    end
  end
end
