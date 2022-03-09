defmodule AmpsPortal.DataController do
  use AmpsPortal, :controller
  #import Argon2
  alias Amps.DB

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
        qp = conn.query_params()

        qp = Map.put(qp, "filters", Jason.encode!(%{"mailbox" => user.username}))
        IO.inspect(qp)
        conn = Map.put(conn, :query_params, qp)

        data = DB.get_rows(conn, %{"collection" => "mailbox"})

        json(
          conn,
          data
        )
    end
  end

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
        qp = conn.query_params()

        qp = Map.put(qp, "filters", Jason.encode!(%{"mailbox" => user.username}))
        IO.inspect(qp)
        conn = Map.put(conn, :query_params, qp)

        data = DB.get_rows(conn, %{"collection" => "mailbox"})

        json(
          conn,
          data
        )
    end
  end

  def duplicate(conn, _params) do
    body = conn.body_params()

    duplicate = DB.find_one("users", body) != nil

    json(conn, duplicate)
  end

  def get_mailbox_topics(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        json(
          conn,
          %{success: false, count: 0, rows: []}
        )

      user ->
        topics =
          DB.find("topics", %{
            "type" => "mailbox",
            "topic" => %{"$regex" => "amps.mailbox.#{user.username}.*"}
          })

        json(
          conn,
          topics
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

  def delete_message(conn, %{"msgid" => msgid}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        DB.delete_one("mailbox", %{"recipient" => user.username, "msgid" => msgid})
        json(conn, :ok)
    end
  end

  def ufa_logs(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        json(
          conn,
          %{success: false, count: 0, rows: []}
        )
      user ->
        qp = conn.query_params()
        IO.inspect(qp)
        conn = Map.put(conn, :query_params, qp)
        data = DB.get_rows(conn, %{"collection" => "ufa_logs"})

        json(
          conn,
          data
        )
    end
  end
end
