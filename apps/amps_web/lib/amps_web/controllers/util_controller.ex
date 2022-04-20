defmodule AmpsWeb.UtilController do
  use AmpsWeb, :controller
  require Logger
  import Argon2
  alias Amps.DB
  alias AmpsWeb.Encryption
  alias Amps.SvcManager
  alias AmpsWeb.ServiceController
  alias Amps.VaultDatabase
  alias AmpsWeb.Util

  @loop_delimiter "//"

  def glob_match(conn, _params) do
    body = conn.body_params()
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

    body = conn.body_params()

    id = body["id"]

    clauses =
      if id do
        %{
          "port" => port,
          "bool" => %{
            "must_not" => %{
              "match" => %{"_id" => id}
            }
          }
        }
      else
        %{
          "port" => port
        }
      end

    in_use =
      case(DB.find_one("*services", clauses)) do
        nil ->
          case :gen_tcp.listen(port, []) do
            {:ok, socket} ->
              case socket do
                :eaddrinuse ->
                  true

                _ ->
                  false
              end

            {:error, _reason} ->
              true
          end

        _item ->
          true
      end

    json(conn, in_use)
  end

  def duplicate_username(conn, %{"username" => username}) do
    json(conn, DB.find_one("admin", %{"username" => username}) != nil)
  end

  def duplicate(conn, _params) do
    body = conn.body_params()

    duplicate =
      Enum.reduce(body, true, fn {collection, clauses}, acc ->
        acc &&
          DB.find_one(Util.index(conn.assigns().env, collection), clauses) !=
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
    body = conn.body_params()

    root = Amps.DB.find_one("admin", %{"systemdefault" => true})

    host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]

    # username = System.get_env("AMPS_ROOT_USER", "root")
    # password = System.get_env("AMPS_ROOT_PASS", "ampsadmin")

    if root == nil do
      root =
        Map.merge(body["root"], %{
          "approved" => true,
          "systemdefault" => true,
          "role" => "Admin"
        })

      password = root["password"]
      %{password_hash: hashed} = add_hash(root["password"])
      root = Map.put(root, "password", hashed)

      if Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] ==
           "vault" do
        token = AmpsWeb.Vault.get_token(:vaulthandler)

        {:ok, vault} =
          Vault.new(
            engine: Vault.Engine.KVV1,
            auth: Vault.Auth.Token,
            host: host,
            credentials: %{token: token}
          )
          |> Vault.auth()

        _result =
          Vault.request(
            vault,
            :post,
            "auth/userpass/users/" <> root["username"],
            body: %{"token_policies" => "admin,default", "password" => password}
          )
      end

      systemdefaults = Map.merge(body["system"], %{"name" => "SYSTEM"})
      Amps.DB.insert("config", systemdefaults)

      Amps.DB.insert("admin", root)

      Amps.SvcManager.load_system_parms()
      send_resp(conn, 200, "Created")
    else
      send_resp(conn, 403, "Application Already Initialized")
    end
  end

  def download(conn, %{"msgid" => msgid}) do
    case DB.find_one(
           AmpsWeb.Util.index(conn.assigns().env, "message_events"),
           %{"msgid" => msgid}
         ) do
      nil ->
        send_resp(conn, 404, "Not found")

      msg ->
        if msg["data"] do
          send_download(conn, {:binary, msg["data"]},
            disposition: :attachment,
            filename: msg["fname"]
          )
        else
          if msg["temp"] do
            send_download(conn, {:file, msg["fpath"]},
              disposition: :attachment,
              filename: msg["fname"]
            )
          else
            root = AmpsUtil.get_env(:storage_root)

            send_download(conn, {:file, Path.join(root, msg["fpath"])},
              disposition: :attachment,
              filename: msg["fname"]
            )
          end
        end
    end
  end

  def history(conn, %{"msgid" => msgid}) do
    env = conn.assigns().env
    rows = get_history(msgid, env)

    rows =
      Enum.sort(rows, fn e1, e2 ->
        e1["etime"] <= e2["etime"]
      end)

    {rows, idx} =
      Enum.reduce(rows, {%{}, 0}, fn row, {sessions, idx} ->
        case row["sid"] do
          nil ->
            {Map.put(sessions, idx, row), idx + 1}

          sid ->
            session =
              Enum.find(sessions, fn {idx, session} ->
                session["sid"] == sid
              end)

            IO.inspect(row["msgid"] == msgid)

            case session do
              nil ->
                session = DB.find_one(Util.index(env, "sessions"), %{"sid" => sid})

                {Map.put(sessions, idx + 1, Map.merge(session, %{"rows" => [row]})), idx + 1}

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
      Enum.map(rows, fn {k, v} ->
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
    env = conn.assigns().env
    data = find_sub_loop(sub, %{}, [], env)
    IO.inspect(data)

    {paths, loops, _} =
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

    loops
    json(conn, loops)
  end

  def find_sub_loop(sub, meta, topics, env) do
    sub = DB.find_one(Util.index(env, "services"), %{"name" => sub})

    action = DB.find_one(Util.index(env, "actions"), %{"_id" => sub["handler"]})
    step = %{"topic" => sub["topic"]}

    step =
      if action["type"] == "router" do
        # rule = RouterAction.evaluate(action, meta)

        # rule["topic"]

        step =
          Enum.reduce(action["rules"], [], fn id, acc ->
            rule = Amps.DB.find_one(Util.index(env, "rules"), %{"_id" => id})

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

  def workflow(conn, %{"topic" => topic, "meta" => meta}) do
    steps = find_topics(topic, meta, [], conn.assigns().env)

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

  defp find_topics(topic, meta, topics, env) do
    subs =
      DB.find(Util.index(env, "services"), %{
        type: "subscriber",
        active: true
      })

    steps =
      Enum.reduce(subs, [], fn sub, steps ->
        if match_topic(sub["topic"], topic) do
          action = DB.find_one(Util.index(env, "actions"), %{"_id" => sub["handler"]})

          step = %{"action" => action, "sub" => sub, "topic" => sub["topic"]}

          step =
            if action["type"] == "router" do
              rule = RouterAction.evaluate(action, meta, env)
              step = Map.merge(step, %{"rule" => rule})

              if check_loop_new(step, topics) do
                # Logger.warn("Workflow loop detected")
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
                # Logger.warn("Workflow loop detected")
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
                        e ->
                          meta
                      end
                    else
                      meta
                    end

                  IO.inspect(meta)

                  steps =
                    find_topics(
                      action["output"],
                      Map.merge(meta, %{}),
                      topics,
                      env
                    )

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

  def create_store(conn, %{"collection" => collection}) do
    data =
      DB.get_rows(conn, %{
        "collection" => collection
      })

    rows =
      Map.get(data, :rows)
      |> Enum.reject(fn row ->
        row["systemdefault"] == true
      end)

    data = Map.put(data, :rows, rows)

    json(
      conn,
      data
    )
  end
end
