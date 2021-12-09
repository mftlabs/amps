defmodule AmpsPortal.UserController do
  use AmpsPortal, :controller
  import Argon2
  alias AmpsWeb.DB

  def get(conn, _params) do
    res = AmpsWeb.DB.find_one("users", %{"_id" => Pow.Plug.current_user(conn).id})
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

    {:ok, res} = AmpsWeb.DB.find_one_and_update("users", %{"_id" => user.id}, body)
    json(conn, res)
  end

  def get_user_link(conn, %{"id" => id}) do
    obj = AmpsWeb.DB.find_one("users", %{"_id" => id})
    IO.inspect(id)
    IO.inspect(conn)

    {:ok, map, conn} = PowResetPassword.Plug.create_reset_token(conn, %{"email" => obj["email"]})

    token = map.token

    conn
    |> PowResetPassword.Plug.load_user_by_token(token)
    |> case do
      {:ok, conn} ->
        IO.inspect(conn)
    end

    [host: host] = Application.get_env(:amps_web, AmpsWeb.Endpoint)[:url]
    IO.inspect(host)

    [:inet6, port: port] = Application.get_env(:master_proxy, :http)
    IO.inspect(port)
    json(conn, "#{host}:#{port}/?token=#{token}#setpassword")
  end

  def parse_user_token(conn, %{"token" => token}) do
    IO.inspect(conn)
    IO.inspect(token)

    case PowResetPassword.Plug.load_user_by_token(
           conn,
           token
         ) do
      {:ok, conn} ->
        IO.inspect(conn)
        json(conn, %{status: "success", username: conn.assigns.reset_password_user.username})

      {:error, conn} ->
        json(conn, %{status: "error", error: %{message: "Expired Token"}})
    end

    json(conn, :ok)
  end

  def reset_password(conn, %{"token" => token, "user" => user}) do
    conn
    |> PowResetPassword.Plug.load_user_by_token(token)
    |> case do
      {:ok, conn} ->
        DB.find_one_and_update(
          "mailbox_auth",
          %{
            mailbox: user["username"]
          },
          %{
            password: user["password"]
          }
        )

        %{password_hash: hashed} = add_hash(user["password"])

        res =
          AmpsWeb.DB.find_one_and_update("users", %{"username" => user["username"]}, %{
            "password" => hashed
          })

        IO.inspect(res)
        json(conn, %{success: %{message: "Password Set"}})

      {:error, conn} ->
        json(conn, %{error: %{message: "Expired Token"}})
    end

    json(conn, %{status: "ok"})
  end
end
