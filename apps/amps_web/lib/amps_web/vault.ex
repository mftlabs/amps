defmodule AmpsWeb.Vault do
  use GenServer
  require Logger
  require Vault

  # Client
  def start_link(arg) do
    GenServer.start_link(__MODULE__, arg, name: :vaulthandler)
  end

  def get_token(pid) do
    GenServer.call(pid, :token)
  end

  # Server
  def init(_) do
    vault_startup()
  end

  def handle_call(:token, _from, keys) do
    {:reply, keys["root_token"], keys}
  end

  def kill() do
    {:stop}
  end

  defp vault_startup() do
    host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]
    IO.puts("starting vault")
    IO.inspect(host)

    vault =
      Vault.new(
        engine: Vault.Engine.KVV2,
        host: host
      )

    case Vault.request(vault, :put, "sys/init",
           body: %{"secret_shares" => 1, "secret_threshold" => 1}
         ) do
      {:ok, %{"errors" => errors}} ->
        IO.inspect(errors)

        case AmpsWeb.DB.find_one("services", %{"name" => "vault"}) do
          nil ->
            {:ok, {:missing, "Missing Vault Config"}}

          config ->
            try do
              keys = Jason.decode!(AmpsWeb.Encryption.decrypt(config["keys"]))
              IO.puts("Fetching Vault Credentials")

              unseal_vault(vault, keys)
              {:ok, keys}
            rescue
              _e ->
                {:ok, {:missing, "Missing Vault Config"}}
            end
        end

      {:ok, keys} ->
        IO.puts("Initializing Vault")
        unseal_vault(vault, keys)
        initialize_vault(vault, keys)

        case AmpsWeb.DB.find_one("services", %{
               "name" => "vault"
             }) do
          nil ->
            AmpsWeb.DB.insert("services", %{
              "name" => "vault",
              "keys" => AmpsWeb.Encryption.encrypt(Jason.encode!(keys))
            })

          body ->
            AmpsWeb.DB.update(
              "services",
              %{
                "name" => "vault",
                "keys" => AmpsWeb.Encryption.encrypt(Jason.encode!(keys))
              },
              BSON.ObjectId.encode!(body["_id"])
            )
        end

        # IO.inspect(File.write("keys/keys.json", Jason.encode!(keys), [:binary]))
        {:ok, keys}
    end
  end

  defp unseal_vault(vault, keys) do
    Enum.each(keys["keys"], fn key ->
      result = Vault.request(vault, :put, "sys/unseal", body: %{"key" => key})
      IO.inspect(result)
    end)
  end

  defp initialize_vault(vault, keys) do
    vault = Vault.set_auth(vault, Vault.Auth.Token)
    {:ok, vault} = Vault.auth(vault, %{"token" => keys["root_token"]})

    IO.inspect(
      Vault.request(vault, :post, "sys/mounts/kv", body: %{"type" => "kv-v2", "version" => 2})
    )

    Vault.request(vault, :post, "sys/auth/userpass", body: %{"type" => "userpass"})
  end
end
