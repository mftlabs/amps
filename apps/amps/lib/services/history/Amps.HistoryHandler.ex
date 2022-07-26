defmodule Amps.HistoryHandler do
  use GenServer
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

    AmpsUtil.create_consumer(
      stream,
      consumer,
      AmpsUtil.env_topic(parms["topic"], env),
      %{
        deliver_policy: :new,
        deliver_subject: listening_topic,
        deliver_group: group,
        ack_policy: :all
      }
    )

    children =
      Enum.reduce(1..count, [], fn x, acc ->
        name = String.to_atom(parms["name"] <> Integer.to_string(x))

        [
          {Amps.HistoryConsumer, name: name, parms: parms, env: env, handler: self()}
          | acc
        ]
      end)

    # Now we start the supervisor with the children and a strategy
    {:ok, _pid} = Supervisor.start_link(children, strategy: :one_for_one)

    # After started, we can query the supervisor for information

    state = %{
      parms: parms,
      messages: []
    }

    schedule_bulk()

    {:ok, state}
  end

  def put_message(pid, message) do
    GenServer.cast(pid, {:message, message})
  end

  def handle_cast({:message, message}, state) do
    state = Map.put(state, :messages, [message | state.messages])
    {:noreply, state}
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
          if index == "sessions" do
            IO.inspect(ops)
          end

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

  defp handle_index(indexes, index, op) do
    if Map.has_key?(indexes, index) do
      Map.put(indexes, index, [op | indexes[index]])
    else
      Map.put(indexes, index, [op])
    end
  end
end
