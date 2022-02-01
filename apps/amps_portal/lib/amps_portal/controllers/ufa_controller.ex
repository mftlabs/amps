defmodule AmpsPortal.UFAController do
  use AmpsPortal, :controller
  import Argon2
  import Jetstream
  alias Amps.DB

  def get_sched(conn, %{"username" => username}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        json(
          conn,
          nil
        )

      user ->
        if user.username == username do
          user = DB.find_one("users", %{"username" => username})

          ufa = user["ufa"]

          schedule = %{
            "account" => %{
              "stime" => ufa["stime"],
              "debug" => to_string(ufa["debug"]),
              "logfile" => ufa["logpath"],
              "hinterval" => Integer.to_string(ufa["hinterval"]),
              "cinterval" => Integer.to_string(ufa["cinterval"]),
              "max" => Integer.to_string(ufa["max"]) || "100"
            }
          }

          schedule =
            Enum.reduce(user["rules"], schedule, fn rule, acc ->
              name = rule["name"]

              rule =
                rule
                |> Map.drop(["name"])
                |> Map.put("rtype", rule["type"])
                |> Map.drop(["type"])
                |> Enum.reduce(%{}, fn {k, v}, acc ->
                  if is_boolean(v) do
                    Map.put(acc, k, to_string(v))
                  else
                    Map.put(acc, k, v)
                  end
                end)

              Map.put(acc, name, rule)
            end)

          encoded = Jason.encode!(schedule)

          json(
            conn,
            encoded
          )
        else
          send_resp(conn, 401, "Unauthorized")
        end
    end
  end

  def heartbeat(conn, %{"username" => username}) do
    AmpsEvents.send_history(
      "amps.events.svcs",
      "service_events",
      %{
        "status" => "running",
        "service" => "ufa",
        "user" => username
      }
    )

    json(conn, :ok)
  end

  def poll_mailbox(conn, %{"username" => username}) do
  end

  def handle_download(conn, %{"username" => username}) do
    receive_message(%{"username" => username, "topic" => "amps.mailbox.#{username}"}, self())

    receive do
      {:message, message} ->
        IO.inspect(message)
        conn = conn |> put_resp_header("amps-message", message.reply_to)
        message

        msg = Jason.decode!(message.body)["msg"]

        if msg["data"] do
          send_download(conn, {:binary, msg["data"]}, filename: msg["fname"])
        else
          send_download(conn, {:file, msg["fpath"]}, filename: msg["fname"])
        end

      {:none, nil} ->
        IO.inspect("none")
        send_resp(conn, 404, "No Messages")
    end
  end

  def ack(conn, %{"reply" => reply}) do
    IO.inspect(reply)
    res = Jetstream.ack(%{gnat: Process.whereis(:gnat), reply_to: reply})
    IO.inspect(res)
    json(conn, :ok)
  end

  def handle_upload(conn, %{
        "username" => username,
        "file" => file,
        "meta" => meta
      }) do
    meta = Jason.decode!(meta)
    msgid = meta["msgid"]

    dir = AmpsUtil.tempdir(msgid)
    fpath = Path.join(dir, msgid)
    File.cp(file.path, fpath)
    info = File.stat!(fpath)
    IO.inspect(info)

    msg =
      Map.merge(
        meta,
        %{
          "fname" => file.filename,
          "fpath" => fpath,
          "fsize" => info.size,
          "service" => "ufa",
          "user" => username
        }
      )

    AmpsEvents.send(msg, %{"output" => "amps.svcs.ufa." <> username}, %{})

    AmpsEvents.send_history(
      "amps.events.messages",
      "message_events",
      Map.merge(msg, %{
        "status" => "received"
      })
    )

    json(conn, :ok)
  end

  def receive_message(parms, pid) do
    parms = %{"name" => parms["username"], "topic" => parms["topic"]}
    listening_topic = "_CON.#{nuid()}"

    {stream, consumer} = {"MAILBOX", parms["name"]}
    IO.inspect(stream)
    # AmpsUtil.create_consumer(stream, consumer, parms["topic"])

    spawn(fn ->
      con = %{
        listening_topic: listening_topic,
        connection_pid: Process.whereis(:gnat),
        stream_name: stream,
        consumer_name: consumer
      }

      sid = subscribe(con, parms)
      IO.inspect(sid)

      case get_message(con, parms, sid) do
        nil ->
          send(pid, {:none, nil})
          sid

          Gnat.unsub(self(), sid)

        msg ->
          send(pid, {:message, msg})
          Gnat.unsub(self(), sid)
      end
    end)
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

    {:ok, sid} =
      Gnat.sub(consumer.connection_pid, self(), consumer.listening_topic, queue_group: group)

    sid
  end

  def get_message(state, parms, sid) do
    with {:ok,
          %{
            num_pending: num
          }} <-
           Jetstream.API.Consumer.info(
             state.connection_pid,
             state.stream_name,
             state.consumer_name
           ) do
      IO.inspect(num)

      case num do
        0 ->
          nil

        _ ->
          receive do
            {:msg, message} ->
              message
          end
      end
    end
  end

  defp nuid(), do: :crypto.strong_rand_bytes(12) |> Base.encode64()
end
