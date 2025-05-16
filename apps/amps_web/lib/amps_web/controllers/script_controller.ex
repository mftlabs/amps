defmodule AmpsWeb.ScriptController do
  use AmpsWeb, :controller
  require Logger
  # alias AmpsWeb.Python
  alias Amps.DB
  alias AmpsWeb.Util

  @symbols ~c'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ$@!@#$%&*'

  plug(
    AmpsWeb.EnsureRolePlug,
    :Admin
    when action in [
           :create,
           :update,
           :delete
         ]
  )

  plug(
    AmpsWeb.EnsureRolePlug,
    [:Guest, :Admin] when action in [:index, :show]
  )

  plug(AmpsWeb.AuditPlug)

  def index(conn, _) do
    scripts = Path.wildcard(get_path("*", conn.assigns.env))

    rows =
      Enum.reduce(scripts, [], fn script, acc ->
        info = File.stat!(script)
        [%{name: Path.basename(script, ".py"), size: info.size} | acc]
      end)

    json(conn, rows)
  end

  def duplicate(conn, %{"name" => name}) do
    json(conn, File.exists?(get_path(name, conn.assigns.env)))
  end

  def show(conn, %{"id" => name}) do
    script = get_path(name, conn.assigns.env)
    info = File.stat(script)

    case info do
      {:ok, info} ->
        script = %{
          name: Path.basename(script, ".py"),
          size: info.size,
          data: File.read!(script)
        }

        json(conn, script)

      {:error, :enoent} ->
        send_resp(conn, 400, "Script Does not Exists")

      _ ->
        send_resp(conn, 500, "Unkown Error")
    end
  end

  def create(conn, _params) do
    body = conn.body_params
    name = body["name"]
    script = get_path(name, conn.assigns.env)

    resp = File.mkdir_p!(Path.dirname(script))
    IO.inspect(resp)
    IO.inspect(script)

    data =
      if body["data"] && body["data"] != "" do
        body["data"]
      else
        if body["template"] do
          template =
            DB.find_one(Util.index(conn.assigns.env, "templates"), %{
              "name" => body["template"]
            })

          case template do
            nil ->
              case body["type"] do
                "action" ->
                  "from amps import Action\n\n\nclass #{name}(Action):\n    def action(self):\n        return Action.send_status(\"completed\")"

                "endpoint" ->
                  "from amps import Endpoint\n\n\nclass #{name}(Endpoint):\n    def action(self):\n        return Endpoint.send_resp_data(\"Success\", 200)"
              end

            template ->
              template["data"]
          end
        else
          "import json\nimport os\nimport uuid\n\n# msgdata is a JSON encoded object with two keys:\n# \"msg\" which contains the message data and\n# \"action\" which contains the action configuration.\n# extra is a JSON encoded object with the extra parameters specified in the action configuration\n\n\ndef run(msgdata):\n    msgdata = json.loads(msgdata)\n    msg = msgdata[\"msg\"]\n    parms = msgdata[\"parms\"]\n    sysparms = msgdata[\"sysparms\"]\n\n    output = action(msg, parms, sysparms)\n    return json.dumps(output)\n\n\ndef action(msg, parms, sysparms):\n    try:\n        # Action Here\n        return {\"status\": \"completed\"}\n    except Exception as e:\n        return {\"status\": \"failed\", \"reason\": str(e)}\n"
        end
      end

    resp = File.write(script, data)
    IO.inspect(resp)
    DB.insert(Util.index(conn.assigns.env, "scripts"), %{"name" => name, "data" => data})
    json(conn, :ok)
  end

  def update(conn, %{"id" => name}) do
    body = conn.body_params
    script = get_path(name, conn.assigns.env)
    File.write(script, body["data"])
    index = Util.index(conn.assigns.env, "scripts")

    case DB.find_one(index, %{"name" => name}) do
      nil ->
        DB.insert(index, %{"name" => name, "data" => body["data"]})

      script ->
        DB.find_one_and_update(index, %{"_id" => script["_id"]}, %{
          "data" => body["data"]
        })
    end

    json(conn, :ok)
  end

  def delete(conn, %{"id" => name}) do
    script = get_path(name, conn.assigns.env)
    :ok = File.rm(script)
    DB.delete_one(Util.index(conn.assigns.env, "scripts"), %{"name" => name})
    json(conn, :ok)
  end

  def get_path(name, env) do
    AmpsUtil.get_mod_path(env, [name <> ".py"])
  end

  def get_service_path(name, env) do
    AmpsUtil.get_mod_path(env, [name])
  end

  def get_deps(conn, _params) do
    {res, _code} = System.cmd("python3", ["-m", "pip", "list"])

    res =
      res
      |> String.split("\n")
      |> List.delete_at(0)
      |> List.delete_at(0)

    res =
      res
      |> List.delete_at(Enum.count(res) - 1)
      |> Enum.map(fn piece ->
        pieces = String.split(piece, ~r/\s+/)
        %{"name" => Enum.at(pieces, 0), "version" => Enum.at(pieces, 1)}
      end)

    json(conn, res)
  end

  def install_dep(conn, %{"name" => name}) do
    args = ["-m", "pip", "install", "--user", name]
    Logger.info("Installing python package #{name}")

    {res, code} = System.cmd("python3", args, stderr_to_stdout: true)

    case code do
      0 ->
        Logger.info("Successfully Installed python package #{name}")

      _ ->
        Logger.error("Failed to install python package #{name}")
    end

    IO.inspect(res)
    json(conn, res)
  end

  def update_dep(conn, %{"name" => name}) do
    args = ["-m", "pip", "install", "--upgrade", "--user", name]
    Logger.info("Upgrading python package #{name}")

    {res, code} = System.cmd("python3", args, stderr_to_stdout: true)

    case code do
      0 ->
        Logger.info("Successfully Installed python package #{name}")

      _ ->
        Logger.error("Failed to install python package #{name}")
    end

    IO.inspect(res)
    json(conn, res)
  end

  def uninstall_dep(conn, %{"name" => name}) do
    Logger.info("Uninstalling python package #{name}")

    {res, code} =
      System.cmd("python3", ["-m", "pip", "uninstall", "-y", name], stderr_to_stdout: true)

    IO.inspect(res)

    case code do
      0 ->
        Logger.info("Successfully Uninstalled python package #{name}")

      _ ->
        Logger.error("Failed to uninstall python package #{name}")
    end

    json(conn, res)
  end

  def get_services(conn, _params) do
    scripts =
      Path.wildcard(get_service_path("*", conn.assigns.env))
      |> Enum.filter(fn script ->
        bn = Path.basename(script)
        File.dir?(script) && !String.starts_with?(bn, "__") && bn != "env" && bn != "util"
      end)

    rows =
      Enum.reduce(scripts, [], fn script, acc ->
        [%{name: Path.basename(script)} | acc]
      end)

    json(conn, rows)
  end
end
