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

    children =
      Enum.reduce(1..count, [], fn x, acc ->
        name = String.to_atom(parms["name"] <> Integer.to_string(x))

        [{Amps.HistoryConsumer, name: name, parms: parms, env: env} | acc]
      end)

    # Now we start the supervisor with the children and a strategy
    {:ok, pid} = Supervisor.start_link(children, strategy: :one_for_one)

    # After started, we can query the supervisor for information

    {:ok, parms}
  end
end
