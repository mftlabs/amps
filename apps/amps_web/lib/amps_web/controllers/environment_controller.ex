defmodule AmpsWeb.EnvironmentController do
  use AmpsWeb, :controller
  require Logger
  import Argon2
  alias Amps.DB
  alias Amps.SvcManager

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

  def handle_env(conn, %{"name" => name, "action" => action}) do
    topic = "amps.events.env.handler.#{name}.#{action}"

    IO.inspect(topic)

    Gnat.pub(:gnat, topic, "")

    user = Pow.Plug.current_user(conn)

    AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
      "user" => user.firstname <> " " <> user.lastname,
      "entity" => "environments",
      "action" => action,
      "params" => %{
        "name" => name
      }
    })

    json(conn, :ok)
  end
end
