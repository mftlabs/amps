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

  config :amps_portal, AmpsPortal.Endpoint,
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: String.to_integer(System.get_env("PORT") || "4001")
    ],
    url: [
      host: System.get_env("AMPS_HOST", "localhost"),
      port: String.to_integer(System.get_env("AMPS_PORT"))
    ],
    secret_key_base: secret_key_base

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

  if String.upcase(System.get_env("AMPS_USE_SSL", "FALSE")) == "TRUE" do
    config :master_proxy,
      # any Cowboy options are allowed
      http: [:inet6, port: String.to_integer(System.get_env("AMPS_PORT", "4080"))],
      log_requests: false,
      https: [
        :inet6,
        port: String.to_integer(System.get_env("AMPS_SSL_PORT", "4443")),
        cipher_suite: :strong,
        keyfile: System.get_env("AMPS_SSL_KEY"),
        certfile: System.get_env("AMPS_SSL_CERT")
      ],
      backends: [
        %{
          host: ~r/^#{System.get_env("AMPS_ADMIN_HOST", "admin.localhost")}$/,
          phoenix_endpoint: AmpsWeb.Endpoint
        },
        %{
          host: ~r/^#{System.get_env("AMPS_HOST", "localhost")}$/,
          phoenix_endpoint: AmpsPortal.Endpoint
        }
      ]
  else
    config :master_proxy,
      # any Cowboy options are allowed
      http: [:inet6, port: String.to_integer(System.get_env("AMPS_PORT", "4080"))],
      log_requests: false,
      # https: [:inet6, port: 4443],
      backends: [
        %{
          host: ~r/^#{System.get_env("AMPS_ADMIN_HOST", "admin.localhost")}$/,
          phoenix_endpoint: AmpsWeb.Endpoint
        },
        %{
          host: ~r/^#{System.get_env("AMPS_HOST", "localhost")}$/,
          phoenix_endpoint: AmpsPortal.Endpoint
        }
      ]
  end

  config :amps_web, AmpsWeb.Endpoint,
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/plug_cowboy/Plug.Cowboy.html
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: String.to_integer(System.get_env("AMPS_PORT") || "4000")
    ],
    url: [
      host: System.get_env("AMPS_ADMIN_HOST", "localhost"),
      port: System.get_env("AMPS_PORT")
    ],
    authmethod: System.get_env("AMPS_AUTH_METHOD") || "db",
    vault_addr: System.get_env("AMPS_VAULT_ADDR", "http://localhost:8200"),
    mongo_addr: System.get_env("AMPS_MONGO_ADDR", "mongodb://localhost:27017/amps"),
    minio_addr: System.get_env("AMPS_MINIO_ADDR", "http://localhost:9001"),
    secret_key_base: secret_key_base

  config :amps, Amps.Cluster, url: System.get_env("AMPS_OPENSEARCH_ADDR", "http://localhost:9200")

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
