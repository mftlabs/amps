defmodule Amps.HistoryConsumer do
  use GenServer
  require Logger

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

    IO.puts("starting event listener #{inspect(parms)}")
    name = parms[:name]
    GenServer.start_link(__MODULE__, parms)
  end

  def init(opts) do
    Process.send_after(self(), {:initial_connect, opts[:parms]}, 0)
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

  defp get_names(parms) do
    topic = parms["topic"]
    safe = String.replace(topic, ".", "_")
    consumer = String.replace(safe, "*", "_")

    [base, part, _other] = String.split(topic, ".", parts: 3)

    stream = AmpsUtil.get_env_parm(:streams, String.to_atom(base <> "." <> part))

    {stream, consumer}
  end

  # GenServer callbacks
  def handle_info({:initial_connect, opts}, state) do
    IO.puts("opts #{inspect(opts)}")
    IO.puts("state #{inspect(state)}")
    name = Atom.to_string(state[:name])
    sub = String.to_atom(name <> "_sup")
    IO.puts("sub: #{inspect(sub)}")

    pid = Process.whereis(:gnat)

    IO.puts("pid #{inspect(pid)}")

    {stream, consumer} = AmpsUtil.get_names(opts, state.env)
    IO.inspect(stream)
    IO.inspect(state.env)
    listening_topic = AmpsUtil.env_topic("amps.history.#{consumer}", state.env)

    IO.inspect(listening_topic)

    # AmpsUtil.create_consumer(stream, consumer, AmpsUtil.env_topic(opts["topic"], state.env), %{
    #   deliver_policy: :all,
    #   deliver_subject: listening_topic,
    #   ack_policy: :all
    # })

    # Gnat.sub(pid, self(), listening_topic)
    Logger.info("got stream #{stream} #{consumer}")
    opts = Map.put(opts, "id", name)

    GenServer.start_link(
      Amps.HistoryPullConsumer,
      %{
        parms: opts,
        connection_pid: pid,
        stream_name: stream,
        consumer_name: consumer,
        listening_topic: listening_topic,
        env: state.env,
        handler: state.handler
      }
    )

    {:noreply, %{cpid: pid, opts: opts}}
  end

  def handle_info({:msg, _msg}, state) do
    {:noreply, state}
  end

  def handle_info({val, _opts}, state) do
    IO.puts("got event #{inspect(val)}")
    {:noreply, state}
  end
end

defmodule Amps.HistoryPullConsumer do
  use GenServer
  require Logger
  alias Amps.DB

  def init(%{
        parms: parms,
        connection_pid: connection_pid,
        stream_name: stream_name,
        consumer_name: consumer_name,
        listening_topic: listening_topic,
        env: env
      }) do
    # Process.link(connection_pid)
    group = String.replace(parms["name"], " ", "_")
    Logger.info("History queue_group #{group} #{stream_name} #{consumer_name}")
    IO.inspect(listening_topic)

    {:ok, sid} = Gnat.sub(connection_pid, self(), listening_topic, queue_group: group)

    # :ok =
    #   Gnat.pub(
    #     connection_pid,
    #     "$JS.API.CONSUMER.MSG.NEXT.#{stream_name}.#{consumer_name}",
    #     "1",
    #     reply_to: listening_topic
    #   )

    state = %{
      parms: parms,
      stream_name: stream_name,
      consumer_name: consumer_name,
      listening_topic: listening_topic,
      messages: [],
      env: env,
      index:
        if parms["receipt"] do
          parms["index"]
        else
          nil
        end,
      doc:
        if parms["doc"] do
          parms["doc"]
        else
          nil
        end,
      sid: sid
    }

    schedule_bulk()
    {:ok, state}
  end

  def handle_info({:msg, message}, state) do
    data = Poison.decode!(message.body)
    msg = data["msg"]
    # AmpsEvents.send_history(
    #   AmpsUtil.env_topic("amps.events.action", state.env),
    #   "message_events",
    #   msg,
    #   %{
    #     "status" => "started",
    #     "topic" => AmpsUtil.env_topic(parms["topic"], state.env),
    #     "action" => actparms["name"],
    #     "subscriber" => name
    #   }
    # )
    parms = state[:parms]
    name = parms["name"]

    Logger.debug("got history message #{name}: #{message.topic} / #{message.body}")

    message =
      if state.index do
        doc =
          if state.doc do
            state.doc.(message.topic, data["msg"])
          else
            Map.merge(data["msg"], %{
              "status" => "received"
            })
          end

        if is_list(state.index) do
          actions =
            Enum.reduce(state.index, [], fn index, acc ->
              [
                {AmpsUtil.index(state.env, index), Amps.DB.bulk_insert(doc)} | acc
              ]
            end)

          {actions, message}
        else
          {[
             {AmpsUtil.index(state.env, state.index), Amps.DB.bulk_insert(doc)}
           ], message}
        end
      else
        {[
           {AmpsUtil.index(state.env, data["index"]), Amps.DB.bulk_insert(data)}
         ], message}
      end

    state = Map.put(state, :messages, [message | state.messages])

    {:noreply, state}
  end

  defp handle_index(indexes, index, op) do
    if Map.has_key?(indexes, index) do
      Map.put(indexes, index, [op | indexes[index]])
    else
      Map.put(indexes, index, [op])
    end
  end

  def handle_info(:bulk, state) do
    schedule_bulk()

    state =
      if Enum.count(state.messages) > 0 do
        indexes =
          Enum.reduce(state.messages, %{}, fn {actions, _}, acc ->
            Enum.reduce(actions, acc, fn {index, op}, acc ->
              handle_index(acc, index, op)
            end)
          end)

        Enum.each(indexes, fn {index, ops} ->
          Amps.DB.bulk_perform(ops, index)
        end)

        # case res do
        #   :ok ->
        Logger.debug("Bulked #{state.parms["name"]}")
        {_, msg} = Enum.at(state.messages, 0)
        Jetstream.ack(msg)
        Map.put(state, :messages, [])

        # {:error, error} ->
        #   Logger.error("#{inspect(error)}")
        #   state
        # end
      else
        state
      end

    {:noreply, state}
  end

  defp schedule_bulk do
    Process.send_after(self(), :bulk, AmpsUtil.hinterval())
  end

  def handle_info(other, state) do
    require Logger
    IO.puts("handle info #(inspect(other)) #{inspect(state)}")

    Logger.error(
      "#{__MODULE__} for #{state.stream_name}.#{state.consumer_name} received unexpected message: #{inspect(other)}"
    )

    {:noreply, state}
  end

  def handle_call(parms, _from, state) do
    IO.puts("handler call called #{inspect(parms)}")
    {:reply, :ok, state}
  end

  def terminate(reason, state) do
    Gnat.unsub(:gnat, state.sid)
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
