defmodule RunScriptAction do
  require Logger

  def run(msg, parms, {state, env}) do
    result =
      case parms["script_type"] do
        "python" ->
          Amps.PyService.call(msg, parms, env)

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
              msg
              |> Map.merge(newmsg)
              |> Map.merge(%{
                "parent" => msg["msgid"]
              })
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

          AmpsEvents.send(event, parms, %{})
        end

        :ok

      {:error, error} ->
        raise error
    end
  end
end
