defmodule Amps.EventConsumer do
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
    consumer = parms["name"] |> String.replace(" ", "_") |> String.downcase()

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
    Logger.info("got stream #{stream} #{consumer}")
    opts = Map.put(opts, "id", name)

    GenServer.start_link(
      Amps.PullConsumer,
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

  #  def handle_call({:send, qname, data}, _from, state) do
  #    pid = state[:cpid]
  #    IO.puts("subject: #{inspect(qname)}")
  #    {:ok, pid} = Gnat.start_link()
  #    Gnat.pub(pid, qname, data)
  #    {:reply, :ok, state}
  #  end

  # client code

  #  def send(qname, data) do
  #    {:ok, pid} = Gnat.start_link()
  #    Gnat.pub(pid, qname, data)
  #    #   GenServer.call(:evtest1, {:send, qname, data})
  #  end
end

defmodule Amps.PullConsumer do
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
    IO.puts("group #{group}")
    consumer_name = get_consumer(parms, consumer_name)

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

  def get_consumer(parms, name) do
    action_id = parms["handler"]
    aparms = AmpsDatabase.get_action_parms(action_id)
    type = aparms["type"]

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

  def handle_info({:msg, message}, state) do
    parms = state[:parms]
    name = parms["name"]
    id = parms["id"]
    Logger.info("got message #{id} #{name}: #{message.topic} / #{message.body}")

    case get_data(message.body) do
      {:error, _error} ->
        IO.puts("ack next message after data error")
        Jetstream.ack_next(message, state.listening_topic)
        {:noreply, state}

      data ->
        try do
          msg = data["msg"]
          mctx = data["state"]
          action_id = parms["handler"]
          actparms = AmpsDatabase.get_action_parms(action_id)

          AmpsEvents.send_history("amps.events.action", "message_events", msg, %{
            "status" => "started",
            "action" => actparms["name"]
          })

          IO.puts("action parms #{inspect(actparms)}")
          handler = AmpsUtil.get_env_parm(:actions, String.to_atom(actparms["type"]))
          IO.puts("opts after lookup #{inspect(actparms)}")

          case handler.run(msg, actparms, mctx) do
            aparms ->
              Logger.info("action done #{inspect(aparms)}")
              IO.puts("ack next message")

              AmpsEvents.send_history("amps.events.action", "message_events", msg, %{
                "status" => "completed",
                "action" => actparms["name"]
              })
          end
        rescue
          error ->
            msg = Jason.decode!(message.body)["msg"]

            msg =
              if is_map(msg) do
                msg
              else
                %{}
              end

            mctx = data["state"]
            action_id = parms["handler"]
            actparms = AmpsDatabase.get_action_parms(action_id)
            IO.puts("ack next message after action error")
            Logger.warning("action failed #{inspect(error)}")
            Logger.error(Exception.format_stacktrace())

            AmpsEvents.send_history(
              "amps.events.action",
              "message_events",
              msg,
              %{
                status: "failed",
                action: actparms["name"],
                reason: inspect(error)
              }
            )
        end

        Jetstream.ack_next(message, state.listening_topic)
        {:noreply, state}
    end
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
