defmodule AmpsPortal.UFAController do
  use AmpsPortal, :controller
  import Argon2
  import Jetstream
  alias Amps.DB
  require Logger

  def get_sched(conn, %{"username" => username}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

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
                    if is_integer(v) do
                      Map.put(acc, k, Integer.to_string(v))
                    else
                      Map.put(acc, k, v)
                    end
                  end
                end)

              Map.put(acc, name, rule)
            end)

          encoded = Jason.encode!(schedule)

          AmpsEvents.send_history(
            "amps.events.svcs",
            "service_events",
            %{
              "service" => "ufa",
              "user" => user["username"],
              "status" => "success",
              "operation" => "schedule"
            }
          )

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
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        AmpsEvents.send_history(
          "amps.events.svcs",
          "service_events",
          %{
            "service" => "ufa",
            "user" => user.username,
            "status" => "success",
            "operation" => "heartbeat"
          }
        )

        json(conn, :ok)
    end
  end

  def poll_mailbox(conn, %{"username" => username}) do
  end

  def handle_upload(conn, %{
        "username" => username,
        "file" => file,
        "meta" => meta
      }) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
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

        topic = "amps.svcs.ufa." <> username

        AmpsEvents.send(msg, %{"output" => topic}, %{})

        AmpsEvents.send_history(
          "amps.events.messages",
          "message_events",
          Map.merge(msg, %{
            "status" => "received",
            "output" => topic
          })
        )

        AmpsEvents.send_history(
          "amps.events.svcs",
          "service_events",
          Map.merge(msg, %{
            "service" => "ufa",
            "user" => user.username,
            "status" => "success",
            "operation" => "upload"
          })
        )

        json(conn, :ok)
    end
  end

  def handle_download(conn, %{"rule" => rule}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        case receive_message({user, rule}, self()) do
          {:message, message} ->
            IO.inspect(message)

            msg = Jason.decode!(message.body)["msg"]

            conn =
              conn
              |> put_resp_header("amps-reply", message.reply_to)
              |> put_resp_header("amps-message", message.body)

            AmpsEvents.send_history(
              "amps.events.svcs",
              "service_events",
              Map.merge(msg, %{
                "service" => "ufa",
                "user" => user.username,
                "status" => "started",
                "operation" => "download"
              })
            )

            if msg["data"] do
              send_download(conn, {:binary, msg["data"]}, filename: msg["fname"])
            else
              send_download(conn, {:file, msg["fpath"]}, filename: msg["fname"])
            end

          {:none, nil} ->
            IO.inspect("none")
            send_resp(conn, 404, "No Messages")

          {:error, error} ->
            send_resp(conn, 408, "Subscriber Timeout")
        end
    end
  end

  def ack(conn, %{"reply" => reply}) do
    IO.inspect(conn)

    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        IO.inspect(reply)
        res = Jetstream.ack(%{gnat: Process.whereis(:gnat), reply_to: reply})

        msg = Jason.decode!(get_req_header(conn, "amps-message"))

        AmpsEvents.send_history(
          "amps.events.svcs",
          "service_events",
          Map.merge(msg, %{
            "service" => "ufa",
            "user" => user.username,
            "status" => "completed",
            "operation" => "download"
          })
        )

        IO.inspect(res)
        json(conn, :ok)
    end
  end

  def receive_message({user, rule}, pid) do
    listening_topic = "_CON.#{nuid()}"

    {stream, consumer} = {"MAILBOX", user.username <> "_" <> rule}

    try do
      pid =
        Task.async(fn ->
          con = %{
            listening_topic: listening_topic,
            connection_pid: Process.whereis(:gnat),
            stream_name: stream,
            consumer_name: consumer
          }

          sid = subscribe(con, %{"name" => consumer})

          case get_message(con) do
            nil ->
              Gnat.unsub(:gnat, sid)

              {:none, nil}

            msg ->
              Gnat.unsub(:gnat, sid)

              {:message, msg}
          end
        end)

      Task.await(pid, 2500)
    catch
      :exit, _ ->
        Logger.info("UFA Subscription Timeout")
        {:error, "timeout"}
    end
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

  def get_message(state) do
    with {:ok,
          %{
            num_pending: pending,
            num_redelivered: redelivered
          }} <-
           Jetstream.API.Consumer.info(
             state.connection_pid,
             state.stream_name,
             state.consumer_name
           ) do
      num = pending + redelivered

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

  def get_agent_config(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        user = Amps.DB.find_one("users", %{"_id" => user.id})
        # _host = Application.fetch_env!(:amps_portal, AmpsWeb.Endpoint)[:url]

        json(conn, user["ufa"])
        # json(conn, :ok)
    end
  end

  def put_agent_config(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        body = conn.body_params()
        Amps.DB.find_one_and_update("users", %{"_id" => user.id}, %{"ufa" => body})

        json(conn, :ok)
    end
  end

  def get_agent(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        user = Amps.DB.find_one("users", %{"_id" => user.id})
        # _host = Application.fetch_env!(:amps_portal, AmpsWeb.Endpoint)[:url]

        agentdir = Application.app_dir(:amps_portal, "priv/agents")
        query = conn.query_params()
        os = query["os"]
        arch = query["arch"]
        host = query["host"]
        {:ok, agentfolder} = Temp.mkdir()

        agent =
          case os do
            "linux" ->
              case arch do
                "32" ->
                  "386"

                "64" ->
                  "amd64"
              end

            "darwin" ->
              "universal"

            "windows" ->
              case arch do
                "32" ->
                  "386"

                "64" ->
                  "amd64"
              end
          end

        fname =
          if os == "windows" do
            "ufa_agent.exe"
          else
            "ufa_agent"
          end

        File.copy(Path.join([agentdir, os, agent]), Path.join(agentfolder, fname))

        conf =
          File.read!(Path.join(agentdir, "conf"))
          |> String.replace("{UFA_URL}", host)

        # IO.inspect(script)

        IO.inspect(File.write(Path.join(agentfolder, "conf"), conf))

        IO.inspect(File.ls(agentfolder))

        # case os do
        #   "linux" ->

        #   "windows" ->
        #     IO.inspect(File.cp_r("./agents/windows", agentfolder))

        #     script =
        #       File.read!(Path.join(agentfolder, "run.bat"))
        #       |> String.replace("{ACCOUNT}", account["username"])
        #       |> String.replace("{KEY}", account["username"])
        #       |> String.replace(
        #         "{CRED}",
        #         AmpsWeb.Encryption.decrypt(account["aws_secret_access_key"])
        #       )
        #       |> String.replace("{HOST}", host)

        #     IO.inspect(script)
        #     IO.inspect(File.write(Path.join(agentfolder, "run.bat"), script))

        #     IO.inspect(File.ls(agentfolder))

        #   "mac" ->
        #     {"run.sh", "mac_" <> arch <> "_agent"}
        # end

        zipname = user["username"] <> "_agent.zip"

        files = File.ls!(agentfolder) |> Enum.map(&String.to_charlist/1)

        {:ok, zippath} = Temp.mkdir()
        zippath = Path.join(zippath, zipname)
        {:ok, zip} = :zip.create(zippath, files, cwd: agentfolder)

        IO.inspect(zip)

        send_download(conn, {:file, zip}, disposition: :attachment)
        # json(conn, :ok)
    end
  end

  def get_agent_rules(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        user = DB.find_one("users", %{"username" => user.username})
        json(conn, user["rules"])
    end
  end

  def create_agent_rule(conn, _params) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        body = conn.body_params()
        fieldid = DB.add_to_field("users", body, user.id, "rules")
        user = DB.find_one("users", %{"_id" => user.id})
        rule = Map.put(body, "_id", fieldid)
        AmpsPortal.Util.agent_rule_creation(user, rule)

        json(conn, :ok)
    end
  end

  def update_agent_rule(conn, %{"id" => id}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        body = conn.body_params()
        body = Map.put(body, "_id", id)
        DB.update_in_field("users", body, user.id, "rules", id)
        rule = DB.get_in_field("users", user.id, "rules", id)
        AmpsPortal.Util.agent_rule_update(user.id, rule)

        json(conn, :ok)
    end
  end

  def get_agent_rule(conn, %{"id" => id}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        rule = DB.get_in_field("users", user.id, "rules", id)

        json(conn, rule)
    end
  end

  def delete_agent_rule(conn, %{"id" => id}) do
    case Pow.Plug.current_user(conn) do
      nil ->
        send_resp(conn, 403, "Forbidden")

      user ->
        IO.inspect(user)
        rule = DB.get_in_field("users", user.id, "rules", id)
        DB.delete_from_field("users", nil, user.id, "rules", id)
        user = DB.find_one("users", %{"_id" => user.id})

        AmpsPortal.Util.agent_rule_deletion(user, rule)
        json(conn, :ok)
    end
  end
end
