defimpl Jason.Encoder, for: BSON.ObjectId do
  def encode(val, _opts \\ []) do
    BSON.ObjectId.encode!(val)
    |> Jason.encode!()
  end
end

defmodule AmpsWeb.DataController do
  use AmpsWeb, :controller
  require Logger
  import Argon2
  alias AmpsWeb.DB
  alias AmpsWeb.Encryption
  alias Amps.SvcManager
  alias AmpsWeb.ServiceController

  plug(
    AmpsWeb.EnsureRolePlug,
    :Admin
    when action in [
           :create,
           :update,
           :delete,
           :add_to_field,
           :update_in_field,
           :delete_from_field
         ]
  )

  plug(AmpsWeb.EnsureRolePlug, [:Guest, :Admin] when action in [:get_rows])

  def test(conn, _params) do
    {:ok, gnat} =
      Gnat.start_link(%{
        # (required) the registered named you want to give the Gnat connection
        # number of milliseconds to wait between consecutive reconnect attempts (default: 2_000)
        backoff_period: 4_000,
        connection_settings: [
          %{host: '0.0.0.0', port: 4222}
        ]
      })

    :ok =
      Gnat.pub(
        gnat,
        "amps.actions.kafkaput.abhay",
        Poison.encode!(%{
          msg: %{
            data: "abhay kafka abhay kafka abhay kafka",
            fname: "kafka.txt",
            ftime: DateTime.to_iso8601(DateTime.utc_now())
          },
          state: %{}
        })
      )

    IO.inspect(Jetstream.API.Consumer.list(gnat, "ACTIONS"))

    json(conn, :ok)
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
      IO.puts("Creating Root User")

      root =
        Map.merge(body["root"], %{"approved" => true, "systemdefault" => true, "role" => "Admin"})

      password = root["password"]
      %{password_hash: hashed} = add_hash(root["password"])
      root = Map.put(root, "password", hashed)

      IO.inspect(Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] == "vault")

      if Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] == "vault" do
        token = AmpsWeb.Vault.get_token(:vaulthandler)
        IO.inspect(token)

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

        IO.inspect(result)
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
      nil ->
        Logger.info("Message not found for id #{msgid}")
        []

      msgs ->
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
    json(conn, %{"steps" => find_topics(topic, meta), "topic" => topic})
  end

  defp find_topics(topic, meta) do
    subs =
      DB.find("services", %{
        type: "subscriber"
      })

    Enum.reduce(subs, [], fn sub, acc ->
      if match_topic(sub["topic"], topic) do
        action = DB.find_one("actions", %{"_id" => sub["handler"]})
        step = %{"action" => action, "sub" => sub}

        step =
          if action["type"] == "router" do
            rule = RouterAction.evaluate(action, meta)

            # rule["topic"]

            step
            |> Map.put(
              "ruleid",
              rule["id"]
            )
            |> Map.put(
              "steps",
              find_topics(rule["topic"], Map.merge(meta, %{}))
            )
            |> Map.put(
              "topic",
              rule["topic"]
            )
          else
            if action["output"] do
              step
              |> Map.put(
                "steps",
                find_topics(action["output"], Map.merge(meta, %{}))
              )
              |> Map.put(
                "topic",
                action["output"]
              )
            else
              step
            end
          end

        [step | acc]
      else
        acc
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

  def reprocess(conn, _params) do
    message = conn.body_params()
    S3.reprocess(message)
    json(conn, :ok)
  end

  def get_user_link(conn, %{"id" => id}) do
    IO.inspect(conn)
    obj = DB.find_one("users", %{"_id" => id})
    IO.inspect(id)

    edited = Map.put(conn, :host, "localhost")
    IO.puts("edit")
    IO.inspect(edited)

    {:ok, map, conn} =
      PowResetPassword.Plug.create_reset_token(edited, %{"email" => obj["email"]})

    token = map.token

    resp =
      conn
      |> PowResetPassword.Plug.load_user_by_token(token)

    IO.inspect(resp)

    IO.inspect(token)
    [host: host] = Application.get_env(:amps_web, AmpsWeb.Endpoint)[:url]
    IO.inspect(host)

    [:inet6, port: port] = Application.get_env(:master_proxy, :http)
    IO.inspect(port)
    json(conn, "#{host}:#{port}/?token=#{token}#setpassword")
  end

  def get_url(conn, %{
        "fname" => fname,
        "bucket" => bucket,
        "host" => host
      }) do
    config = ExAws.Config.new(:s3) |> Map.put(:host, host)

    {:ok, presigned_url} = ExAws.S3.presigned_url(config, :put, bucket, fname)

    IO.inspect(presigned_url)
    # IO.inspect(file)
    # IO.inspect(File.stat!(file.path))
    json(conn, presigned_url)
  end

  def upload(conn, _params) do
  end

  def index(conn, %{"collection" => collection}) do
    cursor = Mongo.find(:mongo, collection, %{})

    data =
      cursor
      |> Enum.to_list()

    IO.inspect(data)
    json(conn, data)
  end

  def get_rows(conn, %{
        "collection" => collection
      }) do
    if vault_collection(collection) do
      data = VaultData.get_rows("amps/" <> collection)
      # IO.inspect(data)

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

  def get_field(conn, %{"collection" => collection, "id" => id, "field" => field}) do
    data = DB.find_one(collection, %{"_id" => id})
    IO.inspect(data)
    json(conn, data[field])
  end

  def add_to_field(conn, %{"collection" => collection, "id" => id, "field" => field}) do
    Logger.debug("Adding Field")
    body = conn.body_params()

    updated = DB.add_to_field(collection, body, id, field)

    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.put_env(:amps, String.to_atom(body["field"]), body["value"])

          _ ->
            nil
        end

      "accounts" ->
        case field do
          "rules" ->
            S3.update_schedule(id)

          _ ->
            nil
        end

      _ ->
        nil
    end

    json(conn, updated)
  end

  def get_in_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field,
        "idx" => idx
      }) do
    Logger.debug("Getting Field")
    body = conn.body_params()
    result = DB.get_in_field(collection, id, field, idx)
    json(conn, result)
  end

  def update_in_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field,
        "idx" => idx
      }) do
    Logger.debug("Updating Field")
    body = conn.body_params()
    result = DB.update_in_field(collection, body, id, field, idx)

    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.put_env(:amps, String.to_atom(body["field"]), body["value"])

          _ ->
            nil
        end

      "accounts" ->
        case field do
          "rules" ->
            S3.update_schedule(id)

          _ ->
            nil
        end

      _ ->
        nil
    end

    json(conn, result)
  end

  # def reorder_in_field(conn, %{"collection" => collection, "id" => id, "field" => field}) do
  #   Logger.debug("Adding Field")
  #   body = conn.body_params();

  #   {:ok, result} = Mongo.update_one(:mongo, collection, %{"_id" => objectid(id)}, %{"$push": %{field => body}})

  #   json(conn, :ok)

  # end

  def delete_from_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field,
        "idx" => idx
      }) do
    Logger.debug("Deleting Field")
    body = conn.body_params()
    item = DB.get_in_field(collection, id, field, idx)
    result = DB.delete_from_field(collection, body, id, field, idx)

    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.delete_env(:amps, String.to_atom(item["field"]))

          _ ->
            nil
        end

      "accounts" ->
        case field do
          "rules" ->
            S3.update_schedule(id)

          _ ->
            nil
        end

      _ ->
        nil
    end

    json(conn, result)
  end

  def in_use(conn, %{"port" => port}) do
    {port, _} = Integer.parse(port)

    in_use =
      case(DB.find_one("services", %{"port" => port})) do
        nil ->
          case :gen_tcp.listen(port, []) do
            {ok, socket} ->
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

    IO.inspect(duplicate)

    json(conn, duplicate)
  end

  def create(conn, %{"collection" => collection}) do
    body =
      case collection do
        "users" ->
          IO.inspect(conn.body_params())

          body = conn.body_params()

          body = Map.put(body, "password", nil)

          DB.insert("mailbox_auth", %{
            mailbox: body["username"],
            password: body["password"],
            active: true
          })

          # account = S3.Minio.create_account(conn.body_params())
          # S3.create_schedule(account)
          # account
          body

        # VaultData.vault_store_key(conn.body_params(), collection, "account", "cred")
        "services" ->
          body = conn.body_params()

          if body["type"] == "subscriber" do
            {stream, consumer} = AmpsUtil.get_names(body)
            AmpsUtil.create_consumer(stream, consumer, body["topic"])
          end

          body

        _ ->
          conn.body_params()
      end

    IO.inspect(body)

    res =
      if vault_collection(collection) do
        {:ok, resp} = VaultData.insert(collection, body)
        resp
      else
        DB.insert(collection, body)
      end

    case collection do
      "services" ->
        IO.puts("New Service")
        types = SvcManager.service_types()

        if Map.has_key?(types, String.to_atom(body["type"])) do
          Amps.SvcManager.load_service(body["name"])
        end

      _ ->
        nil
    end

    json(conn, res)
  end

  def show(conn, %{"collection" => collection, "id" => id}) do
    object =
      if vault_collection(collection) do
        {:ok, data} = VaultData.read(collection, id)
        data
      else
        DB.find_one(collection, %{"_id" => id})
      end

    IO.inspect(object)

    object =
      case collection do
        # "users" ->
        #   Map.put(
        #     object,
        #     "password",
        #     Encryption.decrypt(object["password"])
        # )

        _ ->
          object
      end

    # Send the query to the repository

    json(conn, object)
  end

  def vault_collection(collection) do
    collections = [
      "keys"
    ]

    Enum.member?(collections, collection)
  end

  def update(conn, %{"collection" => collection, "id" => id}) do
    body =
      case collection do
        "users" ->
          case Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] do
            "vault" ->
              VaultData.update_vault_password(conn.body_params())

            "db" ->
              body = conn.body_params()

              if body["password"] != nil && body["password"] != "" do
                password = body["password"]
                %{password_hash: hashed} = add_hash(password)
                Map.put(body, "password", hashed)
              else
                body
              end
          end

        _ ->
          conn.body_params()
      end

    result =
      if vault_collection(collection) do
        {:ok, resp} = VaultData.update(collection, body, id)
        resp
      else
        DB.update(collection, body, id)
      end

    case collection do
      "accounts" ->
        S3.update_schedule(id)

      "services" ->
        service = DB.find_one("services", %{"_id" => id})
        IO.inspect(service)

        if service["type"] == "subscriber" do
          {stream, consumer} = AmpsUtil.get_names(body)
          AmpsUtil.delete_consumer(stream, consumer)
          AmpsUtil.create_consumer(stream, consumer, service["topic"])
        end

        types = SvcManager.service_types()

        if Map.has_key?(service, "type") do
          if Map.has_key?(types, String.to_atom(service["type"])) do
            ServiceController.stop_service(service["name"])

            if service["active"] do
              ServiceController.start_service(service["name"])
            end
          end
        end

        if service["name"] == "SYSTEM" do
          Amps.SvcManager.load_system_parms()
        end

      _ ->
        nil
    end

    json(conn, result)
  end

  def delete(conn, %{"collection" => collection, "id" => id}) do
    object =
      if vault_collection(collection) do
        VaultData.read(collection, id)
      else
        DB.find_one(collection, %{"_id" => id})
      end

    case collection do
      # "accounts" ->
      #   S3.Minio.delete_account(object)

      "users" ->
        DB.delete("mailbox_auth", %{
          "mailbox" => object["username"]
        })

      "rules" ->
        S3.Minio.delete_bucket(object)

      "services" ->
        types = SvcManager.service_types()

        if Map.has_key?(types, String.to_atom(object["type"])) do
          AmpsWeb.ServiceController.stop_service(object["name"])
        end

        if object["type"] == "subscriber" do
          {stream, consumer} = AmpsUtil.get_names(object)
          AmpsUtil.delete_consumer(stream, consumer)
        end

      _ ->
        conn.body_params()
    end

    IO.inspect(vault_collection(collection))

    resp =
      if vault_collection(collection) do
        {:ok, resp} = VaultData.delete(collection, id)
        resp
      else
        DB.delete_one(collection, %{"_id" => id})
      end

    json(conn, resp)
  end

  def objectid(id) do
    BSON.ObjectId.decode!(id)
  end
