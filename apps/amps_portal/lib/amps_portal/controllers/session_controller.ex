defmodule AmpsPortal.SessionController do
  use AmpsPortal, :controller

  alias AmpsPortal.APIAuthPlug
  alias Plug.Conn
  alias AmpsPortal.Util

  @spec create(Conn.t(), map()) :: Conn.t()
  def create(conn, %{"user" => user_params}) do
    conn
    |> custom_auth(user_params)
    |> case do
      {:ok, conn} ->
        user =
          Amps.DB.find_one(AmpsUtil.index(conn.assigns().env, "users"), %{
            "username" => user_params["username"]
          })
          |> Map.put("password", user_params["password"])

        # Task.start_link(fn -> Amps.Onboarding.synchronize(user, conn.assigns().env) end)

        json(conn, %{
          data: %{
            user: Pow.Plug.current_user(conn),
            access_token: conn.private.api_access_token,
            renewal_token: conn.private.api_renewal_token
          }
        })

      {:error, conn} ->
        conn
        |> put_status(401)
        |> json(%{error: %{status: 401, message: "Invalid username or password"}})
    end
  end

  def custom_auth(conn, params) do
    config =
      Pow.Plug.fetch_config(conn)
      |> Keyword.put(:env, conn.assigns().env)

    Amps.Users.authenticate(params, config)
    |> case do
      nil -> {:error, conn}
      user -> {:ok, Pow.Plug.create(conn, user, config)}
    end
  end

  @spec renew(Conn.t(), map()) :: Conn.t()
  def renew(conn, _params) do
    config =
      Pow.Plug.fetch_config(conn)
      |> Keyword.put(:env, conn.assigns().env)

    IO.inspect(config)

    res = APIAuthPlug.renew(conn, config)

    IO.inspect(res)

    case res do
      {conn, nil} ->
        conn
        |> put_status(401)
        |> json(%{error: %{status: 401, message: "Invalid token"}})

      {conn, _user} ->
        json(conn, %{
          data: %{
            access_token: conn.private.api_access_token,
            renewal_token: conn.private.api_renewal_token
          }
        })
    end
  end

  @spec delete(Conn.t(), map()) :: Conn.t()
  def delete(conn, _params) do
    conn
    |> Pow.Plug.delete()
    |> json(%{data: %{}})
  end
end
