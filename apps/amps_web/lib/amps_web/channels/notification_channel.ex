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

    {:reply, {:ok, response}, socket}
  end

  def handle_in("stream", %{"name" => stream}, socket) do
    {:ok, %{consumers: consumers}} = Jetstream.API.Consumer.list(:gnat, stream)

    consumers =
      Enum.reduce(consumers, [], fn consumer, acc ->
        {:ok, info} = Jetstream.API.Consumer.info(:gnat, stream, consumer)

        info =
          Map.merge(info, info.config)
          |> Map.merge(info.delivered)
          |> Map.drop([:config, :delivered])

        [info | acc]
      end)

    {:reply, {:ok, consumers}, socket}
  end

  def handle_in("consumer", %{"name" => name, "topic" => topic}, socket) do
    {stream, consumer} = AmpsUtil.get_names(%{"name" => name, "topic" => topic})
    # IO.inspect("#{stream}, #{consumer}")
    {:ok, info} = Jetstream.API.Consumer.info(:gnat, stream, consumer)
    {:reply, {:ok, Integer.to_string(info.num_pending)}, socket}
  end
end
