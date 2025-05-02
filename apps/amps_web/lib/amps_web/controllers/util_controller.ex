defmodule AmpsWeb.UtilController do
  use AmpsWeb, :controller
  require Logger
  import Argon2
  alias Amps.DB
  # alias AmpsWeb.Encryption
  # alias Amps.SvcManager
  # alias AmpsWeb.ServiceController
  # alias Amps.VaultDatabase
  # alias AmpsWeb.Util

  @loop_delimiter "//"

  def verify(conn, %{"username" => _username}) do
    # user = DB.find_one(Util.index(conn.assigns.env, "users"), %{"username" => username})
    # auths = Amps.Onboarding.verify(user)
    json(conn, :ok)
  end

  def glob_match(conn, _params) do
    body = conn.body_params
    test = body["test"]
    pattern = body["pattern"]

    is_match =
      if :glob.matches(test, pattern) do
        true
      else
        false
      end

    json(conn, is_match)
  end

  def in_use(conn, %{"port" => port}) do
    {port, _} = Integer.parse(port)

    body = conn.body_params

    id = body["id"]

    clauses = %{
      "port" => port
    }

    envs = DB.find("environments", %{}) |> Enum.map(fn env -> env["name"] end)
    envs = envs ++ [""]

    service =
      Enum.reduce_while(envs, nil, fn env, acc ->
        case DB.find_one(AmpsUtil.index(env, "services"), clauses) do
          nil ->
            {:cont, acc}

          service ->
            {:halt, service}
        end
      end)

    IO.inspect(service)

    in_use =
      case service do
        nil ->
          case :gen_tcp.listen(port, []) do
            {:ok, _socket} ->
               false
        #        case socket do
      #          :eaddrinuse ->
      #            true
