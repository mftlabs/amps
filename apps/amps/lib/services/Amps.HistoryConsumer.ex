defmodule Amps.HistoryConsumer do
  use GenServer
  require Logger

  # alias Jetstream.API.{Consumer, Stream}

  def start_link(args) do
    parms = Enum.into(args, %{})
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

    {stream, consumer} = AmpsUtil.get_names(opts)

    listening_topic = "amps.history.#{consumer}"

    AmpsUtil.create_consumer(stream, consumer, opts["topic"], %{
      deliver_policy: :all,
      deliver_subject: listening_topic,
      ack_policy: :all
    })

    Gnat.sub(pid, self(), listening_topic)
    Logger.info("got stream #{stream} #{consumer}")
    opts = Map.put(opts, "id", name)

    GenServer.start_link(
      Amps.HistoryPullConsumer,
      %{
        parms: opts,
        connection_pid: pid,
        stream_name: stream,
        consumer_name: consumer
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
        consumer_name: consumer_name
      }) do
    # Process.link(connection_pid)
    listening_topic = "amps.history.#{consumer_name}"
    group = String.replace(parms["name"], " ", "_")
    Logger.info("History queue_group #{group} #{stream_name} #{consumer_name}")
    IO.inspect(listening_topic)

    {:ok, _sid} = Gnat.sub(connection_pid, self(), listening_topic, queue_group: group)

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
      index:
        if parms["receipt"] do
          parms["index"]
        else
          nil
        end
    }

    schedule_bulk()
    {:ok, state}
  end

  def handle_info({:msg, message}, state) do
    parms = state[:parms]
    name = parms["name"]

    Logger.debug("got history message #{name}: #{message.topic} / #{message.body}")

    data = Poison.decode!(message.body)

    message =
      if state.index do
        {%Snap.Bulk.Action.Create{
           _index: state.index,
           doc:
             Map.merge(data["msg"], %{
               "status" => "received"
             })
         }, message}
      else
        {%Snap.Bulk.Action.Create{
           _index: data["index"],
           doc: data
         }, message}
      end

    state = Map.put(state, :messages, [message | state.messages])

    {:noreply, state}
  end

  def handle_info(:bulk, state) do
    schedule_bulk()

    state =
      if Enum.count(state.messages) > 0 do
        Enum.reduce(state.messages, [], fn {action, _}, acc ->
          [action | acc]
        end)
        |> Snap.Bulk.perform(Amps.Cluster, nil, [])

        {_, msg} = Enum.at(state.messages, 0)
        Jetstream.ack(msg)
        Map.put(state, :messages, [])
      else
        state
      end

    {:noreply, state}
  end

  defp schedule_bulk do
    Process.send_after(self(), :bulk, Amps.Defaults.get("hinterval", 5_000))
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

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
