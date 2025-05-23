# This file is responsible for configuring your umbrella
# and **all applications** and their dependencies with the
# help of the Config module.
#
# Note that all applications in your umbrella share the
# same configuration and dependencies, which is why they
# all use the same configuration file. If you want different
# configurations or dependencies per app, it is best to
# move said applications out of the umbrella.
import Config

force_ssl =
  if String.to_atom(String.downcase(System.get_env("AMPS_USE_SSL", "FALSE"))) do
    [rewrite_on: [:x_forwarded_host, :x_forwarded_port, :x_forwarded_proto], host: nil]
  else
    nil
  end

config :amps_portal,
  generators: [context_app: false]

config :amps, env: Mix.env()

config :phoenix, :filter_parameters, ["password", "token", "logo"]

# Configures the endpoint
config :amps_portal, AmpsPortal.Endpoint,
  url: [host: System.get_env("AMPS_HOST", "localhost")],
  # force_ssl: force_ssl,
  render_errors: [
    view: AmpsPortal.ErrorView,
    accepts: ~w(html json),
    layout: false
  ],
  pubsub_server: AmpsPortal.PubSub,
  live_view: [signing_salt: "IzQCGrqZ"]

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.14.23",
  amps_portal: [
    args: ~w(js/app.js --bundle --target=es2016 --outdir=../priv/static/assets),
    cd: Path.expand("../apps/amps_portal/assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ],
  amps_web: [
    args:
      ~w(js/app.js --bundle --target=es2016 --loader:.svg=file --loader:.ttf=file --outdir=../priv/static/assets),
    cd: Path.expand("../apps/amps_web/assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.

backends =
  if String.to_atom(String.downcase(System.get_env("AMPS_GEN_CERTS", "FALSE"))) do
    [
      %{
        path: ~r{^/.well-known/acme-challenge/.*$},
        plug: SiteEncrypt.AcmeChallenge,
        opts: AmpsWeb.Proxy,
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
  config :master_proxy,
         mp_config ++ [https: [port: String.to_integer(System.get_env("AMPS_SSL_PORT", "4443"))]]
else
  config :master_proxy, mp_config
end

# any Cowboy options are allowed

config :amps,
  db: System.get_env("AMPS_DB_PROVIDER", "mongo"),
  adminhost: System.get_env("AMPS_ADMIN_HOST", "admin.localhost"),
  userhost: System.get_env("AMPS_HOST", "localhost"),
  use_ssl: String.to_atom(String.downcase(System.get_env("AMPS_USE_SSL", "FALSE"))),
  force_ssl: String.to_atom(String.downcase(System.get_env("AMPS_FORCE_SSL", "FALSE"))),
  gen_certs: String.to_atom(String.downcase(System.get_env("AMPS_GEN_CERTS", "FALSE"))),
  dns_emails: System.get_env("AMPS_DNS_EMAILS", ""),
  extra_domains: System.get_env("AMPS_EXTRA_DOMAINS", "")

config :amps, :gnat,
  host: String.to_charlist(System.get_env("AMPS_NATS_HOST", "localhost")),
  port: String.to_integer(System.get_env("AMPS_NATS_PORT", "4222"))

config :amps, Amps.Logger, level: :debug, format: "$message"

config :amps, Amps.Mailer, adapter: Swoosh.Adapters.Local

config :amps, Amps.Cluster,
  url: System.get_env("AMPS_OPENSEARCH_ADDR", "https://localhost:9200"),
  username: System.get_env("AMPS_OPENSEARCH_USERNAME", "admin"),
  password: System.get_env("AMPS_OPENSEARCH_PASSWORD", "admin"),
  conn_opts: [
    transport_opts: [
      verify: :verify_none
    ]
  ]

# Swoosh API client is needed for adapters other than SMTP.
config :swoosh, :api_client, false

config :amps_web,
  generators: [context_app: :amps]

# Configures the endpoint
config :amps_web, AmpsWeb.Endpoint,
  render_errors: [
    view: AmpsWeb.ErrorView,
    accepts: ~w(html json),
    layout: false
  ],
  pubsub_server: Amps.PubSub,
  live_view: [signing_salt: "kl+/cr/G"],
  url: [host: System.get_env("AMPS_ADMIN_HOST", "admin.localhost")],
  http: [
    port: System.get_env("AMPS_HOST_PORT", "4000"),
    protocol_options: [idle_timeout: 5_000_000]
  ],
  # force_ssl: force_ssl,
  # https: [
  #   port: 443,
  #   # cipher_suite: :strong,
  #   # otp_app: :amps,
  #   keyfile: "/etc/letsencrypt/live/amps.hub4edi.dev/privkey.pem",
  #   cacertfile: "/etc/letsencrypt/live/amps.hub4edi.dev/chain.pem",
  #   certfile: "/etc/letsencrypt/live/amps.hub4edi.dev/cert.pem"
  # ],
  authmethod: System.get_env("AMPS_AUTH_METHOD") || "db",
  vault_addr: System.get_env("AMPS_VAULT_ADDR", "http://localhost:8200"),
  mongo_addr: System.get_env("AMPS_MONGO_ADDR", "mongodb://localhost:27017/amps"),
  nats_addr: System.get_env("AMPS_NATS_ADDR", "http://localhost:8222"),
  minio_addr:
    System.get_env("AMPS_S3_SCHEME", "http://") <>
      System.get_env("AMPS_S3_HOST", "localhost") <>
      ":" <> System.get_env("AMPS_S3_PORT", "9001"),
  pg_addr: System.get_env("AMPS_POSTGRES_ADDR"),
  elastic_prefix: System.get_env("AMPS_ELASTIC_INDEX", "")

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.

# config :mnesia, dir: to_charlist(System.get_env("MNESIA_DIR", "/Users/abhayram/mnesia"))

config :mnesiac,
  stores: [Amps.Defaults, Amps.Responders, Amps.Handlers],
  schema_type: :disc_copies

# defaults to :ram_copies

if config_env() == :prod do
  config :logger,
    level: :info
end

config :logger,
  utc_log: true

config :amps_web, :pow,
  user: AmpsWeb.Users.User,
  users_context: AmpsWeb.Users,
  extensions: [PowResetPassword],
  controller_callbacks: Pow.Extension.Phoenix.ControllerCallbacks,
  mailer_backend: AmpsWeb.PowMailer,
  cache_store_backend: Pow.Store.Backend.MnesiaCache

config :amps_web, :pow_assent,
  user: AmpsWeb.Users.User,
  users_context: AmpsWeb.Users,
  providers: [
    google: [
      client_id: "63199210559-hmhqeu7hmlkv3epournsu7j8sn9likqv.apps.googleusercontent.com",
      client_secret: "bdvfUN3jk1wkrH7TXmY1yx3c",
      strategy: Assent.Strategy.Google
    ]
  ]

config :amps_portal, :pow,
  user: Amps.Users.User,
  users_context: Amps.Users,
  extensions: [PowResetPassword],
  controller_callbacks: Pow.Extension.Phoenix.ControllerCallbacks,
  mailer_backend: AmpsWeb.PowMailer,
  cache_store_backend: Pow.Store.Backend.MnesiaCache

config :amps_portal, :pow_assent,
  user: Amps.Users.User,
  users_context: Amps.Users,
  providers: [
    google: [
      client_id: "63199210559-hmhqeu7hmlkv3epournsu7j8sn9likqv.apps.googleusercontent.com",
      client_secret: "bdvfUN3jk1wkrH7TXmY1yx3c",
      strategy: Assent.Strategy.Google
    ]
  ]

config :ex_aws,
  dl_max_conncurrency: 8,
  dl_chunk_size: 1_000_000,
  dl_timeout_multiplier: 10,
  # fetch from db
  # access_key_id: [{:system, "minioadmin"}, :instance_role],
  # secret_access_key: [{:system, "minioadmin"}, :instance_role],
  # access_key_id: "minioadmin",
  # secret_access_key:  "minioadmin",
  # region: "us-east-2",
  json_codec: Jason

config :ex_aws, :retries,
  max_attempts: 2,
  base_backoff_in_ms: 10,
  max_backoff_in_ms: 10_000

config :ex_aws, :hackney_opts, recv_timeout: 240_000

# config :ex_aws, :s3,
#   access_key_id: "minioadmin",
#   secret_access_key: "minioadmin",
#   region: "us-east-1",
#   scheme: System.get_env("AMPS_S3_SCHEME") || "http://",
#   host: System.get_env("AMPS_S3_HOST") || "localhost",
#   port: System.get_env("AMPS_S3_PORT") || "9000"

config :amps,
  sched_interval: 10000,
  retry_delay: 60000,
  storage_root: "c://tools/amps/data",
  storage_temp: "c://tools/amps/temp",
  storage_logs: "c://tools/amps/logs",
  python_path: "c://tools/amps/python",
  registration_queue: "registerq"

config :amps, :streams,
  "amps.events": "EVENTS",
  "amps.svcs": "SERVICES",
  "amps.actions": "ACTIONS",
  "amps.mailbox": "MAILBOX",
  "amps.data": "DATA",
  "amps.objects": "OBJECTS"

config :amps, :services,
  subscriber: Amps.EventHandler,
  history: Amps.HistoryConsumer,
  sftpd: Amps.SftpServer,
  httpd: Amps.MailboxApi,
  gateway: Amps.Gateway,
  pyservice: Amps.PyHandler,
  sqs: Amps.SQS,
  nats: Amps.NATS

config :amps, :actions,
  strrepl: Amps.Actions.StringReplace,
  mailbox: Amps.Actions.Mailbox,
  sftpput: Amps.Actions.SftpPut,
  router: Amps.Actions.Router,
  unzip: Amps.Actions.Unzip,
  zip: Amps.Actions.Zip,
  http: Amps.Actions.Http,
  runscript: Amps.Actions.RunScript,
  s3: Amps.Actions.S3,
  sharepoint: Amps.Actions.SharePoint,
  pgpencrypt: Amps.Actions.PGPEncrypt,
  pgpdecrypt: Amps.Actions.PGPDecrypt,
  batch: Amps.Actions.Batch,
  ldap: Amps.Actions.LDAP,
  aws: Amps.Actions.AWS

config :amps, Amps.Scheduler,
  jobs: [
    heartbeat: [
      schedule: "* * * * *",
      task: {Amps.Heartbeat, :send, []},
      run_strategy: Quantum.RunStrategy.Local
    ]
  ]

config :amps, :pyworker,
  config: [
    {:name, {:local, :worker}},
    {:worker_module, Amps.PyService},
    {:size, 5},
    {:max_overflow, 2}
  ]

# if String.upcase(System.get_env("AMPS_CLUSTER", "FALSE")) == "TRUE" do
#   config :libcluster,
#     topologies: [
#       amps: [
#         # The selected clustering strategy. Required.
#         strategy: Cluster.Strategy.LocalEpmd,
#         # Configuration for the provided strategy. Optional.
#         # The function to use for connecting nodes. The node
#         # name will be appended to the argument list. Optional
#         connect: {:net_kernel, :connect_node, []},
#         # The function to use for disconnecting nodes. The node
#         # name will be appended to the argument list. Optional
#         disconnect: {:erlang, :disconnect_node, []},
#         # The function to use for listing nodes.
#         # This function must return a list of node names. Optional
#         list_nodes: {:erlang, :nodes, [:connected]}
#       ]
#     ]
# else
#   config :libcluster,
#     topologies: []
# end

# Configure esbuild (the version is required)
# config :esbuild,
#   version: "0.12.18",

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :logger, :backends, [:console, Amps.Logger]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
import_config "plugins.exs"
