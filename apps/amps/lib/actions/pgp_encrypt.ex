defmodule PGPEncrypt do
  require Logger

  def run(msg, parms, state) do
    # Logger.info("input #{inspect(msg)}")

    # msg = %{
    #   # "fpath" => "mix.exs",
    #   "data" => "echo \"hello\"",
    #   "fname" => "test.gpg"
    # }

    # parms = %{
    #   "key" => "-----BEGIN PGP PUBLIC KEY BLOCK-----

    #   mDMEYdTCzxYJKwYBBAHaRw8BAQdAQq0+70kO/jVqgnh5Hu2u2GE+NQ05btYKocii
    #   G8/1CHq0IUFiaGF5IFJhbSA8YWJoYXlrcmFtMTJAZ21haWwuY29tPoiaBBMWCgBC
    #   FiEEDfORZLd+UH0KaCiHvCXgL5Lph2AFAmHUws8CGwMFCQPCZwAFCwkIBwIDIgIB
    #   BhUKCQgLAgQWAgMBAh4HAheAAAoJELwl4C+S6Ydgd9MA/ip7IbwnaYIh6f5VelyB
    #   oi/NHm18K+ScxHf+F5Zz6Q+RAQCVwpEaWqtWNZxshzklsaC9Gy4DW6ckvvLe167S
    #   K9PZBLg4BGHUws8SCisGAQQBl1UBBQEBB0AUn/941g8dSmOxUxPePDbRwLje4Uiw
    #   b1paCLilHFIVLQMBCAeIfgQYFgoAJhYhBA3zkWS3flB9Cmgoh7wl4C+S6YdgBQJh
    #   1MLPAhsMBQkDwmcAAAoJELwl4C+S6YdgrgoBAKwdgQm1jTjOLSuaPlrAr12278+P
    #   mIIAKFTGknG8cm0gAP9WD6U1t0zc/Hn1UpeTevXfkQ/K5PPsXkoVb+OWZ6CYDQ==
    #   =euaf
    #   -----END PGP PUBLIC KEY BLOCK-----",
    #   "passphrase" => "test123",
    #   "format" => "{fname}_{HH}_{SS}",
    #   "armor" => true,
    #   "compress" => true
    # }

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

    IO.inspect(exec)

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