end

defmodule AmpsWeb.Encryption do
  def encrypt(plaintext) do
    # create random Initialisation Vector
    iv = :crypto.strong_rand_bytes(16)
    # sample secret_key is a 32 bit hex string

    secret_key =
      Base.encode64(Application.get_env(:amps_web, AmpsWeb.Endpoint)[:secret_key_base])
      |> binary_part(0, 32)

    plaintext = pad(plaintext, 32)
    encrypted_text = :crypto.crypto_one_time(:aes_256_cbc, secret_key, iv, plaintext, true)
    encrypted_text = iv <> encrypted_text
    :base64.encode(encrypted_text)
  end

  def decrypt(ciphertext) do
    secret_key =
      Base.encode64(Application.get_env(:amps_web, AmpsWeb.Endpoint)[:secret_key_base])
      |> binary_part(0, 32)

    ciphertext = :base64.decode(ciphertext)
    <<iv::binary-16, ciphertext::binary>> = ciphertext
    decrypted_text = :crypto.crypto_one_time(:aes_256_cbc, secret_key, iv, ciphertext, false)
    unpad(decrypted_text)
  end

  def unpad(data) do
    to_remove = :binary.last(data)
    :binary.part(data, 0, byte_size(data) - to_remove)
  end

  # PKCS5Padding
  def pad(data, block_size) do
    to_add = block_size - rem(byte_size(data), block_size)
    data <> :binary.copy(<<to_add>>, to_add)
  end