#
#                _ ->
#                  false
#              end

            {:error, _reason} ->
              true
          end

        service ->
          if id do
            if service["_id"] == id do
              false
            else
              true
            end
          else
            true
          end
      end

    json(conn, in_use)
  end

  def duplicate_username(conn, %{"username" => username}) do
    json(conn, DB.find_one("admin", %{"username" => username}) != nil)
  end

  def duplicate(conn, _params) do
    body = conn.body_params

    duplicate =
      Enum.reduce(body, true, fn {collection, clauses}, acc ->
        acc &&
          DB.find_one(AmpsUtil.index(conn.assigns.env, collection), clauses) !=
            nil
      end)

    json(conn, duplicate)
  end

  def get_match_fields(conn, %{"id" => id}) do
    bucket = DB.find_one("rules", %{"_id" => id})

    account =
      DB.find_one("accounts", %{
        username: bucket["account"]
      })

    system =
      DB.find_one("accounts", %{
        username: "SYSTEM"
      })

    json(conn, account["fields"] ++ system["fields"])
  end

  def initialized(conn, _params) do
    case Amps.DB.find_one("admin", %{"systemdefault" => true}) do
      nil ->
        json(conn, false)

      _ ->
        json(conn, true)
    end
  end

  @spec execute_test(Plug.Conn.t(), any) :: Plug.Conn.t()
  def execute_test(conn, _params) do
    send_file(conn, 200, "mix.exs")
  end

  def aggregate_field(conn, %{"collection" => collection, "field" => field}) do
    values = DB.aggregate_field(collection, field)
    json(conn, values)
  end

  def startup(conn, _params) do
    body = conn.body_params

    root = Amps.DB.find_one("admin", %{"systemdefault" => true})

    # host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]

    # username = System.get_env("AMPS_ROOT_USER", "root")
    # password = System.get_env("AMPS_ROOT_PASS", "ampsadmin")

    if root == nil do
      root =
        Map.merge(body["root"], %{
          "approved" => true,
          "systemdefault" => true,
          "role" => "Admin"
        })

      # password = root["password"]
      %{password_hash: hashed} = add_hash(root["password"])
      root = Map.put(root, "password", hashed)

      # if Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] ==
      #      "vault" do
      #   token = AmpsWeb.Vault.get_token(:vaulthandler)

      #   {:ok, vault} =
      #     Vault.new(
      #       engine: Vault.Engine.KVV1,
      #       auth: Vault.Auth.Token,
      #       host: host,
      #       credentials: %{token: token}
      #     )
      #     |> Vault.auth()

      #   _result =
      #     Vault.request(
      #       vault,
      #       :post,
      #       "auth/userpass/users/" <> root["username"],
      #       body: %{"token_policies" => "admin,default", "password" => password}
      #     )
      # end

      systemdefaults = Map.merge(body["system"], %{"name" => "SYSTEM"})
      Amps.DB.insert("config", systemdefaults)

      Amps.DB.insert("admin", root)

      Amps.SvcManager.load_system_parms()
      Amps.SvcManager.check_util()

      send_resp(conn, 200, "Created")
    else
      send_resp(conn, 403, "Application Already Initialized")
    end
  end

  def download(conn, %{"id" => id}) do
    case DB.find_by_id(AmpsWeb.Util.index(conn.assigns.env, "message_events"), id) do
      nil ->
        send_resp(conn, 404, "Not found")

      msg ->
        if msg["data"] do
          send_download(conn, {:binary, msg["data"]},
            disposition: :attachment,
            filename: msg["fname"] || "message.dat"
          )
        else
          stream = AmpsUtil.stream(msg, conn.assigns.env)

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

  def stream(conn, %{"id" => id, "token" => token}) do
    case AmpsWeb.APIAuthPlug.get_credentials(conn, token, otp_app: :amps_web) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      {user, _} ->
        user = DB.find_by_id("admin", user.id)
        env = user["config"]["env"]

        case DB.find_by_id(AmpsWeb.Util.index(env, "message_events"), id) do
          nil ->
            send_resp(conn, 404, "Not found")

          msg ->
            fpath = AmpsUtil.local_file(msg, env)
            offset = get_offset(conn.req_headers)
            file_size = get_file_size(msg["fpath"])
            {:ok, {_ext, mime}} = FileType.from_path(msg["fpath"])

            conn
            |> Plug.Conn.put_resp_header("content-type", mime)
            |> Plug.Conn.put_resp_header(
              "content-range",
              "bytes #{offset}-#{file_size - 1}/#{file_size}"
            )
            |> Plug.Conn.send_file(206, fpath, offset, file_size - offset)
        end
    end
  end

  def get_offset(headers) do
    case List.keyfind(headers, "range", 0) do
      {"range", "bytes=" <> start_pos} ->
        String.split(start_pos, "-") |> hd |> String.to_integer()

      nil ->
        0
    end
  end

  def get_file_size(path) do
    {:ok, %{size: size}} = File.stat(path)
    size
  end

  def data(conn, %{"id" => id}) do
    env = conn.assigns.env
    index = AmpsWeb.Util.index(env, "message_events")
    msg = DB.find_by_id(index, id)
    send_file(conn, 200, msg["fpath"])
  end

  def preview(conn, %{"id" => id}) do
    env = conn.assigns.env
    index = AmpsWeb.Util.index(env, "message_events")
    msg = DB.find_by_id(index, id)

    supported = [
      %{"mime" => "application/pdf", "type" => "pdf"},
      %{"mime" => "image/*(.+)", "type" => "image"},
      %{"mime" => "video/*(.+)", "type" => "video"}
    ]

    if msg["data"] do
      json(conn, %{"supported" => true, "type" => "data", "data" => msg["data"]})
    else
      if msg["fpath"] do
        case FileType.from_path(msg["fpath"]) do
          {:ok, {_ext, mime}} ->
            match =
              Enum.find(supported, fn sp ->
                Regex.match?(~r/#{sp["mime"]}/, mime)
              end)

            if mime == "image/heic" do
              json(conn, %{"supported" => false})
            else
              if File.stat!(msg["fpath"]).size > 10_000_000 do
                if match["type"] == "video" do
                  json(conn, %{"supported" => true, "type" => match["type"]})
                else
                  json(conn, %{"supported" => false})
                end
              else
                if match do
                  json(conn, %{"supported" => true, "type" => match["type"]})
                else
                  json(conn, %{"supported" => false})
                end
              end
            end

          {:error, _} ->
            data = AmpsUtil.get_data(msg, conn.assigns.env)

            if String.valid?(data) do
              json(conn, %{"supported" => true, "type" => "text"})
            else
              json(conn, %{"supported" => false})
            end
        end
      else
        json(conn, %{"supported" => false})
      end
    end
  end

  def history(conn, %{"msgid" => msgid}) do
    env = conn.assigns.env
    rows = get_history(msgid, env)

    rows =
      Enum.sort(rows, fn e1, e2 ->
        e1["etime"] <= e2["etime"]
      end)

    {rows, _idx} =
      Enum.reduce(rows, {%{}, 0}, fn row, {sessions, idx} ->
        case row["sid"] do
          nil ->
            {Map.put(sessions, idx, row), idx + 1}

          sid ->
            session =
              Enum.find(sessions, fn {_idx, session} ->
                session["sid"] == sid
              end)

            case session do
              nil ->
                session = DB.find_one(AmpsUtil.index(env, "sessions"), %{"sid" => sid})

                if session do
                  {Map.put(sessions, idx + 1, Map.merge(session, %{"rows" => [row]})), idx + 1}
                else
                  {sessions, idx}
                end

              {idx, session} ->
                {Map.put(
                   sessions,
                   idx,
                   Map.put(session, "rows", session["rows"] ++ [row])
                 ), idx}
            end
        end
      end)

    rows =
      Enum.map(rows, fn {_k, v} ->
        v
      end)

    json(conn, rows)
  end

  def get_history(msgid, env) do
    index = AmpsWeb.Util.index(env, "message_events")

    case DB.find(index, %{"msgid" => msgid}) do
      [] ->
        Logger.info("Message not found for id #{msgid}")
        []

      msgs ->
        msg = Enum.at(msgs, 0)
        get_parents(msg, [], index) ++ msgs ++ get_children(msg, [], index)
    end
  end

  def get_parents(msg, parents, index) do
    if Map.has_key?(msg, "parent") do
      case DB.find(index, %{
             "msgid" => msg["parent"]
           }) do
        [] ->
          parents

        msgs ->
          msg = Enum.at(msgs, 0)

          # if not AmpsUtil.blank?(msg["parent"]) do
          get_parents(msg, msgs ++ parents, index)
          # else
          #   parents
          # end
      end
    else
      parents
    end
  end

  def get_children(msg, children, index) do
    case DB.find(index, %{
           "parent" => msg["msgid"]
         }) do
      [] ->
        children

      msgs ->
        msg = Enum.at(msgs, 0)
        get_children(msg, children ++ msgs, index)
    end
  end

  def loop(conn, %{"sub" => sub}) do
    env = conn.assigns.env
    data = find_sub_loop(sub, %{}, [], env)
    IO.inspect(data)

    {_paths, loops, _} =
      Enum.reduce(List.flatten(data), {[], [], []}, fn item, {paths, loops, curr} ->
        if item == @loop_delimiter do
          if List.last(curr)["loop"] do
            {[curr | paths], [curr | loops], []}
          else
            {[curr | paths], loops, []}
          end
        else
          {paths, loops, curr ++ [item]}
        end
      end)

    json(conn, loops)
  end

  def find_sub_loop(sub, meta, topics, env) do
    sub = DB.find_one(AmpsUtil.index(env, "services"), %{"name" => sub})

    action = DB.find_one(AmpsUtil.index(env, "actions"), %{"_id" => sub["handler"]})
    step = %{"topic" => sub["topic"]}

    if action["type"] == "router" do
      # rule = RouterAction.evaluate(action, meta)

      # rule["topic"]

      step =
        Enum.reduce(action["rules"], [], fn id, acc ->
          rule = Amps.DB.find_one(AmpsUtil.index(env, "rules"), %{"_id" => id})

          IO.inspect(rule["patterns"])

          topics =
            topics ++
              [
                %{
                  "topic" => sub["topic"],
                  "sub" => sub,
                  "action" => action,
                  "rule" => rule
                }
              ]

          [
            find_topic_loop(rule["output"], Map.merge(meta, %{}), topics)
            | acc
          ]
        end)

      step
    else
      topics =
        topics ++
          [%{"topic" => sub["topic"], "sub" => sub, "action" => action}]

      output = fn action ->
        find_topic_loop(action["output"], Map.merge(meta, %{}), topics)
      end

      if Map.has_key?(action, "send_output") do
        if(action["send_output"]) do
          output.(action)
        else
          step
        end
      else
        if action["output"] do
          output.(action)
        else
          topics ++ [@loop_delimiter]
        end
      end
    end
  end

  def check_loop(topic, topics) do
    topics =
      Enum.reduce(topics, [], fn %{"topic" => topic}, topics ->
        topics ++ [topic]
      end)

    Enum.member?(topics, topic)
  end

  def find_topic_loop(topic, meta, topics) do
    if check_loop(topic, topics) do
      topics ++ [%{"topic" => topic, "loop" => true}, @loop_delimiter]
    else
      subs =
        DB.find("services", %{
          type: "subscriber",
          active: true
        })

      steps =
        Enum.reduce(subs, [], fn sub, steps ->
          if match_topic(sub["topic"], topic) do
            action = DB.find_one("actions", %{"_id" => sub["handler"]})

            step = %{"topic" => sub["topic"]}

            step =
              if action["type"] == "router" do
                # rule = RouterAction.evaluate(action, meta)

                # rule["topic"]

                step =
                  Enum.reduce(action["rules"], [], fn id, acc ->
                    rule = Amps.DB.find_one("rules", %{"_id" => id})

                    topics =
                      topics ++
                        [
                          %{
                            "topic" => topic,
                            "sub" => sub,
                            "action" => action,
                            "rule" => rule
                          }
                        ]

                    [
                      find_topic_loop(
                        rule["output"],
                        Map.merge(meta, %{}),
                        topics
                      )
                      | acc
                    ]
                  end)

                step
              else
                topics =
                  topics ++
                    [%{"topic" => topic, "sub" => sub, "action" => action}]

                output = fn action ->
                  find_topic_loop(
                    action["output"],
                    Map.merge(meta, %{}),
                    topics
                  )
                end

                if Map.has_key?(action, "send_output") do
                  if(action["send_output"]) do
                    output.(action)
                  else
                    step
                  end
                else
                  if action["output"] do
                    output.(action)
                  else
                    topics ++ [@loop_delimiter]
                  end
                end
              end

            [step | steps]
          else
            steps
          end
        end)

      case steps do
        [] ->
          topics ++ [%{"topic" => topic, "sub" => nil}, @loop_delimiter]

        steps ->
          steps
      end
    end
  end

  def check_loop_new(step, steps) do
    Logger.info("CHECKING LOOP")
    IO.inspect(step)
    IO.inspect(steps)

    Enum.reduce(steps, false, fn item, loop ->
      if item["sub"]["name"] == step["sub"]["name"] do
        if item["action"]["type"] == "router" do
          if item["rule"]["name"] == step["rule"]["name"] do
            true
          else
            loop
          end
        else
          true
        end
      else
        loop
      end
    end)
  end

  def workflow(conn, %{"topic" => topic, "meta" => meta}) do
    steps = find_topics(topic, meta, [], conn.assigns.env)

    res =
      case steps do
        [] ->
          %{
            "steps" => steps,
            "action" => %{"output" => topic},
            "topic" => topic
          }

        steps ->
          %{
            "steps" => steps,
            "action" => %{"output" => topic},
            "topic" => topic
          }
      end

    json(conn, res)
  end

  defp find_topics(topic, meta, topics, env) do
    subs =
      DB.find(AmpsUtil.index(env, "services"), %{
        type: "subscriber",
        active: true
      })

    Enum.reduce(subs, [], fn sub, steps ->
      if match_topic(sub["topic"], topic) do
        action = DB.find_one(AmpsUtil.index(env, "actions"), %{"_id" => sub["handler"]})

        step = %{"action" => action, "sub" => sub, "topic" => sub["topic"]}

        step =
          if action["type"] == "router" do
            rule = Amps.Actions.Router.evaluate(action, meta, env)
            step = Map.merge(step, %{"rule" => rule})

            if check_loop_new(step, topics) do
              # Logger.warning("Workflow loop detected")
              %{"loop" => true, "topic" => topic}
            else
              topics = [step | topics]

              # rule["topic"]

              steps = find_topics(rule["output"], Map.merge(meta, %{}), topics, env)

              step =
                step
                |> Map.put(
                  "action",
                  Map.merge(action, %{"output" => rule["output"]})
                )
                |> Map.put(
                  "steps",
                  steps
                )

              step
            end
          else
            if check_loop_new(step, topics) do
              # Logger.warning("Workflow loop detected")
              %{"loop" => true, "topic" => topic}
            else
              topics = [step | topics]

              output = fn action ->
                meta =
                  if action["format"] do
                    try do
                      Map.merge(
                        meta,
                        %{
                          "fname" => AmpsUtil.format(action["format"], meta)
                        }
                      )
                    rescue
                      _e ->
                        meta
                    end
                  else
                    meta
                  end

                IO.inspect(meta)

                steps =
                  if is_list(action["output"]) do
                    Enum.map(action["output"], fn topic ->
                      find_topics(
                        topic,
                        Map.merge(meta, %{}),
                        topics,
                        env
                      )
                    end)
                  else
                    find_topics(
                      action["output"],
                      Map.merge(meta, %{}),
                      topics,
                      env
                    )
                  end

                step =
                  step
                  |> Map.put(
                    "steps",
                    steps
                  )

                step
              end

              if Map.has_key?(action, "send_output") do
                if(action["send_output"]) do
                  output.(action)
                else
                  step
                end
              else
                if action["output"] do
                  output.(action)
                else
                  step
                end
              end
            end
          end

        [step | steps]
      else
        steps
      end
    end)
  end

  defp match_topic(stopic, wtopic) do
    spieces = String.split(stopic, ".")
    wpieces = String.split(wtopic, ".")

    wpieces
    |> Enum.with_index(fn element, index -> {index, element} end)
    |> Enum.reduce(true, fn {idx, piece}, match ->
      spiece = Enum.at(spieces, idx)

      match &&
        (spiece == piece || spiece == "*" ||
           spiece == ">")
    end)
  end

  def get_plugins(conn, %{"object" => collection}) do
    plugins = AmpsUtil.get_env(:plugins, [])

    resp =
      Enum.reduce(plugins, [], fn plugin, acc ->
        case plugin.ui(collection) do
          nil ->
            acc

          ui ->
            acc ++ [ui]
        end
      end)

    json(conn, resp)
  end

  def create_store(conn, %{"collection" => collection}) do
    data = DB.get_rows(collection, conn.query_params)

    # rows =
    #   Map.get(data, :rows)
    #   |> Enum.reject(fn row ->
    #     row["systemdefault"] == true
    #   end)

    # data = Map.put(data, :rows, rows)

    json(
      conn,
      data
    )
  end

  def page_num(conn, %{"collection" => collection, "id" => id}) do
    clauses = JSON.decode!(conn.query_params["filters"] || "{}")
    sort = JSON.decode!(conn.query_params["sort"] || "{}")

    case DB.get_page(collection, id, clauses, sort) do
      {:ok, page} ->
        json(conn, %{"success" => true, "page" => page})

      {:error, _error} ->
        json(conn, %{"success" => false})
    end
  end

  # def msg_session(conn, %{"msgid" => msgid, "sid" => sid}) do
  #   json(
  #     conn,
  #     DB.find_one(AmpsDatabaseUtil.index(conn.assigns.env, "message_events"), %{
  #       "msgid" => msgid,
  #       "sid" => sid
  #     })
  #   )
  # end
end
