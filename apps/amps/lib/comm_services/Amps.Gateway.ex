defmodule Amps.Gateway do
  import Plug.Conn
  alias Amps.DB
  use Plug.Router
  require Logger
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
    opts = Keyword.get(options, :opts, [])

    router = %{
      "GET" => [],
      "POST" => [],
      "PUT" => [],
      "DELETE" => []
    }

    routes = opts["router"]

    router =
      Enum.reduce(routes, router, fn route, acc ->
        Map.put(acc, route["method"], [route | acc[route["method"]]])
      end)

    opts = Map.put(opts, "router", router)

    env = Keyword.get(options, :env, "")
    %{env: env, opts: opts}
    #    Map.put(options, "test", "test")
  end

  def call(conn, opts) do
    put_private(conn, :env, opts.env)
    |> put_private(:opts, opts.opts)
    |> super(opts)
  end

  def get_route(conn, opts) do
    Enum.reduce_while(opts["router"][conn.method], nil, fn route, acc ->
      case parse_route(Path.split(route["path"]), Path.split(conn.request_path), %{}) do
        nil ->
          {:cont, acc}

        parms ->
          {:halt, {put_private(conn, :path_params, parms), route}}
      end
    end)
  end

  def parse_route([], [], parms) do
    parms
  end

  def parse_route([], [_ | _], _) do
    nil
  end

  def parse_route([_ | _], [], _) do
    nil
  end

  def parse_route([ph | pt], [rh | rt], parms) do
    case String.split(ph, ":") do
      [ph] ->
        case String.split(ph, "*") do
          [ph] ->
            if ph == rh do
              parse_route(pt, rt, parms)
            else
              nil
            end

          ["", parm] ->
            Map.put(parms, parm, [rh] ++ rt)

          [piece, parm] ->
            case Regex.run(~r/#{piece}(.*$)/, Path.join([rh] ++ rt), capture: :first) do
              [path] ->
                Map.put(parms, parm, Path.split(path))

              nil ->
                nil
            end
        end

      ["", parm] ->
        parse_route(pt, rt, Map.put(parms, parm, rh))

      [piece, parm] ->
        [path] = Regex.run(~r/#{piece}(.*$)/, rh, capture: :all_but_first)
        parse_route(pt, rt, Map.put(parms, parm, path))
    end
  end

  defp get_header_metadata(conn, msg) do
    Enum.filter(conn.req_headers, fn x ->
      String.starts_with?(elem(x, 0), "amps_")
    end)
    |> Enum.map(fn {x, y} ->
      key = String.replace(x, "amps_", "")
      {key, y}
    end)
    |> Enum.into(msg)
  end

  defp get_body_metadata(conn, msgid, stime, temp) do
    size =
      Enum.find(conn.req_headers, -1, fn x ->
        String.starts_with?(elem(x, 0), "content-length")
      end)

    nmsg = %{
      "msgid" => msgid,
      "fpath" => temp,
      "temp" => "true",
      "stime" => stime,
      "fsize" => elem(size, 1),
      "ftime" => AmpsUtil.gettime()
    }

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

  match _ do
    case myauth(conn) do
      {:ok, user} ->
        case get_route(conn, conn.private.opts) do
          nil ->
            send_resp(conn, 404, "HTTP request not supported")

          {conn, route} ->
            handle_route(conn, route, user)
        end

      {:error, reason} ->
        send_resp(conn, 401, Poison.encode!(%{error: reason}))
    end
  end

  def handle_route(conn, route, user) do
    msgid = AmpsUtil.get_id()
    stime = AmpsUtil.gettime()

    msg = %{
      "msgid" => msgid,
      "stime" => stime,
      "path_params" => conn.private.path_params,
      "service" => conn.private.opts["name"],
      "request_path" => conn.request_path,
      "route_path" => route["path"],
      "user" => user,
      "method" => conn.method
    }

    topic =
      AmpsUtil.env_topic(
        "amps.svcs.#{conn.private.opts["name"]}.#{conn.method}#{route["path"]}",
        conn.private.env
      )

    msg = get_header_metadata(conn, msg)

    if conn.method == "POST" || conn.method == "PUT" do
      temp_file = AmpsUtil.tempdir() <> "/" <> msgid

      msg =
        Map.merge(
          msg,
          get_body_metadata(conn, msgid, stime, temp_file)
        )

      AmpsEvents.send(
        msg,
        %{
          "output" => topic
        },
        %{}
      )

      case write_file(conn, temp_file) do
        {:error, reason} ->
          # cannot write temp file (500 internal service error)
          handle_error(conn, reason, msg)

        {:ok, conn} ->
          # temp file written okay

          do_action(msg, route, conn)
      end
    else
      AmpsEvents.send(
        msg,
        %{
          "output" => topic
        },
        %{}
      )

      do_action(msg, route, conn)
    end
  end

  def do_action(msg, route, conn) do
    actparms =
      DB.find_by_id(AmpsUtil.index(conn.private.env, "actions"), route["action"])
      |> AmpsUtil.convert_output(conn.private.env)

    if actparms do
      try do
        AmpsEvents.send_history(
          AmpsUtil.env_topic("amps.events.action", conn.private.env),
          "message_events",
          msg,
          %{
            "status" => "started"
          }
        )

        handler = AmpsUtil.get_env_parm(:actions, String.to_atom(actparms["type"]))

        case handler.run(msg, actparms, {%{}, conn.private.env}) do
          {:ok, res} ->
            AmpsEvents.send_history(
              AmpsUtil.env_topic("amps.events.action", conn.private.env),
              "message_events",
              msg,
              %{
                "status" => "completed",
                "action" => actparms["name"]
              }
            )

            IO.inspect(res)

            if Map.has_key?(res, "response") do
              response = res["response"]

              conn =
                if Map.has_key?(response, "headers") do
                  Enum.reduce(response["headers"], conn, fn {k, v}, conn ->
                    put_resp_header(conn, k, v)
                  end)
                else
                  conn
                end

              case response do
                %{"data" => data} ->
                  send_resp(conn, 200, Poison.encode!(data))

                %{"fpath" => fpath} ->
                  Plug.Conn.send_file(conn, 200, fpath)
              end
            else
              send_resp(conn, 200, Poison.encode!(%{"status" => "completed"}))
            end

          {:sent, topic} ->
            AmpsEvents.send_history(
              AmpsUtil.env_topic("amps.events.action", conn.private.env),
              "message_events",
              msg,
              %{
                "status" => "completed",
                "action" => actparms["name"]
              }
            )

            send_resp(conn, 200, "Sent to topic #{topic}")
        end
      rescue
        e ->
          handle_error(conn, e, msg)
      end
    else
      handle_error(conn, "Action not found", msg)
    end
  end

  def handle_error(conn, e, msg) do
    Logger.error(e)

    AmpsEvents.send_history(
      AmpsUtil.env_topic("amps.events.action", conn.private.env),
      "message_events",
      msg,
      %{
        status: "failed",
        reason: inspect(e)
      }
    )

    case e do
      %ErlangError{original: {:python, type, message, stacktrace}} ->
        send_resp(conn, 500, "#{type} #{message}")

      _ ->
        send_resp(conn, 500, Exception.message(e))
    end
  end

  defp myauth(conn) do
    case Plug.BasicAuth.parse_basic_auth(conn) do
      {id, secret} ->
        case AmpsPortal.Util.verify_token(id, secret, conn.private.env) do
          nil ->
            {:error, "Access Denied"}

          user ->
            {:ok, user}
        end

      :error ->
        {:error, "Authorization denied - invalid HTTP auth header"}
    end
  end
end
