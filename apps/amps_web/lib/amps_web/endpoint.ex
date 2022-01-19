defmodule AmpsWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :amps_web

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_amps_web_key",
    signing_salt: "4Xavf6Is"
  ]

  socket("/live", Phoenix.LiveView.Socket, websocket: [connect_info: [session: @session_options]])

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phx.digest
  # when deploying your static files in production.

  plug(Plug.Static,
    at: "/",
    from: {:amps_web, "priv/static/frontend"},
    gzip: false
  )

  plug(Plug.Static,
    at: "/",
    from: :amps_web,
    gzip: false,
    only: ~w(assets fonts images favicon.ico robots.txt)
  )

  socket("/socket", AmpsWeb.UserSocket,
    websocket: [
      connect_info: [pow_config: [otp_app: :amps_web]]
    ],
    longpoll: false,
    log: false
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
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    length: 1_073_741_824,
    json_decoder: Phoenix.json_library()
  )

  plug(Plug.MethodOverride)
  plug(Plug.Head)
  plug(Plug.Session, @session_options)
  plug(AmpsWeb.Router)
end
