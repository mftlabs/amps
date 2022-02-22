defmodule AmpsWeb.ServiceController do
  use AmpsWeb, :controller
  require Logger
  #import Argon2
  #alias Amps.DB
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
    resp =
      case action do
        "start" ->
          start_service(name)

        "stop" ->
          stop_service(name)

        "restart" ->
          restart_service(name)
      end

    user = Pow.Plug.current_user(conn)

    AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
      "user" => user.firstname <> " " <> user.lastname,
      "entity" => "services",
      "action" => action,
      "params" => %{
        "name" => name
      }
    })

    json(conn, resp)
  end

  def restart_service(_svcname) do
  end

  def start_service(svcname) do
    # svc = String.to_atom(svcname)
    res = SvcManager.start_service(svcname)

    case res do
      {:ok, _res} ->
        %{
          "success" => true
        }

      {:error, reason} ->
        %{
          "success" => false,
          "reason" => reason
        }
    end
  end

  def stop_service(svcname) do
    case SvcManager.stop_service(svcname) do
      {:ok, res} ->
        res

      {:error, reason} ->
        reason
    end
  end
end
