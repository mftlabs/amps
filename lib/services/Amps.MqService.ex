defmodule Amps.MqService do
  use GenServer
  require Logger

  def start_link(args) do
    parms = Enum.into(args, %{})
    Logger.info("starting queue listener #{inspect(parms)}")
    #    parms = parms[:parms] || %{}
    Logger.info("first name #{inspect(parms[:name])}")
    GenServer.start_link(__MODULE__, parms, name: parms[:name])
  end

  def init(opts) do
    Process.send_after(self(), {:perform, opts[:parms]}, 10_000)
    # Process.send_after(self(), {:monitor, opts[:parms]}, 60_000)
    {:ok, %{}}
  end

  def child_spec(opts) do
    name = opts[:name]
    Logger.info("name #{inspect(name)}")

    %{
      id: name,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  # GenServer callbacks
  def handle_info({:perform, opts}, state) do
    #    Logger.info("perform called")
    process_message(opts)
    Process.send_after(self(), {:perform, opts}, 500)
    {:noreply, state}
  end

  def handle_info({:monitor, opts}, state) do
    Logger.info("monitor called")
    Process.send_after(self(), {:monitor, opts}, 60_000)
    {:noreply, state}
  end

  def handle_call({:send, qname, msg}, _from, state) do
    AmpsQueue.enqueue(qname, msg)
    {:reply, :ok, state}
  end

  def handle_call({:sendtx, qname, msg}, _from, state) do
    ctx = state[:context] || %{}
    nctx = AmpsQueue.enqueueTx(ctx, qname, msg)
    nstate = Map.put(state, :context, nctx)
    {:reply, :ok, nstate}
  end

  def handle_call({:committx}, _from, state) do
    ctx = state[:context] || %{}
    nctx = AmpsQueue.commit(ctx)
    nstate = Map.put(state, :context, nctx)
    {:reply, :ok, nstate}
  end

  def handle_call({:rollbacktx}, _from, state) do
    ctx = state[:context] || %{}
    nctx = AmpsQueue.rollback(ctx)
    nstate = Map.put(state, :context, nctx)
    {:reply, :ok, nstate}
  end

  def handle_call({:commit, msg}, _from, state) do
    AmpsQueue.commit(msg)
    {:reply, :ok, state}
  end

  def handle_call({:rollback, msg}, _from, state) do
    AmpsQueue.rollback(msg)
    {:reply, :ok, state}
  end

  # work on error handling
  def process_message(opts) do
    qname = opts["input_queue"]

    # currently testing without the transaction support
    #    case AmpsQueue.dequeueTx(qname) do
    case AmpsQueue.dequeue(qname) do
      nil ->
        # Logger.info "nothing found"
        :ok

      #        {msg, state} ->
      {:error, reason} ->
        {:error, reason}

      {:ok, msg} ->
        try do
          handler = opts["handler"]
          Logger.info("calling handler [#{handler}]")
          apply(String.to_atom("Elixir." <> handler), :run, [msg, opts, %{}])
          AmpsQueue.commit(msg)
        rescue
          error ->
            Logger.warning("got error #{inspect(error)}")
            Logger.warning("queue handler failed #{inspect(__STACKTRACE__)}")
            # use system property here
            :timer.sleep(10_000)
            Logger.info("rolling back message")
            AmpsQueue.rollback(msg)
        end
    end
  end

  # client code

  #  def send_tx(ctx, qname, msg) do
  #    pid = ctx[:pid]
  #    GenServer.call(pid, {:send, qname, msg})
  #  end

  #  def commit_tx(ctx, qname, msg) do
  #    pid = ctx[:pid]
  #    GenServer.call(pid, {:commit, qname, msg})
  #  end

  #  def rollback_tx(ctx, qname, msg) do
  #    pid = ctx[:pid]
  #    GenServer.call(pid, {:rollback, qname, msg})
  #  end

  # def send(qname, msg) do
  #  AmpsQueue.enqueue(qname, msg)
  # end

  #  def commit(msg) do
  #    pid = ctx[:pid]
  #    GenServer.call(pid, {:commit, qname, msg})
  #  end

  #  def rollback_tx(ctx, qname, msg) do
  #    pid = ctx[:pid]
  #    GenServer.call(pid, {:rollback, qname, msg})
  #  end
end
