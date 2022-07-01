defmodule AmpsWeb.AuditPlug do
  # import Plug.Conn
  require Logger
  alias AmpsWeb.Util

  def init(options) do
    # initialize options
    options
  end

  def call(conn, _opts) do
    user = conn.assigns().current_user
    env = conn.assigns().env
    info = Phoenix.Router.route_info(AmpsWeb.Router, conn.method, conn.path_info, conn.host)

    params = info.path_params

    entity = Jason.encode!(params)

    Logger.info("#{user.firstname} #{user.lastname} performed #{info.plug_opts} on #{entity}")

    AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
      "user" => user.firstname <> " " <> user.lastname,
      "entity" => entity,
      "action" => info.plug_opts,
      "params" => %{
        "path_params" => params,
        "body_params" => conn.body_params(),
        "query_params" => conn.query_params()
      }
    })

    conn
  end
end
