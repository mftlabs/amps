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
    # plug(:accepts, ["json"])
    plug(AmpsWeb.APIAuthPlug, otp_app: :amps_web)
  end

  pipeline :api_protected do
    plug(:fetch_session)
    plug(:fetch_live_flash)

    plug(AmpsWeb.EnvPlug)
    plug(Pow.Plug.RequireAuthenticated, error_handler: AmpsWeb.APIAuthErrorHandler)
  end

  scope "/api", AmpsWeb do
    pipe_through(:api)
    get("/startup", UtilController, :initialized)
    post("/startup", UtilController, :startup)
    get("/ampstest", UtilController, :execute_test)

    resources("/session", SessionController, singleton: true, only: [:create, :delete])
    post("/session/renew", SessionController, :renew)

    get("/auth/:provider/new", AuthorizationController, :new)
    get("/auth/:provider/callback", AuthorizationController, :auth_redirect)
    post("/auth/:provider/callback", AuthorizationController, :callback)

    post("/util/glob", UtilController, :glob_match)
    post("/user/reset-password", UserController, :send_password_email)
    post("/user/reg", UserController, :register)
    get("/duplicate_username/:username", UtilController, :duplicate_username)
  end

  scope "/api", AmpsWeb do
    pipe_through([:api, :api_protected])

    post("/system/logo", DataController, :update_logo)

    post("/duplicate", UtilController, :duplicate)

    get("/user/info", UserController, :info)

    get("/data/export/:collection", DataController, :export_collection)
    post("/data/import/:collection", DataController, :import_data)
    post("/data/import/:collection/:entity/:field", DataController, :import_field_data)

    post("/data/export/:collection", DataController, :export_selection)

    get("/data/export-subitem/:collection/:id/:field", DataController, :export_sub_collection)

    get(
      "/data/import/sample/:collection",
      DataController,
      :sample_template_download
    )

    get(
      "/data/import/sample/:collection/:field",
      DataController,
      :sample_field_template_download
    )

    get("/users/reset/:id", DataController, :reset_password)
    get("/admin/reset/:id", DataController, :reset_admin_password)
    post("/admin/changepassword/:id", DataController, :change_admin_password)

    get("/message_events/history/:msgid", UtilController, :history)
    get("/message_events/download/:msgid", UtilController, :download)
    post("/workflow", UtilController, :workflow)
    get("/loop/:sub", UtilController, :loop)

    post("/port/:port", UtilController, :in_use)
    post("/service/:name", ServiceController, :handle_service)
    get("/service/:name", ServiceController, :ping_service)
    post("/msg/reprocess/:msgid", DataController, :reprocess)
    post("/msg/reroute/:id", DataController, :reroute)
    post("/msg/reroute", DataController, :reroute_many)
    get("/streams", DataController, :get_streams)

    post("/upload/:topic", DataController, :upload)
    post("/event/:topic", DataController, :send_event)

    get("/agent/download/:id", AgentController, :download_agent)
    get("/rules/fields/:id", DataController, :get_match_fields)
    # get("/:collection", DataController, :get_rows)
    get("/store/:collection", UtilController, :create_store)
    get("/:collection/aggregate/:field", UtilController, :aggregate_field)

    post("/demos", DataController, :upload_demo)
    post("/environments/clear/:name", DataController, :clear_env)
    post("/environments/export/:env", DataController, :export_env)

    get("/deps", ScriptController, :get_deps)
    post("/deps", ScriptController, :install_dep)
    delete("/deps/:name", ScriptController, :uninstall_dep)

    post("/scripts/duplicate/", ScriptController, :duplicate)
    resources("/scripts/", ScriptController, except: [:new, :edit])

    resources("/:collection/", DataController, except: [:new, :edit])
    post("/:collection/:id", DataController, :create_with_id)
    post("/:collection/:id/:field/:fieldid", DataController, :add_to_field_with_id)

    get("/:collection/:id/:field", DataController, :get_field)
    put("/:collection/:id/:field", DataController, :update_field)
    post("/:collection/:id/:field", DataController, :add_to_field)
    get("/:collection/:id/:field/:fieldid", DataController, :get_in_field)

    put("/:collection/:id/:field/:fieldid", DataController, :update_in_field)
    delete("/:collection/:id/:field/:fieldid", DataController, :delete_from_field)

    # Your protected API endpoints here
  end

  scope "/", AmpsWeb do
    pipe_through(:browser)

    get("/", PageController, :index)
  end

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

  redirect("/*path", "/", :permanent)
end
