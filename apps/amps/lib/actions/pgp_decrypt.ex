defmodule Amps.Actions.PGPDecrypt do
  require Logger

  def run(msg, parms, {state, _env}) do
    Logger.info("input #{inspect(msg)}")
    {:ok, newmsg} = decrypt(msg, parms, state)
    Logger.info("output #{inspect(newmsg)}")
    {:send, [newmsg]}
  end

  defp decrypt(msg, parms, _state) do
    msgid = AmpsUtil.get_id()
    dir = AmpsUtil.tempdir(msgid)
    key = Path.join(dir, "key.asc")
    signing_key = Path.join(dir, "signing_key.asc")

    fpath = Path.join(dir, msgid)
    File.write(key, AmpsUtil.get_key(parms["key"]))
    File.write(signing_key, AmpsUtil.get_key(parms["signing_key"]))

    exec =
      "gpg --batch --pinentry-mode loopback --import #{signing_key}"
      |> String.to_charlist()
      |> :os.cmd()

    IO.inspect(exec)

    exec =
      "gpg --batch --pinentry-mode loopback --import #{key}"
      |> String.to_charlist()
      |> :os.cmd()

    IO.inspect(exec)
    command = "#{if msg["data"] do
      "echo \"#{msg["data"]}\" | "
    end}gpg --batch --pinentry-mode loopback --passphrase #{parms["passphrase"]} -o #{fpath} --decrypt #{if msg["fpath"] do
      msg["fpath"]
    end}"
    IO.inspect(exec)

    exec =
      command
      |> String.to_charlist()
      |> :os.cmd()
      |> List.to_string()

    IO.inspect(exec)

    if(String.contains?(exec, "failed")) do
      raise exec
    end

    if parms["verify"] do
      if String.contains?(exec, "Good signature") do
        :ok
      else
        raise "Unverified Signature"
      end
    end

    File.rm(key)
    File.rm(signing_key)
    info = File.stat!(fpath)

    newmsg =
      msg
      |> Map.drop(["data"])
      |> Map.merge(%{
        "fpath" => fpath,
        "fname" => AmpsUtil.format(parms["format"], msg),
        "msgid" => msgid,
        "fsize" => info.size,
        "temp" => true,
        "parent" => msg["msgid"]
      })

    {:ok, newmsg}
  end
end
