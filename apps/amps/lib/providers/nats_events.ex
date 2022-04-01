defmodule AmpsEvents do
  require Logger

  def send(msg, parms, state) do
    IO.puts("send parms #{inspect(msg)}   #{inspect(parms)}   #{inspect(state)}")

    topic = parms["output"]

    msg = Map.merge(msg, %{"etime" => AmpsUtil.gettime(), "topic" => topic})

    if not AmpsUtil.blank?(topic) do
      data = %{msg: msg, state: state}

      Gnat.pub(:gnat, topic, Poison.encode!(data))
      # send_history("amps.events.messages", "messages", msg)
    else
      topic = "amps.action.error"
      newstate = Map.put(state, :error, "output topic missing in action")
      data = %{msg: msg, state: newstate}

      Gnat.pub(:gnat, topic, Poison.encode!(data))
    end
  end

  def send_history(topic, index, msg, app \\ %{}) do
    app = Map.merge(app, %{"index" => index, "etime" => AmpsUtil.gettime()})
    data = Map.merge(msg, app)
    Logger.debug("post event #{topic}   #{inspect(data)}")
    Gnat.pub(:gnat, topic, Poison.encode!(data))
  end

  defp send_event(topic, data) do
    Gnat.pub(:gnat, topic, Poison.encode!(data))
  end

  def message(msg) do
    IO.puts("event: message - #{inspect(msg)}")
    send_event("amps.events.message", Poison.encode!(msg))
  end

  def session_start(session) do
    data =
      Map.merge(session, %{
        "status" => "started",
        "stime" => AmpsUtil.gettime()
      })

    IO.puts("event: session start #{inspect(data)}")
    send_event("amps.events.session", Poison.encode!(data))
  end

  def session_end(session, status, text \\ "") do
    IO.puts("event: session end / #{status} #{text}")

    data =
      Map.merge(session, %{
        "status" => "started",
        "reason" => text,
        "stime" => AmpsUtil.gettime()
      })

    send_event("amps.events.session", Poison.encode!(data))
  end

  def session_info(source, session_id, session) do
    data =
      Map.merge(session, %{
        "session" => session_id,
        "source" => source,
        "status" => "info",
        "time" => AmpsUtil.gettime()
      })

    IO.puts("session info event: #{inspect(data)}")
    send_event("amps.events.session_info", Poison.encode!(data))
  end

  def session_debug(source, session_id, session) do
    data =
      Map.merge(session, %{
        "session" => session_id,
        "source" => source,
        "status" => "debug",
        "time" => AmpsUtil.gettime()
      })

    IO.puts("event: #{inspect(data)}")
  end

  def session_warning(source, session_id, session) do
    data =
      Map.merge(session, %{
        "session" => session_id,
        "source" => source,
        "status" => "warning",
        "time" => AmpsUtil.gettime()
      })

    IO.puts("event: #{inspect(data)}")
  end
end
