defmodule AmpsPortal.UFAController do
  use AmpsPortal, :controller
  import Argon2
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
end
