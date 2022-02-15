defmodule VaultDatabase do
  require Logger

  def host() do
    Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]
  end

  def create_vault_user(body) do
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    {:ok, vault} =
      Vault.new(
        engine: Vault.Engine.KVV1,
        auth: Vault.Auth.Token,
        host: host(),
        credentials: %{token: token}
      )
      |> Vault.auth()

    result =
      Vault.request(vault, :post, "auth/userpass/users/" |> Kernel.<>(body["username"]),
        body: %{"token_policies" => "default", password: body["password"]}
      )

    Map.drop(body, ["password", "confirmpswd"])
  end

  def update_vault_password(username, password) do
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    {:ok, vault} =
      Vault.new(
        engine: Vault.Engine.KVV1,
        auth: Vault.Auth.Token,
        host: host(),
        credentials: %{token: token}
      )
      |> Vault.auth()

    result =
      Vault.request(
        vault,
        :post,
        "auth/userpass/users/" <> username <> "/password",
        body: %{"password" => password}
      )
  end

  def vault_store_key(body, collection, unique, field) do
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    if body[field] != "" do
      {:ok, vault} =
        Vault.new(
          engine: Vault.Engine.KVV1,
          auth: Vault.Auth.Token,
          host: host(),
          credentials: %{token: token}
        )
        |> Vault.auth()

      result =
        Vault.write(vault, "kv/" <> collection <> "/" <> body[unique], %{field => body[field]})
    end

    Map.drop(body, [field])
  end

  def get_vault() do
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    Vault.new(
      engine: Vault.Engine.KVV2,
      auth: Vault.Auth.Token,
      host: host(),
      credentials: %{token: token}
    )
    |> Vault.auth()
  end

  def read(collection, id) do
    case get_vault() do
      {:ok, vault} ->
        case Vault.read(vault, "kv/amps/" <> collection <> "/" <> id) do
          {:ok, resp} ->
            resp = Map.put(resp, "_id", id)
            {:ok, resp}

          {:error, error} ->
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def update(collection, body, id) do
    case get_vault() do
      {:ok, vault} ->
        case Vault.write(vault, "kv/amps/" <> collection <> "/" <> id, body) do
          {:ok, resp} ->
            {:ok, resp}

          {:error, error} ->
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def insert(collection, body) do
    case get_vault() do
      {:ok, vault} ->
        case Vault.write(vault, "kv/amps/" <> collection <> "/" <> AmpsUtil.get_id(), body) do
          {:ok, resp} ->
            {:ok, resp}

          {:error, error} ->
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def delete(collection, id) do
    case get_vault() do
      {:ok, vault} ->
        # v1/kv/metadata/amps/keys/c08771cd-46b3-4c32-8d8e-bca3f83e7a68
        case Vault.request(vault, :delete, "kv/metadata/amps/" <> collection <> "/" <> id) do
          {:ok, resp} ->
            {:ok, resp}

          {:error, error} ->
            Logger.error(error)
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def get_rows(path) do
    {:ok, vault} = VaultDatabase.get_vault()

    case Vault.list(vault, Path.join("kv/amps", path)) do
      {:ok, %{"keys" => keys}} ->
        data =
          Enum.reduce(keys, [], fn key, acc ->
            {:ok, body} =
              Vault.read(
                vault,
                Path.join(["kv/amps", path, key])
              )

            body = Map.put(body, "_id", key)

            [body | acc]
          end)

        %{rows: data, success: true, count: Enum.count(data)}

      {:error, error} ->
        Logger.error(error)
        %{rows: [], success: true, count: 0}
    end
  end
end
