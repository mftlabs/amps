defmodule AmpsWeb.ScriptController do
  use AmpsWeb, :controller
  require Logger
  alias AmpsWeb.Python

  @symbols '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ$@!@#$%&*'

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
    scripts = Path.wildcard(get_path("*", conn.assigns().env))

    rows =
      Enum.reduce(scripts, [], fn script, acc ->
        info = File.stat!(script)
        [%{name: Path.basename(script, ".py"), size: info.size} | acc]
      end)

    json(conn, rows)
  end

  def duplicate(conn, %{"name" => name}) do
    json(conn, File.exists?(get_path(name, conn.assigns().env)))
  end

  def show(conn, %{"id" => name}) do
    script = get_path(name, conn.assigns().env)
    info = File.stat(script)

    case info do
      {:ok, info} ->
        script = %{name: Path.basename(script, ".py"), size: info.size, data: File.read!(script)}
        json(conn, script)

      {:error, :enoent} ->
        send_resp(conn, 400, "Script Does not Exists")

      _ ->
        send_resp(conn, 500, "Unkown Error")
    end
  end

  def create(conn, %{"name" => name}) do
    script = get_path(name, conn.assigns().env)
    body = conn.body_params()

    resp = File.mkdir_p!(Path.dirname(script))
    IO.inspect(resp)
    IO.inspect(script)
    IO.inspect(body["data"])

    resp = File.write(script, body["data"])
    IO.inspect(resp)
    json(conn, :ok)
  end

  def update(conn, %{"id" => name}) do
    body = conn.body_params()
    script = get_path(name, conn.assigns().env)
    File.write(script, body["data"])
    json(conn, :ok)
  end

  def delete(conn, %{"id" => name}) do
    script = get_path(name, conn.assigns().env)
    :ok = File.rm(script)
    json(conn, :ok)
  end

  def get_path(name, env) do
    Path.join([Amps.Defaults.get("python_path"), env, name <> ".py"])
  end

  def get_deps(conn, _params) do
    {res, _code} = System.cmd("python", ["-m", "pip", "list"])

    res =
      res
      |> String.split("\n")
      |> List.delete_at(0)
      |> List.delete_at(0)

    res =
      res
      |> List.delete_at(Enum.count(res) - 1)
      |> Enum.map(fn piece ->
        [name, version] = String.split(piece, ~r/\s+/)
        %{"name" => name, "version" => version}
      end)

    json(conn, res)
  end

  def install_dep(conn, %{"name" => name}) do
    args = ["-m", "pip", "install", name]
    Logger.info("Installing python package #{name}")

    {res, code} = System.cmd("python", args, stderr_to_stdout: true)

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
      System.cmd("python", ["-m", "pip", "uninstall", "-y", name], stderr_to_stdout: true)

    IO.inspect(res)

    case code do
      0 ->
        Logger.info("Successfully Uninstalled python package #{name}")

      _ ->
        Logger.error("Failed to uninstall python package #{name}")
    end

    json(conn, res)
  end

  # def index(conn, _params) do
  #   scripts = Path.wildcard(Path.join(Amps.Defaults.get("python_path"), "**/*.py"))

  #   rows =
  #     Enum.reduce(scripts, %{}, fn script, acc ->
  #       info = File.stat!(script)

  #       path =
  #         Path.rootname(
  #           Path.relative_to(script, Amps.Defaults.get("python_path")),
  #           ".py"
  #         )

  #       pieces = String.split(path, "/")
  #       {base, keys} = List.pop_at(pieces, -1)
  #       IO.inspect(keys)
  #       IO.inspect(base)

  #       case keys do
  #         [] ->
  #           Map.put(acc, base, %{"path" => path, "size" => info.size})

  #         keys ->
  #           case get_in(acc, keys) do
  #             nil ->
  #               put_nested(acc, keys, %{base => %{"path" => path, "size" => info.size}})

  #             existing ->
  #               put_nested(
  #                 acc,
  #                 keys,
  #                 Map.merge(existing, %{base => %{"path" => path, "size" => info.size}})
  #               )
  #           end
  #       end
  #     end)

  #   IO.inspect(rows)

  #   json(conn, rows)
  # end

  # def put_nested(map, keys, value) do
  #   put_in(map, Enum.map(keys, &Access.key(&1, %{})), value)
  # end

  # def show(conn, %{"path" => path}) do
  #   script = get_path(path)
  #   info = File.stat!(script)

  #   script = %{
  #     size: info.size,
  #     data: File.read!(script),
  #     path: path
  #   }

  #   json(conn, script)
  # end

  # def create(conn, %{"path" => path}) do
  #   script = get_path(path)
  #   body = conn.body_params()

  #   File.write(script, body["data"])
  #   json(conn, :ok)
  # end

  # def update(conn, %{"path" => path}) do
  #   body = conn.body_params()
  #   script = get_path(path)
  #   File.write(script, body["data"])
  #   json(conn, :ok)
  # end

  # def get_path(name) do
  #   Path.join(Amps.Defaults.get("python_path"), name <> ".py")
  # end
end
