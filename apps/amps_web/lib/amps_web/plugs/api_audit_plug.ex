defmodule AmpsWeb.AuditPlug do
  import Plug.Conn
  require Logger

  def init(options) do
    # initialize options
    options
  end

  def call(conn, opts) do
    Plug.Conn.register_before_send(conn, fn conn ->
      Logger.info("Sent a #{conn.status} response")
      conn
    end)

    user = conn.assigns().current_user
    info = Phoenix.Router.route_info(AmpsWeb.Router, conn.method, conn.path_info, conn.host)

    params = info.path_params

    params =
      if Map.has_key?(params, "collection") do
        params["collection"]
      else
        Jason.encode!(params)
      end

    Logger.info("#{user.firstname} #{user.lastname} performed #{info.plug_opts} on #{params}")

    AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
      "user" => user.firstname <> " " <> user.lastname,
      "entity" => params,
      "action" => info.plug_opts,
      "params" => Map.merge(conn.body_params(), %{"query_params" => conn.query_params()})
    })

    conn
  end
end
