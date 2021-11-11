defmodule AmpsWeb.UserController do
  use AmpsWeb, :controller
  alias AmpsWeb.Router.Helpers, as: Routes
  require Vault
  require Logger

  def host() do
    Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]
  end

  def update(conn, %{"id" => id}) do
    body = conn.body_params

    user =
      if Map.has_key?(body, "_id") do
        Map.delete(body, "_id")
      else
        body
      end

    Logger.debug("Var value: #{inspect(body)}")
    {:ok, result} = Mongo.update_one(:mongo, "users", %{"_id" => objectid(id)}, %{"$set": user})
    Logger.debug("Var value: #{inspect(result)}")
    json(conn, "ok")
  end

  def send_password_email(conn, %{"user" => %{"email" => user_email}}) do
    conn
    |> PowResetPassword.Plug.create_reset_token(%{"email" => user_email})
    |> case do
      {:ok, %{token: token, user: user}, conn} ->
        resetPasswordUrl = Routes.page_path(conn, :index, token: token)
        resetPasswordUrl = resetPasswordUrl <> "/newpassword"
        email = PowResetPassword.Phoenix.Mailer.reset_password(conn, user, resetPasswordUrl)
        Pow.Phoenix.Mailer.deliver(conn, email)
        json(conn, %{status: "Email Found"})

      {:error, _any, conn} ->
        conn
        |> json(%{error: "Email Not Found"})
    end

    json(conn, %{user_email: user_email})
  end

  def reset_password(conn, %{"id" => token, "user" => userPasswords}) do
    conn
    |> PowResetPassword.Plug.load_user_by_token(token)
    |> case do
      {:ok, conn} ->
        PowResetPassword.Plug.update_user_password(conn, userPasswords)

      {:error, conn} ->
        json(conn, %{error: %{message: "Expired Token"}})
    end

    json(conn, %{status: "ok"})
  end

  def login(conn, _params) do
    body = conn.body_params

    vault =
      Vault.new(
        engine: Vault.Engine.KVV1,
        auth: Vault.Auth.UserPass,
        host: host()
      )

    login =
      Vault.Auth.UserPass.login(vault, %{username: body["username"], password: body["password"]})

    Logger.debug("Var value: #{inspect(login)}")

    case login do
      {:ok, token, _ttl} ->
        user = Mongo.find_one(:mongo, "users", %{username: body["username"]})

        if user["approved"] do
          Logger.debug("Var value: #{inspect(user)}")

          authToken =
            Phoenix.Token.sign(
              AmpsWeb.Endpoint,
              "user auth",
              %{vault_token: token, id: user["_id"]},
              []
            )

          user = Map.put(user, :token, authToken)
          user = Map.put(user, "success", true)
          # conn = conn |> put_resp_cookie("token", token, http_only: false)
          Logger.debug("Var value: #{inspect(conn)}")
          json(conn, user)
        else
          json(conn, %{
            "success" => false,
            "message" => "Unauthorized, please check with administrator approval"
          })
        end

      {:error, _} ->
        # send_resp(conn, 406, "Unauthorized")
        json(conn, %{"success" => false, "message" => "Unauthorized or invalid password"})
    end
  end

  # def get_password(conn, %{"username" => username}) do
  #   IO.inspect(Application.fetch_env(:agile, :vault_token))

  #   Logger.debug("Var value: #{inspect(System.get_env("VAULT_TOKEN"))}")

  #   {:ok, %{"data" => data, "metadata" => metadata}} =
  #     Vaultex.Client.read(
  #       "kv/data/user/" |> Kernel.<>(username),
  #       :token,
  #       {System.get_env("VAULT_TOKEN")}
  #     )

  #   Logger.debug("Var value: #{inspect(data)}")
  #   json(conn, data)
  # end

  def authorize(conn, _params) do
    if conn.cookies["token"] == nil do
      send_resp(conn, 406, "Unauthorized")
    else
      [header] = get_req_header(conn, "authorization")
      [_, token] = String.split(header, " ")
      Logger.debug("Var value: #{inspect(token)}")

      case Phoenix.Token.verify(AgileWeb.Endpoint, "user auth", token, max_age: 86400) do
        {:ok, %{id: id, vault_token: _vt}} ->
          user = Mongo.find_one(:mongo, "users", %{"_id" => id})
          user = Map.put(user, :token, token)
          Logger.debug("Var value: #{inspect(user)}")
          json(conn, user)

        {:error, _} ->
          # conn = conn |> delete_resp_cookie("token")
          send_resp(conn, 406, "Unauthorized")
      end
    end
  end

  def unique_username(conn, %{"username" => username}) do
    cursor = Mongo.find(:mongo, "users", %{username: username})

    data =
      cursor
      |> Enum.to_list()

    if Enum.any?(data) do
      json(conn, %{duplicate: true})
    else
      json(conn, %{duplicate: false})
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
        |> json(%{error: %{status: 500, message: "Couldn't create user", errors: "error"}})
    end

    # IO.inspect(body)
    # IO.inspect(token)
    # if body["password"] != body["confirmpswd"] do
    #   json(conn, %{"success" => false, "message" => "Passwords not matched"})
    # else
    #   {:ok, vault} = Vault.new([
    #     engine: Vault.Engine.KVV1,
    #     auth: Vault.Auth.Token,
    #     host: @host,
    #     credentials: %{token: token}
    #   ])
    #   |> Vault.auth()
    #   Logger.debug("#{inspect(vault)}")
    #   result = Vault.request(vault,:post, "auth/userpass/users/" |> Kernel.<>(body["username"]), [body: %{"token_policies" => "admin,default", password: body["password"] }])
    #   IO.inspect(result)
    #   user = Map.drop(conn.body_params, ["password"])
    #   user = Map.drop(user, ["confirmpswd"])
    #   user = Map.merge(user,%{"approved"=>false, "role" => "guest"})
    #   Mongo.insert_one(:mongo, "users", user)

    #   json(conn, %{"success" => true, "message" => "Successfully registered"})
    # end
  end

  def approve(conn, %{"id" => id}) do
    if conn.cookies["token"] == nil do
      send_resp(conn, 406, "Unauthorized")
    else
      [header] = get_req_header(conn, "authorization")
      [_, token] = String.split(header, " ")
      Logger.debug("Var value: #{inspect(token)}")

      case Phoenix.Token.verify(AgileWeb.Endpoint, "user auth", token, max_age: 86400) do
        {:ok, %{id: userid, vault_token: _vt}} ->
          user = Mongo.find_one(:mongo, "users", %{"_id" => userid})
          Logger.debug("Var value: #{inspect(user)}")

          if Enum.member?(user["role"], "Admin") do
            Logger.debug("Var value: #{inspect(userid)}")

            Mongo.update_one(:mongo, "users", %{"_id" => objectid(id)}, %{
              "$set": %{approved: true, role: ["Observer"], active: true}
            })

            json(conn, "ok")
          else
            send_resp(conn, 406, "Unauthorized")
          end

        {:error, _} ->
          # conn = conn |> delete_resp_cookie("token")
          send_resp(conn, 406, "Unauthorized")
      end
    end
  end

  defp objectid(id) do
    {_, idbin} = Base.decode16(id, case: :mixed)
    %BSON.ObjectId{value: idbin}
  end
end
