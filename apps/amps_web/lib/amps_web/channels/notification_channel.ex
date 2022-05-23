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
    env = Amps.DB.find_one("admin", %{"_id" => socket.assigns().user_id})["config"]["env"]

    response =
      if env == "" do
        case SvcManager.service_active?(name) do
          nil ->
            false

          _pid ->
            true
        end
      else
        case Amps.EnvSvcManager.service_active?(name, env) do
          nil ->
            false

          _pid ->
            true
        end
      end

    {:reply, {:ok, response}, socket}
  end

  def handle_in("environment", %{"name" => name}, socket) do
    response =
      case Amps.EnvManager.env_active?(name) do
        nil ->
          false

        _pid ->
          true
      end

    {:reply, {:ok, response}, socket}
  end

  def handle_in("stream", %{"name" => stream}, socket) do
    env = Amps.DB.find_one("admin", %{"_id" => socket.assigns().user_id})["config"]["env"]

    stream =
      if env == "" do
        stream
      else
        String.upcase(env) <> "-" <> stream
      end

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

  def handle_in("consumer", body, socket) do
    env = Amps.DB.find_one("admin", %{"_id" => socket.assigns().user_id})["config"]["env"]

    if body["local"] do
      nodes = [node() | Node.list()]

      resp =
        Enum.reduce(nodes, "", fn node, acc ->
          {stream, consumer} = AmpsUtil.get_names(body, env, node)

          case Jetstream.API.Consumer.info(:gnat, stream, consumer) do
            {:ok, info} ->
              acc <> " " <> Integer.to_string(info.num_pending)

            {:error, error} ->
              acc
          end
        end)

      {:reply, {:ok, resp}, socket}
    else
      {stream, consumer} = AmpsUtil.get_names(body, env)

      case Jetstream.API.Consumer.info(:gnat, stream, consumer) do
        {:ok, info} ->
          {:reply, {:ok, Integer.to_string(info.num_pending)}, socket}

        {:error, error} ->
          {:reply, {:ok, "Error"}, socket}
      end
    end
  end

  def handle_out(event, msg, socket) do
    push(socket, event, msg)
    {:noreply, socket}
  end
end
