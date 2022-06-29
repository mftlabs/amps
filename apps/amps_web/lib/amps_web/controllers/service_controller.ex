defmodule AmpsWeb.ServiceController do
  use AmpsWeb, :controller
  require Logger
  # import Argon2
  alias Amps.DB
  alias Amps.SvcManager
  alias AmpsWeb.Util

  plug(
    AmpsWeb.EnsureRolePlug,
    :Admin
    when action in [
           :start_service,
           :stop_service
         ]
  )

  def ping_service(conn, %{"name" => name}) do
    case SvcManager.service_active?(name) do
      nil ->
        json(conn, false)

      _pid ->
        json(conn, true)
    end
  end

  def skip(conn, %{"id" => id}) do
    env = conn.assigns().env
    do_skip(id, env)
    json(conn, :ok)
  end

  def skip(conn, %{"ids" => ids}) do
    env = conn.assigns().env

    Enum.each(ids, fn id ->
      do_skip(id, env)
    end)

    json(conn, :ok)
  end

  defp do_skip(id, env) do
    msg = DB.find_by_id(Util.index(env, "message_events"), id)

    {msg, sid} =
      AmpsEvents.start_session(
        msg,
        %{
          "service" => "UI Skip"
        },
        env
      )

    AmpsEvents.send(
      %{},
      %{"output" => "amps.events.svcs.handler.#{msg["subscriber"]}.skip.#{msg["msgid"]}"},
      %{},
      env
    )

    AmpsEvents.send_history(
      AmpsUtil.env_topic("amps.events.action", env),
      "message_events",
      msg,
      %{
        "status" => "skipping",
        "action" => "UI Skip"
      }
    )

    AmpsEvents.end_session(sid, env)
  end

  def handle_service(conn, %{"name" => name, "action" => action}) do
    env = conn.assigns().env

    topic =
      if env == "" do
        "amps.events.svcs.handler.#{name}.#{action}"
      else
        "amps.#{env}.events.svcs.handler.#{name}.#{action}"
      end

    IO.inspect(topic)

    Gnat.pub(:gnat, topic, "")

    user = Pow.Plug.current_user(conn)

    AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
      "user" => user.firstname <> " " <> user.lastname,
      "entity" => "services",
      "action" => action,
      "params" => %{
        "name" => name
      }
    })

    json(conn, :ok)
  end
end
