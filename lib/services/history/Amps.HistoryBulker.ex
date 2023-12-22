defmodule Amps.HistoryBulker do
  use GenServer
  require Logger

  def start_link(args, env \\ "") do
    IO.inspect(args)
    IO.inspect(env)
    GenServer.start_link(__MODULE__, {args, env})
  end

  def init({parms, env}) do
    schedule_bulk()

    state = %{
      parms: parms
    }

    {:ok, state}
  end

  def handle_info(:bulk, state) do
    schedule_bulk()
    res = Amps.History.get(state.parms["name"])

    if res do
      %{"indexes" => indexes, "last_message" => last_message} = res

      if last_message do
        Enum.each(indexes, fn {index, ops} ->
          Amps.DB.bulk_perform(ops, index)
        end)

        # case res do
        #   :ok ->
        Logger.debug("Bulked #{state.parms["name"]}")
        Jetstream.ack(last_message)
        Amps.History.clear(state.parms["name"])
      end
    end

    # {:error, error} ->
    #   Logger.error("#{inspect(error)}")
    #   state
    # end

    {:noreply, state}
  end

  defp schedule_bulk do
    Process.send_after(self(), :bulk, AmpsUtil.hinterval())
  end
end
