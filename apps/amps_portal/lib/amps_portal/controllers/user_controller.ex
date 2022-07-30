defmodule AmpsPortal.UserController do
  use AmpsPortal, :controller
  import Argon2
  alias Amps.DB
  import Plug.Conn
  alias AmpsPortal.Util
  alias Plug.Conn
  alias Pow.{Config, Plug, Store.Backend.EtsCache, UUID}
  alias PowResetPassword.Ecto.Context, as: ResetPasswordContext
  alias PowResetPassword.Store.ResetTokenCache
  import PowResetPassword.Plug

  def get(conn, _params) do
    Util.conn_index(conn, "users")

    res =
      Amps.DB.find_one(Util.conn_index(conn, "users"), %{
        "_id" => Pow.Plug.current_user(conn).id
      })

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
      Amps.DB.find_one_and_update(
        Util.conn_index(conn, "users"),
        %{"_id" => user.id},
        body
      )

    json(conn, res)
  end

  def send_user_link(conn, %{"email" => email}) do
    data = conn.body_params()
    host = data["host"]

    conn =
      put_private(
        conn,
        :pow_config,
        Keyword.put(conn.private.pow_config, :env, conn.assigns().env)
      )

    IO.inspect(conn)

    case reset_token(conn, %{"email" => email}) do
      {:ok, %{token: token, user: user}, conn} ->
        link = "#{host}?token=#{token}#setpassword"

        AmpsPortal.UserEmail.reset(user, link, host)
        |> AmpsUtil.deliver()

        json(conn, %{"success" => true})

      {:error, nil, conn} ->
        json(conn, %{"success" => false})
    end
  end

  def create_link() do
    #   host = data["host"]
    conn =
      Pow.Plug.put_config(%Conn{},
        mod: AmpsPortal.APIAuthPlug,
        plug: AmpsPortal.APIAuthPlug,
        otp_app: :amps_portal
      )

    #   conn =
    #     put_private(
    #       conn,
    #       :pow_config,
    #       Keyword.put(conn.private.pow_config, :env, conn.assigns().env)
    #     )

    #   IO.inspect(conn)

    #   case reset_token(conn, %{"email" => email}) do
    #     {:ok, %{token: token, user: user}, conn} ->
    #       link = "#{host}?token=#{token}#setpassword"
  end

  defp reset_token(conn, params) do
    conn =
      put_private(
        conn,
        :pow_config,
        Keyword.put(conn.private.pow_config, :env, conn.assigns().env)
      )

    config = Plug.fetch_config(conn)
    token = UUID.generate()
    IO.inspect(config)

    Amps.Users.get_by(params, config)
    |> case do
      nil ->
        {:error, nil, conn}

      user ->
        {store, store_config} = store(config)

        store.put(store_config, token, user)

        signed = Phoenix.Token.sign(AmpsPortal.Endpoint, Atom.to_string(__MODULE__), token, [])

        {:ok, %{token: signed, user: user}, conn}
    end
  end

  def parse_user_token(conn, %{"token" => token}) do
    IO.inspect(conn)
    IO.inspect(token)

    conn =
      put_private(
        conn,
        :pow_config,
        Keyword.put(conn.private.pow_config, :env, conn.assigns().env)
      )

    case load_from_token(
           conn,
           token
         ) do
      {:ok, conn} ->
        IO.inspect("SUCCESS")

        json(conn, %{
          success: true,
          username: conn.assigns.reset_password_user.username
        })

      {:error, conn} ->
        json(conn, %{success: false, error: %{message: "Expired Token"}})
    end
  end

  def reset_password(conn, %{"token" => token, "user" => user}) do
    conn
    |> load_from_token(token)
    |> case do
      {:ok, conn} ->
        %{password_hash: hashed} = add_hash(user["password"])

        # res = PowResetPassword.Plug.update_user_password(conn, %{"password" => hashed})
        config = Plug.fetch_config(conn)
        index = Util.conn_index(conn, "users")

        res =
          Amps.DB.find_one_and_update(
            index,
            %{"username" => user["username"]},
            %{
              "password" => hashed
            }
          )

        expire_token(conn, config)

        # onb = fn msg, obj, env ->
        #   obj = obj |> Map.put("password", user["password"])
        #   msg = Map.put(msg, "data", Jason.encode!(obj))

        #   Amps.Onboarding.onboard(
        #     msg,
        #     obj,
        #     env
        #   )

        #   Map.merge(msg, %{"onboarding" => true, "user_id" => obj["_id"]})
        # end

        user = Amps.DB.find_one(index, %{"username" => user["username"]})

        AmpsWeb.Util.ui_event(index, user["_id"], "reset_password", conn.assigns().env)

        json(conn, %{success: true, message: "Password Set"})

      {:error, conn} ->
        json(conn, %{success: false, message: "Expired Token"})
    end
  end

  def load_from_token(conn, signed_token) do
    config = Plug.fetch_config(conn)

    IO.inspect(
      Phoenix.Token.verify(AmpsPortal.Endpoint, Atom.to_string(__MODULE__), signed_token,
        max_age: 86400
      )
    )

    with {:ok, token} <-
           Phoenix.Token.verify(AmpsPortal.Endpoint, Atom.to_string(__MODULE__), signed_token,
             max_age: 86400
           ),
         user when not is_nil(user) <-
           fetch_user_from_token(token, config) do
      conn =
        conn
        |> Conn.put_private(:pow_reset_password_decoded_token, token)
        |> Conn.assign(:reset_password_user, user)

      {:ok, conn}
    else
      _any -> {:error, conn}
    end
  end

  defp fetch_user_from_token(token, config) do
    IO.inspect(token)
    {store, store_config} = store(config)

    store_config
    |> store.get(token)
    |> case do
      :not_found -> nil
      user -> user
    end
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
        |> json(%{
          error: %{
            status: 500,
            message: "Couldn't create user",
            errors: "error"
          }
        })
    end
  end

  defp expire_token(
         %{private: %{pow_reset_password_decoded_token: token}},
         config
       ) do
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
    |> Keyword.put_new(
      :backend,
      Config.get(config, :cache_store_backend, EtsCache)
    )
    |> Keyword.put_new(:pow_config, config)
  end

  def get_tokens(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        user =
          DB.find_one(Util.conn_index(conn, "users"), %{
            "username" => user.username
          })

        json(conn, user["tokens"])
    end
  end

  def create_token(conn, _parms) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 401, "Unauthorized")

      user ->
        user =
          DB.find_one(Util.conn_index(conn, "users"), %{
            "username" => user.username
          })

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

        secrets =
          DB.find_one(Util.conn_index(conn, "tokens"), %{
            "username" => user["username"]
          })

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

  def duplicate_username(conn, %{"username" => username}) do
    body = conn.body_params()

    duplicate =
      DB.find_one(Util.conn_index(conn, "users"), %{"username" => username}) !=
        nil

    json(conn, duplicate)
  end

  def duplicate_email(conn, %{"email" => email}) do
    body = conn.body_params()

    duplicate =
      DB.find_one(Util.conn_index(conn, "users"), %{"email" => email}) !=
        nil

    json(conn, duplicate)
  end
end
