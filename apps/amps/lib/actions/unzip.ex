defmodule Amps.Actions.Unzip do
  def run(msg, parms, {_state, env}) do
    _tmpdir = AmpsUtil.tempdir(msg[:session])

    input = %{msg: msg, parms: parms, env: env}

    {:ok, pid} =
      :python.start([{:python_path, to_charlist(Application.app_dir(:amps, "priv/py/actions"))}])

    case :python.call(pid, :unzip, :run, [Jason.encode!(input)]) do
      %{'status' => 'failed', 'message' => error} ->
        raise error

      %{'status' => 'success', 'files' => files} ->
        events =
          Enum.map(files, fn file ->
            file = to_string(file)

            {:ok, info} = File.stat(file)
            msgid = AmpsUtil.get_id()

            newmsg =
              Map.merge(msg, %{
                "fname" => Path.basename(file),
                "msgid" => msgid,
                "fsize" => info.size,
                "fpath" => file,
                "temp" => true,
                "parent" => msg["msgid"]
              })

            newmsg
          end)

        {:send, events}
    end
  end

  # case :zip.zip_open(to_charlist(zf), [{:cwd, to_charlist(tmpdir)}]) do
  #   {:ok, handle} ->
  #     case :zip.zip_list_dir(handle) do
  #       {:ok, list} ->
  #         get_zip_entries(handle, list, msg, state, parms)

  #       {:error, reason} ->
  #         {:error, reason}
  #     end

  #   {:error, reason} ->
  #     {:error, reason}
  # end

  # defp get_zip_entries(handle, [head | tail], msg, state, parms) do
  #   case elem(head, 0) do
  #     :zip_comment ->
  #       # ignore comment for now
  #       get_zip_entries(handle, tail, msg, state, parms)

  #     :zip_file ->
  #       fname = elem(head, 1)

  #       case :zip.zip_get(fname, handle) do
  #         {:ok, fpath} ->
  #           msgid = AmpsUtil.get_id()

  #           newmsg =
  #             Map.merge(msg, %{
  #               :fname => to_string(fname),
  #               :msgid => msgid,
  #               :fpath => to_string(fpath),
  #               :temp => true
  #             })

  #           smsg = AmpsStorage.store(newmsg)
  #           AmpsTopic.send(smsg, parms, state)
  #           get_zip_entries(handle, tail, msg, state, parms)

  #         {:error, reason} ->
  #           IO.puts(reason)
  #           {:error, reason, state}
  #       end
  #   end
  # end

  # defp get_zip_entries(_handle, [], _msg, state, _parms) do
  #   # this gets called last
  #   {:ok, state}
  # end
end
