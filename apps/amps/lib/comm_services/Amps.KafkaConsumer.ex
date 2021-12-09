defmodule Amps.KafkaConsumer do
  use Elsa.Consumer.MessageHandler
  require Logger

  def init(args) do
    {:ok, args}
  end

  def handle_messages(messages, state) do
    IO.inspect(state)

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
      "topic" => msg.topic,
      "data" => msg.value,
      "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
      "fname" => opts["name"] <> "_" <> AmpsUtil.format("{YYYY}_{MM}_{DD}_{HH}_{mm}_{SS}", msg)
    }

    IO.inspect(event)

    ktopic = Regex.replace(~r/[.>* -]/, msg.topic, "_")

    topic = "amps.svcs.#{opts["name"]}.#{ktopic}"
    IO.inspect(topic)
    AmpsEvents.send(event, %{"output" => topic}, %{})
  end
end
