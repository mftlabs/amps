defmodule AmpsPortal.MailboxController do
  use AmpsPortal, :controller
  # import Argon2
  alias Amps.DB
  alias AmpsPortal.Util

  def index(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        user = DB.find_one(Util.conn_index(conn, "users"), %{"username" => user.username})
        json(conn, user["mailboxes"] || [])
    end
  end

  def create(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        body = conn.body_params()
        result = DB.add_to_field(Util.conn_index(conn, "users"), body, user.id, "mailboxes")
        json(conn, :ok)
    end
  end
end
