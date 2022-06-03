defmodule AmpsPortal.EnvPlug do
  import Plug.Conn
  require Logger

  def init(options) do
    # initialize options
    options
  end

  def call(conn, _opts) do
    host = System.get_env("AMPS_HOST", "localhost")

    if host == conn.host do
      assign(conn, :env, "")
    else
      case Amps.DB.find_one("environments", %{"host" => conn.host}) do
        nil ->
          conn
          |> Phoenix.Controller.redirect(
            external: "#{Atom.to_string(conn.scheme)}://#{host}:#{conn.port}"
          )

        obj ->
          assign(conn, :env, obj["name"])
      end
    end
  end
end
