defmodule Amps.EventHandler do
  use Supervisor
  require Logger

  def start_link(args) do
    args = Enum.into(args, %{})

    args =
      case args[:env] do
        nil ->
          Map.put(args, :env, "")

        _ ->
          args
      end

    GenServer.start_link(__MODULE__, args, name: args[:name])
  end

  def child_spec(opts) do
    IO.inspect("HANDLER OPTS")
    IO.inspect(opts)
    name = Atom.to_string(opts[:name]) <> "_hdlr"
    # IO.puts("name #{inspect(name)}")
    # Logger.info(opts[:name])

    %{
      id: String.to_atom(name),
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  def init(args) do
    IO.inspect(args)

    name = Process.info(self())[:registered_name]
    Amps.Handlers.put(args[:name])

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
          prev = config.delivered.stream_seq

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

    {:ok, %{parms: parms, messages: %{}, name: args[:name]}}
  end

  def register(pid, message, msgid) do
    GenServer.call(pid, {:register, {message, msgid}})
  end

  def skip(name, msgid) do
    Amps.Handlers.skip(name, msgid)
  end

  def process(pid, message, msgid) do
    GenServer.call(pid, {:process, message, msgid})
  end

  def stop_process(pid, message, msgid) do
    GenServer.call(pid, {:stop_process, message, msgid})
  end

  def is_registered(pid, msgid) do
    GenServer.call(pid, {:is_registered, msgid})
  end

  def attempts(pid, msgid) do
    GenServer.call(pid, {:attempts, msgid})
  end

  def add_attempt(pid, msgid) do
    GenServer.call(pid, {:add_attempt, msgid})
  end

  def deregister(pid, msgid) do
    GenServer.cast(pid, {:deregister, msgid})
  end

  def progress(pid, message, msgid, total \\ 0) do
    Process.sleep(5000)
    curr = total + 5000
    # fname = Jason.decode!(message.body)["msg"]["fname"]
    # IO.inspect("Progress for #{fname} #{curr}")

    in_progress = GenServer.call(pid, {:progress, message, msgid})

    if in_progress do
      acked = Jetstream.ack_progress(message)

      progress(pid, message, msgid, curr)
    end
  end

  def handle_call({:register, {message, msgid}}, _, state) do
    info = Amps.Handlers.is_registered(state.name, msgid)

    handler = self()

    info =
      case info do
        :new ->
          {:ok, progress} =
            Task.start(fn ->
              progress(handler, message, msgid)
            end)

          Amps.Handlers.register(state.name, message, msgid, progress)

        :skip ->
          :skip

        info ->
          {:ok, progress} =
            Task.start(fn ->
              progress(handler, message, msgid)
            end)

          Amps.Handlers.process(state.name, message, msgid, progress)
      end

    {:reply, info, state}
  end

  # def handle_call({:is_registered, msgid}, _, state) do
  #   {:reply, info, state}
  # end

  def handle_call({:progress, message, msgid}, _, state) do
    info = Amps.Handlers.progress(state.name, message, msgid)

    {:reply, info, state}
  end

  def handle_call({:process, message, msgid}, _, state) do
    handler = self()

    {:ok, progress} =
      Task.start(fn ->
        progress(handler, message, msgid)
      end)

    Amps.Handlers.process(state.name, message, msgid, progress)

    {:reply, :ok, state}
  end

  def handle_call({:stop_process, message, msgid}, _, state) do
    Amps.Handlers.stop_process(state.name, message, msgid)

    {:reply, :ok, state}
  end

  def handle_call({:add_attempt, msgid}, _, state) do
    new = Amps.Handlers.add_attempt(state.name, msgid)

    {:reply, new, state}
  end

  def handle_call({:attempts, msgid}, _, state) do
    attempts = Amps.Handlers.attempts(state.name, msgid)
    {:reply, attempts, state}
  end

  def handle_cast({:deregister, msgid}, state) do
    Amps.Handlers.deregister(state.name, msgid)
    {:noreply, state}
  end
end
