defmodule AmpsWeb.AgentController do
  use AmpsWeb, :controller
  require Logger

  plug(
    AmpsWeb.EnsureRolePlug,
    :Admin
    when action in [
           :download_agent
         ]
  )

  def download_agent(conn, %{"id" => id}) do
    account = AmpsWeb.DB.find_one("accounts", %{"_id" => id})
    _host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:url]

    IO.puts(id)

    agentdir = Application.app_dir(:amps, "priv/agents")
    query = conn.query_params()
    os = query["os"]
    arch = query["arch"]
    host = query["host"]
    {:ok, agentfolder} = Temp.mkdir()

    {scriptname, agent} =
      case os do
        "linux" ->
          {"run.sh", os <> "_" <> arch}

        "mac" ->
          {"run.sh", os <> "_" <> "64"}

        "windows" ->
          {"run.bat", os <> "_" <> arch <> ".exe"}
      end

    IO.inspect(File.copy(Path.join([agentdir, os, agent]), Path.join(agentfolder, agent)))

    script =
      File.read!(Path.join([agentdir, os, scriptname]))
      |> String.replace("{ACCOUNT}", account["username"])
      |> String.replace("{KEY}", account["username"])
      |> String.replace(
        "{CRED}",
        AmpsWeb.Encryption.decrypt(account["aws_secret_access_key"])
      )
      |> String.replace("{HOST}", host)
      |> String.replace("{AGENT}", agent)

    IO.inspect(script)
    IO.inspect(File.write(Path.join(agentfolder, scriptname), script))

    IO.inspect(File.ls(agentfolder))

    # case os do
    #   "linux" ->

    #   "windows" ->
    #     IO.inspect(File.cp_r("./agents/windows", agentfolder))

    #     script =
    #       File.read!(Path.join(agentfolder, "run.bat"))
    #       |> String.replace("{ACCOUNT}", account["username"])
    #       |> String.replace("{KEY}", account["username"])
    #       |> String.replace(
    #         "{CRED}",
    #         AmpsWeb.Encryption.decrypt(account["aws_secret_access_key"])
    #       )
    #       |> String.replace("{HOST}", host)

    #     IO.inspect(script)
    #     IO.inspect(File.write(Path.join(agentfolder, "run.bat"), script))

    #     IO.inspect(File.ls(agentfolder))

    #   "mac" ->
    #     {"run.sh", "mac_" <> arch <> "_agent"}
    # end

    zipname = account["username"] <> "_agent.zip"

    files = File.ls!(agentfolder) |> Enum.map(&String.to_charlist/1)

    {:ok, zippath} = Temp.mkdir()
    zippath = Path.join(zippath, zipname)
    {:ok, zip} = :zip.create(zippath, files, cwd: agentfolder)

    IO.inspect(zip)

    send_download(conn, {:file, zip}, disposition: :attachment)
    # json(conn, :ok)
  end

  def grpc_agent() do
    # {:ok, dir_path} = Temp.mkdir()

    # result = File.cp_r("agents/Agent", dir_path <> "/Agent")
    # IO.inspect(result)

    # {:ok, binary} = File.read(dir_path <> "/Agent/main.go")
    # IO.inspect(binary)

    # replaced = String.replace(binary, "{{ACCOUNTNAME}}", account["username"])

    # :ok = File.write(dir_path <> "/Agent/main.go", replaced)

    # {:ok, rep} = File.read(dir_path <> "/Agent/main.go")
    # IO.inspect(rep)

    # {resp, status} =
    #   System.cmd("go", ["build", "."],
    #     cd: dir_path <> "/Agent",
    #     env: [{"GOOS", "linux"}, {"GOARCH", "amd64"}]
    #   )

    # IO.inspect(resp)
    # IO.inspect(status)

    # IO.inspect(File.ls(dir_path <> "/Agent"))

    # System.cmd("chmod", ["+x", dir_path <> "/Agent/Service"])

    # {ok, zip} =
    #   :zip.create(dir_path <> "/agent.zip", [String.to_char_list("Service")],
    #     cwd: dir_path <> "/Agent/"
    #   )

    # IO.inspect(zip)

    # send_download(conn, {:file, zip}, disposition: :attachment)
  end
end
