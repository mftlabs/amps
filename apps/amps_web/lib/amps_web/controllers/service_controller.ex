defmodule AmpsWeb.ServiceController do
  use AmpsWeb, :controller
  require Logger
  import Argon2
  alias AmpsWeb.DB
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
    IO.inspect(name)

    case SvcManager.service_active?(name) do
      nil ->
        json(conn, false)

      pid ->
        IO.inspect(pid)
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

    json(conn, resp)
  end

  def restart_service(svcname) do
  end

  def start_service(svcname) do
    # svc = String.to_atom(svcname)

    case SvcManager.start_service(svcname) do
      {:ok, res} ->
        res

      {:error, reason} ->
        reason
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
