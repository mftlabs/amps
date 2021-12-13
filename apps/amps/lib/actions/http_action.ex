defmodule HttpAction do
  import Logger

  def run(msg, parms, state) do
    Logger.info("input #{inspect(msg)}")
    {:ok, newmsg} = req(msg, parms, state)
    Logger.info("output #{inspect(newmsg)}")
    AmpsEvents.send(newmsg, parms, state)
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
    data =
      if msg["data"] do
        msg["data"]
      else
        File.open!(msg["fpath"])
      end

    {:ok, res} =
      HTTPoison.request(
        String.to_atom(parms["method"]),
        parms["url"],
        Jason.encode!(%{"data" => data}),
        parms["headers"]
      )

    msgid = AmpsUtil.get_id()
    parent = msg["msgid"]

    msg =
      msg
      |> Map.drop(["fpath", "fsize"])
      |> Map.merge(%{
        "msgid" => msgid,
        "data" => res.body,
        "temp" => true,
        "parent" => parent
      })

    IO.inspect(res)
    {:ok, msg}

    # {:file, msg["fpath"]}
  end
end