end

defmodule Filter do
  def convert_dates(map, acc) do
    if Kernel.is_map(map) do
      cond do
        Map.has_key?(map, "$date") ->
          # with {:ok, datetime, _} <- DateTime.from_iso8601(Map.get(map, "$date")), do: datetime
          Map.get(map, "$date")

        # Map.has_key?(map, "$regex") ->
        #   %BSON.Regex{pattern: Map.get(map, "$regex")}
        true ->
          Enum.reduce(map, acc, fn {key, value}, acc ->
            Map.put(acc, key, convert_dates(value, acc))
          end)
      end
    else
      map
    end
  end

  def convert_dates(map) do
    cond do
      Map.has_key?(map, "$or") ->
        handle_cond(map, "$or")

      Map.has_key?(map, "$and") ->
        handle_cond(map, "$and")

      true ->
        acc = %{}
        convert_dates(map, acc)
    end
  end

  def handle_cond(map, op) do
    conds = Map.get(map, op)

    list =
      Enum.reduce(conds, [], fn element, acc ->
        [convert_dates(element) | acc]
      end)

    %{op => list}
  end

  def parse(filter) do
    if filter != nil do
      Enum.reduce(filter, %{}, fn {key, value}, acc ->
        Map.merge(acc, convert_dates(%{key => value}))
      end)
    else
      %{}
    end
  end

  def get_mongo_filter(filter) do
    case filter["operator"] do
      "like" ->
        %{filter["property"] => %{"$regex" => filter["value"]}}

      _ ->
        op = "$" <> filter["operator"]
        value = convert_sencha_dates(filter["value"])
        %{filter["property"] => %{op => value}}
    end
  end

  def convert_sencha_dates(value) do
    if Regex.match?(~r/^\d{2}\/\d{2}\/\d{4}$/, "#{value}") do
      pieces = String.split(value, "/")

      date =
        Date.from_iso8601!(
          Enum.at(pieces, 2) <> "-" <> Enum.at(pieces, 0) <> "-" <> Enum.at(pieces, 1)
        )

      {:ok, datetime} = DateTime.new!(date, Time.new(0, 0, 0, 0))
      datetime
    else
      value
    end
  end

  def combine_filters(curr, new) do
    op = "$" <> new["operator"]
    value = convert_sencha_dates(new["value"])
    filters = Map.merge(curr, %{op => value})
    Map.put(%{}, new["property"], filters)
  end

  def convert_sencha_filter(filters) do
    IO.inspect(filters)

    Enum.reduce(filters, %{}, fn val, acc ->
      if Map.has_key?(acc, val["property"]) do
        combined = combine_filters(acc[val["property"]], val)
        Map.drop(acc, [val["property"]])
        Map.merge(acc, combined)
      else
        Map.merge(acc, get_mongo_filter(val))
      end
    end)
  end
