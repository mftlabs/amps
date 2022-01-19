defmodule AmpsWeb.UtilController do
  use AmpsWeb, :controller
  require Logger
  import Argon2
  alias AmpsWeb.DB
  alias AmpsWeb.Encryption
  alias Amps.SvcManager
  alias AmpsWeb.ServiceController

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

    in_use =
      case(DB.find_one("services", %{"port" => port})) do
        nil ->
          case :gen_tcp.listen(port, []) do
            {:ok, socket} ->
              case socket do
                :eaddrinuse ->
                  true

                _ ->
                  false
              end

            {:error, reason} ->
              true
          end

        item ->
          true
      end

    json(conn, in_use)
  end

  def duplicate(conn, _params) do
    body = conn.body_params()

    duplicate =
      Enum.reduce(body, true, fn {collection, clauses}, acc ->
        acc && DB.find_one(collection, clauses) != nil
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
    case AmpsWeb.DB.find_one("admin", %{"systemdefault" => true}) do
      nil ->
        json(conn, false)

      _ ->
        json(conn, true)
    end
  end

  def startup(conn, _params) do
    body = conn.body_params()

    root = AmpsWeb.DB.find_one("admin", %{"systemdefault" => true})

    host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]

    # username = System.get_env("AMPS_ROOT_USER", "root")
    # password = System.get_env("AMPS_ROOT_PASS", "ampsadmin")

    if root == nil do
      root =
        Map.merge(body["root"], %{"approved" => true, "systemdefault" => true, "role" => "Admin"})

      password = root["password"]
      %{password_hash: hashed} = add_hash(root["password"])
      root = Map.put(root, "password", hashed)

      if Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] == "vault" do
        token = AmpsWeb.Vault.get_token(:vaulthandler)

        {:ok, vault} =
          Vault.new(
            engine: Vault.Engine.KVV1,
            auth: Vault.Auth.Token,
            host: host,
            credentials: %{token: token}
          )
          |> Vault.auth()

        result =
          Vault.request(vault, :post, "auth/userpass/users/" <> root["username"],
            body: %{"token_policies" => "admin,default", "password" => password}
          )
      end

      systemdefaults = Map.merge(body["system"], %{"name" => "SYSTEM"})
      AmpsWeb.DB.insert("services", systemdefaults)

      AmpsWeb.DB.insert("admin", root)

      Amps.SvcManager.load_system_parms()
      send_resp(conn, 200, "Created")
    else
      send_resp(conn, 403, "Application Already Initialized")
    end
  end

  def download(conn, %{"msgid" => msgid}) do
    case DB.find_one("message_events", %{"msgid" => msgid}) do
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
    json(conn, get_history(msgid))
  end

  def get_history(msgid) do
    case DB.find("message_events", %{"msgid" => msgid}) do
      [] ->
        Logger.info("Message not found for id #{msgid}")
        []

      msgs ->
        IO.inspect(msgs)
        msg = Enum.find(msgs, fn msg -> msg["status"] == "started" end)
        get_parents(msg, []) ++ msgs ++ get_children(msg, [])
    end
  end

  def get_parents(msg, parents) do
    if Map.has_key?(msg, "parent") do
      case DB.find("message_events", %{
             "msgid" => msg["parent"]
           }) do
        [] ->
          parents

        msgs ->
          msg = Enum.find(msgs, fn msg -> msg["status"] == "started" end)
          get_parents(msg, msgs ++ parents)
      end
    else
      parents
    end
  end

  def get_children(msg, children) do
    case DB.find("message_events", %{
           "parent" => msg["msgid"]
         }) do
      [] ->
        children

      msgs ->
        msg = Enum.find(msgs, fn msg -> msg["status"] == "started" end)
        get_children(msg, children ++ msgs)
    end
  end

  def workflow(conn, %{"topic" => topic, "meta" => meta}) do
    {steps, topics} = find_topics(topic, meta, [])
    IO.inspect(steps)
    IO.inspect(topics)

    res =
      case steps do
        [] ->
          %{
            "steps" => steps,
            "action" => %{"output" => topic},
            "topics" => Enum.reverse(topics),
            "topic" => topic
          }

        steps ->
          %{"steps" => steps, "topics" => Enum.reverse(topics), "topic" => topic}
      end

    json(conn, res)
  end

  defp find_topics(topic, meta, topics) do
    IO.inspect(topics)

    if Enum.member?(topics, topic) do
      Logger.warn("Workflow loop detected")
      {[%{"loop" => true, "topic" => topic}], topics}
    else
      subs =
        DB.find("services", %{
          type: "subscriber"
        })

      topics = [topic | topics]

      {steps, topics} =
        Enum.reduce(subs, {[], topics}, fn sub, {steps, topics} ->
          if match_topic(sub["topic"], topic) do
            action = DB.find_one("actions", %{"_id" => sub["handler"]})
            step = %{"action" => action, "sub" => sub, "topic" => sub["topic"]}

            {step, topics} =
              if action["type"] == "router" do
                rule = RouterAction.evaluate(action, meta)

                # rule["topic"]
                {steps, topics} = find_topics(rule["topic"], Map.merge(meta, %{}), topics)

                step =
                  step
                  |> Map.put(
                    "ruleid",
                    rule["id"]
                  )
                  |> Map.put(
                    "steps",
                    steps
                  )

                {step, topics}
              else
                if action["output"] do
                  {steps, topics} = find_topics(action["output"], Map.merge(meta, %{}), topics)

                  IO.inspect(steps)
                  IO.inspect(topics)

                  step =
                    step
                    |> Map.put(
                      "steps",
                      steps
                    )

                  {step, topics}
                else
                  {step, topics}
                end
              end

            {[step | steps], topics}
          else
            {steps, topics}
          end
        end)
    end
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
    if AmpsWeb.DataController.vault_collection(collection) do
      data = VaultDatabase.get_rows("amps/" <> collection)

      json(
        conn,
        data
      )
    else
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
end
