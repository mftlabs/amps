defmodule AmpsWeb.AuthorizationController do
  use AmpsWeb, :controller

  alias Plug.Conn
  alias PowAssent.Plug

  @spec new(Conn.t(), map()) :: Conn.t()
  def new(conn, %{"provider" => provider}) do
    conn
    |> Plug.authorize_url(provider, redirect_uri(conn))
    |> case do
      {:ok, url, conn} ->
        json(conn, %{data: %{url: url, session_params: conn.private[:pow_assent_session_params]}})

      {:error, _error, conn} ->
        conn
        |> put_status(500)
        |> json(%{error: %{status: 500, message: "An unexpected error occurred"}})
    end
  end

  defp redirect_uri(conn) do
    uri = AmpsWeb.Endpoint.url() <> "/api/auth/#{conn.params["provider"]}/callback"
    IO.inspect(uri)
    uri
  end

  def auth_redirect(conn, params) do
    IO.inspect(params)
    test = AmpsWeb.Endpoint.url() <> "?" <> URI.encode_query(params)
    IO.inspect(test)
    redirect(conn, external: test)
  end

  @spec callback(Conn.t(), map()) :: Conn.t()
  def callback(conn, %{"provider" => provider} = params) do
    session_params = Map.fetch!(params, "session_params")
    params = Map.drop(params, ["provider", "session_params"])

    conn = Conn.put_private(conn, :pow_assent_session_params, session_params)
    {:ok, body, _user, conn} = Plug.callback(conn, provider, params, redirect_uri(conn))

    Pow.Plug.authenticate_user(conn, body)
    |> case do
      {:ok, conn} ->
        case provider do
          "google" ->
            user = Pow.Plug.current_user(conn)

            if user.approved do
              json(conn, %{
                data: %{
                  user: user,
                  access_token: conn.private[:api_access_token],
                  renewal_token: conn.private[:api_renewal_token]
                }
              })
            else
              json(conn, %{
                unapproved: "You have been registered and your account is pending approval."
              })
            end
        end

      {:error, conn} ->
        conn
        |> put_status(500)
        |> json(%{error: %{status: 500, message: "An unexpected error occurred"}})
    end
  end
end
