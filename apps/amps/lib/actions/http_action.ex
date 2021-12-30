defmodule HttpAction do
  import Logger

  def run(msg, parms, state) do
    Logger.info("input #{inspect(msg)}")
    {:ok, newmsg} = req(msg, parms, state)
    Logger.info("output #{inspect(newmsg)}")
    # AmpsEvents.send(newmsg, parms, state)
  end

  def req(msg, parms, state) do
    IO.inspect(msg)
    IO.inspect(parms)
    IO.inspect(state)

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
    body =
      if msg["data"] || msg["fpath"] do
        if parms["multipart"] do
          if msg["data"] do
            {:multipart,
             [{"file", msg["data"], {"form-data", [name: "file", filename: msg["fname"]]}, []}]}
          else
            {:multipart,
             [
               {:file, msg["fpath"],
                {"form-data", [{"name", "file"}, {"filename", msg["fname"]}]}, []}
             ]}
          end
        else
          if msg["data"] do
            {"file", msg["data"], {"form-data", [name: "file", filename: msg["fname"]]}, []}
          else
            {:file, msg["fpath"]}
          end
        end
      else
        ""
      end

    IO.inspect(body)

    resp =
      case parms["method"] do
        "get" ->
          HTTPoison.request(
            String.to_atom(parms["method"]),
            parms["url"] <> parms["querystring"],
            parms["headers"],
            follow_redirect: true
          )

        "post" ->
          HTTPoison.post(
            parms["url"] <> parms["querystring"],
            body,
            parms["headers"],
            follow_redirect: true
          )

        "delete" ->
          HTTPoison.delete(
            String.to_atom(parms["method"]),
            parms["url"] <> parms["querystring"],
            parms["headers"],
            follow_redirect: true
          )
      end

    case resp do
      {:error, error} ->
        raise error

      {:ok, res} ->
        IO.inspect(res)

        case res do
          %HTTPoison.Response{
            body: body,
            headers: headers,
            status_code: 200
          } ->
            Logger.info("#{inspect(body)}")

          %HTTPoison.Response{
            body: body,
            headers: headers,
            status_code: error_code
          } ->
            IO.inspect(body)
            raise Integer.to_string(error_code) <> " " <> body
        end
    end

    # msgid = AmpsUtil.get_id()
    # parent = msg["msgid"]

    # msg =
    #   msg
    #   |> Map.drop(["fpath", "fsize"])
    #   |> Map.merge(%{
    #     "msgid" => msgid,
    #     "data" => res.body,
    #     "temp" => true,
    #     "parent" => parent
    #   })

    {:ok, msg}

    # {:file, msg["fpath"]}
  end
end
