defmodule Amps.HistoryConsumer do
  use GenServer
  require Logger

  # alias Jetstream.API.{Consumer, Stream}

  def start_link(args) do
    parms = Enum.into(args, %{})
    IO.puts("starting event listener #{inspect(parms)}")
    name = parms[:name]
    IO.puts("first name #{inspect(name)}")
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
    AmpsUtil.create_consumer(stream, consumer, opts["topic"], %{deliver_policy: :all})

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

  def handle_info({val, _opts}, _state) do
    IO.puts("got event #{inspect(val)}")
  end
end

defmodule Amps.HistoryPullConsumer do
  use GenServer
  require Logger

  def init(%{
        parms: parms,
        connection_pid: connection_pid,
        stream_name: stream_name,
        consumer_name: consumer_name
      }) do
    Process.link(connection_pid)
    listening_topic = "_CON.#{nuid()}"
    IO.puts("handle init #{inspect(connection_pid)}")
    group = String.replace(parms["name"], " ", "_")
    IO.puts("history group #{group} #{stream_name}  #{consumer_name}")

    {:ok, _sid} = Gnat.sub(connection_pid, self(), listening_topic, queue_group: group)

    :ok =
      Gnat.pub(connection_pid, "$JS.API.CONSUMER.MSG.NEXT.#{stream_name}.#{consumer_name}", "1",
        reply_to: listening_topic
      )

    state = %{
      parms: parms,
      stream_name: stream_name,
      consumer_name: consumer_name,
      listening_topic: listening_topic
    }

    {:ok, state}
  end

  def handle_info({:msg, message}, state) do
    IO.inspect(message)
    parms = state[:parms]
    name = parms["name"]
    Logger.info("got history message #{name}: #{message.topic} / #{message.body}")
    data = Poison.decode!(message.body)
    Mongo.insert_one!(:mongo, data["index"], data)
    Jetstream.ack_next(message, state.listening_topic)
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

  def handle_call(parms, _from, state) do
    IO.puts("handler call called #{inspect(parms)}")
    {:reply, :ok, state}
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
