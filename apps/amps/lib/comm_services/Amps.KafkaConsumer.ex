defmodule Amps.KafkaConsumer do
  use Elsa.Consumer.MessageHandler
  require Logger

  def init(args) do
    {:ok, args}
  end

  def handle_messages(messages, state) do
    for msg <- messages do
      handle_message(msg, state)
    end

    {:ack, state}
  end

  def handle_message(msg, opts) do
    Logger.info(msg)
    msgid = AmpsUtil.get_id()

    event = %{
      "service" => opts["name"],
      "msgid" => msgid,
      "ktopic" => msg.topic,
      "data" => msg.value,
      "ftime" => DateTime.to_iso8601(DateTime.utc_now())
    }

    fname =
      if not AmpsUtil.blank?(opts["format"]) do
        AmpsUtil.format(opts["format"], event)
      else
        opts["name"] <> "_" <> AmpsUtil.format("{YYYY}_{MM}_{DD}_{HH}_{mm}_{SS}", event)
      end

    event = Map.merge(event, %{"fname" => fname})

    Logger.info("Kafka Message Received from service #{opts["name"]}: #{msg.value}")

    ktopic = Regex.replace(~r/[.>* -]/, msg.topic, "_")

    topic = "amps.svcs.#{opts["name"]}.#{ktopic}"
    AmpsEvents.send(event, %{"output" => topic}, %{})

    AmpsEvents.send_history(
      "amps.events.messages",
      "message_events",
      Map.merge(event, %{
        "status" => "received"
      })
    )
  end
end
