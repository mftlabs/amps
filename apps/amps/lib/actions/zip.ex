defmodule Amps.Actions.Zip do
  require Logger

  def run(msg, parms, {state, env}) do
    Logger.info("input #{inspect(msg)}")
    {:ok, newmsg} = zip(msg, parms, {state, env})
    Logger.info("output #{inspect(newmsg)}")
    {:send, [newmsg]}
  end

  def zip(msg, parms, {state, env}) do
    is = AmpsUtil.stream(msg, env)
    opts = []

    if not AmpsUtil.blank?(parms["password"]) do
      _opts = [
        encryption_coder: {Zstream.EncryptionCoder.Traditional, password: parms["password"]}
      ]
    end

    parent = msg["msgid"]
    msgid = AmpsUtil.get_id()

    tfile = AmpsUtil.tempdir() <> "/" <> msgid <> ".out"

    Zstream.zip([
      Zstream.entry(msg["fname"] || msgid, is, opts)
    ])
    |> Stream.into(File.stream!(tfile))
    |> Stream.run()

    {:ok, info} = File.stat(tfile)

    msg =
      msg
      |> Map.drop(["data"])
      |> Map.merge(%{
        "msgid" => msgid,
        "fpath" => tfile,
        "fsize" => info.size,
        "temp" => true,
        "parent" => parent
      })

    msg =
      if not AmpsUtil.blank?(parms["format"]) do
        fname = AmpsUtil.format(parms["format"], msg)
        Map.merge(msg, %{"fname" => fname})
      else
        msg
      end

    {:ok, msg}

    # {:ok, AmpsUtil.get_output_msg(msg, val, parms)}
  end
end
