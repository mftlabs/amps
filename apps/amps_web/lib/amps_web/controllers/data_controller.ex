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
  alias Amps.DB
  alias AmpsWeb.Encryption
  alias Amps.SvcManager
  alias AmpsWeb.ServiceController
  alias Elixlsx.Workbook
  alias Elixlsx.Sheet

  plug(
    AmpsWeb.EnsureRolePlug,
    :Admin
    when action in [
           :create,
           :update,
           :delete,
           :add_to_field,
           :update_in_field,
           :delete_from_field,
           :reset_password,
           :reprocess,
           :download,
           :upload
         ]
  )

  plug(
    AmpsWeb.EnsureRolePlug,
    [:Guest, :Admin] when action in [:index, :show, :get_field, :get_in_field]
  )

  plug(AmpsWeb.AuditPlug)

  def reset_password(conn, %{"id" => id}) do
    obj = Amps.DB.find_one("users", %{"_id" => id})
    length = 15
    password = :crypto.strong_rand_bytes(length) |> Base.url_encode64() |> binary_part(0, length)
    IO.inspect(password)
    %{password_hash: hashed} = add_hash(password)
    # res = PowResetPassword.Plug.update_user_password(conn, %{"password" => hashed})

    Amps.DB.find_one_and_update("users", %{"username" => obj["username"]}, %{
      "password" => hashed
    })

    json(conn, %{success: %{password: password}})
  end

  @spec upload(Plug.Conn.t(), map) :: Plug.Conn.t()
  def upload(conn, %{"topic" => topic, "file" => file, "meta" => meta}) do
    msgid = AmpsUtil.get_id()
    dir = AmpsUtil.tempdir(msgid)
    fpath = Path.join(dir, msgid)
    File.cp(file.path, fpath)
    info = File.stat!(fpath)
    meta = Jason.decode!(meta)

    msg =
      Map.merge(
        %{
          "msgid" => msgid,
          "fname" => file.filename,
          "fpath" => fpath,
          "fsize" => info.size,
          "ftime" => DateTime.to_iso8601(DateTime.utc_now())
        },
        meta
      )

    AmpsEvents.send(msg, %{"output" => topic}, %{})
    json(conn, :ok)
  end

  # def export(conn, %{"collection" => collection}) do
  #   headers = ["Name", "Type", "Description"]
  #   contents = [["one", "two", "three"], ["four", "five", "six"], ["seven", "eight", "nine"]]
  #   formatted = Enum.map(headers, fn x -> [x, bold: true] end)

  #   write_in_workbook("Services", formatted, contents)
  #   |> Elixlsx.write_to("hello.xlsx")
  # end

  def ignore_keys(collection, obj) do
    case collection do
      "users" ->
        Map.drop(obj, ["password"])
        _ ->
        obj
    end
  end

  def export_collection(conn, %{
      "collection" => collection
    }) do
    IO.puts("Generating report for:::: #{collection}")
    data = DB.find(collection)

    headers =
      Enum.reduce(Enum.with_index(data), [], fn {obj, idx}, acc ->
        obj = ignore_keys(collection, obj)

        Enum.reduce(obj, acc, fn {k, v}, acc ->
          IO.inspect(acc)

          if Enum.member?(acc, k) do
            acc
          else
            if is_map(v) || is_list(v) do
              if is_map(v) do
                Enum.reduce(v, acc, fn {mk, _mv}, keys ->
                  if Enum.member?(keys, Path.join(k, mk)) do
                    keys
                  else
                    keys ++ [Path.join(k, mk)]
                  end
                end)
              else
                acc
              end
            else
              acc ++ [k]
            end
          end
        end)
      end)

    IO.inspect(headers)

    contents =
      Enum.reduce(data, [], fn obj, contents ->
        contents ++
          [
            Enum.reduce(headers, [], fn k, acc ->
              keys = Path.split(k)

              if Enum.count(keys) == 1 do
                acc ++ [obj[k]]
              else
                acc ++
                  [
                    Enum.reduce(keys, obj, fn key, obj ->
                      obj[key]
                    end)
                  ]
              end
            end)
          ]
      end)

    formatted = Enum.map(headers, fn x -> [x, bold: true] end)

    {:ok, {name, binary}} =
      write_in_workbook(collection, formatted, contents)
      |> Elixlsx.write_to_memory(collection)

    binary
    file = File.write("#{collection}.xlsx", binary)
    contents = File.read!("#{collection}.xlsx")
    conn
    |> put_resp_content_type("application/octet-stream")
    |> put_resp_header("content-disposition", "attachment; filename=\"#{collection}.xlsx\"")
      |> send_download({:binary, contents}, filename: "#{collection}.xlsx")


  end

  def write_in_workbook(sheet_name, column_headers, contents) do
    IO.inspect(column_headers)
    IO.inspect(contents)

    # formatted_contents = Enum.map(contents, fn x  -> Enum.map(x, fn y -> [y, {:bold, false}] end)  end)
    formatted_contents = Enum.map(contents, fn x -> Enum.map(x, fn y -> [y] end) end)
    IO.inspect(formatted_contents)
    row_data = [column_headers | formatted_contents]
    IO.inspect(row_data)
    newsheet = %Sheet{name: sheet_name, rows: row_data}
    # IO.inspect(newsheet)
    workbook = %Workbook{sheets: [newsheet]}
    # IO.inspect(workbook)
    workbook
  end

  def send_event(conn, %{"topic" => topic, "meta" => meta}) do
    msgid = AmpsUtil.get_id()
    dir = AmpsUtil.tempdir(msgid)
    fpath = Path.join(dir, msgid)
    meta = Jason.decode!(meta)

    AmpsEvents.send(meta, %{"output" => topic}, %{})
    json(conn, :ok)
  end

  def reprocess(conn, %{"msgid" => msgid}) do
    obj = Amps.DB.find_one("message_events", %{"msgid" => msgid, "status" => "started"})
    topic = obj["topic"]
    msg = obj |> Map.drop(["status", "action", "topic", "_id", "index", "etime"])
    AmpsEvents.send(msg, %{"output" => topic}, %{})

    json(conn, :ok)
  end

  def reroute(conn, %{"id" => id}) do
    obj = Amps.DB.find_one("message_events", %{"_id" => id})
    body = conn.body_params()
    topic = body["topic"]
    meta = Jason.decode!(body["meta"])
    msg = obj |> Map.drop(["status", "action", "topic", "_id", "index", "etime"])
    AmpsEvents.send(Map.merge(msg, meta), %{"output" => topic}, %{})

    json(conn, :ok)
  end

  def reroute_many(conn, _params) do
    body = conn.body_params()
    ids = body["ids"]
    topic = body["topic"]
    meta = Jason.decode!(body["meta"])

    Enum.each(ids, fn id ->
      obj = Amps.DB.find_one("message_events", %{"_id" => id})
      body = conn.body_params()
      topic = body["topic"]
      meta = Jason.decode!(body["meta"])
      msg = obj |> Map.drop(["status", "action", "topic", "_id", "index", "etime"])
      AmpsEvents.send(Map.merge(msg, meta), %{"output" => topic}, %{})
    end)

    json(conn, :ok)
  end

  def index(conn, %{"collection" => collection}) do
    if vault_collection(collection) do
      data = VaultDatabase.get_rows(collection)

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

  def create(conn, %{"collection" => collection}) do
    body =
      case collection do
        "users" ->
          body = conn.body_params()

          body = Map.put(body, "password", nil)

          # DB.insert("mailbox_auth", %{
          #   mailbox: body["username"],
          #   password: body["password"],
          #   active: true
          # })

          # account = S3.Minio.create_account(conn.body_params())
          # S3.create_schedule(account)
          # account
          body

        # VaultDatabase.vault_store_key(conn.body_params(), collection, "account", "cred")
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

    {:ok, res} =
      if vault_collection(collection) do
        VaultDatabase.insert(collection, body)
      else
        DB.insert(collection, body)
      end

    case collection do
      "services" ->
        types = SvcManager.service_types()

        if Map.has_key?(types, String.to_atom(body["type"])) do
          Amps.SvcManager.load_service(body["name"])
        end

      "scheduler" ->
        Amps.Scheduler.load(body["name"])

      "actions" ->
        body = conn.body_params()

        if body["type"] == "batch" do
          create_batch_consumer(body)
        end

        body

      _ ->
        nil
    end

    IO.inspect(res)
    json(conn, res)
  end

  def show(conn, %{"collection" => collection, "id" => id}) do
    object =
      if vault_collection(collection) do
        {:ok, data} = VaultDatabase.read(collection, id)
        data
      else
        DB.find_one(collection, %{"_id" => id})
      end

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

  def update(conn, %{"collection" => collection, "id" => id}) do
    body =
      case collection do
        "actions" ->
          old = DB.find_one("actions", %{"_id" => id})

          case old["type"] do
            "batch" ->
              delete_batch_consumer(old)
              conn.body_params()

            _ ->
              conn.body_params()
          end

        "users" ->
          case Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] do
            "vault" ->
              VaultDatabase.update_vault_password(conn.body_params())

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
        {:ok, resp} = VaultDatabase.update(collection, body, id)
        resp
      else
        DB.update(collection, body, id)
      end

    case collection do
      "accounts" ->
        S3.update_schedule(id)

      "services" ->
        service = DB.find_one("services", %{"_id" => id})

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

      "actions" ->
        action = DB.find_one("actions", %{"_id" => id})

        if body["type"] == "batch" do
          create_batch_consumer(body)
        end

      "scheduler" ->
        Amps.Scheduler.update(body)

      _ ->
        nil
    end

    json(conn, result)
  end

  def delete(conn, %{"collection" => collection, "id" => id}) do
    object =
      if vault_collection(collection) do
        VaultDatabase.read(collection, id)
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

      "services" ->
        types = SvcManager.service_types()

        if Map.has_key?(types, String.to_atom(object["type"])) do
          AmpsWeb.ServiceController.stop_service(object["name"])
        end

        if object["type"] == "subscriber" do
          {stream, consumer} = AmpsUtil.get_names(object)
          AmpsUtil.delete_consumer(stream, consumer)
        end

      "actions" ->
        if object["type"] == "batch" do
          delete_batch_consumer(object)
        end

      _ ->
        conn.body_params()
    end

    resp =
      if vault_collection(collection) do
        {:ok, resp} = VaultDatabase.delete(collection, id)
        resp
      else
        DB.delete_one(collection, %{"_id" => id})
      end

    json(conn, resp)
  end

  def get_field(conn, %{"collection" => collection, "id" => id, "field" => field}) do
    data = DB.find_one(collection, %{"_id" => id})
    json(conn, data[field])
  end

  def get_streams(conn, _params) do
    {:ok, %{streams: streams}} = Jetstream.API.Stream.list(:gnat)
    json(conn, streams)
  end

  def add_to_field(conn, %{"collection" => collection, "id" => id, "field" => field}) do
    Logger.debug("Adding Field")
    body = conn.body_params()

    body = Map.put(body, "_id", AmpsUtil.get_id())
    IO.inspect(body)
    updated = DB.add_to_field(collection, body, id, field)

    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.put_env(:amps, String.to_atom(body["field"]), body["value"])

          _ ->
            nil
        end

      "users" ->
        case field do
          "rules" ->
            DB.find_one_and_update("users", %{"_id" => id}, %{
              "ufa" => %{
                "stime" =>
                  DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
              }
            })

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
        "fieldid" => fieldid
      }) do
    Logger.debug("Getting Field")
    body = conn.body_params()
    result = DB.get_in_field(collection, id, field, fieldid)
    json(conn, result)
  end

  def update_field(conn, %{"collection" => collection, "id" => id, "field" => field}) do
    body = conn.body_params()
    DB.find_one_and_update(collection, %{"_id" => id}, %{field => body})
    json(conn, :ok)
  end

  def update_in_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field,
        "fieldid" => fieldid
      }) do
    Logger.debug("Updating Field")
    body = conn.body_params()
    result = DB.update_in_field(collection, body, id, field, fieldid)

    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.put_env(:amps, String.to_atom(body["field"]), body["value"])

          _ ->
            nil
        end

      "users" ->
        case field do
          "rules" ->
            DB.find_one_and_update("users", %{"_id" => id}, %{
              "ufa" => %{
                "stime" =>
                  DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
              }
            })

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
        "fieldid" => fieldid
      }) do
    Logger.debug("Deleting Field")
    body = conn.body_params()
    item = DB.get_in_field(collection, id, field, fieldid)
    result = DB.delete_from_field(collection, body, id, field, fieldid)

    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.delete_env(:amps, String.to_atom(item["field"]))

          _ ->
            nil
        end

      "users" ->
        case field do
          "rules" ->
            DB.find_one_and_update("users", %{"_id" => id}, %{
              "ufa" => %{
                "stime" =>
                  DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
              }
            })

          _ ->
            nil
        end

      _ ->
        nil
    end

    json(conn, result)
  end

  def create_batch_consumer(body) do
    if body["inputtype"] == "topic" do
      {stream, consumer} = AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["input"]})

      opts =
        if body["policy"] == "by_start_time" do
          %{
            deliver_policy: String.to_atom(body["policy"]),
            opt_start_time: body["start_time"]
          }
        else
          %{
            deliver_policy: String.to_atom(body["policy"])
          }
        end

      AmpsUtil.create_consumer(stream, consumer, body["input"], opts)
    end
  end

  @spec delete_batch_consumer(nil | maybe_improper_list | map) :: any
  def delete_batch_consumer(body) do
    if body["inputtype"] == "topic" do
      {stream, consumer} = AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["input"]})

      AmpsUtil.delete_consumer(stream, consumer)
    end
  end

  def vault_collection(collection) do
    collections = [
      "keys"
    ]

    Enum.member?(collections, collection)
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
  alias Amps.DB

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
    result = File.write(schedulepath, Jason.encode!(schedule))

    put =
      ExAws.S3.put_object(
        account["username"],
        "schedule/schedule.json",
        File.read!(schedulepath)
      )
      |> ExAws.request!()

    File.rm_rf!(path)
  end

  def update_schedule(id) do
    account = Amps.DB.find_one("accounts", %{"_id" => id})

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
    result = File.write(schedulepath, Jason.encode!(schedule))

    put =
      ExAws.S3.put_object(
        account["username"],
        "schedule/schedule.json",
        File.read!(schedulepath)
      )
      |> ExAws.request!()

    File.rm_rf!(path)
  end

  def reprocess_copy(message) do
    location = message["location"]

    bucket = message["bucket"]

    msgid = message["msgid"]

    fname = List.last(String.split(location, "/"))

    obj = ExAws.S3.head_object(bucket, location) |> ExAws.request!()

    meta =
      Enum.reduce(obj.headers, [], fn {k, v}, acc ->
        if String.starts_with?(k, "x-amz-meta") do
          [{String.replace(k, "x-amz-meta-", ""), v} | acc]
        else
          acc
        end
      end)

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

      :ok
    rescue
      e in ExAws.Error ->
        val =
          Regex.named_captures(
            ~r/\<Message\>(?<message>.*?)\<\/Message\>/,
            e.message
          )

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

        Amps.DB.insert("message_status", ev)

        {:ok, val} =
          Amps.DB.find_one_and_update(
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

    Amps.DB.insert("message_status", ev)

    {:ok, val} =
      Amps.DB.find_one_and_update(
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
