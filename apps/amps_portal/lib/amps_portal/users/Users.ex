defmodule AmpsPortal.UserIdentities do
  use PowAssent.Ecto.UserIdentities.Context,
    users_context: AmpsPortal.Users,
    user: AmpsPortal.Users.User

  def all(user) do
    pow_assent_all(user)
  end
end

defmodule AmpsPortal.Users do
  import Pow.Context
  require Logger

  defp authmethod() do
    Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod]
  end

  def authenticate(body) do
    IO.puts("Authenticate")

    case body["provider"] do
      "google" ->
        google_upsert(body)

      _ ->
        case authmethod() do
          "vault" ->
            AmpsPortal.Users.Vault.authenticate(body)

          _ ->
            AmpsPortal.Users.DB.authenticate(body)
        end
    end

    # Use params to look up user and verify password with `MyApp.Users.User.verify_password/2`
  end

  def create(body) do
    case authmethod() do
      "vault" ->
        AmpsPortal.Users.Vault.create(body)

      _ ->
        AmpsPortal.Users.DB.create(body)
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

  def get_by(clauses) do
    IO.puts("Clauses")
    IO.inspect(clauses)

    filter =
      Enum.reduce(clauses, %{}, fn {key, value}, acc ->
        if key == :id do
          Map.put(acc, :_id, value)
        else
          Map.put(acc, key, value)
        end
      end)

    IO.inspect(filter)

    convert_to_user_struct(AmpsWeb.DB.find_one("users", filter))
  end

  def convert_to_user_struct(user) do
    IO.puts("Convert")

    user =
      Map.put(user, "id", user["_id"])
      |> Map.new(fn {k, v} -> {String.to_atom(k), v} end)

    IO.inspect(user)
    struct(AmpsPortal.Users.User, user)
  end

  def google_upsert(params) do
    userinfo = params["userinfo"]
    IO.inspect(userinfo)
    uid = params["uid"]
    user = AmpsWeb.DB.find_one("users", %{google_id: uid})

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

      id = AmpsWeb.DB.insert("users", user)

      user = Map.put(user, :id, id)
      struct(AmpsPortal.Users.User, user)
    end
  end
end

defmodule AmpsPortal.Users.Vault do
  alias AmpsPortal.Users, as: Users
  import Pow.Context
  require Logger

  def host(), do: Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]

  def authenticate(body) do
    IO.puts("Auth Method")
    IO.inspect(Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod])
    IO.puts("authenticate")
    IO.inspect(body)

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

    Logger.debug("Var value: #{inspect(login)}")

    case login do
      {:ok, _token, _ttl} ->
        user = AmpsWeb.DB.find_one("users", %{username: body["username"]})
        IO.inspect(user)

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
    IO.puts("create")
    token = AmpsWeb.Vault.get_token(:vaulthandler)

    {:ok, vault} =
      Vault.new(
        engine: Vault.Engine.KVV1,
        auth: Vault.Auth.Token,
        host: host(),
        credentials: %{token: token}
      )
      |> Vault.auth()

    Logger.debug("#{inspect(vault)}")

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

    id = AmpsWeb.DB.insert("users", user)

    user = Map.put(user, :id, id)
    IO.inspect(result)
    IO.inspect(user)
    userstruct = struct(AmpsPortal.Users.User, user)
    IO.inspect(userstruct)
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

defmodule AmpsPortal.Users.DB do
  alias AmpsPortal.Users, as: Users
  import Pow.Context
  require Logger
  import Argon2

  def authenticate(body) do
    user = AmpsWeb.DB.find_one("users", %{"username" => body["username"]})
    IO.inspect(user)
    IO.inspect(body["password"])

    case check_pass(user, body["password"], hash_key: "password") do
      {:ok, user} ->
        IO.inspect("verified")

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
    password = body["password"]
    IO.inspect(password)
    %{password_hash: hashed} = add_hash(password)
    IO.inspect(hashed)

    IO.inspect(check_pass(%{"password" => hashed}, password, hash_key: "password"))

    user =
      Map.drop(body, ["password"])
      |> Map.drop(["confirmpswd"])
      |> Map.put("password", hashed)
      |> Map.merge(%{"approved" => false, "role" => "Guest", "provider" => "amps"})

    id = AmpsWeb.DB.insert("users", user)

    user = Map.put(user, "id", id) |> Map.new(fn {k, v} -> {String.to_atom(k), v} end)

    IO.inspect(user)

    user = struct(AmpsPortal.Users.User, user)
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

defmodule AmpsPortal.Users.User do
  @derive Jason.Encoder
  defstruct firstname: nil,
            phone: nil,
            email: nil,
            lastname: nil,
            username: nil,
            password: nil,
            approved: nil,
            role: nil,
            id: nil,
            provider: nil

  require Pow.Ecto.Schema
  require PowAssent.Ecto.Schema

  def reset_password_changeset(user, attrs) do
    IO.inspect(user)
    IO.inspect(attrs)
    res = AmpsWeb.DB.find_one_and_update("users", %{"_id" => user.id}, attrs)
    IO.inspect(res)
    user
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
