defmodule Amps.VaultDatabase do
  require Logger
  alias Amps.DB

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

    _result =
      Vault.request(
        vault,
        :post,
        "auth/userpass/users/" |> Kernel.<>(body["username"]),
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

    _result =
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

      _result =
        Vault.write(vault, "kv/" <> collection <> "/" <> body[unique], %{
          field => body[field]
        })
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

  def find_one(collection, clauses) do
    if Map.has_key?(clauses, "_id") do
      id = clauses["_id"]
      clauses = Map.drop(clauses, ["_id"])
      {:ok, resp} = read(collection, id)
    else
      %{rows: data, success: success, count: count} = get_rows(collection)

      resp =
        Enum.reduce_while(data, nil, fn obj, acc ->
          match =
            Enum.reduce(clauses, true, fn {k, v}, match ->
              match && obj[k] == v
            end)

          if match do
            {:halt, obj}
          else
            {:cont, acc}
          end
        end)

      {:ok, resp}
    end

    # Enum.reduce_while(data, nil, fn row, acc ->

    # end)
  end

  def find(collection) do
    {:ok, vault} = get_vault()

    case Vault.list(vault, Path.join("kv/amps", collection)) do
      {:ok, %{"keys" => keys}} ->
        data =
          Enum.reduce(keys, [], fn key, acc ->
            {:ok, body} =
              Vault.read(
                vault,
                Path.join(["kv/amps", collection, key])
              )

            body = Map.put(body, "_id", key)

            [body | acc]
          end)

        data

      {:error, error} ->
        Logger.error(error)
        []
    end
  end

  def read(collection, id) do
    collection = DB.path(collection)

    case get_vault() do
      {:ok, vault} ->
        case Vault.read(vault, "kv/amps/" <> collection <> "/" <> id) do
          {:ok, resp} ->
            resp = Map.put(resp, "_id", id)
            {:ok, resp}

          {:error, error} ->
            {:error, error}
            {:ok, nil}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def update(collection, body, id) do
    collection = DB.path(collection)

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
    collection = DB.path(collection)

    case get_vault() do
      {:ok, vault} ->
        case Vault.write(
               vault,
               "kv/amps/" <> collection <> "/" <> AmpsUtil.get_id(),
               body
             ) do
          {:ok, resp} ->
            {:ok, resp}

          {:error, error} ->
            {:error, error}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def insert_with_id(collection, body, id) do
    collection = DB.path(collection)

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

  def delete(collection, id) do
    collection = DB.path(collection)

    case get_vault() do
      {:ok, vault} ->
        # v1/kv/metadata/amps/keys/c08771cd-46b3-4c32-8d8e-bca3f83e7a68
        case Vault.request(
               vault,
               :delete,
               "kv/metadata/amps/" <> collection <> "/" <> id
             ) do
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

  def recursive_delete(vault, path) do
    case Vault.list(vault, Path.join("kv/amps", path)) do
      {:ok, %{"keys" => keys}} ->
        Enum.each(keys, fn key ->
          if String.ends_with?(key, "/") do
            recursive_delete(vault, Path.join(path, key))
          else
            case Vault.request(
                   vault,
                   :delete,
                   "kv/metadata/amps/" <> Path.join(path, key)
                 ) do
              {:ok, resp} ->
                Logger.info("Delete Vault Key Path: kv/amps/#{Path.join(path, key)}}")

                {:ok, resp}

              {:error, error} ->
                Logger.error(error)
                {:error, error}
            end
          end
        end)

      {:error, error} ->
        Logger.error(error)
    end
  end

  def delete_env(env) do
    {:ok, vault} = get_vault()

    case Vault.list(vault, "kv/amps") do
      {:ok, %{"keys" => keys}} ->
        Enum.each(keys, fn key ->
          if String.starts_with?(key, env) do
            if String.ends_with?(key, "/") do
              recursive_delete(vault, key)
            else
              case Vault.request(vault, :delete, "kv/metadata/amps/" <> key) do
                {:ok, resp} ->
                  Logger.info("Delete Vault Key Path: kv/amps/#{key}}")
                  {:ok, resp}

                {:error, error} ->
                  Logger.error(error)
                  {:error, error}
              end
            end
          end
        end)

      {:error, error} ->
        Logger.error(error)
    end
  end

  def get_rows(collection) do
    collection = DB.path(collection)

    {:ok, vault} = get_vault()

    case Vault.list(vault, Path.join("kv/amps", collection)) do
      {:ok, %{"keys" => keys}} ->
        data =
          Enum.reduce(keys, [], fn key, acc ->
            {:ok, body} =
              Vault.read(
                vault,
                Path.join(["kv/amps", collection, key])
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
