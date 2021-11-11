defmodule AmpsWeb.NotificationChannel do
  use Phoenix.Channel, log_join: :info, log_handle_in: false
  alias Amps.SvcManager
  require Logger

  def join("notifications", _message, socket) do
    Phoenix.PubSub.subscribe(Amps.PubSub, "notifications")
    {:ok, socket}
  end

  def join(_, _params, _socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def handle_in("update", %{"page" => page}, socket) do
    IO.inspect(page)
    broadcast_from!(socket, "update", %{page: page})
    {:noreply, socket}
  end

  def handle_in("service", %{"name" => name}, socket) do
    response =
      case SvcManager.service_active?(name) do
        nil ->
          false

        pid ->
          true
      end

    # IO.inspect(response)

    {:reply, {:ok, response}, socket}
  end
end
