defmodule AmpsWeb.UserSocket do
  use Phoenix.Socket
  alias AmpsWeb.APIAuthPlug
  # transport :websocket, Phoenix.Transports.WebSocket
  channel "notifications", AmpsWeb.NotificationChannel

  ## Channels
  # channel "room:*", AmpsWeb.RoomChannel

  # Socket params are passed from the client and can
  # be used to verify and authenticate a user. After
  # verification, you can put default assigns into
  # the socket that will be set for all channels, ie
  #
  #     {:ok, assign(socket, :user_id, verified_user_id)}
  #
  # To deny connection, return `:error`.
  #
  # See `Phoenix.Token` documentation for examples in
  # performing token verification on connect.
  @impl true
  # def connect(_params, socket, _connect_info) do
  #   {:ok, socket}
  # end

  def connect(%{"token" => token} = _params, socket, %{pow_config: config}) do
    %Plug.Conn{secret_key_base: socket.endpoint.config(:secret_key_base)}
    |> APIAuthPlug.get_credentials(token, config)
    |> case do
      nil ->
        :error

      {user, metadata} ->
        fingerprint = Keyword.fetch!(metadata, :fingerprint)

        socket =
          socket
          |> assign(:session_fingerprint, fingerprint)
          |> assign(:user_id, user.id)

        {:ok, socket}
    end
  end

  def connect(_params, _socket, %{pow_config: _config}) do
    {:error, "Unauthorized"}
  end

  # Socket id's are topics that allow you to identify all sockets for a given user:
  #
  #     def id(socket), do: "user_socket:#{socket.assigns.user_id}"
  #
  # Would allow you to broadcast a "disconnect" event and terminate
  # all active sockets and channels for a given user:
  #
  #     AmpsWeb.Endpoint.broadcast("user_socket:#{user.id}", "disconnect", %{})
  #
  # Returning `nil` makes this socket anonymous.
  @impl true
  def id(_socket), do: nil
end
