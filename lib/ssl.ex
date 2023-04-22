defmodule Amps.SSL do
  use SiteEncrypt.Adapter
  alias SiteEncrypt.Adapter
  require SiteEncrypt
  require Logger

  def start_link([id, endpoint]) do
    Adapter.start_link(__MODULE__, id, endpoint)
  end

  @impl Adapter
  def config(id, endpoint) do
    IO.inspect("PLUG SSL")

    IO.inspect(id)
    IO.inspect(endpoint)

    %{
      certification: certification(id),
      site_spec: endpoint
    }
  end

  def handle_new_cert() do
    Logger.info("Successfully Obtained Certificate for Service Host")
  end

  def certification(id) do
    adminhost = Application.get_env(:amps, :svchost, "svc.localhost")
    # userhost = Application.get_env(:amps, :userhost)
    emails = String.split(Application.get_env(:amps, :dns_emails, "info@mftlabs.io"), ",")

    # domains =
    #   case Application.get_env(:amps, :extra_domains) do
    #     "" ->
    #       []

    #     domains ->
    #       String.split(domains, ",")
    #   end

    db_folder = System.get_env("AMPS_CFG_PATH", "/tmp")

    db_folder = Path.join([db_folder, "amps", "site_encrypt_db"])

    config =
      SiteEncrypt.configure(
        # Note that native client is very immature. If you want a more stable behaviour, you can
        # provide `:certbot` instead. Note that in this case certbot needs to be installed on the
        # host machine.
        client: :certbot,
        domains: [adminhost],
        emails: emails,
        # By default the certs will be stored in tmp/site_encrypt_db, which is convenient for
        # local development. Make sure that tmp folder is gitignored.
        #
        # Set OS env var SITE_ENCRYPT_DB on staging/production hosts to some absolute path
        # outside of the deployment folder. Otherwise, the deploy may delete the db_folder,
        # which will effectively remove the generated key and certificate files.
        db_folder: db_folder,
        # set OS env var CERT_MODE to "staging" or "production" on staging/production hosts
        directory_url:
          case System.get_env("AMPS_CERT_MODE", "local") do
            "local" -> {:internal, port: 4004}
            "staging" -> "https://acme-staging-v02.api.letsencrypt.org/directory"
            "production" -> "https://acme-v02.api.letsencrypt.org/directory"
          end
      )

    Map.merge(config, %{id: id})
  end

  @impl Adapter
  def http_port(_id, endpoint) do
    case endpoint do
      {Amps.CowboySupervisor, opts} ->
        port = get_in(opts, [:http, :port])
        IO.inspect(port)
        {:ok, port}

      {Plug.Cowboy, opts} ->
        port = get_in(opts, [:options, :port])
        {:ok, port}
    end
  end
end