end

defmodule S3 do
  alias AmpsWeb.DB

  def create_schedule(account) do
    schedule = %{
      "account" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601(),
        "debug" => to_string(account["debug"]),
        "logfile" => account["logpath"],
        "hinterval" => account["hinterval"],
        "cinterval" => account["cinterval"],
        "max" => account["max"] || "100"
      }
    }

    schedule =
      Enum.reduce(account["rules"], schedule, fn rule, acc ->
        IO.inspect(rule)
        name = rule["name"]
        rule = Map.drop(rule, ["name"])

        if rule["active"] do
          rule = Map.drop(rule, ["active"])
          Map.put(acc, name, rule)
        else
          acc
        end
      end)

    {:ok, path} = Temp.mkdir()
    schedulepath = path <> "/schedule.json"
    IO.inspect(schedulepath)
    result = File.write(schedulepath, Jason.encode!(schedule))
    IO.inspect(result)

    put =
      ExAws.S3.put_object(
        account["username"],
        "schedule/schedule.json",
        File.read!(schedulepath)
      )
      |> ExAws.request!()

    IO.inspect("schedule")
    IO.inspect(put)
    File.rm_rf!(path)
  end

  def update_schedule(id) do
    account = AmpsWeb.DB.find_one("accounts", %{"_id" => id})

    schedule = %{
      "account" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601(),
        "debug" => to_string(account["debug"]),
        "logfile" => account["logpath"],
        "hinterval" => account["hinterval"],
        "cinterval" => account["cinterval"],
        "max" => account["max"] || "100"
      }
    }

    schedule =
      Enum.reduce(account["rules"], schedule, fn rule, acc ->
        IO.inspect(rule)
        name = rule["name"]
        rule = rule |> Map.drop(["name"]) |> Map.put("active", to_string(rule["active"]))

        rule =
          if Map.has_key?(rule, "regex") do
            Map.put(rule, "regex", to_string(rule["regex"]))
          else
            rule
          end

        Map.put(acc, name, rule)
      end)

    {:ok, path} = Temp.mkdir()
    schedulepath = path <> "/schedule.json"
    IO.inspect(schedulepath)
    result = File.write(schedulepath, Jason.encode!(schedule))
    IO.inspect(result)

    put =
      ExAws.S3.put_object(
        account["username"],
        "schedule/schedule.json",
        File.read!(schedulepath)
      )
      |> ExAws.request!()

    IO.inspect(put)
    File.rm_rf!(path)
  end

  def reprocess_copy(message) do
    location = message["location"]

    bucket = message["bucket"]

    msgid = message["msgid"]

    fname = List.last(String.split(location, "/"))
    IO.inspect(fname)

    obj = ExAws.S3.head_object(bucket, location) |> ExAws.request!()

    IO.inspect(obj)

    meta =
      Enum.reduce(obj.headers, [], fn {k, v}, acc ->
        if String.starts_with?(k, "x-amz-meta") do
          [{String.replace(k, "x-amz-meta-", ""), v} | acc]
        else
          acc
        end
      end)

    IO.inspect(meta)

    try do
      AmpsWeb.FileHandler.put_object_copy(
        bucket,
        "stage/" <> fname,
        bucket,
        location,
        metadata_directive: :REPLACE,
        meta: [{:reprocess, DateTime.to_iso8601(DateTime.utc_now())} | meta]
      )
      |> ExAws.request!()

      IO.puts("Successfully Reprocessed")
      :ok
    rescue
      e in ExAws.Error ->
        val =
          Regex.named_captures(
            ~r/\<Message\>(?<message>.*?)\<\/Message\>/,
            e.message
          )

        IO.inspect(val)

        :error

      error ->
        text = Exception.format(:error, error, __STACKTRACE__)
        IO.puts("process failed 2 #{inspect(text)}")
        stime = DateTime.to_iso8601(DateTime.utc_now())

        ev = %{
          msgid: msgid,
          status: "reprocess failed",
          action: "",
          stime: stime,
          reason: error
        }

        AmpsWeb.DB.insert("message_status", ev)

        {:ok, val} =
          AmpsWeb.DB.find_one_and_update(
            "messages",
            %{msgid: msgid},
            %{status: ev.status, stime: ev.stime}
          )

        :error
    end
  end

  def reprocess(message) do
    IO.puts("Reprocessing")
    msgid = message["msgid"]
    stime = DateTime.to_iso8601(DateTime.utc_now())

    Gnat.pub(:gnat, "AMPS.Events.Reprocess", Jason.encode!(message))

    ev = %{
      msgid: msgid,
      status: "reprocessing",
      action: "",
      stime: stime,
      reason: "Manual Reprocess"
    }

    AmpsWeb.DB.insert("message_status", ev)

    {:ok, val} =
      AmpsWeb.DB.find_one_and_update(
        "messages",
        %{msgid: msgid},
        %{status: ev.status, stime: ev.stime}
      )

    # IO.puts("updated status #{inspect(val)}")
  end

  defp add_headers(req, add) do
    IO.inspect(add)

    %ExAws.Operation.S3{headers: headers} = req
    IO.inspect(headers)

    headers =
      Enum.reduce(add, headers, fn {k, v}, acc ->
        Map.put(acc, k, v)
      end)

    Map.put(
      req,
      :headers,
      headers
    )
  end

  def put_object_copy(to, to_path, from, from_path, opts \\ []) do
    req = ExAws.S3.put_object_copy(to, to_path, from, from_path, opts)
    %ExAws.Operation.S3{headers: headers} = req
    %{"x-amz-copy-source" => path} = headers

    Map.put(
      req,
      :headers,
      Map.merge(headers, %{"x-amz-copy-source" => URI.decode_www_form(path)})
    )
  end

  defmodule Minio do
    def create_new_bucket(body) do
      bucketname = body["name"]
      username = body["account"]
      account = DB.find_one("accounts", %{"username" => username})

      bucket = AmpsWeb.Minio.create_bucket(:miniohandler, bucketname)
      IO.inspect(bucket)

      event =
        AmpsWeb.Minio.create_bucket_event(
          :miniohandler,
          {bucketname,
           %{
             "arn" => "arn:minio:sqs::AMPS:nats",
             "events" => ["put", "get"],
             "prefix" => "stage",
             "suffix" => ""
           }}
        )

      IO.inspect(event)

      policy = AmpsWeb.Minio.create_policy(:miniohandler, bucketname, bucketname)

      IO.inspect(policy)

      attach =
        AmpsWeb.Minio.attach_policy(
          :miniohandler,
          account["aws_access_key_id"],
          bucketname
        )

      IO.inspect(attach)
      body
    end

    def delete_bucket(body) do
      bucketname = body["name"]
      bucket = AmpsWeb.Minio.delete_bucket(:miniohandler, bucketname)
      IO.inspect(bucket)

      policy = AmpsWeb.Minio.delete_policy(:miniohandler, bucketname)

      IO.inspect(policy)
    end

    def create_account(body) do
      username = body["username"]
      bucket = AmpsWeb.Minio.create_bucket(:miniohandler, username)
      IO.inspect(bucket)

      DB.insert("rules", %{
        "name" => username,
        "rules" => [],
        "account" => username
      })

      event =
        AmpsWeb.Minio.create_bucket_event(
          :miniohandler,
          {username,
           %{
             "arn" => "arn:minio:sqs::AMPS:nats",
             "events" => ["put", "get"],
             "prefix" => "stage",
             "suffix" => ""
           }}
        )

      IO.inspect(event)

      user = AmpsWeb.Minio.create_user(:miniohandler, username, body["password"])

      IO.inspect(user)

      policy = AmpsWeb.Minio.create_policy(:miniohandler, username, username)

      IO.inspect(policy)

      attach = AmpsWeb.Minio.attach_policy(:miniohandler, username, username)

      IO.inspect(attach)

      IO.inspect(body["aws_secret_access_key"])

      body =
        Map.put(
          body,
          "aws_secret_access_key",
          AmpsWeb.Encryption.encrypt(body["aws_secret_access_key"])
        )

      body = Map.drop(body, ["password"])

      body
    end

    def update_account(body) do
      IO.inspect(body)

      if(body["aws_secret_access_key"] != "") do
        IO.puts("Updating Access Key")

        user =
          AmpsWeb.Minio.create_user(
            :miniohandler,
            body["username"],
            body["aws_secret_access_key"]
          )

        IO.inspect(user)

        body =
          Map.put(
            body,
            "aws_secret_access_key",
            AmpsWeb.Encryption.encrypt(body["aws_secret_access_key"])
          )

        body
      else
        Map.drop(body, ["aws_secret_access_key"])
      end
    end

    def delete_account(body) do
      username = body["username"]

      buckets = DB.find("rules", %{"account" => username})

      IO.inspect(buckets)

      Enum.each(buckets, fn bucket ->
        IO.inspect(bucket)
        delete = AmpsWeb.Minio.delete_bucket(:miniohandler, bucket["name"])
        IO.inspect(delete)
        policy = AmpsWeb.Minio.delete_policy(:miniohandler, bucket["name"])
        IO.inspect(policy)

        DB.delete("rules", %{
          "name" => bucket["name"]
        })
      end)

      user = AmpsWeb.Minio.delete_user(:miniohandler, username)
      IO.inspect(user)

      body
    end
  end

  defmodule AWS do
    def create_account(body) do
      # username = body["username"]
      # IO.inspect(Code.ensure_loaded?(SweetXml))

      bucket =
        ExAws.S3.list_buckets()
        |> ExAws.request!()

      IO.inspect(bucket)

      %ExAws.Operation.S3{
        body: "",
        bucket: "bucketybuckety",
        headers: %{},
        http_method: :put,
        params: %{},
        parser: &ExAws.Utils.identity/1,
        path: "/",
        resource: "",
        service: :s3,
        stream_builder: nil
      }
      |> ExAws.request!()

      # IO.inspect(op)

      # op = %ExAws.Operation.JSON{
      #   http_method: :get,
      #   service: :s3,
      #   headers: [
      #     {"x-amz-target", "S3.ListBuckets"},
      #     {"content-type", "application/x-amz-json-1.0"}
      #   ]
      # }

      # # access_key_id: "minioadmin",
      # # secret_access_key: "minioadmin",

      # result = ExAws.request(op)
      # IO.inspect(result)
      # event =
      #   AmpsWeb.Minio.create_bucket_event(
      #     :miniohandler,
      #     {username,
      #      %{
      #        "arn" => "arn:minio:sqs::AMPS:webhook",
      #        "events" => ["put", "get"],
      #        "prefix" => "stage",
      #        "suffix" => ""
      #      }}
      #   )

      # IO.inspect(event)

      # Mongo.insert_one(:mongo, "rules", %{
      #   "name" => username,
      #   "rules" => [],
      #   "account" => username
      # })

      # user = AmpsWeb.Minio.create_user(:miniohandler, username, body["password"])

      # IO.inspect(user)

      # policy = AmpsWeb.Minio.create_policy(:miniohandler, username, username)

      # IO.inspect(policy)

      # attach = AmpsWeb.Minio.attach_policy(:miniohandler, username, username)

      # IO.inspect(attach)

      body
    end
  end
