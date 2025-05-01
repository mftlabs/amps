defmodule AmpsPortal.DataController do
  use AmpsPortal, :controller
  # import Argon2
  alias Amps.DB
  alias AmpsPortal.Util

  def email(conn, _) do
    json(conn, Amps.Defaults.get("email"))
  end

  def get_mailboxes(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        user = DB.find_one(Util.conn_index(conn, "users"), %{"username" => user.username})
        json(conn, user["mailboxes"] || [])
    end
  end

  def get_messages(conn, %{"mailbox" => mailbox}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        json(
          conn,
          %{success: false, count: 0, rows: []}
        )

      user ->
        user = DB.find_one(Util.conn_index(conn, "users"), %{"username" => user.username})

        mailbox =
          Enum.find(user["mailboxes"], fn mb ->
            mb["name"] == mailbox
          end)

        case mailbox do
          nil ->
            send_resp(conn, 404, "Mailbox not found")

          mailbox ->
            qp = conn.query_params()

            qp =
              Util.create_filter(qp, %{
                "recipient" => user["username"],
                "mailbox" => mailbox["name"]
              })

            data = DB.get_rows(Util.conn_index(conn, "mailbox"), qp)

            json(
              conn,
              data
            )
        end
    end
  end

  def get_messages(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        json(
          conn,
          %{success: false, count: 0, rows: []}
        )

      user ->
        qp = conn.query_params()
        qp = Util.create_filter(qp, %{"recipient" => user.username})
        data = DB.get_rows(Util.conn_index(conn, "mailbox"), qp)

        json(
          conn,
          data
        )
    end
  end

  def duplicate(conn, _params) do
    body = conn.body_params()

    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        duplicate =
          DB.find_one(
            Util.conn_index(conn, "users"),
            Map.merge(body, %{"username" => user.username})
          ) != nil

        json(conn, duplicate)
    end
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
          DB.find(Util.conn_index(conn, "topics"), %{
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
        case DB.find_one(Util.conn_index(conn, "mailbox"), %{
               "recipient" => user.username,
               "msgid" => msgid
             }) do
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
              stream = AmpsUtil.stream(msg, conn.assigns.env)

              conn =
                conn
                |> put_resp_header(
                  "content-disposition",
                  "attachment; filename=\"#{msg["fname"] || msg["msgid"]}\""
                )
                |> send_chunked(200)

              Enum.reduce_while(stream, conn, fn chunk, conn ->
                case Plug.Conn.chunk(conn, chunk) do
                  {:ok, conn} ->
                    {:cont, conn}

                  {:error, :closed} ->
                    {:halt, conn}
                end
              end)

              # send_download(conn, {:file, msg["fpath"]}, disposition: :attachment)

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
        DB.delete_one(Util.conn_index(conn, "mailbox"), %{
          "recipient" => user.username,
          "msgid" => msgid
        })

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
        qp = Util.create_filter(qp, %{"user" => user.username})
        data = DB.get_rows(Util.conn_index(conn, "ufa_logs"), qp)

        json(
          conn,
          data
        )
    end
  end
end
