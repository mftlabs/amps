defmodule Amps.Actions.RunScript do
  require Logger

  def run(msg, parms, {state, env}) do
    runscript(msg, parms, env)
  end

  def runscript(msg, parms, env) do
    result =
      case parms["script_type"] do
        "python" ->
          Amps.PyService.run(msg, parms, env)

        _ ->
          nil

          # do better checking to see if module exists
          # apply(String.to_atom("Elixir." <> parms["module"]), :run, [parms, files])
      end

    case result do
      {:ok, rparm} ->
        Logger.info("Script returned: #{inspect(rparm)}")

        if parms["send_output"] do
          msgid = AmpsUtil.get_id()
          newmsg = rparm["msg"]

          event =
            if newmsg do
              msg =
                msg
                |> Map.merge(newmsg)
                |> Map.merge(%{
                  "msgid" => msgid,
                  "parent" => msg["msgid"]
                })

              if newmsg["data"] do
                Map.drop(msg, ["fpath", "fsize"])
              else
                Map.drop(msg, ["data"])
              end
            else
              Map.merge(
                msg,
                %{
                  "msgid" => msgid,
                  "parent" => msg["msgid"],
                  "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
                  "fname" => AmpsUtil.format(parms["format"], msg)
                }
              )
            end

          IO.inspect(parms)
          {:send, [event]}
        else
          {:ok, rparm}
        end

      {:error, error} ->
        raise error
    end
  end
end
