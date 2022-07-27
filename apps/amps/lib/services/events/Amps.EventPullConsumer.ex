# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.EventPullConsumer do
  use Jetstream.PullConsumer
  use GenServer
  require Logger

  def start_link(arg) do
    IO.inspect(arg)

    Jetstream.PullConsumer.start_link(__MODULE__, arg,
      name: arg[:name],
      id: arg[:name]
    )
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
    Task.start_link(fn ->
      actparms = state.actparms
      Process.flag(:trap_exit, true)

      parms = state[:parms]
      name = parms["name"]
#      id = parms["id"]
      # info = Process.info(self()))
      Logger.info("got message #{state.name} #{name}: #{message.topic} / #{message.body}")

      case get_data(message.body) do
        {:error, _error} ->
          Logger.error("ack next message after data error")

          Jetstream.ack(message)

        data ->
          try do
            msg = data["msg"]
            msg = Map.merge(msg, %{sub: Process.info(self())[:registered_name]})

            {msg, sid, skip} =
              case Amps.EventHandler.register(
                     state.handler,
                     message,
                     msg["msgid"]
                   ) do
                :skip ->
                  {msg, sid} =
                    AmpsEvents.start_session(
                      data["msg"],
                      %{
                        "service" =>
                          parms["name"] <>
                            " (Skipped)",
                        "status" => "skipped"
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
                            " (Attempt " <>
                            Integer.to_string(info.attempts) <> ")",
                        "status" => "started"
                      },
                      state.env
                    )

                  {msg, sid, false}
              end

            mstate = data["state"] || %{}
            process_task = self()
            #action_id = parms["handler"]

            {:ok, task} =
              Task.start_link(fn ->
                Process.flag(:trap_exit, true)

                res =
                  try do
                    mctx = {mstate, state.env}

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

                      {:term, "skipped"}
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

                            status

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

                            "completed"

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

                            "completed"
                        end

                      Amps.EventHandler.stop_process(state.handler, message, msg["msgid"])
                      Jetstream.ack(message)
                      {:ack, status}
                    end
                  rescue
                    error ->
                      Logger.error(Exception.format(:error, error, __STACKTRACE__))

                      #action_id = parms["handler"]

                      attempts =
                        Amps.EventHandler.attempts(
                          state.handler,
                          msg["msgid"]
                        )

                      # IO.inspect(failures)
                      # IO.inspect(parms)

                      retry = fn ->
                        if mstate["return"] do
                          Amps.AsyncResponder.put_response(
                            mstate["return"],
                            mstate["contextid"] <> parms["name"],
                            {actparms["name"], msg["msgid"], Exception.message(error)}
                          )
                        end

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

                        AmpsEvents.update_session(
                          sid,
                          state.env,
                          "Sleeping for #{parms["backoff"]} seconds"
                        )

                        Process.sleep(parms["backoff"] * 1000)

                        {:nack, "retrying",
                         fn ->
                           Amps.EventHandler.stop_process(
                             state.handler,
                             message,
                             msg["msgid"]
                           )
                         end}
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

                        Amps.EventHandler.stop_process(
                          state.handler,
                          message,
                          msg["msgid"]
                        )

                        {:ack, "failed"}
                      end

                      case parms["rmode"] do
                        "limit" ->
                          if attempts <= parms["rlimit"] do
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

                ackstate =
                  case res do
                    {ackstate, status} ->
                      AmpsEvents.end_session(sid, state.env, status)
                      ackstate

                    {ackstate, status, post} ->
                      AmpsEvents.end_session(sid, state.env, status)
                      post.()
                      ackstate
                  end

                case ackstate do
                  :ack ->
                    Jetstream.ack(message)

                  :nack ->
                    Jetstream.nack(message)

                  :term ->
                    Jetstream.ack_term(message)
                end

                send(process_task, :done)
              end)

            term_listener(message, msg, actparms, sid, task, state)
          rescue
            e ->
              Logger.error(Exception.format(:error, e, __STACKTRACE__))
              Jetstream.ack(message)
          end
      end
    end)

    {:noreply, state}
  end

  defp term_listener(message, msg, actparms, sid, task, state) do
    #handlername = Process.info(state.handler)[:registered_name]
    parms = state.parms
    name = parms["name"]

    kill_task = fn ->
      res = Process.unlink(task)
      Logger.info("#{inspect(res)}")
      res = Process.exit(task, :kill)
      Logger.info("#{inspect(res)}")
    end

    termtopic =
      AmpsUtil.env_topic(
        "amps.eventhandler.#{sid}.term",
        state.env
      )

    {:ok, nsid} = Gnat.sub(:gnat, self(), termtopic)

    res =
      receive do
        :done ->
          "done"

        {:EXIT, pid, reason} ->
          Logger.info("#{inspect(pid)}")

          Logger.info(Atom.to_string(reason))
          Jetstream.nack(message)
          AmpsEvents.end_session(sid, state.env, "Subscriber Stopped")
          kill_task.()

        {:msg, msg} ->
          IO.inspect(msg)

          try do
            Jason.decode!(msg.body)["msg"]["ackmode"]
          rescue
            e ->
              Logger.warning("could not terminate process [#{sid}] reason [#{inspect(e)}]")
              "nack"
          end
      end

    Logger.info(res)

    Gnat.unsub(:gnat, nsid)

    if res == "nack" || res == "term" do
      Logger.info("#{inspect(self())}")
      Logger.info("#{inspect(task)}")

      status =
        if res == "term" do
          "terminated"
        else
          "terminated - redelivering"
        end

      AmpsEvents.send_history(
        AmpsUtil.env_topic("amps.events.action", state.env),
        "message_events",
        msg,
        %{
          "status" => status,
          "topic" => parms["topic"],
          "action" => actparms["name"],
          "subscriber" => name
        }
      )

      if res == "term" do
        Jetstream.ack_term(message)
      else
        Jetstream.nack(message)
      end

      # Logger.info(inspect(state))

      # failures = Amps.EventHandler.failures(state.handler, msg["msgid"])

      # Logger.info(failures)

      # case parms["rmode"] do
      #   "limit" ->
      #     if failures <= parms["rlimit"] do
      #       Amps.EventHandler.stop_process(
      #         state.handler,
      #         msg["msgid"]
      #       )
      #     else
      #       Amps.EventHandler.deregister(
      #         state.handler,
      #         msg["msgid"]
      #       )
      #     end

      #   "always" ->
      #     Amps.EventHandler.stop_process(
      #       state.handler,
      #       msg["msgid"]
      #     )

      #   _ ->
      #     Amps.EventHandler.deregister(
      #       state.handler,
      #       msg["msgid"]
      #     )
      # end

      Amps.EventHandler.stop_process(
        state.handler,
        message,
        msg["msgid"]
      )

      AmpsEvents.end_session(sid, state.env, status)
      kill_task.()
    end
  end
end
