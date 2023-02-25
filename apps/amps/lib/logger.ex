defmodule Amps.Logger do
  use GenServer
  @behaviour :gen_event

  defstruct level: nil,
            format: nil,
            messages: []

  @impl true
  def init(parms) do
    # config = Application.get_env(:logger, :console)
    config = Application.get_env(:amps, __MODULE__)

    level = Keyword.get(config, :level, :debug)
    IO.inspect(Keyword.get(config, :format))
    format = Logger.Formatter.compile(Keyword.get(config, :format))
    IO.inspect(format)

    state = %__MODULE__{level: level, format: format}

    schedule_bulk()
    # device = Keyword.get(config, :device, :user)

    {:ok, state}
  end

  @impl true
  def handle_call({:configure, options}, state) do
    {:ok, :ok, :ok}
  end

  @impl true
  def handle_event({level, gl, {Logger, msg, ts, md}}, state) do
    if not meet_level?(level, state.level) do
      {:ok, state}
    else
      if node(gl) == node() do
        application = Keyword.get(md, :application)
        sid = Keyword.get(md, :sid, "")

        meta = %{
          application: application,
          sid: sid
        }

        state =
          if application != :snap do
            {{yr, mth, day}, {hour, min, second, milli}} = ts
            date = Date.new!(yr, mth, day)
            time = Time.new!(hour, min, second, milli * 1000)
            etime = DateTime.new!(date, time) |> DateTime.to_iso8601()

            msg =
              state.format
              |> Logger.Formatter.format(level, msg, ts, [])
              |> IO.chardata_to_string()

            message =
              Amps.DB.bulk_insert(
                Map.merge(
                  meta,
                  %{
                    level: level,
                    node: node(),
                    message: msg,
                    etime: etime
                  }
                )
              )

            Map.put(state, :messages, [message | state.messages])
          else
            state
          end

        # IO.inspect(state.messages)
        {:ok, state}
      else
        {:ok, state}
      end
    end
  end

  def handle_info(:bulk, state) do
    schedule_bulk()

    state =
      if Application.fetch_env!(:amps_logger, :initialized) do
        if Enum.count(state.messages) > 0 do
          state.messages
          |> Amps.DB.bulk_perform("system_logs")

          Map.put(state, :messages, [])
        else
          state
        end
      else
        state
      end

    {:ok, state}
  end

  defp schedule_bulk do
    if Application.ensure_started(:amps) == :ok do
      Process.send_after(self(), :bulk, AmpsUtil.hinterval())
    else
      Process.send_after(self(), :bulk, 5000)
    end
  end

  def handle_info(other, state) do
    # IO.puts("handle info #(inspect(other)) #{inspect(state)}")

    {:ok, state}
  end

  def handle_event(:flush, state) do
    {:ok, flush(state)}
  end

  def handle_event(_, state) do
    {:ok, state}
  end

  def handle_info(_, state) do
    {:ok, state}
  end

  @impl true
  def code_change(_old_vsn, state, _extra) do
    {:ok, state}
  end

  @impl true
  def terminate(_reason, _state) do
    :ok
  end

  ## Helpers

  defp flush(state) do
    state
  end

  defp meet_level?(_lvl, nil), do: true

  defp meet_level?(lvl, min) do
    Logger.compare_levels(lvl, min) != :lt
  end
end
