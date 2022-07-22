import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.
if config_env() == :prod do
  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  force_ssl =
    if String.to_atom(String.downcase(System.get_env("AMPS_USE_SSL", "FALSE"))) do
      [rewrite_on: [:x_forwarded_proto], host: nil]
    else
      nil
    end

  config :amps_portal, AmpsPortal.Endpoint,
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: String.to_integer(System.get_env("PORT") || "4001")
    ],
    secret_key_base: secret_key_base

  # force_ssl: force_ssl

  # ## Using releases
  #
  # If you are doing OTP releases, you need to instruct Phoenix
  # to start each relevant endpoint:
  #
  #     config :amps_portal, AmpsPortal.Endpoint, server: true
  #
  # Then you can assemble a release by calling `mix release`.
  # See `mix help release` for more information.

  # ## Configuring the mailer
  #
  # In production you need to configure the mailer to use a different adapter.
  # Also, you may need to configure the Swoosh API client of your choice if you
  # are not using SMTP. Here is an example of the configuration:
  #
  #     config :amps_portal, AmpsPortal.Mailer,
  #       adapter: Swoosh.Adapters.Mailgun,
  #       api_key: System.get_env("MAILGUN_API_KEY"),
  #       domain: System.get_env("MAILGUN_DOMAIN")
  #
  # For this example you need include a HTTP client required by Swoosh API client.
  # Swoosh supports Hackney and Finch out of the box:
  #
  #     config :swoosh, :api_client, Swoosh.ApiClient.Hackney
  #
  # See https://hexdocs.pm/swoosh/Swoosh.html#module-installation for details.

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  backends =
    if String.to_atom(String.downcase(System.get_env("AMPS_GEN_CERTS", "FALSE"))) do
      [
        %{
          path: ~r{^/.well-known/acme-challenge/.*$},
          plug: SiteEncrypt.AcmeChallenge,
          opts: Amps.Proxy,
          host: ~r/(.*?)/
        },
        %{
          host: ~r/^#{System.get_env("AMPS_ADMIN_HOST", "admin.localhost")}$/,
          phoenix_endpoint: AmpsWeb.Endpoint
        },
        %{
          host: ~r/(.*?)/,
          phoenix_endpoint: AmpsPortal.Endpoint
        }
      ]
    else
      [
        %{
          host: ~r/^#{System.get_env("AMPS_ADMIN_HOST", "admin.localhost")}$/,
          phoenix_endpoint: AmpsWeb.Endpoint
        },
        %{
          host: ~r/(.*?)/,
          phoenix_endpoint: AmpsPortal.Endpoint
        }
      ]
    end

  mp_config = [
    protocol_options: [
      request_timeout: 10000
    ],
    http: [
      net: :inet6,
      port: String.to_integer(System.get_env("AMPS_PORT", "4080"))
    ],
    log_requests: false,
    # https: [:inet6, port: 4443],
    backends: backends
  ]

  if String.to_atom(String.downcase(System.get_env("AMPS_USE_SSL", "FALSE"))) do
    config :amps_portal, AmpsPortal.Endpoint,
      url: [
        host: System.get_env("AMPS_HOST", "localhost"),
        port: String.to_integer(System.get_env("AMPS_SSL_PORT", "45443"))
      ]

    config :amps_web, AmpsWeb.Endpoint,
      url: [
        host: System.get_env("AMPS_ADMIN_HOST", "admin.localhost"),
        port: String.to_integer(System.get_env("AMPS_SSL_PORT", "45443"))
      ]

    IO.inspect("USING SSL PORT")
    IO.inspect(System.get_env("AMPS_SSL_PORT"))

    config :master_proxy,
           mp_config ++
             [
               https: [
                 port: String.to_integer(System.get_env("AMPS_SSL_PORT", "45443"))
               ]
             ]
  else
    IO.inspect("USING NORMAL PORT")

    config :amps_web, AmpsWeb.Endpoint,
      url: [
        host: System.get_env("AMPS_ADMIN_HOST", "admin.localhost"),
        port: String.to_integer(System.get_env("AMPS_PORT", "4080"))
      ]

    config :amps_portal, AmpsPortal.Endpoint,
      url: [
        host: System.get_env("AMPS_HOST", "localhost"),
        port: String.to_integer(System.get_env("AMPS_PORT", "4080"))
      ]

    config :master_proxy, mp_config
  end

  config :amps_web, AmpsWeb.Endpoint,
    use_ssl: String.to_atom(String.downcase(System.get_env("AMPS_USE_SSL", "FALSE"))),
    # force_ssl: force_ssl,
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/plug_cowboy/Plug.Cowboy.html
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: String.to_integer(System.get_env("AMPS_PORT") || "4000")
    ],
    authmethod: System.get_env("AMPS_AUTH_METHOD") || "db",
    vault_addr: System.get_env("AMPS_VAULT_ADDR", "http://localhost:8200"),
    mongo_addr: System.get_env("AMPS_MONGO_ADDR", "mongodb://localhost:27017/amps"),
    secret_key_base: secret_key_base

  config :amps, Amps.Cluster,
    url: System.get_env("AMPS_OPENSEARCH_ADDR", "https://localhost:9200"),
    username: System.get_env("AMPS_OPENSEARCH_USERNAME", "admin"),
    password: System.get_env("AMPS_OPENSEARCH_PASSWORD", "admin"),
    conn_opts: [
      transport_opts: [
        verify: :verify_none
      ]
    ]

  config :amps,
    db: System.get_env("AMPS_DB_PROVIDER", "mongo"),
    adminhost: System.get_env("AMPS_ADMIN_HOST", "admin.localhost"),
    userhost: System.get_env("AMPS_HOST", "localhost"),
    use_ssl: String.to_atom(String.downcase(System.get_env("AMPS_USE_SSL", "FALSE"))),
    force_ssl: String.to_atom(String.downcase(System.get_env("AMPS_FORCE_SSL", "FALSE"))),
    gen_certs: String.to_atom(String.downcase(System.get_env("AMPS_GEN_CERTS", "FALSE"))),
    dns_emails: System.get_env("AMPS_DNS_EMAILS", ""),
    extra_domains: System.get_env("AMPS_EXTRA_DOMAINS", "")

  # config :ex_aws, :s3,
  #   access_key_id: "minioadmin",
  #   secret_access_key: "minioadmin",
  #   region: "us-east-1",
  #   scheme: System.get_env("AMPS_S3_SCHEME") || "http://",
  #   host: System.get_env("AMPS_S3_HOST") || "localhost",
  #   port: System.get_env("AMPS_S3_PORT") || "9000"

  config :amps, :gnat,
    host: String.to_charlist(System.get_env("AMPS_NATS_HOST", "localhost")),
    port: String.to_integer(System.get_env("AMPS_NATS_PORT", "4222"))

  config :amps, :pow_assent,
    providers: [
      google: [
        client_id:
          System.get_env(
            "AMPS_GOOGLE_ID",
            "63199210559-hmhqeu7hmlkv3epournsu7j8sn9likqv.apps.googleusercontent.com"
          ),
        client_secret: System.get_env("AMPS_GOOGLE_SECRET", "bdvfUN3jk1wkrH7TXmY1yx3c"),
        strategy: Assent.Strategy.Google
      ]
    ]

  # ## Using releases
  #
  # If you are doing OTP releases, you need to instruct Phoenix
  # to start each relevant endpoint:
  #
  # config :amps, AmpsWeb.Endpoint, server: true

  # ## Using releases
  #
  # If you are doing OTP releases, you need to instruct Phoenix
  # to start each relevant endpoint:
  #
  #     config :amps_web, AmpsWeb.Endpoint, server: true
  #
  # Then you can assemble a release by calling `mix release`.
  # See `mix help release` for more information.

  # ## Configuring the mailer
  #
  # In production you need to configure the mailer to use a different adapter.
  # Also, you may need to configure the Swoosh API client of your choice if you
  # are not using SMTP. Here is an example of the configuration:
  #
  #     config :amps, Amps.Mailer,
  #       adapter: Swoosh.Adapters.Mailgun,
  #       api_key: System.get_env("MAILGUN_API_KEY"),
  #       domain: System.get_env("MAILGUN_DOMAIN")
  #
  # For this example you need include a HTTP client required by Swoosh API client.
  # Swoosh supports Hackney and Finch out of the box:
  #
  #     config :swoosh, :api_client, Swoosh.ApiClient.Hackney
  #
  # See https://hexdocs.pm/swoosh/Swoosh.html#module-installation for details.
end
