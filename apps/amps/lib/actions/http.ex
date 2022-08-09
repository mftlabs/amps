defmodule Amps.Actions.Http do
  require Logger

  def run(msg, parms, {_state, env}) do
    Logger.info("input #{inspect(msg)}")
    req(msg, parms, env)
    # AmpsEvents.send(newmsg, parms, state)
  end

  def req(msg, parms, env) do
    # case parms["method"] do
    # end

    # if msg["data"] do
    #   msg["data"]
    # else
    #   {:ok, info} = File.stat(msg["fpath"])
    #   IO.inspect(info)
    #   # case parms["method"] do
    #   # end
    # end
    # body =
    #   if msg["data"] || msg["fpath"] do
    #     if parms["multipart"] do
    #       if msg["data"] do
    #         {:multipart,
    #          [{"file", msg["data"], {"form-data", [name: "file", filename: msg["fname"]]}, []}]}
    #       else
    #         {:multipart,
    #          [
    #            {:file, msg["fpath"],
    #             {"form-data", [{"name", "file"}, {"filename", msg["fname"]}]}, []}
    #          ]}
    #       end
    #     else
    #       if msg["data"] do
    #         {"file", msg["data"], {"form-data", [name: "file", filename: msg["fname"]]}, []}
    #       else
    #         {:file, msg["fpath"]}
    #       end
    #     end
    #   else
    #     ""
    #   end

    body = AmpsUtil.get_data(msg, env)

    IO.inspect(body)

    url = AmpsUtil.format(parms["url"], msg)

    Logger.info("URL: #{url}")

    urlinfo = URI.parse(url)

    IO.inspect(urlinfo)

    headers =
      Enum.reduce(parms["headers"], %{}, fn x, acc ->
        Map.put(acc, x["field"], x["value"])
      end)

    _resp =
      case parms["method"] do
        b when b in ["post", "put", "get"] ->
          resp =
            case b do
              "get" ->
                HTTPoison.get(
                  url,
                  headers,
                  follow_redirect: true
                )

              "post" ->
                HTTPoison.post(
                  url,
                  body,
                  headers |> Map.put("content-length", byte_size(body)),
                  follow_redirect: true,
                  recv_timeout: 500
                )

              "put" ->
                HTTPoison.put(
                  url,
                  body,
                  headers,
                  follow_redirect: true
                )
            end

          resp = check_resp(resp)

          if parms["send_output"] do
            msgid = AmpsUtil.get_id()
            dir = AmpsUtil.tempdir(msgid)
            fpath = Path.join(dir, msgid)
            File.write(fpath, resp.body)

            event = %{
              "msgid" => msgid,
              "service" => parms["name"],
              "fpath" => fpath,
              "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
              "fname" => AmpsUtil.format(parms["format"], msg)
            }

            event =
              if parms["store_headers"] do
                Map.merge(event, Enum.into(resp.headers, %{}))
              else
                event
              end

            {:send, [event]}
          end

        "delete" ->
          resp =
            HTTPoison.delete(
              url,
              headers,
              follow_redirect: true
            )

          check_resp(resp)

          :ok
      end
  end

  def check_resp(resp) do
    case resp do
      {:error, error} ->
        raise error

      {:ok, res} ->
        if res.status_code >= 400 do
          raise "Error #{res.status_code} #{res.body}"
        else
          Logger.info("HTTP call successful with code #{res.status_code}")
          res
        end
    end
  end
end
