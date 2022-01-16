defmodule BatchAction do
  require Logger
  alias AmpsWeb.DB

  def run(msg, parms, state) do
    Logger.info("input #{inspect(msg)}")

    case batch(msg, parms, state) do
      {:ok, newmsg} ->
        Logger.info("output #{inspect(newmsg)}")
        AmpsEvents.send(newmsg, parms, state)

      :ok ->
        :ok
    end
  end

  def batch(msg, parms, state) do
    messages =
      case parms["inputtype"] do
        "topic" ->
          listening_topic = "_CON.#{nuid()}"

          {stream, consumer} =
            AmpsUtil.get_names(%{"name" => parms["name"], "topic" => parms["input"]})

          AmpsWeb.DataController.create_batch_consumer(parms)

          parent = self()

          pid =
            spawn(fn ->
              con = %{
                listening_topic: listening_topic,
                connection_pid: Process.whereis(:gnat),
                stream_name: stream,
                consumer_name: consumer
              }

              subscribe(con, parms)

              messages = get_messages(con)
              send(parent, {:messages, messages})
            end)

          receive do
            {:messages, messages} ->
              messages
          end

        "mailbox" ->
          DB.find("mailbox", %{
            "recipient" => parms["mailbox"],
            "mtime" => %{"$gt" => get_time(parms["from_time"])}
          })
      end

    len = Enum.count(messages)

    case len do
      0 ->
        Logger.info("No messages to batch")
        :ok

      _ ->
        Logger.info("Batching #{len} messages")
        msgid = AmpsUtil.get_id()
        dir = AmpsUtil.tempdir(msgid)
        fpath = Path.join(dir, msgid)

        file = File.stream!(fpath)

        Enum.map(messages, fn msg ->
          data =
            if msg["fpath"] do
              File.read!(msg["fpath"])
            else
              msg["data"]
            end

          data <> parms["delimiter"]
        end)
        |> Stream.into(file)
        |> Stream.run()

        info = File.stat!(fpath)

        newmsg =
          msg
          |> Map.merge(%{
            "msgid" => msgid,
            "fpath" => fpath,
            "fsize" => info.size,
            "fname" => AmpsUtil.format(parms["format"], msg),
            "temp" => true
          })
          |> Map.drop(["data"])

        {:ok, newmsg}
    end
  end

  def get_time(time) do
    ((DateTime.utc_now() |> DateTime.to_unix()) - time)
    |> DateTime.from_unix!()
    |> DateTime.to_iso8601()
  end

  def test(time) do
    total =
      DB.find("mailbox", %{
        "recipient" => "aram0112",
        "mtime" => %{"$gt" => get_time(time)}
      })

    Enum.count(total)
  end

  def subscribe(consumer, parms) do
    :ok =
      Gnat.pub(
        consumer.connection_pid,
        "$JS.API.CONSUMER.MSG.NEXT.#{consumer.stream_name}.#{consumer.consumer_name}",
        "1",
        reply_to: consumer.listening_topic
      )

    group = String.replace(parms["name"], " ", "_")
    # consumer_name = get_consumer(parms, consumer_name)

    {:ok, _sid} =
      Gnat.sub(consumer.connection_pid, self(), consumer.listening_topic, queue_group: group)
  end

  @spec get_messages(
          atom
          | %{
              :connection_pid => atom | pid | {atom, any} | {:via, atom, any},
              :consumer_name => binary,
              :stream_name => binary,
              optional(any) => any
            },
          any
        ) :: any
  def get_messages(state, messages \\ []) do
    with {:ok,
          %{
            num_pending: num
          }} <-
           Jetstream.API.Consumer.info(
             state.connection_pid,
             state.stream_name,
             state.consumer_name
           ) do
      case num do
        0 ->
          messages

        _ ->
          receive do
            {:msg, message} ->
              msg = Jason.decode!(message.body)["msg"]
              Jetstream.ack_next(message, state.listening_topic)

              get_messages(state, messages ++ [msg])
          end
      end
    end
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
