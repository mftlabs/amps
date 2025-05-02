defmodule AmpsWeb.UtilScriptController do
  use AmpsWeb, :controller
  require Logger
  # alias AmpsWeb.Python
  alias Amps.DB
  alias AmpsWeb.Util

  # @symbols "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ$@!@#$%&*"

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
    scripts = Path.wildcard(get_path("*"))

    rows =
      Enum.reduce(scripts, [], fn script, acc ->
        info = File.stat!(script)
        [%{name: Path.basename(script, ".py"), size: info.size} | acc]
      end)

    json(conn, rows)
  end

  def duplicate(conn, %{"name" => name}) do
    json(conn, File.exists?(get_path(name)))
  end

  def show(conn, %{"id" => name}) do
    script = get_path(name)
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
    script = get_path(name)

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
    DB.insert("utilscripts", %{"name" => name, "data" => data})

    IO.inspect(resp)
    json(conn, :ok)
  end

  def update(conn, %{"id" => name}) do
    body = conn.body_params
    script = get_path(name)
    File.write(script, body["data"])
    index = "utilscripts"

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
    script = get_path(name)
    :ok = File.rm(script)
    DB.delete_one("utilscripts", %{"name" => name})

    json(conn, :ok)
  end

  def get_path(name) do
    Path.join([AmpsUtil.get_mod_path(), "util", name <> ".py"])
  end
end
