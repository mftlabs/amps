defmodule AmpsWeb.Router do
  use AmpsWeb, :router
  import Redirect

  use Pow.Extension.Phoenix.Router,
    extensions: [PowResetPassword]

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_live_flash)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(AmpsWeb.APIAuthPlug, otp_app: :amps)
  end

  pipeline :api_portal do
    plug(:accepts, ["json"])
    plug(AmpsPortal.APIAuthPlug, otp_app: :amps_portal)
  end

  pipeline :api_protected do
    plug(:fetch_session)
    plug(:fetch_live_flash)
    plug(Pow.Plug.RequireAuthenticated, error_handler: AmpsWeb.APIAuthErrorHandler)
  end

  scope "/api", AmpsWeb do
    pipe_through(:api_portal)
    get("/users/link/:id", DataController, :get_user_link)
  end

  scope "/api", AmpsWeb do
    post("/test", DataController, :test)
    post("/duplicate", DataController, :duplicate)
    get("/port/:port", DataController, :in_use)
    post("/service/:name", ServiceController, :handle_service)
    get("/service/:name", ServiceController, :ping_service)
    post("/reprocess", DataController, :reprocess)
    post("/upload", DataController, :get_url)
    pipe_through(:api)

    resources("/session", SessionController, singleton: true, only: [:create, :delete])
    post("/session/renew", SessionController, :renew)

    get("/auth/:provider/new", AuthorizationController, :new)
    get("/auth/:provider/callback", AuthorizationController, :auth_redirect)
    post("/auth/:provider/callback", AuthorizationController, :callback)

    post("/util/glob", UtilController, :glob_match)
    post("/user/reset-password", UserController, :send_password_email)
    post("/user/reg", UserController, :register)
  end

  scope "/api", AmpsWeb do
    pipe_through([:api, :api_protected])

    get("/agent/download/:id", AgentController, :download_agent)
    get("/rules/fields/:id", DataController, :get_match_fields)
    get("/:collection", DataController, :get_rows)
    resources("/:collection/", DataController, except: [:new, :edit])
    get("/:collection/:id/:field", DataController, :get_field)
    post("/:collection/:id/:field", DataController, :add_to_field)
    get("/:collection/:id/:field/:idx", DataController, :get_in_field)

    put("/:collection/:id/:field/:idx", DataController, :update_in_field)
    delete("/:collection/:id/:field/:idx", DataController, :delete_from_field)
    # Your protected API endpoints here
  end

  scope "/", AmpsWeb do
    pipe_through(:browser)

    get("/", PageController, :index)
  end

  redirect("/*path", "/", :permanent)

  # Other scopes may use custom stacks.
  # scope "/api", AmpsWeb do
  #   pipe_through :api
  # end

  # Enables LiveDashboard only for development
  #
  # If you want to use the LiveDashboard in production, you should put
  # it behind authentication and allow only admins to access it.
  # If your application does not have an admins-only section yet,
  # you can use Plug.BasicAuth to set up some basic authentication
  # as long as you are also using SSL (which you should anyway).
  if Mix.env() in [:dev, :test] do
    import Phoenix.LiveDashboard.Router

    scope "/" do
      pipe_through(:browser)
      live_dashboard("/dashboard", metrics: AmpsWeb.Telemetry)
    end
  end

  # Enables the Swoosh mailbox preview in development.
  #
  # Note that preview only shows emails that were sent by the same
  # node running the Phoenix server.
  if Mix.env() == :dev do
    scope "/dev" do
      pipe_through(:browser)

      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end
end
