defmodule AmpsEvents do
  require Logger
  alias Amps.DB

  def send(msg, parms, state, env \\ "") do
    Logger.debug("Sending to #{parms["output"]}")
    # Logger.debug(msg)
    # Logger.debug(parms)
    # Logger.debug(state)

    output = parms["output"]

    if is_list(output) do
      Enum.each(output, fn topic ->
        do_send(msg, parms, state, topic, env)
      end)
    else
      do_send(msg, parms, state, output, env)
    end
  end

  def do_send(msg, parms, state, topic, env) do
    msg = Map.merge(msg, %{"etime" => AmpsUtil.gettime(), "topic" => topic})

    if not AmpsUtil.blank?(topic) do
      data =
        if state["return"] do
          contextid = AmpsUtil.get_id()

          subs =
            DB.find(AmpsUtil.index(env, "services"), %{
              "type" => "subscriber",
              "active" => true,
              "topic" => topic
            })

          Enum.each(subs, fn sub ->
            Amps.AsyncResponder.register_message(state["return"], contextid <> sub["name"])
          end)

          %{msg: msg, state: Map.merge(state, %{"contextid" => contextid})}
        else
          %{msg: msg, state: state}
        end

      topic = AmpsUtil.env_topic(topic, env)
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
    Gnat.pub(:gnat, topic, Poison.encode!(%{"msg" => data}))
  end

  def send_history_update(topic, index, msg, clauses, env \\ "") do
    Logger.debug("post update event #{topic} msg: #{inspect(msg)} clauses: #{inspect(clauses)}")

    topic = AmpsUtil.env_topic(topic, env)

    Gnat.pub(
      :gnat,
      topic,
      Poison.encode!(%{
        "msg" => Map.merge(msg, %{"index" => index}),
        "op" => "update",
        "clauses" => clauses
      })
    )
  end

  defp send_event(topic, data) do
    Gnat.pub(:gnat, topic, Poison.encode!(data))
  end

  def message(msg) do
    IO.puts("event: message - #{inspect(msg)}")
    send_event("amps.events.message", Poison.encode!(msg))
  end

  def start_session(msg, session, env) do
    sid = AmpsUtil.get_id()
    # Process.register(self, String.to_atom(sid))
    Logger.metadata(sid: sid)
    time = AmpsUtil.gettime()

    session =
      if Map.has_key?(session, "status") do
        session
      else
        Map.put(session, "status", "started")
      end

    session =
      Map.merge(session, %{
        "sid" => sid,
        "msgid" => msg["msgid"],
        "start" => time,
        "stime" => time,
        "index" => "sessions"
      })

    Gnat.pub(
      :gnat,
      AmpsUtil.env_topic("amps.events.sessions", env),
      Poison.encode!(%{"msg" => session})
    )

    msg =
      Map.merge(msg, %{
        "sid" => sid
      })

    {msg, sid}
  end

  def update_session(sid, env, status) do
    clauses = %{"sid" => sid}

    msg = %{
      "status" => status,
      "stime" => AmpsUtil.gettime()
    }

    send_history_update(
      "amps.events.sessions",
      "sessions",
      msg,
      clauses,
      env
    )
  end

  def end_session(sid, env, status \\ "completed") do
    time = AmpsUtil.gettime()

    clauses = %{"sid" => sid}

    msg = %{
      "end" => time,
      "stime" => time,
      "status" => status
    }

    send_history_update(
      "amps.events.sessions",
      "sessions",
      msg,
      clauses,
      env
    )

    Logger.metadata(sid: nil)
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
