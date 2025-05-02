defmodule Amps.Actions.StringReplace do
  require Logger

  # String Replace Action

  def run(msg, parms, {_state, env}) do
    Logger.info("input #{inspect(msg)}")
    {:ok, newmsg} = replace(msg, parms, env)
    Logger.info("output #{inspect(newmsg)}")
    {:send, [newmsg]}
  end

  defp replace(msg, parms, env) do
    from = parms["from"] || ""
    to = parms["to"] || ""
    {is, os, val} = AmpsUtil.get_stream(msg, env)

    is
    |> Stream.map(&String.replace(&1, from, to))
    |> Stream.into(os)
    |> Stream.run()

    newmsg = AmpsUtil.get_output_msg(msg, val)
    {:ok, newmsg}
  end
end
