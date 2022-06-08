defmodule AmpsPortal.EnvPlug do
  import Plug.Conn
  require Logger

  def init(options) do
    # initialize options
    options
  end

  def call(conn, _opts) do
    host = System.get_env("AMPS_HOST", "localhost")
    IO.inspect(conn.host)

    if host == conn.host do
      assign(conn, :env, "")
    else
      case Amps.DB.find_one("environments", %{"host" => conn.host}) do
        nil ->
          conn
          |> send_resp(404, "Not Found")

        obj ->
          assign(conn, :env, obj["name"])
      end
    end
  end
end
