defmodule AmpsPortal.EnvPlug do
  import Plug.Conn
  require Logger

  def init(options) do
    # initialize options
    options
  end

  def call(conn, _opts) do
    host = System.get_env("AMPS_HOST", "localhost")

    env = String.replace(conn.host, ~r/#{host}$/, "") |> String.split(".") |> Enum.at(0)

    if env == "" do
      assign(conn, :env, env)
    else
      case Amps.DB.find_one("environments", %{"name" => env}) do
        nil ->
          conn
          |> Phoenix.Controller.redirect(
            external: "#{Atom.to_string(conn.scheme)}://#{host}:#{conn.port}"
          )

        obj ->
          assign(conn, :env, env)
      end
    end
  end
end
