defmodule Amps.PullConsumer do
  @callback initialize(state :: map()) :: map()
  @callback process(
              message :: map(),
              msg :: map(),
              process_task :: pid(),
              mstate :: map(),
              state :: map()
            ) ::
              {ackstate :: atom(), status :: binary()}
              | {ackstate :: atom(), status :: binary(), post :: fun()}
  @callback action_name(state :: map()) :: binary()

  defmacro __using__(opts) do
    quote do
      use Jetstream.PullConsumer
      use GenServer
      require Logger
      alias Amps.DB

      def start_link(arg) do
        IO.inspect(arg)

        Jetstream.PullConsumer.start_link(__MODULE__, arg,
          name: arg[:name],
          id: arg[:name]
        )
      end

      @impl true
      def init(arg) do
        state = initialize(arg)

        {:ok, state, connection_name: :gnat, stream_name: arg.stream, consumer_name: arg.consumer}
      end

      def get_data(body) do
        try do
          Poison.decode!(body)
        rescue
          error ->
            Logger.warning("Data Failure #{inspect(error)}")
            Logger.error(Exception.format_stacktrace())
            {:error, error}
        end
      end

      @impl true
      def handle_message(message, state) do
        Task.start_link(fn ->
          Process.flag(:trap_exit, true)

          case get_data(message.body) do
            {:error, _error} ->
              Logger.error("ack next message after data error")

              Jetstream.ack(message)

            data ->
              try do
                parms = state.parms
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
                            "status" => "started",
                            "attempt" => info.attempts,
                            "subscriber" => parms["name"]
                          },
                          state.env
                        )

                      msg =
                        Map.put(
                          msg,
                          "service",
                          parms["name"]
                        )

                      {msg, sid, false}
                  end

                if skip do
                  AmpsEvents.send_history(
                    AmpsUtil.env_topic("amps.events.action", state.env),
                    "message_events",
                    msg,
                    %{
                      "status" => "skipped",
                      "topic" => parms["topic"],
                      "action" => action_name(state),
                      "subscriber" => parms["name"]
                    }
                  )

                  Jetstream.ack_term(message)
                else
                  mstate = data["state"] || %{}
                  process_task = self()

                  {:ok, task} =
                    Task.start_link(fn ->
                      Process.flag(:trap_exit, true)

                      name = parms["name"]

                      res =
                        try do
                          process(message, msg, process_task, mstate, state)
                        rescue
                          error ->
                            Logger.error(Exception.format(:error, error, __STACKTRACE__))

                            action_id = parms["handler"]

                            attempts =
                              Amps.EventHandler.attempts(
                                state.handler,
                                msg["msgid"]
                              )

                            # IO.inspect(failures)

                            msg =
                              if is_map(msg) do
                                msg
                              else
                                %{}
                              end

                            # IO.inspect(parms)

                            retry = fn ->
                              if mstate["return"] do
                                Amps.AsyncResponder.put_response(
                                  mstate["return"],
                                  mstate["contextid"] <> parms["name"],
                                  {action_name(state), msg["msgid"],
                                   %{
                                     "status" => "retrying",
                                     "error" => Exception.message(error)
                                   }}
                                )
                              end

                              AmpsEvents.send_history(
                                AmpsUtil.env_topic(
                                  "amps.events.action",
                                  state.env
                                ),
                                "message_events",
                                msg,
                                %{
                                  status: "Sleeping for #{parms["backoff"]} seconds",
                                  sleepDuration: parms["backoff"],
                                  topic: parms["topic"],
                                  action: action_name(state),
                                  reason: Exception.message(error),
                                  subscriber: name
                                }
                              )

                              AmpsEvents.update_session(
                                sid,
                                state.env,
                                "Sleeping for #{parms["backoff"]} seconds"
                              )

                              Process.sleep(parms["backoff"] * 1000)

                              AmpsEvents.send_history(
                                AmpsUtil.env_topic(
                                  "amps.events.action",
                                  state.env
                                ),
                                "message_events",
                                msg,
                                %{
                                  status: "retrying",
                                  topic: parms["topic"],
                                  action: action_name(state),
                                  reason: Exception.message(error),
                                  subscriber: name
                                }
                              )

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
                                  {action_name(state), msg["msgid"],
                                   %{
                                     "status" => "failed",
                                     "error" => Exception.message(error)
                                   }}
                                )
                              end

                              Logger.error(
                                "Action Failed\n" <>
                                  Exception.format(
                                    :error,
                                    error,
                                    __STACKTRACE__
                                  )
                              )

                              AmpsEvents.send_history(
                                AmpsUtil.env_topic(
                                  "amps.events.action",
                                  state.env
                                ),
                                "message_events",
                                msg,
                                %{
                                  status: "failed",
                                  topic: parms["topic"],
                                  action: action_name(state),
                                  reason: Exception.message(error),
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

                      IO.inspect(res)

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

                  term_listener(message, msg, sid, task, state)
                end
              rescue
                e ->
                  Logger.error(Exception.format(:error, e, __STACKTRACE__))
                  Jetstream.ack(message)
              end
          end
        end)

        {:noreply, state}
      end

      defp term_listener(message, msg, sid, task, state) do
        handlername = Process.info(state.handler)[:registered_name]
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
              "action" => action_name(state),
              "subscriber" => name
            }
          )

          if res == "term" do
            Jetstream.ack_term(message)
          else
            Jetstream.nack(message)
          end

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
  end
end
