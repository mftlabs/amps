defmodule AmpsPortal.Endpoint do
  use Phoenix.Endpoint, otp_app: :amps_portal

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_amps_portal_key",
    signing_salt: "7j3uMen9"
  ]

  plug(Unplug,
    if: {AmpsWeb.UnplugPredicates.ForceSSL, []},
    do:
      {Plug.SSL,
       [rewrite_on: [:x_forwarded_host, :x_forwarded_port, :x_forwarded_proto], host: nil]}
  )

  socket("/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]])

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phx.digest
  # when deploying your static files in production.
  plug(Plug.Static,
    at: "/",
    from: {:amps_portal, "priv/static/amps"},
    gzip: false
  )

  plug(Plug.Static,
    at: "/",
    from: :amps_portal,
    gzip: false,
    only: ~w(assets fonts images favicon.ico robots.txt)
  )

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket("/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket)
    plug(Phoenix.LiveReloader)
    plug(Phoenix.CodeReloader)
  end

  plug(Phoenix.LiveDashboard.RequestLogger,
    param_key: "request_logger",
    cookie_key: "request_logger"
  )

  plug(Plug.RequestId)
  plug(Plug.Telemetry, event_prefix: [:phoenix, :endpoint])

  plug(Plug.Parsers,
    parsers: [:urlencoded, Amps.Multipart, :json],
    pass: ["*/*"],
    length: 26_843_545_600,
    json_decoder: Phoenix.json_library()
  )

  plug(Plug.MethodOverride)
  plug(Plug.Head)
  plug(Plug.Session, @session_options)
  plug(CORSPlug)
  plug(AmpsPortal.Router)
end
