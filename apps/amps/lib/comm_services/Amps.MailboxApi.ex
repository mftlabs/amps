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
    put_private(conn, :env, opts.env)
    |> put_private(:opts, opts.opts)
    |> super(opts)
  end

  get "/mailbox/:user" do
    case myauth(conn, user) do
      {:ok, _} ->
        result = AmpsMailbox.get_mailboxes(user, conn.private.env)
        # list successful (200 ok)
        send_resp(conn, 200, Poison.encode!(result))

      {:error, reason} ->
        # auth failure (401 unauthorized)
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  get "/mailbox/:user/:mailbox" do
    # IO.inspect(opts)
    case myauth(conn, user, mailbox) do
      {:ok, _} ->
        limit = conn.query_params()["limit"]

        limit =
          if limit do
            try do
              String.to_integer(limit)
            rescue
              _ ->
                {:error,
                 "Invalid parameter: \"limit\" must be textual representation of an integer."}
            end
          else
            100
          end

        case limit do
          {:error, e} ->
            send_resp(conn, 400, e)

          limit ->
            result = AmpsMailbox.list_messages(user, mailbox, limit, conn.private.env)
            count = Enum.count(result)
            # list successful (200 ok)
            send_resp(conn, 200, Poison.encode!(%{count: count, messages: result}))
        end

      {:error, reason} ->
        # auth failure (401 unauthorized)
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  post "/mailbox/:user/:mailbox" do
    IO.inspect(conn)

    IO.puts("opts: #{inspect(opts)}")
    msgid = AmpsUtil.get_id()
    stime = AmpsUtil.gettime()
    temp_file = AmpsUtil.tempdir() <> "/" <> msgid
    IO.puts("temp: #{temp_file}")

    IO.inspect(conn)
    IO.inspect(conn.body_params())

    case myauth(conn, user, mailbox) do
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
            {msg, sid} =
              AmpsEvents.start_session(
                msg,
                %{"service" => conn.private.opts["name"]},
                conn.private.env
              )

            msg = Map.put(msg, "header", "")
            #            :file.delete(temp_file)
            #            Amps.MqService.send("registerq", msg)
            msg = Map.put(msg, "mailbox", mailbox)

            topic =
              AmpsUtil.env_topic(
                "amps.svcs.#{conn.private.opts["name"]}.#{user}",
                conn.private.env
              )

            mailboxtopic = AmpsUtil.env_topic("amps.mailbox.#{user}.#{mailbox}", conn.private.env)

            svced = AmpsEvents.send(msg, %{"output" => topic}, %{}, conn.private.env)
            mailboxed = AmpsEvents.send(msg, %{"output" => mailboxtopic}, %{}, conn.private.env)

            case {svced, mailboxed} do
              {:ok, :ok} ->
                # AmpsQueue.commitTx()
                # register normal completion (201 created)
                AmpsEvents.end_session(sid, conn.private.env)

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

  get "/mailbox/:user/:mailbox/message/:msgid" do
    case myauth(conn, user, mailbox) do
      {:ok, _} ->
        case AmpsMailbox.get_message(user, mailbox, msgid, conn.private.env) do
          nil ->
            send_resp(conn, 404, Poison.encode!(%{error: "Message Not Found"}))

          msg ->
            stream = AmpsUtil.stream(msg, conn.private.env)

            conn =
              conn
              |> put_resp_header(
                "content-disposition",
                "attachment; filename=\"#{msg["fname"] || "download"}\""
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
        end

      {:error, reason} ->
        # auth failure (401 unauthorized)
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  delete "/mailbox/:user/:mailbox/message/:msgid" do
    case myauth(conn, user, mailbox) do
      {:ok, _} ->
        AmpsMailbox.delete_message(user, mailbox, msgid, conn.private.env)
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
        "ftime" => AmpsUtil.gettime(),
        "service" => conn.private.opts["name"]
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

    case conn.body_params() do
      %Plug.Conn.Unfetched{aspect: :body_params} ->
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

      res ->
        {_key, %Plug.Upload{path: path}} = Enum.at(res, 0)
        :file.copy(path, f)
        :file.close(f)
        {:ok, conn}
    end
  end

  defp myauth(conn, username, mailbox \\ nil) do
    case Plug.BasicAuth.parse_basic_auth(conn) do
      {id, secret} ->
        case AmpsPortal.Util.verify_token(id, secret, conn.private.env) do
          nil ->
            {:error, "Access Denied"}

          user ->
            if username == user["username"] do
              if mailbox do
                mailbox =
                  Enum.find(user["mailboxes"], nil, fn mb ->
                    IO.inspect(mailbox)
                    mb["name"] == mailbox
                  end)

                case mailbox do
                  nil ->
                    {:error, "Mailbox does not exist"}

                  mailbox ->
                    {:ok, user["username"]}
                end
              else
                {:ok, user["username"]}
              end
            else
              {:error, "Forbidden"}
            end
        end

      :error ->
        {:error, "Authorization denied - invalid HTTP auth header"}
    end
  end
end
