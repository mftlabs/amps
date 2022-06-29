defmodule Amps.HistoryHandler do
  use Supervisor
  require Logger

  def start_link(args, env \\ "") do
    IO.inspect(args)
    IO.inspect(env)
    GenServer.start_link(__MODULE__, {args, env})
  end

  def init({parms, env}) do
    count = parms["subs_count"]
    {stream, consumer} = AmpsUtil.get_names(parms, env)

    listening_topic = AmpsUtil.env_topic("amps.history.#{consumer}", env)

    group = String.replace(parms["name"], " ", "_")

    AmpsUtil.create_consumer(stream, consumer, AmpsUtil.env_topic(parms["topic"], env), %{
      deliver_policy: :new,
      deliver_subject: listening_topic,
      deliver_group: group,
      ack_policy: :all
    })

    children =
      Enum.reduce(1..count, [], fn x, acc ->
        name = String.to_atom(parms["name"] <> Integer.to_string(x))

        [{Amps.HistoryConsumer, name: name, parms: parms, env: env, handler: self()} | acc]
      end)

    # Now we start the supervisor with the children and a strategy
    {:ok, pid} = Supervisor.start_link(children, strategy: :one_for_one)

    # After started, we can query the supervisor for information

    {:ok, parms}
  end
end
