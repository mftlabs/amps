defmodule AmpsPortal.UserController do
  use AmpsPortal, :controller
  import Argon2
  alias Amps.DB
  alias AmpsPortal.Util
  alias Plug.Conn
  alias Pow.{Config, Plug, Store.Backend.EtsCache, UUID}
  alias PowResetPassword.Ecto.Context, as: ResetPasswordContext
  alias PowResetPassword.Store.ResetTokenCache

  def get(conn, _params) do
    Util.conn_index(conn, "users")

    res =
      Amps.DB.find_one(Util.conn_index(conn, "users"), %{"_id" => Pow.Plug.current_user(conn).id})

    IO.inspect(res)
    json(conn, res)
  end

  def update(conn, _params) do
    user = Pow.Plug.current_user(conn)
    body = conn.body_params()
    IO.inspect(body)
    IO.inspect(Map.has_key?(body, "password"))

    body =
      if Map.has_key?(body, "password") do
        %{password_hash: hashed} = add_hash(body["password"])
        IO.inspect(hashed)
        Map.put(body, "password", hashed)
      else
        body
      end

    {:ok, res} =
      Amps.DB.find_one_and_update(Util.conn_index(conn, "users"), %{"_id" => user.id}, body)

    json(conn, res)
  end

  def send_user_link(conn, %{"email" => email}) do
    data = conn.body_params()
    host = data["host"]

    case PowResetPassword.Plug.create_reset_token(conn, %{"email" => email}) do
      {:ok, %{token: token, user: user}, conn} ->
        link = "#{host}?token=#{token}#setpassword"

        AmpsPortal.UserEmail.reset(user, link)
        |> Amps.Mailer.deliver()

        json(conn, %{"success" => true})

      {:error, nil, conn} ->
        json(conn, %{"success" => false})
    end
  end

  def parse_user_token(conn, %{"token" => token}) do
    IO.inspect(conn)
    IO.inspect(token)

    case PowResetPassword.Plug.load_user_by_token(
           conn,
           token
         ) do
      {:ok, conn} ->
        json(conn, %{status: "success", username: conn.assigns.reset_password_user.username})

      {:error, conn} ->
        IO.inspect(conn)
        json(conn, %{status: "error", error: %{message: "Expired Token"}})
    end

    json(conn, :ok)
  end

  def reset_password(conn, %{"token" => token, "user" => user}) do
    conn
    |> PowResetPassword.Plug.load_user_by_token(token)
    |> case do
      {:ok, conn} ->
        %{password_hash: hashed} = add_hash(user["password"])
        # res = PowResetPassword.Plug.update_user_password(conn, %{"password" => hashed})
        config = Plug.fetch_config(conn)

        res =
          Amps.DB.find_one_and_update(
            Util.conn_index(conn, "users"),
            %{"username" => user["username"]},
            %{
              "password" => hashed
            }
          )

        expire_token(conn, config)

        IO.inspect(res)
        json(conn, %{success: %{message: "Password Set"}})

      {:error, conn} ->
        json(conn, %{error: %{message: "Expired Token"}})
    end

    json(conn, %{status: "ok"})
  end

  def register(conn, _params) do
    body = conn.body_params

    conn
    |> Pow.Plug.create_user(body)
    |> case do
      {:ok, _user, conn} ->
        json(conn, %{"success" => true, "message" => "Successfully registered"})

      {:error, _changeset, conn} ->
        conn
        |> put_status(500)
        |> json(%{error: %{status: 500, message: "Couldn't create user", errors: "error"}})
    end
  end

  defp expire_token(%{private: %{pow_reset_password_decoded_token: token}}, config) do
    {store, store_config} = store(config)
    store.delete(store_config, token)
  end

  defp expire_token(_conn, _config) do
    IO.warn(
      "no `:pow_reset_password_decoded_token` key found in `conn.private`, please call `#{inspect(__MODULE__)}.load_user_by_token/2` first"
    )

    :ok
  end

  defp reset_password_user(conn) do
    conn.assigns[:reset_password_user]
  end

  defp store(config) do
    case Config.get(config, :reset_password_token_store) do
      {store, store_config} -> {store, store_opts(config, store_config)}
      nil -> {ResetTokenCache, store_opts(config)}
    end
  end

  defp store_opts(config, store_config \\ []) do
    store_config
    |> Keyword.put_new(:backend, Config.get(config, :cache_store_backend, EtsCache))
    |> Keyword.put_new(:pow_config, config)
  end

  def get_tokens(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        user = DB.find_one(Util.conn_index(conn, "users"), %{"username" => user.username})
        json(conn, user["tokens"])
    end
  end

  def create_token(conn, _parms) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        user = DB.find_one(Util.conn_index(conn, "users"), %{"username" => user.username})
        body = conn.body_params()
        body = Util.before_token_create(body, conn.assigns().env)
        index = Util.conn_index(conn, "users")
        fieldid = DB.add_to_field(index, body, user["_id"], "tokens")
        updated = DB.find_one(index, %{"_id" => user["_id"]})
        Util.after_token_create(updated, body, conn.assigns().env)
        json(conn, user["tokens"])
    end
  end

  def get_token_secret(conn, %{"id" => id}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        index = Util.conn_index(conn, "users")
        user = DB.find_one(index, %{"username" => user.username})
        item = DB.get_in_field(index, user["_id"], "tokens", id)
        secrets = DB.find_one(Util.conn_index(conn, "tokens"), %{"username" => user["username"]})

        case secrets do
          nil ->
            send_resp(conn, 400, "Not Found")

          secrets ->
            json(conn, secrets[item["id"]])
        end
    end
  end

  def delete_token(conn, %{"id" => id}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        body = conn.body_params()
        index = Util.conn_index(conn, "users")
        user = DB.find_one(index, %{"username" => user.username})
        item = DB.get_in_field(index, user["_id"], "tokens", id)
        result = DB.delete_from_field(index, body, user["_id"], "tokens", id)
        Util.after_token_delete(user, item, conn.assigns().env)
        json(conn, :ok)
    end
  end
end
