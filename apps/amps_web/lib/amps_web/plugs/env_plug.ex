defmodule AmpsWeb.EnvPlug do
  import Plug.Conn
  require Logger
  alias Amps.DB

  def init(options) do
    # initialize options
    options
  end

  def call(conn, _opts) do
    user = Pow.Plug.current_user(conn)

    case user do
      nil ->
        conn

      user ->
        env = DB.find_one("admin", %{"username" => user.username})["config"]["env"]

        if env == "" do
          assign(conn, :env, env)
        else
          case DB.find_one("environments", %{"name" => env}) do
            nil ->
              DB.find_one_and_update("admin", %{"username" => user.username}, %{
                "config" => %{"env" => ""}
              })

              assign(conn, :env, "")

            obj ->
              pp = conn.params()

              conn =
                if Map.has_key?(pp, "collection") do
                  pp =
                    Map.merge(pp, %{
                      "collection" => AmpsWeb.Util.index(env, pp["collection"])
                    })

                  Map.put(conn, :params, pp)
                else
                  conn
                end

              assign(conn, :env, env)
          end
        end
    end
  end
end
