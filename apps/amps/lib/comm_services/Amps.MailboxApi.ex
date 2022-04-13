defmodule Amps.MailboxApi do
  @moduledoc """
    AMF message processor
  """
  use Plug.Router
  #  use Plug.ErrorHandler
  plug(CORSPlug)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart],
    pass: ["*/*"],
    length: Amps.Defaults.get("max_upload", 15_000_000_000),
    json_decoder: Jason
  )

  plug(Plug.Logger, log: :debug)

  plug(:match)
  plug(:dispatch)

  def init(options) do
    opts = Keyword.get(options, :opts, %{})
    env = Keyword.get(options, :env, "")
    %{env: env, opts: opts}
    #    Map.put(options, "test", "test")
  end

  def call(conn, opts) do
    put_private(conn, :opts, opts)
    |> super(opts)
  end

  get "/mailbox/:mailbox/message/:msgid" do
    case myauth(conn, mailbox) do
      {:ok, _} ->
        case AmpsMailbox.get_message(mailbox, msgid) do
          nil ->
            send_resp(conn, 401, Poison.encode!(%{error: "message not found"}))

          msg ->
            path = AmpsUtil.get_env(:storage_root, "") <> "/" <> msg["fpath"]
            Plug.Conn.send_file(conn, 200, path)
        end

      {:error, reason} ->
        # auth failure (401 unauthorized)
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  get "/mailbox/:mailbox" do
    # IO.inspect(opts)

    case myauth(conn, mailbox) do
      {:ok, _} ->
        result = AmpsMailbox.list_messages(mailbox, 100)
        # list successful (200 ok)
        send_resp(conn, 200, Poison.encode!(result))

      {:error, reason} ->
        # auth failure (401 unauthorized)
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  post "/mailbox/:mailbox" do
    IO.inspect(conn)

    IO.puts("opts: #{inspect(opts)}")
    msgid = AmpsUtil.get_id()
    stime = AmpsUtil.gettime()
    temp_file = AmpsUtil.tempdir() <> "/" <> msgid
    IO.puts("temp: #{temp_file}")

    IO.inspect(conn)
    IO.inspect(conn.body_params())

    case myauth(conn, mailbox) do
      {:ok, user} ->
        msg = get_metadata(conn, user, msgid, stime, temp_file)

        case write_file(conn, temp_file) do
          {:error, reason} ->
            # cannot write temp file (500 internal service error)
            send_resp(
              conn,
              500,
              Poison.encode!(%{msgid: msgid, status: reason})
            )

          {:ok, _conn} ->
            # temp file written okay
            msg = Map.put(msg, "header", "")
            #            :file.delete(temp_file)
            #            Amps.MqService.send("registerq", msg)
            msg = Map.put(msg, "mailbox", mailbox)
            user = mailbox
            topic = "amps.svcs.#{conn.private.opts.opts["name"]}.#{user}"

            case AmpsEvents.send(
                   msg,
                   %{"output" => AmpsUtil.env_topic(topic, conn.private.opts.env)},
                   %{}
                 ) do
              :ok ->
                # AmpsQueue.commitTx()
                # register normal completion (201 created)
                send_resp(
                  conn,
                  201,
                  Poison.encode!(%{msgid: msgid, status: "accepted"})
                )

                #              :error ->
                # register reports failure (400 bad request)
                #                send_resp(conn, 400, Poison.encode!(%{msgid: msgid, status: "rejected"}))
            end
        end

      {:error, reason} ->
        # auth failure (401 unauthorized)
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  delete "/mailbox/:mailbox/message/:msgid" do
    case myauth(conn, mailbox) do
      {:ok, _} ->
        AmpsMailbox.delete_message(mailbox, msgid)
        # delete successful (200 ok)
        send_resp(conn, 200, Poison.encode!(%{msgid: msgid, status: "deleted"}))

      {:error, reason} ->
        # auth failure (401 unauthorized)
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  match _ do
    # uri not matched (404 not found)
    send_resp(conn, 404, "HTTP request not supported")
  end

  defp myauth(conn, mailbox) do
    case Plug.BasicAuth.parse_basic_auth(conn) do
      {user, cred} ->
        IO.inspect(user)
        IO.inspect(cred)

        case AmpsPortal.Util.verify_token(user, cred, conn.private.opts.env) do
          nil ->
            {:error, "Access to mailbox [#{mailbox}] denied to user [#{user}]"}

          user ->
            {:ok, mailbox}

          false ->
            nil
        end

      :error ->
        {:error, "Authorization denied - invalid HTTP auth header"}
    end
  end

  defp get_metadata(conn, user, msgid, stime, temp) do
    size =
      Enum.find(conn.req_headers, -1, fn x ->
        String.starts_with?(elem(x, 0), "content-length")
      end)

    IO.puts("size: #{inspect(size)}")

    msg =
      Enum.filter(conn.req_headers, fn x ->
        String.starts_with?(elem(x, 0), "amps_")
      end)
      |> Enum.map(fn {x, y} ->
        key = String.replace(x, "amps_", "")
        {key, y}
      end)
      |> Enum.into(%{})

    nmsg =
      :maps.merge(msg, %{
        "msgid" => msgid,
        "user" => user,
        "fpath" => temp,
        "temp" => "true",
        "stime" => stime,
        "fsize" => elem(size, 1),
        "ftime" => AmpsUtil.gettime()
      })

    if nmsg["fname"] == "" || nmsg["fname"] == nil do
      fname =
        if conn.body_params() != %Plug.Conn.Unfetched{aspect: :body_params} do
          if conn.body_params()["upload"] do
            if Map.has_key?(conn.body_params()["upload"], :filename) do
              conn.body_params()["upload"].filename
            end
          end
        else
          "message.dat"
        end

      if fname do
        Map.put(nmsg, "fname", fname)
      else
        nmsg
      end
    else
      nmsg
    end
  end

  defp write_file(conn, fpath) do
    # consider data pass-thru without using file
    case :file.open(fpath, [:write, :raw, :delayed_write]) do
      {:ok, file} ->
        read_body(conn, [length: 0, read_length: 16_640], file)

      #        read_body(conn, [], file)
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp read_body(conn, opts, f) do
    IO.inspect(conn)

    case Plug.Conn.read_body(conn, opts) do
      {:ok, binary, conn} ->
        :file.write(f, binary)
        :file.close(f)
        {:ok, conn}

      {:more, binary, conn} ->
        :file.write(f, binary)
        read_body(conn, opts, f)

      {:error, term} ->
        {:error, term}
    end
  end
end
