defmodule Amps.EventHandler do
  use Supervisor
  require Logger

  def start_link(args) do
    IO.inspect(args)
    args = Enum.into(args, %{})

    args =
      case args[:env] do
        nil ->
          Map.put(args, :env, "")

        _ ->
          args
      end

    GenServer.start_link(__MODULE__, args)
  end

  def child_spec(opts) do
    IO.inspect("HANDLER OPTS")
    IO.inspect(opts)
    name = Atom.to_string(opts[:name]) <> "_mgr"
    # IO.puts("name #{inspect(name)}")

    %{
      id: String.to_atom(name),
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  def init(args) do
    IO.inspect(args)

    parms = args[:parms]
    IO.inspect(parms)
    env = args[:env]

    count = parms["subs_count"]

    {stream, consumer} = AmpsUtil.get_names(parms, env)
    IO.inspect(stream)
    IO.inspect(env)

    listening_topic = AmpsUtil.env_topic("amps.consumer.#{consumer}", env)

    IO.inspect(listening_topic)
    {:ok, sid} = Gnat.sub(:gnat, self(), listening_topic)
    IO.inspect(listening_topic)
    ack_wait = parms["ack_wait"] * 1_000_000_000

    case Jetstream.API.Consumer.info(:gnat, stream, consumer) do
      {:error, %{"code" => 404}} ->
        AmpsWeb.Util.create_config_consumer(parms, env, %{})

      {:ok, config} ->
        IO.inspect(config.config.max_ack_pending)
        IO.inspect(count)

        if config.config.max_ack_pending != count ||
             config.config.ack_wait != ack_wait do
          prev = config.delivered.stream_seq + 1

          AmpsUtil.delete_consumer(stream, consumer)

          AmpsWeb.Util.create_config_consumer(parms, env, %{
            deliver_policy: :by_start_sequence,
            opt_start_seq: prev
          })
        end
    end

    children =
      Enum.reduce(1..count, [], fn x, acc ->
        name = String.to_atom(env <> "-" <> parms["name"] <> Integer.to_string(x))

        [
          {Amps.EventWrapper, name: name, parms: parms, env: env, handler: self()}
          | acc
        ]
      end)

    # Now we start the supervisor with the children and a strategy
    {:ok, pid} = Supervisor.start_link(children, strategy: :one_for_one)

    # After started, we can query the supervisor for information

    {:ok, %{parms: parms, messages: %{}}}
  end

  def register(pid, message, msgid, sid) do
    GenServer.call(pid, {:register, {message, msgid, sid}})
  end

  def skip(pid, msgid) do
    GenServer.call(pid, {:skip, msgid})
  end

  def process(pid, message, msgid) do
    GenServer.call(pid, {:process, message, msgid})
  end

  def stop_process(pid, msgid) do
    GenServer.call(pid, {:stop_process, msgid})
  end

  def is_registered(pid, msgid) do
    GenServer.call(pid, {:is_registered, msgid})
  end

  def get_failures(pid, msgid) do
    GenServer.call(pid, {:failures, msgid})
  end

  def add_failure(pid, msgid) do
    GenServer.call(pid, {:add_fail, msgid})
  end

  def deregister(pid, msgid) do
    GenServer.cast(pid, {:deregister, msgid})
  end

  def progress(pid, message, msgid, total \\ 0) do
    Process.sleep(5000)
    curr = total + 5000
    # fname = Jason.decode!(message.body)["msg"]["fname"]
    # IO.inspect("Progress for #{fname} #{curr}")

    message = GenServer.call(pid, {:progress, msgid})

    if message do
      acked = Jetstream.ack_progress(message)

      progress(pid, message, msgid, curr)
    end
  end

  def handle_call({:register, {message, msgid, sid}}, _, state) do
    handler = self()

    {:ok, pid} =
      Task.start(fn ->
        progress(handler, message, msgid)
      end)

    {:reply, :ok,
     Map.put(
       state,
       :messages,
       Map.put(state.messages, msgid, %{
         sid: sid,
         failures: 0,
         processing: true,
         message: message,
         skip: false,
         progress: pid
       })
     )}
  end

  def handle_call({:is_registered, msgid}, _, state) do
    info =
      if Map.has_key?(state.messages, msgid) do
        if state.messages[msgid].skip do
          :skip
        else
          state.messages[msgid]
        end
      else
        :new
      end

    {:reply, info, state}
  end

  def handle_call({:progress, msgid}, _, state) do
    info =
      if Map.has_key?(state.messages, msgid) do
        if state.messages[msgid].processing do
          state.messages[msgid].message
        else
          false
        end
      else
        false
      end

    {:reply, info, state}
  end

  def handle_call({:process, message, msgid}, _, state) do
    handler = self()

    {:ok, pid} =
      Task.start(fn ->
        progress(handler, message, msgid)
      end)

    state =
      if Map.has_key?(state.messages, msgid) do
        state
        |> put_in([:messages, msgid, :processing], true)
        |> put_in([:messages, msgid, :message], message)
        |> put_in([:messages, msgid, :progress], pid)
      else
        state
      end

    {:reply, :ok, state}
  end

  def handle_call({:skip, msgid}, _, state) do
    state =
      if Map.has_key?(state.messages, msgid) do
        Process.exit(state.messages[msgid].progress, :shutdown)
        put_in(state, [:messages, msgid, :skip], true)
      else
        state
      end

    {:reply, :ok, state}
  end

  def handle_call({:stop_process, msgid}, _, state) do
    state =
      if Map.has_key?(state.messages, msgid) do
        Process.exit(state.messages[msgid].progress, :shutdown)
        put_in(state, [:messages, msgid, :processing], false)
      else
        state
      end

    {:reply, :ok, state}
  end

  def handle_call({:add_fail, msgid}, _, state) do
    new = state.messages[msgid].failures + 1
    message = Map.put(state.messages[msgid], :failures, new)
    messages = Map.put(state.messages, msgid, message)

    {:reply, new, Map.put(state, :messages, messages)}
  end

  def handle_call({:failures, msgid}, _, state) do
    {:reply, get_in(state.messages, [msgid, :failures]), state}
  end

  def handle_cast({:deregister, msgid}, state) do
    Process.exit(state.messages[msgid].progress, :shutdown)

    messages = Map.drop(state.messages, [msgid])
    {:noreply, Map.put(state, :messages, messages)}
  end
end
