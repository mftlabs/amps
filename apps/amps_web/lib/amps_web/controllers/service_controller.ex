defmodule AmpsWeb.ServiceController do
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

  def handle_service(conn, %{"name" => name, "action" => action}) do
    Gnat.pub(:gnat, "amps.events.svcs.handler.#{name}.#{action}", "")

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
