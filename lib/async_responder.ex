defmodule Amps.AsyncResponder do
  alias Amps.DB
  # alias Amps.DB
  require Logger
  use GenServer

  def start_link(_args) do
    Logger.info("Starting Async Responder")
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(opts) do
    Process.send_after(self(), {:initial_connect, opts}, 0)
    {:ok, %{}}
  end

  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  # GenServer callbacks
  def handle_info({:initial_connect, opts}, _state) do
    {:noreply, opts}
  end

  def register(events, parms, env, timeout) do
    id = AmpsUtil.get_id()

    try do
      Task.async(fn ->
        Amps.Responders.put(id, self())

        Enum.each(events, fn event ->
          AmpsEvents.send(event, parms, %{"return" => id}, env)
        end)

        subs =
          DB.find(AmpsUtil.index(env, "services"), %{
            "type" => "subscriber",
            "topic" => parms["output"]
          })

        if Enum.count(subs) == 0 do
          Amps.Responders.delete(id)
          {:sent, "Action performed successfully\nMessage sent to topic:\n" <> parms["output"]}
        else
          receive do
            {:resp, responses} ->
              Amps.Responders.delete(id)

              {:resp, responses}
          end
        end
      end)
      |> Task.await(timeout)
    catch
      :exit, _ ->
        Amps.Responders.delete(id)
        :pending
    end
  end

  def register_message(id, ctxid) do
    Amps.Responders.put_pending(id, ctxid)
  end

  def resolve_message(id, ctxid) do
    res = Amps.Responders.delete_pending(id, ctxid)
    done?(res)
  end

  def put_response(id, ctxid, response) do
    res = Amps.Responders.put_response(id, ctxid, response)
    done?(res)
  end

  def done?(res) do
    case res do
      nil ->
        false

      {:responder, id, pid, node, pending, responses} ->
        case pending do
          [] ->
            Process.send(pid, {:resp, responses}, [])

          _pending ->
            false
        end
    end
  end
end