end

defmodule VaultData do
  def host() do
    Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]
  end

  def create_vault_user(body) do
    token = AmpsWeb.Vault.get_token(:vaulthandler)
    IO.inspect(body)
    IO.inspect(token)

    {:ok, vault} =
      Vault.new(
        engine: Vault.Engine.KVV1,
        auth: Vault.Auth.Token,
        host: host(),
        credentials: %{token: token}
      )
      |> Vault.auth()

    result =
      Vault.request(vault, :post, "auth/userpass/users/" |> Kernel.<>(body["username"]),
        body: %{"token_policies" => "default", password: body["password"]}
      )

    IO.inspect(result)
    Map.drop(body, ["password", "confirmpswd"])
  end

  def update_vault_password(body) do
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    if body["password"] != nil && body["password"] != "" do
      IO.puts("updating password")

      IO.inspect(
        "auth/userpass/users/"
        |> Kernel.<>(body["username"])
        |> Kernel.<>("/")
        |> Kernel.<>(body["password"])
      )

      {:ok, vault} =
        Vault.new(
          engine: Vault.Engine.KVV1,
          auth: Vault.Auth.Token,
          host: host(),
          credentials: %{token: token}
        )
        |> Vault.auth()

      result =
        Vault.request(
          vault,
          :post,
          "auth/userpass/users/" |> Kernel.<>(body["username"]) |> Kernel.<>("/password"),
          body: %{"password" => body["password"]}
        )

      IO.inspect(result)
    end

    Map.drop(body, ["password", "confirmpswd"])
  end

  def vault_store_key(body, collection, unique, field) do
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    if body[field] != "" do
      {:ok, vault} =
        Vault.new(
          engine: Vault.Engine.KVV1,
          auth: Vault.Auth.Token,
          host: host(),
          credentials: %{token: token}
        )
        |> Vault.auth()

      result =
        Vault.write(vault, "kv/" <> collection <> "/" <> body[unique], %{field => body[field]})

      IO.inspect(result)
    end

    Map.drop(body, [field])
  end

  def get_vault() do
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    Vault.new(
      engine: Vault.Engine.KVV2,
      auth: Vault.Auth.Token,
      host: host(),
      credentials: %{token: token}
    )
    |> Vault.auth()
  end

  def read(collection, id) do
    case get_vault() do
      {:ok, vault} ->
        case Vault.read(vault, "kv/amps/" <> collection <> "/" <> id) do
          {:ok, resp} ->
            resp = Map.put(resp, "_id", id)
            {:ok, resp}

          {:error, error} ->
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def update(collection, body, id) do
    case get_vault() do
      {:ok, vault} ->
        case Vault.write(vault, "kv/amps/" <> collection <> "/" <> id, body) do
          {:ok, resp} ->
            {:ok, resp}

          {:error, error} ->
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def insert(collection, body) do
    case get_vault() do
      {:ok, vault} ->
        case Vault.write(vault, "kv/amps/" <> collection <> "/" <> AmpsUtil.get_id(), body) do
          {:ok, resp} ->
            {:ok, resp}

          {:error, error} ->
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def delete(collection, id) do
    case get_vault() do
      {:ok, vault} ->
        # v1/kv/metadata/amps/keys/c08771cd-46b3-4c32-8d8e-bca3f83e7a68
        case Vault.request(vault, :delete, "kv/metadata/amps/" <> collection <> "/" <> id) do
          {:ok, resp} ->
            IO.inspect(resp)
            {:ok, resp}

          {:error, error} ->
            IO.inspect(error)
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def get_rows(path) do
    {:ok, vault} = VaultData.get_vault()

    case Vault.list(vault, "kv/" <> path) do
      {:ok, %{"keys" => keys}} ->
        IO.inspect(keys)

        data =
          Enum.reduce(keys, [], fn key, acc ->
            {:ok, body} =
              Vault.read(
                vault,
                "kv/" <>
                  path <>
                  "/" <> key
              )

            body = Map.put(body, "_id", key)

            [body | acc]
          end)

        %{rows: data, success: true, count: Enum.count(data)}

      {:error, error} ->
        IO.inspect(error)
        %{rows: [], success: true, count: 0}
    end
  end
end
