defmodule Amps.PyConsumer do
  @behaviour Amps.PullConsumer

  @impl Amps.PullConsumer
  def initialize(state) do
    state
  end

  @impl Amps.PullConsumer
  def process(_message, msg, _process_task, _mstate, state) do
    evtopic = AmpsUtil.env_topic("amps.events.action", state.env)
    topic = state.parms["topic"]

    AmpsEvents.send_history(
      evtopic,
      "message_events",
      msg,
      %{
        "status" => "started",
        "topic" => topic,
        "action" => action_name(state)
      }
    )

    AmpsUtil.local_file(msg, state.env)

    resp =
      :pythra.method(state.process.pid, state.process.service, :__receive__, [
        JSON.encode!(msg)
      ])

    case resp do
      {:ok, status} ->
        status = to_string(status)

        AmpsEvents.send_history(
          evtopic,
          "message_events",
          msg,
          %{
            "status" => status,
            "topic" => topic,
            "action" => action_name(state)
          }
        )

        {:ack, status}

      {:error, error} ->
        raise inspect(error)
    end
  end

  @impl Amps.PullConsumer
  def action_name(state) do
    state.parms["name"] <> " Message Handler"
  end
end
