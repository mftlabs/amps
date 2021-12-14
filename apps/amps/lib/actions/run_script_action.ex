defmodule RunScriptAction do
  use Export.Python

  def run(msg, parms, state) do
    {:ok, py} = Python.start(python_path: AmpsUtil.get_env(:python_path))

    with res <-
           py
           |> Python.call(
             run(
               Jason.encode!(%{"msg" => msg, "action" => parms}),
               Jason.encode!(parms["parms"])
             ),
             from_file: parms["module"] |> String.replace_trailing(".py", "")
           )
           |> Jason.decode!() do
      if res["success"] do
        newmsg =
          Map.merge(msg, %{
            "msgid" => AmpsUtil.get_id(),
            "temp" => true,
            "parent" => msg["msgid"]
          })

        AmpsEvents.send(newmsg, parms, state)
      else
        raise res["reason"]
      end
    end
  end
end
