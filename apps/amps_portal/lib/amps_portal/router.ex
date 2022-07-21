defmodule AmpsPortal.Router do
  use AmpsPortal, :router

  pipeline :browser do
    plug(:accepts, ["html"])

    if String.to_atom(String.downcase(System.get_env("AMPS_USE_SSL", "FALSE"))) do
      plug(Plug.SSL,
        rewrite_on: [:x_forwarded_proto],
        host: nil
      )
    end

    plug(:fetch_session)
    plug(:fetch_live_flash)
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug(AmpsPortal.EnvPlug)
  end

  pipeline :api do
    plug(:accepts, ["json"])
    plug(AmpsPortal.EnvPlug)

    plug(AmpsPortal.APIAuthPlug, otp_app: :amps_portal)
  end

  pipeline :api_protected do
    plug(:fetch_session)
    plug(:fetch_live_flash)

    plug(Pow.Plug.RequireAuthenticated,
      error_handler: AmpsPortal.APIAuthErrorHandler
    )
  end

  scope "/", AmpsPortal do
    pipe_through(:browser)

    get("/", PageController, :index)
  end

  scope "/api", AmpsPortal do
    pipe_through(:api)
    get("/ampstest", PageController, :execute_test)

    resources("/session", SessionController,
      singleton: true,
      only: [:create, :delete]
    )

    get("/util/email", DataController, :email)

    post("/session/renew", SessionController, :renew)
    post("/users/reg", UserController, :register)
    get("/users/token/:token", UserController, :parse_user_token)
    post("/users/link/:email", UserController, :send_user_link)
    post("/users/password", UserController, :reset_password)
    post("/ufa/login", UFAController, :agent_login)
    get("/duplicate_username/:username", UserController, :duplicate_username)
    get("/duplicate_email/:email", UserController, :duplicate_email)
  end

  scope "/api", AmpsPortal do
    pipe_through([:api, :api_protected])
    post("/duplicate", DataController, :duplicate)
    get("/msg/:msgid", DataController, :get_message)
    delete("/msg/:msgid", DataController, :delete_message)
    get("/ufa/sched/:username", UFAController, :get_sched)
    post("/ufa/upload/:username", UFAController, :handle_upload)
    get("/ufa/heartbeat/:username", UFAController, :heartbeat)
    get("/ufa/ack/:reply", UFAController, :ack)

    get("/ufa/download/:rule", UFAController, :handle_download)
    get("/ufa/agent", UFAController, :get_agent)
    get("/tokens", UserController, :get_tokens)
    resources("/mailboxes", MailboxController, except: [:new, :edit])
    get("/tokens/secret/:id", UserController, :get_token_secret)

    post("/tokens", UserController, :create_token)
    delete("/tokens/:id", UserController, :delete_token)

    get("/inbox", DataController, :get_messages)
    get("/inbox/:mailbox", DataController, :get_messages)

    get("/ufa_logs", DataController, :ufa_logs)
    get("/user", UserController, :get)
    put("/user", UserController, :update)
    get("/rules", UFAController, :get_agent_rules)
    get("/ufa/config", UFAController, :get_agent_config)
    put("/ufa/config", UFAController, :put_agent_config)

    get("/topics/mailbox", DataController, :get_mailbox_topics)
    post("/rules", UFAController, :create_agent_rule)
    put("/rules/:id", UFAController, :update_agent_rule)
    get("/rules/:id", UFAController, :get_agent_rule)

    delete("/rules/:id", UFAController, :delete_agent_rule)
  end

  # Other scopes may use custom stacks.
  # scope "/api", AmpsPortal do
  #   pipe_through :api
  # end

  # Enables LiveDashboard only for development
  #
  # If you want to use the LiveDashboard in production, you should put
  # it behind authentication and allow only admins to access it.
  # If your application does not have an admins-only section yet,
  # you can use Plug.BasicAuth to set up some basic authentication
  # as long as you are also using SSL (which you should anyway).

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
