defmodule Amps.EventPullConsumer do
  @behaviour Amps.PullConsumer
  use Amps.PullConsumer

  @impl Amps.PullConsumer
  def initialize(state) do
    actparms =
      Amps.DB.find_by_id(
        AmpsUtil.index(state.env, "actions"),
        state.parms["handler"]
      )

    Map.put(state, :actparms, actparms)
  end

  @impl Amps.PullConsumer
  def process(message, msg, process_task, mstate, state) do
    actparms = state.actparms
    parms = state.parms
    sid = msg["sid"]

    name = parms["name"]
    mctx = {mstate, state.env}

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

    handler =
      AmpsUtil.get_env_parm(
        :actions,
        String.to_atom(actparms["type"])
      )

    # IO.puts("opts after lookup #{inspect(actparms)}")
    status =
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

          {status, reason} =
            if is_map(result) do
              if Map.has_key?(result, "status") do
                status = result["status"]
                reason = result["reason"] || nil
                {status, reason}
              else
                {"completed", nil}
              end
            else
              {"completed", nil}
            end

          event = %{
            "topic" => AmpsUtil.env_topic(parms["topic"], state.env),
            "status" => status,
            "action" => actparms["name"],
            "subscriber" => name
          }

          event =
            if reason do
              Map.put(event, "reason", reason)
            else
              event
            end

          AmpsEvents.send_history(
            AmpsUtil.env_topic(
              "amps.events.action",
              state.env
            ),
            "message_events",
            msg,
            event
          )

          {:ack, status}

        {:send, events} ->
          Enum.each(events, fn event ->
            AmpsEvents.send(
              event,
              actparms,
              mstate,
              state.env
            )
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
            AmpsUtil.env_topic(
              "amps.events.action",
              state.env
            ),
            "message_events",
            msg,
            %{
              "topic" => parms["topic"],
              "status" => "completed",
              "action" => actparms["name"],
              "subscriber" => name
            }
          )

          {:ack, "completed"}

        {:send, events, topic} ->
          Logger.info(topic)

          Enum.each(events, fn event ->
            AmpsEvents.send(
              event,
              %{"output" => topic},
              mstate,
              state.env
            )
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
            AmpsUtil.env_topic(
              "amps.events.action",
              state.env
            ),
            "message_events",
            msg,
            %{
              "topic" => parms["topic"],
              "status" => "completed",
              "action" => actparms["name"],
              "subscriber" => name
            }
          )

          Amps.EventHandler.stop_process(state.handler, message, msg["msgid"])
          {:ack, "completed"}
      end
  end

  @impl Amps.PullConsumer
  def action_name(state) do
    state.actparms["name"]
  end
end
