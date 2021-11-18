defmodule AmpsPortal.DataController do
  use AmpsPortal, :controller
  import Argon2
  alias AmpsWeb.DB

  def get_messages(conn, _params) do
    # if vault_collection(collection) do
    #   data = VaultData.get_rows("amps/" <> collection)
    #   IO.inspect(data)

    #   json(
    #     conn,
    #     data
    #   )
    # else
    case Pow.Plug.current_user(conn) do
      nil ->
        json(
          conn,
          %{success: false, count: 0, rows: []}
        )

      user ->
        data = DB.find("mailbox", %{"recipient" => user.username})
        count = Enum.count(data)

        json(
          conn,
          %{success: true, count: count, rows: data}
        )
    end
  end

  def get_message(conn, %{"msgid" => msgid}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        case DB.find_one("mailbox", %{"recipient" => user.username, "msgid" => msgid}) do
          msg ->
            send_download(conn, {:file, msg["fpath"]}, disposition: :attachment)

          nil ->
            send_resp(conn, 404, "Not found")
        end
    end
  end
end
