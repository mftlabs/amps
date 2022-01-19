defmodule PGPEncrypt do
  require Logger

  def run(msg, parms, state) do
    # Logger.info("input #{inspect(msg)}")

    {:ok, newmsg} = encrypt(msg, parms, state)
    Logger.info("output #{inspect(newmsg)}")
    AmpsEvents.send(newmsg, parms, state)
  end

  defp encrypt(msg, parms, _state) do
    msgid = AmpsUtil.get_id()
    dir = AmpsUtil.tempdir(msgid)
    key = Path.join(dir, "key.asc")
    signing_key = Path.join(dir, "signing_key.asc")

    fpath = Path.join(dir, msgid)
    IO.inspect(signing_key)
    IO.inspect(key)

    IO.inspect(File.write(key, AmpsUtil.get_key(parms["key"])))
    IO.inspect(File.write(signing_key, AmpsUtil.get_key(parms["signing_key"])))
    IO.inspect(File.stat!(key))

    exec =
      "gpg --pinentry-mode loopback --passphrase #{parms["passphrase"]} --import #{signing_key}"
      |> String.to_charlist()
      |> :os.cmd()

    exec =
      exec |> List.to_string() |> String.split(" ") |> Enum.at(2) |> String.trim_trailing(":")

    keyid = "0x" <> exec

    command = "#{if msg["data"] do
      "echo \"#{msg["data"]}\" | "
    end}gpg --batch #{if parms["armor"] do
      "--armor"
    end} #{if !parms["compress"] do
      "-z 0"
    end} --recipient-file #{key} --local-user #{keyid} --pinentry-mode loopback --passphrase #{parms["passphrase"]} --sign -o #{fpath} --encrypt #{if msg["fpath"] do
      msg["fpath"]
    end}"
    IO.inspect(command)

    exec =
      command
      |> String.to_charlist()
      |> :os.cmd()

    # File.rm(key)
    # File.rm(signing_key)

    case exec do
      [] ->
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

      error ->
        error
    end
  end
end
