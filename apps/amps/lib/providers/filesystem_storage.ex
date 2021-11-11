defmodule AmpsStorage do
  def store(msg) do
    [date, t] = String.split(msg["ftime"], "T")
    [hour, _min, _other] = String.split(t, ":")
    rpath = Enum.join([date, hour, msg["mailbox"]], "/")
    root = AmpsUtil.get_env(:storage_root)
    fpath = Enum.join([root, rpath, msg["msgid"]], "/")
    # move file from staging to message store
    tfile = msg["fpath"]

    case :file.rename(tfile, fpath) do
      :ok ->
        # update message parameters for storage path and return updated message
        Map.merge(msg, %{"fpath" => rpath <> "/" <> msg["msgid"], "temp" => false})

      _ ->
        AmpsUtil.mkdir_p(root <> "/" <> rpath)

        case :file.rename(tfile, fpath) do
          :ok ->
            Map.merge(msg, %{"fpath" => rpath <> "/" <> msg["msgid"], "temp" => false})

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  def open(msg) do
    fname = AmpsUtil.get_path(msg)
    :file.open(fname, [:binary])
  end

  def read_bytes(msg, size) do
    fname = AmpsUtil.get_path(msg)
    {:ok, is} = :file.open(fname, [:binary])
    {:ok, data} = :file.pread(is, 0, size)
    :file.close(is)
    {:ok, data}
  end

  def delete(msg) do
    fname = AmpsUtil.get_path(msg)
    :file.delete(fname)
  end
end
