defmodule Amps.GenConsumer do
  use KafkaEx.GenConsumer

  alias KafkaEx.Protocol.Fetch.Message

  require Logger

  defmodule State do
    defstruct messages: [], calls: 0, opts: nil
  end

  # note - messages are delivered in batches

  def init(_topic, _partition) do
    {:ok, %State{}}
  end

  def init(_topic, _partition, opts) do
    {:ok, %State{opts: opts}}
  end

  def handle_message_set(message_set, state) do
    # raise "TEST"

    for message <- message_set do
      handle_message(message, state.opts)
    end

    {:async_commit, state}
  end

  def handle_message(msg, opts) do
    msgid = AmpsUtil.get_id()
    fpath = Path.join(AmpsUtil.tempdir(msgid), msgid)

    data =
      try do
        Jason.encode!(%{"data" => msg.value})
        %{"data" => msg.value}
      rescue
        _ ->
          IO.inspect("RESCUING")
          File.write(fpath, msg.value)
          info = File.stat!(fpath)
          %{"fpath" => fpath, "fsize" => info.size}
      end

    event =
      Map.merge(
        %{
          "service" => opts["name"],
          "msgid" => msgid,
          "ktopic" => msg.topic,
          "ftime" => DateTime.to_iso8601(DateTime.utc_now())
        },
        data
      )

    fname =
      if not AmpsUtil.blank?(opts["format"]) do
        AmpsUtil.format(opts["format"], event)
      else
        opts["name"] <> "_" <> AmpsUtil.format("{YYYY}_{MM}_{DD}_{HH}_{mm}_{SS}", event)
      end

    event = Map.merge(event, %{"fname" => fname})

    Logger.info("Kafka Message Received from service #{opts["name"]} on topic #{msg.topic}")

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