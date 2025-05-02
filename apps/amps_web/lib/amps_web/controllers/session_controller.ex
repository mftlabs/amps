defmodule AmpsWeb.SessionController do
  use AmpsWeb, :controller

  alias AmpsWeb.APIAuthPlug
  alias Plug.Conn

  @spec create(Conn.t(), map()) :: Conn.t()
  def create(conn, %{"user" => user_params}) do
    conn
    |> Pow.Plug.authenticate_user(user_params)
    |> case do
      {:ok, conn} ->
        user = Pow.Plug.current_user(conn)

        ip = conn.remote_ip |> :inet_parse.ntoa() |> to_string()

        AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
          "user" => user.firstname <> " " <> user.lastname,
          "entity" => "session",
          "action" => "create",
          "parms" => %{
            "ip" => ip
          }
        })

        json(conn, %{
          data: %{
            user: user,
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

  @spec renew(Conn.t(), map()) :: Conn.t()
  def renew(conn, _params) do
    config = Pow.Plug.fetch_config(conn)
    res = conn |> APIAuthPlug.renew(config)

    case res do
      {conn, user} when not is_nil(user) ->
        AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
          "user" => user.firstname <> " " <> user.lastname,
          "entity" => "session",
          "action" => "renew"
        })

        json(conn, %{
          data: %{
            access_token: conn.private.api_access_token,
            renewal_token: conn.private.api_renewal_token
          }
        })

      {conn, nil} ->
        conn
        |> put_status(401)
        |> json(%{error: %{status: 401, message: "Invalid token"}})
    end
  end

  @spec delete(Conn.t(), map()) :: Conn.t()
  def delete(conn, _params) do
    user = Pow.Plug.current_user(conn)

    if user do
      AmpsEvents.send_history("amps.events.audit", "ui_audit", %{
        "user" => user.firstname <> " " <> user.lastname,
        "entity" => "session",
        "action" => "delete"
      })
    end

    conn
    |> Pow.Plug.delete()
    |> json(%{data: %{}})
  end
end
