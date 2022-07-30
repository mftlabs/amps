defmodule Amps.UserIdentities do
  use PowAssent.Ecto.UserIdentities.Context,
    users_context: Amps.Users,
    user: Amps.Users.User

  def all(user) do
    pow_assent_all(user)
  end
end

defmodule Amps.Users do
  import Pow.Context
  require Logger

  defp authmethod() do
    Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod]
  end

  def index(config) do
    case Keyword.get(config, :env) do
      "" ->
        "users"

      other ->
        other <> "-users"
    end
  end

  def authenticate(body, config) do
    IO.inspect("authenticate")

    case body["provider"] do
      "google" ->
        google_upsert(body)

      _ ->
        case authmethod() do
          "vault" ->
            Amps.Users.Vault.authenticate(body)

          _ ->
            Amps.Users.DB.authenticate(body, config)
        end
    end

    # Use params to look up user and verify password with `MyApp.Users.User.verify_password/2`
  end

  def create(body) do
    case authmethod() do
      "vault" ->
        Amps.Users.Vault.create(body)

      _ ->
        Amps.Users.DB.create(body)
    end
  end

  def update(_user, _params) do
    IO.puts("update")
    {:error, :not_implemented}
  end

  def delete(_user) do
    IO.puts("delete")
    {:error, :not_implemented}
  end

  def get_by(clauses, config \\ nil) do
    filter =
      Enum.reduce(clauses, %{}, fn {key, value}, acc ->
        if key == :id do
          Map.put(acc, :_id, value)
        else
          Map.put(acc, key, value)
        end
      end)

    case Amps.DB.find_one(index(config), filter) do
      nil ->
        nil

      obj ->
        convert_to_user_struct(obj)
    end
  end

  def convert_to_user_struct(user) do
    user =
      Map.put(user, "id", user["_id"])
      |> Map.new(fn {k, v} -> {String.to_atom(k), v} end)

    struct(Amps.Users.User, user)
  end

  def google_upsert(params) do
    userinfo = params["userinfo"]
    uid = params["uid"]
    user = Amps.DB.find_one("users", %{google_id: uid})

    if user do
      convert_to_user_struct(user)
    else
      user =
        %{}
        |> Map.put("firstname", userinfo["given_name"])
        |> Map.put("lastname", userinfo["family_name"])
        |> Map.put("email", userinfo["email"])
        |> Map.put("username", userinfo["email"])
        |> Map.put("google_id", uid)
        |> Map.put("provider", "google")
        |> Map.merge(%{"approved" => false, "role" => "Guest"})

      id = Amps.DB.insert("users", user)

      user = Map.put(user, :id, id)
      struct(Amps.Users.User, user)
    end
  end
end

defmodule Amps.Users.Vault do
  alias Amps.Users, as: Users
  import Pow.Context
  require Logger

  def host(), do: Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]

  def authenticate(body) do
    vault =
      Vault.new(
        engine: Vault.Engine.KVV1,
        auth: Vault.Auth.UserPass,
        host: host()
      )

    login =
      Vault.Auth.UserPass.login(vault, %{
        username: body["username"],
        password: body["password"]
      })

    case login do
      {:ok, _token, _ttl} ->
        user = Amps.DB.find_one("users", %{username: body["username"]})

        if user["approved"] do
          Users.convert_to_user_struct(user)
        else
          {:error, nil}
        end

      {:error, _} ->
        # send_resp(conn, 406, "Unauthorized")
        {:error, nil}
    end
  end

  # Use params to look up user and verify password with `MyApp.Users.User.verify_password/2

  def create(body) do
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
        body: %{"token_policies" => "admin,default", password: body["password"]}
      )

    IO.inspect(result)
    user = Map.drop(body, ["password"])
    user = Map.drop(user, ["confirmpswd"])

    user =
      Map.merge(user, %{"approved" => false, "role" => "Guest", "provider" => "vault"})
      |> Map.new(fn {k, v} -> {String.to_atom(k), v} end)

    id = Amps.DB.insert("users", user)

    user = Map.put(user, :id, id)
    userstruct = struct(Amps.Users.User, user)
    {:ok, userstruct}
  end

  def update(_user, _params) do
    IO.puts("update")
    {:error, :not_implemented}
  end

  def delete(_user) do
    IO.puts("delete")
    {:error, :not_implemented}
  end
end

defmodule Amps.Users.DB do
  alias Amps.Users, as: Users
  import Pow.Context
  require Logger
  import Argon2

  def authenticate(body, config \\ nil) do
    IO.inspect(config)
    user = Amps.DB.find_one(Users.index(config), %{"username" => body["username"]})

    case check_pass(user, body["password"], hash_key: "password") do
      {:ok, user} ->
        if user["approved"] do
          Users.convert_to_user_struct(user)
        else
          nil
        end

      {:error, reason} ->
        IO.inspect(reason)
        nil
    end

    # Use params to look up user and verify password with `MyApp.Users.User.verify_password/2`
  end

  def create(body) do
    IO.inspect(body)
    # password = body["password"]
    # %{password_hash: hashed} = add_hash(password)

    user =
      body
      # Map.drop(body, ["password"])
      # |> Map.drop(["confirmpswd"])
      |> Map.put("password", nil)
      |> Map.merge(%{"approved" => false})

    {:ok, id} = Amps.DB.insert("users", user)

    user = Map.put(user, "id", id) |> Map.new(fn {k, v} -> {String.to_atom(k), v} end)

    IO.inspect(user)

    user = struct(Amps.Users.User, user)
    IO.inspect(user)

    {:ok, user}
  end

  def update(_user, _params) do
    IO.puts("update")
    {:error, :not_implemented}
  end

  def delete(_user) do
    IO.puts("delete")
    {:error, :not_implemented}
  end
end

defmodule Amps.Users.User do
  @derive Jason.Encoder
  defstruct firstname: nil,
            phone: nil,
            email: nil,
            lastname: nil,
            username: nil,
            password: nil,
            role: nil,
            id: nil

  require Pow.Ecto.Schema
  require PowAssent.Ecto.Schema

  def reset_password_changeset(user, attrs) do
    IO.inspect(user)

    case user.username do
      nil ->
        nil

      _ ->
        _res = Amps.DB.find_one_and_update("users", %{"_id" => user.id}, attrs)
        user
    end
  end

  def changeset(user, _params) do
    user
  end

  def verify_password(_user, _password) do
    {:error, :not_implemented}
  end

  # def user_identity_changeset(user_or_changeset, user_identity, attrs, user_id_attrs) do
  #   user_or_changeset
  #   |> Ecto.Changeset.cast(attrs, [:custom_field])
  #   |> pow_assent_user_identity_changeset(user_identity, attrs, user_id_attrs)
  # end
end
