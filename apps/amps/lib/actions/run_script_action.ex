defmodule RunScriptAction do
  require Logger

  def run(msg, parms, state) do
    result =
      case parms["script_type"] do
        "python" ->
          Amps.PyService.call(msg, parms)

        _ ->
          nil

          # do better checking to see if module exists
          # apply(String.to_atom("Elixir." <> parms["module"]), :run, [parms, files])
      end

    case result do
      {:ok, rparm} ->
        Logger.info("Script returned: #{inspect(rparm)}")
        :ok

      {:error, error} ->
        raise error
    end
  end
end
