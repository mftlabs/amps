defmodule StringReplaceAction do
  require Logger

  def run(msg, parms, {state, env}) do
    Logger.info("input #{inspect(msg)}")
    {:ok, newmsg} = replace(msg, parms, state)
    Logger.info("output #{inspect(newmsg)}")
    AmpsEvents.send(newmsg, parms, state)
  end

  defp replace(msg, parms, _state) do
    from = parms["from"] || ""
    to = parms["to"] || ""
    {is, os, val} = AmpsUtil.get_stream(msg)

    is
    |> Stream.map(&String.replace(&1, from, to))
    |> Stream.into(os)
    |> Stream.run()

    newmsg = AmpsUtil.get_output_msg(msg, val)
    {:ok, newmsg}
  end
end
