defmodule AmpsWeb.DataController do
  use AmpsWeb, :controller
  require Logger
  import Argon2
  alias Amps.DB
  alias AmpsWeb.Encryption
  alias Amps.SvcManager
  alias Amps.VaultDatabase
  alias AmpsWeb.Util
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

  def upload_demo(conn, %{"file" => file}) do
    folder = String.trim(file.filename, ".zip")
    IO.inspect(File.ls())
    id = AmpsUtil.get_id()
    cwd = Path.join(Amps.Defaults.get("storage_temp"), id)
    res = :zip.unzip(File.read!(file.path), cwd: cwd)
    path = cwd
    demo = Jason.decode!(File.read!(Path.join(path, "pkg.json")))

    case DB.find_one("demos", Map.take(demo, ["name", "description"])) do
      nil ->
        imports =
          Enum.reduce(demo["imports"], [], fn imp, acc ->
            acc ++ [Map.put(imp, "rows", import_excel_data(Path.join(path, imp["file"])))]
          end)

        {:ok, readme, []} = Earmark.as_html(File.read!(Path.join(path, "README.md")))
        scripts = Path.wildcard(Path.join([path, demo["scripts"], "*.py"]))

        scripts =
          Enum.reduce(scripts, [], fn script, acc ->
            [
              %{
                name: Path.rootname(Path.basename(script)),
                data: File.read!(script)
              }
              | acc
            ]
          end)

        demo =
          demo
          |> Map.put("imports", imports)
          |> Map.put("readme", readme)
          |> Map.put("scripts", scripts)

        {:ok, id} = Amps.DB.insert("demos", demo)
        json(conn, id)

      duplicate ->
        send_resp(conn, 400, "Demo with name #{duplicate["name"]} already exists")
    end
  end

  def change_admin_password(conn, %{"id" => id}) do
    body = conn.body_params()
    password = body["password"]
    user = DB.find_one("admin", %{"_id" => id})

    case Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] do
      "vault" ->
        VaultDatabase.update_vault_password(user["username"], password)

      "db" ->
        %{password_hash: hashed} = add_hash(password)
        Map.put(user, "password", hashed)

        DB.find_one_and_update("admin", %{"_id" => id}, %{
          "password" => hashed
        })
    end

    json(conn, :ok)
  end

  def reset_admin_password(conn, %{"id" => id}) do
    obj = Amps.DB.find_one("users", %{"_id" => id})
    _length = 15

    symbol_count = Enum.count(@symbols)

    password =
      for _ <- 1..15,
          into: "",
          do: <<Enum.at(@symbols, :crypto.rand_uniform(0, symbol_count))>>

    # IO.inspect(password)
    # res = PowResetPassword.Plug.update_user_password(conn, %{"password" => hashed})

    case Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] do
      "vault" ->
        VaultDatabase.update_vault_password(obj["username"], password)

      "db" ->
        %{password_hash: hashed} = add_hash(password)

        DB.find_one_and_update("admin", %{"_id" => id}, %{
          "password" => hashed
        })
    end

    json(conn, %{success: %{password: password}})
  end

  def reset_password(conn, %{"id" => id}) do
    index = Util.index(conn.assigns().env, "users")
    _length = 15

    password = Util.create_password()

    # IO.inspect(password)
    %{password_hash: hashed} = add_hash(password)

    # res = PowResetPassword.Plug.update_user_password(conn, %{"password" => hashed})

    Amps.DB.find_one_and_update(index, %{"_id" => id}, %{
      "password" => hashed
    })

    # onb = fn msg, obj, env ->
    #   obj = obj |> Map.put("password", password)
    #   msg = Map.put(msg, "data", Jason.encode!(obj))

    #   Amps.Onboarding.onboard(
    #     msg,
    #     obj,
    #     conn.assigns().env
    #   )
    #   Map.merge(msg, %{"onboarding" => true, "user_id" => obj["_id"]})
    # end

    Util.ui_event(index, id, "reset_password", conn.assigns().env)

    json(conn, %{success: %{password: password}})
  end

  def approve_user(conn, %{"id" => id, "group" => group}) do
    index = Util.index(conn.assigns().env, "users")
    _length = 15

    password = Util.create_password()

    # IO.inspect(password)
    %{password_hash: hashed} = add_hash(password)

    # res = PowResetPassword.Plug.update_user_password(conn, %{"password" => hashed})

    Amps.DB.find_one_and_update(index, %{"_id" => id}, %{
      "password" => hashed,
      "approved" => true,
      "group" => group
    })

    # onb = fn msg, obj, env ->
    #   obj = obj |> Map.put("password", password)
    #   msg = Map.put(msg, "data", Jason.encode!(obj))

    #   Amps.Onboarding.onboard(
    #     msg,
    #     obj,
    #     env
    #   )
    #   Map.merge(msg, %{"onboarding" => true, "user_id" => obj["_id"]})
    # end

    Util.ui_event(index, id, "approve_user", conn.assigns().env)

    json(conn, %{success: %{password: password}})
  end

  def ssl(conn, _params) do
    gen_certs = Application.get_env(:amps, :gen_certs)
    use_ssl = Application.get_env(:amps, :use_ssl)

    json(conn, gen_certs and use_ssl)
  end

  def ssl_certify(conn, _params) do
    res = SiteEncrypt.force_certify(Amps.Proxy)
    IO.inspect(res)

    case res do
      :ok ->
        json(conn, "Successfully Initiated Certification")

      :error ->
        json(conn, "Error Initiating Certification")
    end
  end

  @spec upload(Plug.Conn.t(), map) :: Plug.Conn.t()
  def upload(conn, %{"topic" => topic, "file" => file, "meta" => meta}) do
    user = Pow.Plug.current_user(conn)

    msgid = AmpsUtil.get_id()
    dir = AmpsUtil.tempdir(msgid)
    fpath = Path.join(dir, msgid)
    res = File.cp(file.path, fpath)
    IO.inspect(res)
    info = File.stat!(fpath)
    meta = Jason.decode!(meta)

    msg =
      Map.merge(
        %{
          "msgid" => msgid,
          "fname" => file.filename,
          "fpath" => fpath,
          "fsize" => info.size,
          "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
          "user" => user.username,
          "service" => "Topic Upload"
        },
        meta
      )

    {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "Topic Upload"}, conn.assigns().env)

    AmpsEvents.send(
      msg,
      %{"output" => topic},
      %{},
      conn.assigns().env
    )

    AmpsEvents.end_session(sid, conn.assigns().env)
    json(conn, :ok)
  end

  # def download_manager(conn, %{"id" => id, "os" => os}) do
  #   mgr = Amps.DB.find_by_id(Util.index(conn.assigns().env, "system_managers"), id)

  #   # _host = Application.fetch_env!(:amps_portal, AmpsWeb.Endpoint)[:url]

  #   mandir = Application.app_dir(:amps_web, "priv/manager")

  #   {:ok, manfolder} = Temp.mkdir()

  #   fname = "system_manager"

  #   File.cp_r(
  #     Path.join([mandir, os]),
  #     Path.join(manfolder, fname)
  #   )

  #   File.copy(
  #     Path.join([mandir, "start.sh"]),
  #     Path.join(manfolder, "start.sh")
  #   )

  #   conf =
  #     File.read!(Path.join(mandir, "conf"))
  #     |> String.replace("{NODE}", "#{node()}")
  #     |> String.replace("{HOST}", mgr["host"])
  #     |> String.replace("{COOKIE}", "#{Node.get_cookie()}")
  #     |> String.replace("{NODE_ID}", id)
  #     |> String.replace("{NODE_ENV}", conn.assigns().env)

  #   # IO.inspect(script)

  #   File.write(Path.join(manfolder, "conf"), conf)

  #   zipname = mgr["name"] <> "_sysmgr.zip"

  #   files = File.ls!(manfolder) |> Enum.map(&String.to_charlist/1)

  #   {:ok, zippath} = Temp.mkdir()
  #   zippath = Path.join(zippath, zipname)
  #   {:ok, zip} = :zip.create(zippath, files, cwd: manfolder)

  #   IO.inspect(zip)

  #   send_download(conn, {:file, zip}, disposition: :attachment)
  # end

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

  def import_excel_data(path) do
    tables = Xlsxir.multi_extract(path)

    data =
      Enum.reduce(tables, [], fn {:ok, tid}, acc ->
        list = Xlsxir.get_list(tid)
        headers = Enum.at(list, 0)
        list = List.delete_at(list, 0)

        data =
          Enum.reduce(list, [], fn item, data ->
            has =
              Enum.reduce(item, false, fn val, acc ->
                acc || val
              end)

            if has do
              obj =
                Enum.reduce(Enum.with_index(item), %{}, fn {val, idx}, obj ->
                  if val != nil do
                    key = Enum.at(headers, idx)

                    try do
                      val = Jason.decode!(val)

                      Map.put(obj, key, val)
                    rescue
                      _e ->
                        splits = Path.split(key)

                        if Enum.count(splits) == 1 do
                          Map.put(obj, key, val)
                        else
                          keys =
                            Enum.reduce(splits, [], fn piece, acc ->
                              acc ++ [piece]
                            end)

                          put_in(obj, Enum.map(keys, &Access.key(&1, %{})), val)
                        end
                    end
                  else
                    obj
                  end
                end)

              [
                obj
                | data
              ]
            else
              data
            end
          end)

        Xlsxir.close(tid)
        acc ++ data
      end)

    Enum.reverse(data)
  end

  def get_excel_data(collection, data, field \\ nil) do
    config = AmpsWeb.Util.headers(collection)

    config =
      if field do
        config["subgrids"][field]
      else
        config
      end

    if config["types"] do
      headers = ["_id" | config["headers"]]

      types =
        Enum.reduce(data, %{}, fn obj, acc ->
          type = obj["type"]

          if type == nil || type == "history" do
            acc
          else
            theaders = headers ++ config["types"][obj["type"]]

            content = get_content(theaders, obj)

            if Map.has_key?(acc, type) do
              Map.put(acc, type, acc[type] ++ [content])
            else
              Map.put(acc, type, [content])
            end
          end
        end)

      Enum.reduce(types, [], fn {type, content}, acc ->
        [create_sheet(type, headers ++ config["types"][type], content) | acc]
      end)
    else
      headers = ["_id" | config["headers"]]

      rows =
        Enum.reduce(data, [], fn obj, acc ->
          acc ++ [get_content(headers, obj)]
        end)

      [create_sheet(collection, headers, rows)]
    end
  end

  def get_content(headers, obj) do
    Enum.reduce(headers, [], fn header, content ->
      splits = String.split(header, "/")

      if Enum.count(splits) == 1 do
        v = obj[header]

        v =
          if is_list(v) || is_map(v) do
            Jason.encode!(v)
          else
            v
          end

        content ++ [v]
      else
        _v =
          Enum.reduce(splits, obj, fn key, obj ->
            obj[key]
          end)

        content ++
          []
      end
    end)
  end

  def create_sheet(name, headers, contents) do
    formatted_contents = Enum.map(contents, fn x -> Enum.map(x, fn y -> [y] end) end)

    headers |> Enum.map(fn x -> [x, bold: true] end)
    row_data = [headers | formatted_contents]
    _newsheet = %Sheet{name: name, rows: row_data}
  end

  def sample_template_download(conn, %{
        "collection" => collection
      }) do
    data = AmpsWeb.Util.headers(collection)
    sheets = create_sample_sheets(collection, data)

    {:ok, {_name, binary}} = Elixlsx.write_to_memory(%Workbook{sheets: sheets}, collection)

    conn
    |> send_download({:binary, binary}, filename: "#{collection}_template.xlsx")
  end

  def sample_field_template_download(conn, %{
        "collection" => collection,
        "field" => field
      }) do
    data = AmpsWeb.Util.headers(collection, field)

    sheets = create_sample_sheets(collection, data)

    {:ok, {_name, binary}} = Elixlsx.write_to_memory(%Workbook{sheets: sheets}, collection)

    conn
    |> send_download({:binary, binary},
      filename: "#{collection}_#{field}_template.xlsx"
    )
  end

  def create_sample_sheets(collection, data) do
    case data["types"] do
      nil ->
        headers =
          data["headers"]
          |> Enum.map(fn x -> [x, bold: true] end)

        [
          %Sheet{name: collection, rows: [headers]}
          |> Sheet.set_pane_freeze(1, 0)
        ]

      _ ->
        Enum.reduce(data["types"], [], fn {k, v}, acc ->
          headers =
            (data["headers"] ++ v)
            |> Enum.map(fn x -> [x, bold: true] end)

          [
            %Sheet{name: k, rows: [headers]} |> Sheet.set_pane_freeze(1, 0)
            | acc
          ]
        end)
    end
  end

  def import_data(conn, %{"collection" => _collection, "file" => file}) do
    data = import_excel_data(file.path)
    json(conn, data)
  end

  def export(collection, env) do
    data = DB.find(collection)
    IO.inspect(data)
    base_coll = Util.base_index(env, collection)
    IO.inspect(base_coll)

    sheets = get_excel_data(base_coll, data)

    {:ok, {_name, binary}} =
      %Workbook{sheets: sheets}
      |> Elixlsx.write_to_memory(base_coll)

    binary
  end

  def export_collection(conn, %{
        "collection" => collection
      }) do
    binary = export(collection, conn.assigns().env)

    conn
    |> send_download({:binary, binary}, filename: "#{collection}.xlsx")
  end

  def export_sub(collection, id, field, env) do
    data = DB.find_one(collection, %{"_id" => id})
    base_coll = Util.base_index(env, collection)
    sheets = get_excel_data(base_coll, data[field], field)

    {:ok, {_name, binary}} =
      %Workbook{sheets: sheets}
      |> Elixlsx.write_to_memory(base_coll)

    filename =
      if base_coll == "users" do
        "#{data["username"]}_#{field}.xlsx"
      else
        "#{data["name"]}_#{field}.xlsx"
      end

    {binary, filename}
  end

  def export_sub_collection(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field
      }) do
    _body = conn.body_params()
    {binary, filename} = export_sub(collection, id, field, conn.assigns().env)

    conn
    |> send_download({:binary, binary}, filename: filename)
  end

  def export_selection(conn, %{"collection" => collection}) do
    body = conn.body_params()

    rows = body["rows"]
    sheets = get_excel_data(collection, rows)

    {:ok, {_name, binary}} =
      %Workbook{sheets: sheets}
      |> Elixlsx.write_to_memory(collection)

    conn
    |> send_download({:binary, binary},
      filename: "#{collection}_#{Enum.count(rows)}.xlsx"
    )
  end

  def write_in_workbook(sheet_name, column_headers, contents) do
    # formatted_contents = Enum.map(contents, fn x  -> Enum.map(x, fn y -> [y, {:bold, false}] end)  end)
    formatted_contents = Enum.map(contents, fn x -> Enum.map(x, fn y -> [y] end) end)

    row_data = [column_headers | formatted_contents]
    newsheet = %Sheet{name: sheet_name, rows: row_data}

    newsheet = Sheet.set_pane_freeze(newsheet, 1, 0)
    workbook = %Workbook{sheets: [newsheet]}
    workbook
  end

  def send_event(conn, %{"topic" => topic, "meta" => meta}) do
    user = Pow.Plug.current_user(conn)

    msgid = AmpsUtil.get_id()
    dir = AmpsUtil.tempdir(msgid)
    _fpath = Path.join(dir, msgid)

    meta =
      Map.merge(
        %{"msgid" => msgid, "user" => user.username, "service" => "Topic Event"},
        Jason.decode!(meta)
      )

    {msg, sid} = AmpsEvents.start_session(meta, %{"service" => "Topic Event"}, conn.assigns().env)

    AmpsEvents.send(
      msg,
      %{"output" => topic},
      %{},
      conn.assigns().env
    )

    AmpsEvents.end_session(sid, conn.assigns().env)
    json(conn, :ok)
  end

  def reprocess(conn, %{"msgid" => id}) do
    obj =
      Amps.DB.find_one(Util.index(conn.assigns().env, "message_events"), %{
        "_id" => id
      })

    topic = obj["topic"]
    IO.inspect(obj)

    msg = obj |> Map.drop(["status", "action", "topic", "_id", "index", "etime"])

    {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "Reprocess"}, conn.assigns().env)

    AmpsEvents.send(msg, %{"output" => topic}, %{}, conn.assigns().env)
    AmpsEvents.end_session(sid, conn.assigns().env)

    json(conn, :ok)
  end

  def clear_env(conn, %{"name" => name}) do
    AmpsUtil.clear_env(name)
    json(conn, :ok)
  end

  def export_env(conn, %{"env" => env}) do
    id = AmpsUtil.get_id()
    dir = AmpsUtil.tempdir(id)

    demo = conn.body_params()

    imports =
      Enum.reduce(AmpsWeb.Util.order(), [], fn index, imports ->
        pieces = String.split(index, "/")
        index = Enum.at(pieces, 0)

        case Enum.count(pieces) do
          1 ->
            binary = export(Util.index(env, index), env)
            filename = "#{index}.xlsx"
            File.write(Path.join(dir, filename), binary)

            [
              %{
                "type" => "collection",
                "collection" => index,
                "idtype" => "provided",
                "file" => filename
              }
              | imports
            ]

          2 ->
            envindex = Util.index(env, index)

            subimports =
              Enum.reduce(DB.find(envindex), [], fn obj, subimports ->
                entity = obj["_id"]
                field = Enum.at(pieces, 1)
                {binary, filename} = export_sub(envindex, entity, field, env)
                File.write(Path.join(dir, filename), binary)

                [
                  %{
                    "type" => "field",
                    "collection" => index,
                    "entity" => entity,
                    "field" => field,
                    "idtype" => "provided",
                    "file" => filename
                  }
                  | subimports
                ]
              end)

            subimports ++ imports
        end
      end)

    imports = Enum.reverse(imports)
    demo = demo |> Map.put("imports", imports) |> Map.put("scripts", "scripts")
    IO.inspect(demo)
    File.write(Path.join(dir, "pkg.json"), Jason.encode!(demo) |> Jason.Formatter.pretty_print())
    IO.inspect(demo)
    readme = "# #{demo["name"]}\n## #{demo["desc"]}"
    IO.inspect(readme)
    File.write!(Path.join(dir, "README.md"), readme)
    File.cp_r!(AmpsUtil.get_mod_path(env), Path.join(dir, "scripts"))

    files = File.ls!(dir) |> Enum.map(&String.to_charlist/1)

    zippath = AmpsUtil.tempdir(AmpsUtil.get_id())
    zippath = Path.join(zippath, "#{demo["name"]}.zip")
    {:ok, zip} = :zip.create(zippath, files, cwd: dir)

    send_download(conn, {:file, zip}, disposition: :attachment)
  end

  def reroute(conn, %{"id" => id}) do
    obj = Amps.DB.find_one("message_events", %{"_id" => id})
    body = conn.body_params()
    topic = body["topic"]
    meta = Jason.decode!(body["meta"])

    msg = obj |> Map.drop(["status", "action", "topic", "_id", "index", "etime"])
    {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "Reroute"}, conn.assigns().env)

    AmpsEvents.send(Map.merge(msg, meta), %{"output" => topic}, %{}, conn.assigns().env)
    AmpsEvents.end_session(sid, conn.assigns().env)

    json(conn, :ok)
  end

  def reroute_many(conn, _params) do
    body = conn.body_params()
    ids = body["ids"]
    _topic = body["topic"]
    _meta = Jason.decode!(body["meta"])

    Enum.each(ids, fn id ->
      obj = Amps.DB.find_one("message_events", %{"_id" => id})
      body = conn.body_params()
      topic = body["topic"]
      meta = Jason.decode!(body["meta"])

      msg = obj |> Map.drop(["status", "action", "topic", "_id", "index", "etime"])

      AmpsEvents.send(Map.merge(msg, meta), %{"output" => topic}, %{}, conn.assigns().env)
    end)

    json(conn, :ok)
  end

  def update_logo(conn, %{"logo" => logo}) do
    DB.find_one_and_update("config", %{"name" => "SYSTEM"}, %{"logo" => logo})

    img = Base.decode64!(logo)
    path = Path.join(:code.priv_dir(:amps_web), "static/images/logo")
    portal_path = Path.join(:code.priv_dir(:amps_portal), "static/images/logo")
    File.write(path, img)
    File.write(portal_path, img)

    json(conn, :ok)
  end

  def index(conn, %{"collection" => collection}) do
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

  def create(conn, %{"collection" => collection}) do
    body = Util.before_create(collection, conn.body_params(), conn.assigns)

    {:ok, res} = DB.insert(collection, body)

    Util.after_create(collection, Map.merge(body, %{"_id" => res}), conn.assigns().env)

    json(conn, res)
  end

  def create_with_id(conn, %{"collection" => collection, "id" => id}) do
    body = Util.before_create(collection, conn.body_params(), conn.assigns().env)
    {:ok, res} = DB.insert_with_id(collection, body, id)

    Util.after_create(collection, body, conn.assigns().env)

    json(conn, res)
  end

  def show(conn, %{"collection" => collection, "id" => id}) do
    object = DB.find_by_id(collection, id)

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
    old = DB.find_by_id(collection, id)
    body = conn.body_params()

    body = Util.before_update(collection, id, body, conn.assigns().env, old)

    result = DB.update(collection, body, id)

    Util.after_update(collection, id, body, conn.assigns().env, old)
    Util.ui_event(collection, id, "update", conn.assigns().env)

    json(conn, result)
  end

  def update_with_id(conn, %{"collection" => collection, "id" => id}) do
    old = DB.find_by_id(collection, id)
    body = conn.body_params()

    body = Util.before_update(collection, id, body, conn.assigns().env, old)

    {:ok, result} = DB.insert_with_id(collection, body, id)

    Util.after_update(collection, id, body, conn.assigns().env, old)
    Util.ui_event(collection, id, "update", conn.assigns().env)

    json(conn, result)
  end

  def delete(conn, %{"collection" => collection, "id" => id}) do
    object = DB.find_by_id(collection, id)
    base_index = Util.base_index(conn.assigns().env, collection)

    case base_index do
      # "accounts" ->
      #   S3.Minio.delete_account(object)

      "users" ->
        DB.delete("mailbox_auth", %{
          "mailbox" => object["username"]
        })

        rules = object["rules"] || []

        Enum.each(rules, fn rule ->
          if rule["type"] == "download" do
            AmpsPortal.Util.agent_rule_deletion(object, rule, conn.assigns().env)
          end
        end)

      "services" ->
        types = SvcManager.service_types()

        if Map.has_key?(types, String.to_atom(object["type"])) do
          Gnat.pub(:gnat, "amps.events.svcs.handler.#{object["name"]}.stop", "")
        end

        if object["type"] == "subscriber" || (object["type"] == "pyservice" && object["receive"]) do
          Util.delete_config_consumer(object, conn.assigns().env)
        end

        if object["type"] == "gateway" do
          mod =
            case conn.assigns().env do
              "" ->
                :"Amps.Gateway.#{object["name"]}"

              env ->
                :"Amps.Gateway.#{env}.#{object["name"]}"
            end

          :code.delete(mod)
          :code.purge(mod)
        end

      "actions" ->
        if object["type"] == "batch" do
          Util.delete_batch_consumer(object)
        end

      _ ->
        conn.body_params()
    end

    resp = DB.delete_by_id(collection, id)

    case base_index do
      "environments" ->
        Gnat.pub(:gnat, "amps.events.env.handler.#{object["name"]}.destroy", "")
        Gnat.pub(:gnat, "amps.events.archive.handler.stop.#{object["name"]}", "")

      _ ->
        nil
    end

    # onb = fn msg, obj, env ->
    #   msg = Map.put(msg, "data", Jason.encode!(obj))

    #   Amps.Onboarding.onboard(
    #     msg,
    #     obj,
    #     conn.assigns().env
    #   )

    #   Map.merge(msg, %{"onboarding" => true, "user_id" => obj["_id"]})
    # end

    Util.ui_delete_event(collection, object, conn.assigns().env)

    json(conn, resp)
  end

  def get_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field
      }) do
    data = DB.find_one(collection, %{"_id" => id})
    json(conn, data[field])
  end

  def get_streams(conn, _params) do
    {:ok, %{streams: streams}} = Jetstream.API.Stream.list(:gnat)
    json(conn, streams)
  end

  def add_to_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field
      }) do
    Logger.debug("Adding Field")
    body = conn.body_params()

    body =
      Util.before_field_create(
        Util.base_index(conn.assigns().env, collection),
        id,
        field,
        body,
        conn.assigns().env
      )

    fieldid = DB.add_to_field(collection, body, id, field)
    updated = DB.find_one(collection, %{"_id" => id})

    Util.after_field_create(
      Util.base_index(conn.assigns().env, collection),
      id,
      field,
      fieldid,
      body,
      updated,
      conn.assigns().env
    )

    json(conn, updated)
  end

  def add_to_field_with_id(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field,
        "fieldid" => fieldid
      }) do
    Logger.debug("Adding Field")
    body = conn.body_params()

    fieldid = DB.add_to_field_with_id(collection, body, id, field, fieldid)
    updated = DB.find_one(collection, %{"_id" => id})

    Util.after_field_create(
      Util.base_index(conn.assigns().env, collection),
      id,
      field,
      fieldid,
      body,
      updated,
      conn.assigns().env
    )

    Util.ui_field_event(collection, id, field, fieldid, "create", conn.assigns().env)

    json(conn, updated)
  end

  def get_in_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field,
        "fieldid" => fieldid
      }) do
    Logger.debug("Getting Field")
    _body = conn.body_params()
    result = DB.get_in_field(collection, id, field, fieldid)
    json(conn, result)
  end

  def update_field(conn, %{
        "collection" => collection,
        "id" => id,
        "field" => field
      }) do
    body = conn.body_params()
    IO.inspect(%{field => body})
    DB.find_one_and_update(collection, %{"_id" => id}, %{field => body})
    Util.ui_event(collection, id, "update.#{field}", conn.assigns().env)
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

    case Util.base_index(conn.assigns().env, collection) do
      "services" ->
        case field do
          "defaults" ->
            Application.put_env(
              :amps,
              String.to_atom(body["field"]),
              body["value"]
            )

          _ ->
            nil
        end

      "users" ->
        case field do
          "rules" ->
            AmpsPortal.Util.agent_rule_update(id, body, conn.assigns().env)

          _ ->
            nil
        end

      _ ->
        nil
    end

    Util.ui_field_event(collection, id, field, fieldid, "update", conn.assigns().env)

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
    obj = DB.find_one(collection, %{"_id" => id})
    item = DB.get_in_field(collection, id, field, fieldid)
    result = DB.delete_from_field(collection, body, id, field, fieldid)

    case Util.base_index(conn.assigns().env, collection) do
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
            AmpsPortal.Util.agent_rule_deletion(obj, item, conn.assigns().env)

          "tokens" ->
            AmpsPortal.Util.after_token_delete(obj, item, conn.assigns().env)

          _ ->
            nil
        end

      _ ->
        nil
    end

    Util.ui_delete_event(collection, obj, conn.assigns().env)

    json(conn, result)
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
    cond do
      is_map(map) ->
        cond do
          is_struct(map) ->
            map

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

      true ->
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
          Enum.at(pieces, 2) <>
            "-" <> Enum.at(pieces, 0) <> "-" <> Enum.at(pieces, 1)
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
        "stime" =>
          DateTime.utc_now()
          |> DateTime.truncate(:millisecond)
          |> DateTime.to_iso8601(),
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
    _result = File.write(schedulepath, Jason.encode!(schedule))

    _put =
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
        "stime" =>
          DateTime.utc_now()
          |> DateTime.truncate(:millisecond)
          |> DateTime.to_iso8601(),
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

        rule =
          rule
          |> Map.drop(["name"])
          |> Map.put("active", to_string(rule["active"]))

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
    _result = File.write(schedulepath, Jason.encode!(schedule))

    _put =
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
        _val =
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

        {:ok, _val} =
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

    {:ok, _val} =
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
