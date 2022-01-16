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
        qp = conn.query_params

        qp = Map.put(qp, "filter", %{"recipient" => user.username})
        IO.inspect(qp)
        conn = Map.put(conn, :query_params, qp)

        data = DB.get_rows(conn, %{"collection" => "mailbox"})

        json(
          conn,
          data
        )
    end
  end

  def get_message(conn, %{"msgid" => msgid}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        case DB.find_one("mailbox", %{"recipient" => user.username, "msgid" => msgid}) do
          nil ->
            send_resp(conn, 404, "Not found")

          msg ->
            if msg["data"] do
              send_download(conn, {:binary, msg["data"]},
                disposition: :attachment,
                filename: msg["fname"]
              )
            else
              # if msg["temp"] do
              send_download(conn, {:file, msg["fpath"]}, disposition: :attachment)
              # else
              #   root = AmpsUtil.get_env(:storage_root)

              #   send_download(conn, {:file, Path.join(root, msg["fpath"])},
              #     disposition: :attachment
              #   )
              # end
            end
        end
    end
  end
end
