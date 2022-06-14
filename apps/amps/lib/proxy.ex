defmodule Amps.Proxy do
  require Logger
  require SiteEncrypt
  use MasterProxy.Proxy
  @impl MasterProxy.Proxy

  def merge_config(:https, opts) do
    IO.puts("MERGE")
    gen_certs = Application.get_env(:amps, :gen_certs)

    Logger.debug("GEN CERTS: #{gen_certs}")

    if gen_certs do
      Config.Reader.merge(opts, SiteEncrypt.https_keys(__MODULE__))
    else
      Config.Reader.merge(opts,
        cipher_suite: :strong,
        keyfile: System.get_env("AMPS_SSL_KEY"),
        certfile: System.get_env("AMPS_SSL_CERT")
      )
    end
  end

  def merge_config(_, opts), do: opts

  def certification do
    adminhost = Application.get_env(:amps, :adminhost)
    userhost = Application.get_env(:amps, :userhost)
    emails = String.split(Application.get_env(:amps, :dns_emails), ",")

    SiteEncrypt.configure(
      # Note that native client is very immature. If you want a more stable behaviour, you can
      # provide `:certbot` instead. Note that in this case certbot needs to be installed on the
      # host machine.
      client: :certbot,
      domains: [adminhost, userhost],
      emails: emails,
      # By default the certs will be stored in tmp/site_encrypt_db, which is convenient for
      # local development. Make sure that tmp folder is gitignored.
      #
      # Set OS env var SITE_ENCRYPT_DB on staging/production hosts to some absolute path
      # outside of the deployment folder. Otherwise, the deploy may delete the db_folder,
      # which will effectively remove the generated key and certificate files.
      db_folder: System.get_env("AMPS_CFG_PATH", Path.join("tmp", "site_encrypt_db")),
      # set OS env var CERT_MODE to "staging" or "production" on staging/production hosts
      directory_url:
        case System.get_env("AMPS_CERT_MODE", "local") do
          "local" -> {:internal, port: 4002}
          "staging" -> "https://acme-staging-v02.api.letsencrypt.org/directory"
          "production" -> "https://acme-v02.api.letsencrypt.org/directory"
        end
    )
  end

  def config(key) do
    Application.get_env(:master_proxy, key)
  end

  def handle_new_cert, do: :ok
end
