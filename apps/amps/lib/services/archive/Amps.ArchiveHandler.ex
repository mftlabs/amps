# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.ArchiveHandler do
  use Supervisor
  require Logger

  def start_link(args, env \\ "") do
    IO.inspect(args)
    IO.inspect(env)
    GenServer.start_link(__MODULE__, {args, env})
  end

  def init({parms, env}) do
    Logger.info("Archive Handler for #{env}")
    count = parms["subs_count"]

    {stream, consumer} = AmpsUtil.get_names(parms, env)

    listening_topic = AmpsUtil.env_topic("amps.archive.#{consumer}", env)

    IO.inspect(listening_topic)
    group = String.replace(parms["name"], " ", "_")

    AmpsUtil.create_consumer(stream, consumer, AmpsUtil.env_topic(parms["topic"], env), %{
      deliver_policy: :all,
      deliver_subject: listening_topic,
      ack_policy: :explicit,
      deliver_group: group
    })

    children =
      Enum.reduce(1..count, [], fn x, acc ->
        name = String.to_atom(parms["name"] <> Integer.to_string(x))

        [{Amps.ArchiveConsumer, name: name, parms: parms, env: env, handler: self()} | acc]
      end)

    # Now we start the supervisor with the children and a strategy
    {:ok, _pid} = Supervisor.start_link(children, strategy: :one_for_one)

    # After started, we can query the supervisor for information
    Supervisor.init(children, strategy: :one_for_one)
    #{:ok, %{parms: parms, failures: 0}}
  end

  def get_failures(pid) do
    GenServer.call(pid, :failures)
  end

  def add_failure(pid) do
    GenServer.call(pid, :add_fail)
  end

  def reset_failure(pid) do
    GenServer.cast(pid, :reset_failure)
  end

  def handle_call(:add_fail, _, state) do
    {:reply, state.failures + 1, Map.put(state, :failures, state.failures + 1)}
  end

  def handle_call(:failures, _, state) do
    {:reply, state.failures, state}
  end

  def handle_cast(:reset_failure, state) do
    {:noreply, Map.put(state, :failures, 0)}
  end
end
