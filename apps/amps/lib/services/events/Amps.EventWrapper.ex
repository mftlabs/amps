defmodule Amps.EventWrapper do
  use GenServer
  require Logger
  #

  # alias Jetstream.API.{Consumer, Stream}

  def start_link(args) do
    parms = Enum.into(args, %{})

    parms =
      case parms[:env] do
        nil ->
          Map.put(parms, :env, "")

        _ ->
          parms
      end

    name = parms[:name]
    GenServer.start_link(__MODULE__, parms)
  end

  def init(opts) do
    Process.flag(:trap_exit, true)
    Logger.info("starting event listener #{opts[:name]} #{inspect(opts)}")

    Process.register(self(), opts[:name])

    Process.send_after(self(), {:initial_connect, opts}, 0)
    {:ok, opts}
  end

  def child_spec(opts) do
    name = opts[:name]
    IO.puts("name #{inspect(name)}")

    %{
      id: name,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  # GenServer callbacks
  def handle_info({:initial_connect, parms}, state) do
    opts = parms[:parms]
    IO.puts("opts #{inspect(opts)}")
    IO.puts("state #{inspect(state)}")
    name = Atom.to_string(state[:name])
    sub = String.to_atom(name <> "_sup")
    IO.puts("sub: #{inspect(sub)}")

    pid = Process.whereis(:gnat)

    IO.puts("pid #{inspect(pid)}")
    Process.flag(:trap_exit, true)

    {stream, consumer} = AmpsUtil.get_names(opts, state.env)
    IO.inspect(stream)
    IO.inspect(state.env)

    listening_topic = AmpsUtil.env_topic("amps.consumer.#{consumer}", state.env)

    Logger.info("got stream #{stream} #{consumer}")
    opts = Map.put(opts, "id", name)

    {:ok, pid} = Amps.EventPullConsumer.start_link(%{
      parms: opts,
      connection_pid: pid,
      stream: stream,
      listening_topic: listening_topic,
      consumer: consumer,
      env: state.env,
      handler: parms.handler,
      name: String.to_atom(name <> "_pc")
    })

    {:noreply, %{cpid: pid, opts: opts, pid: pid}}
  end

  def handle_info({:msg, msg}, state) do
    # IO.puts("Message")
    {:ok, file} = File.open("test.txt", [:append])
    IO.write(file, Jason.decode!(msg.body)["msg"]["fname"] <> "\n")

    IO.write(
      file,
      Atom.to_string(Process.info(self())[:registered_name]) <> "\n"
    )

    File.close(file)
    {:noreply, state}
  end

  def handle_info(val, state) do
    IO.puts("got event #{inspect(val)}")
    {:noreply, state}
  end

  def terminate(reason, state) do
    Logger.info("TERMINATING #{state.opts["name"]}")
    Process.exit(state.pid, :normal)
  end
end

# defmodule NackError do
#   defexception message: "Error Archiving to S3"

#   def exception(message) do
#     IO.inspect(message)

#     case message do
#       nil ->
#         %NackError{}

#       message ->
#         cond do
#           is_atom(message) ->
#             %NackError{message: Atom.to_string(message)}

#           is_binary(message) ->
#             %NackError{message: message}

#           true ->
#             %NackError{}
#         end
#     end
#   end
# end

# defmodule Amps.PushConsumer do
#   use GenServer
#   require Logger
#   alias Amps.DB
#   import ExAws
#   alias ExAws.S3

#   def init(%{
#         parms: parms,
#         connection_pid: connection_pid,
#         stream_name: stream,
#         consumer_name: consumer,
#         listening_topic: listening_topic,
#         handler: handler,
#         env: env
#       }) do
#     # Process.link(connection_pid)
#     # :ok =
#     #   Gnat.pub(
#     #     connection_pid,
#     #     "$JS.API.CONSUMER.MSG.NEXT.#{stream_name}.#{consumer_name}",
#     #     "1",
#     #     reply_to: listening_topic
#     #   )

#     group = String.replace(parms["name"], " ", "_")
#     Logger.info("History queue_group #{group} #{stream} #{consumer}")
#     {:ok, sid} = Gnat.sub(:gnat, self(), listening_topic, queue_group: group)
#     Process.flag(:trap_exit, true)

#     state = %{
#       parms: parms,
#       stream_name: stream,
#       consumer_name: consumer,
#       listening_topic: listening_topic,
#       env: env,
#       sid: sid,
#       handler: handler
#     }

#     {:ok, state}
#   end

#   def get_data(body) do
#     # IO.inspect(body)

#     try do
#       Poison.decode!(body)
#     rescue
#       error ->
#         Logger.warning("action failed #{inspect(error)}")
#         Logger.error(Exception.format_stacktrace())
#         {:error, error}
#     end
#   end

#   def handle_info({:msg, message}, state) do
#     parms = state[:parms]
#     name = parms["name"]
#     id = parms["id"]
#     Logger.info("got message #{id} #{name}: #{message.topic} / #{message.body}")

#     case get_data(message.body) do
#       {:error, _error} ->
#         Logger.error("ack next message after data error")
#         Jetstream.ack(message)
#         {:noreply, state}

#       data ->
#         msg = data["msg"]

#         {msg, sid} =
#           case Amps.EventHandler.is_registered(state.handler, msg["msgid"]) do
#             nil ->
#               {msg, sid} =
#                 AmpsEvents.start_session(
#                   data["msg"],
#                   %{"service" => parms["name"]},
#                   state.env
#                 )

#               Amps.EventHandler.register(
#                 state.handler,
#                 message,
#                 msg["msgid"],
#                 sid
#               )

#               {msg, sid}

#             info ->
#               IO.inspect(info)

#               {msg, sid} =
#                 AmpsEvents.start_session(
#                   data["msg"],
#                   %{
#                     "service" =>
#                       parms["name"] <>
#                         " (Retry " <> Integer.to_string(info.failures) <> ")"
#                   },
#                   state.env
#                 )

#               Amps.EventHandler.process(state.handler, message, msg["msgid"])
#               {msg, sid}
#           end

#         mstate = data["state"] || %{}

#         try do
#           mctx = {mstate, state.env}
#           action_id = parms["handler"]

#           actparms = Amps.DB.find_by_id(AmpsUtil.index(state.env, "actions"), action_id)

#           AmpsEvents.send_history(
#             AmpsUtil.env_topic("amps.events.action", state.env),
#             "message_events",
#             msg,
#             %{
#               "status" => "started",
#               "topic" => parms["topic"],
#               "action" => actparms["name"],
#               "subscriber" => name
#             }
#           )

#           IO.puts("action parms #{inspect(actparms)}")

#           handler = AmpsUtil.get_env_parm(:actions, String.to_atom(actparms["type"]))

#           IO.puts("opts after lookup #{inspect(actparms)}")

#           case handler.run(msg, actparms, mctx) do
#             {:ok, result} ->
#               Logger.info("Action Completed #{inspect(result)}")
#               # IO.puts("ack next message")

#               if mstate["return"] do
#                 Amps.AsyncResponder.put_response(
#                   mstate["return"],
#                   mstate["contextid"] <> parms["name"],
#                   {actparms["name"], msg["msgid"], result}
#                 )
#               end

#               IO.inspect(state)

#               status =
#                 if is_map(result) do
#                   if Map.has_key?(result, "status") do
#                     result["status"]
#                   else
#                     "completed"
#                   end
#                 else
#                   "completed"
#                 end

#               AmpsEvents.send_history(
#                 AmpsUtil.env_topic("amps.events.action", state.env),
#                 "message_events",
#                 msg,
#                 %{
#                   "topic" => AmpsUtil.env_topic(parms["topic"], state.env),
#                   "status" => status,
#                   "action" => actparms["name"],
#                   "subscriber" => name
#                 }
#               )

#             {:send, events} ->
#               Enum.each(events, fn event ->
#                 AmpsEvents.send(event, actparms, mstate, state.env)
#               end)

#               if mstate["return"] do
#                 Amps.AsyncResponder.resolve_message(
#                   mstate["return"],
#                   mstate["contextid"] <> parms["name"]
#                 )
#               end

#               Logger.info("Action Completed #{parms["name"]}")

#               # IO.puts("ack next message")

#               AmpsEvents.send_history(
#                 AmpsUtil.env_topic("amps.events.action", state.env),
#                 "message_events",
#                 msg,
#                 %{
#                   "topic" => parms["topic"],
#                   "status" => "completed",
#                   "action" => actparms["name"],
#                   "subscriber" => name
#                 }
#               )
#           end

#           Jetstream.ack(message)
#           Amps.EventHandler.deregister(state.handler, msg["msgid"])
#         rescue
#           error ->
#             Logger.error(Exception.format(:error, error, __STACKTRACE__))
#             action_id = parms["handler"]

#             actparms =
#               Amps.DB.find_by_id(
#                 AmpsUtil.index(state.env, "actions"),
#                 action_id
#               )

#             failures = Amps.EventHandler.add_failure(state.handler, msg["msgid"])

#             IO.inspect(failures)

#             msg =
#               if is_map(msg) do
#                 msg
#               else
#                 %{}
#               end

#             IO.inspect(parms)

#             retry = fn ->
#               AmpsEvents.send_history(
#                 AmpsUtil.env_topic("amps.events.action", state.env),
#                 "message_events",
#                 msg,
#                 %{
#                   status: "retrying",
#                   topic: parms["topic"],
#                   action: actparms["name"],
#                   reason: inspect(error)
#                 }
#               )

#               Process.sleep(parms["backoff"] * 1000)
#               Amps.EventHandler.stop_process(state.handler, msg["msgid"])

#               Jetstream.nack(message)
#             end

#             fail = fn ->
#               if mstate["return"] do
#                 Amps.AsyncResponder.put_response(
#                   mstate["return"],
#                   mstate["contextid"] <> parms["name"],
#                   {actparms["name"], msg["msgid"], Exception.message(error)}
#                 )
#               end

#               _mctx = data["state"]

#               IO.puts("ack next message after action error")

#               Logger.error(
#                 "Action Failed\n" <>
#                   Exception.format(:error, error, __STACKTRACE__)
#               )

#               AmpsEvents.send_history(
#                 AmpsUtil.env_topic("amps.events.action", state.env),
#                 "message_events",
#                 msg,
#                 %{
#                   status: "failed",
#                   topic: parms["topic"],
#                   action: actparms["name"],
#                   reason: inspect(error)
#                 }
#               )

#               Jetstream.ack(message)
#               Amps.EventHandler.deregister(state.handler, msg["msgid"])
#             end

#             case parms["rmode"] do
#               "limit" ->
#                 if failures <= parms["rlimit"] do
#                   retry.()
#                 else
#                   fail.()
#                 end

#               "always" ->
#                 retry.()

#               _ ->
#                 fail.()
#             end
#         end

#         AmpsEvents.end_session(sid, state.env)
#     end

#     {:noreply, state}
#   end

#   def terminate(reason, state) do
#     Logger.warn("#{inspect(reason)} in terminate")
#     Gnat.unsub(:gnat, state.sid)
#   end

#   def handle_info(other, state) do
#     require Logger
#     IO.puts("handle info #{inspect(other)} #{inspect(state)}")

#     # Logger.error(
#     #   "#{__MODULE__} for #{state.stream_name}.#{state.consumer_name} received unexpected message: #{inspect(other)}"
#     # )

#     {:noreply, state}
#   end

#   def handle_call(parms, _from, state) do
#     IO.puts("handler call called #{inspect(parms)}")
#     {:reply, :ok, state}
#   end

#   defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
# end
