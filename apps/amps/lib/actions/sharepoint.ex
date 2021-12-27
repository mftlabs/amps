defmodule SharePoint do
  alias AmpsWeb.DB

  def run(msg, parms, state) do
    provider = DB.find_one("providers", %{"_id" => parms["provider"]})

    token = get_token(provider)

    siteid = get_site_id(parms, token)

    case parms["operation"] do
      "download" ->
        rooturl = Path.join(["https://graph.microsoft.com/v1.0/sites/", siteid, "drive"])

        url = Path.join([rooturl, "root:", parms["path"]])

        {:ok, res} =
          HTTPoison.get(
            Path.join(url <> ":", "children"),
            [{"Authorization", "Bearer " <> token}],
            params: [{"select", "name,folder,id,size,@microsoft.graph.downloadUrl"}]
          )

        folder = Jason.decode!(res.body)

        scan_folder(parms, folder, token, url, "", rooturl)

      "upload" ->
        if msg["data"] do
          small_upload(siteid, token, msg, parms, msg["data"])
        else
          info = File.stat!(msg["fpath"])

          if info.size < 4_000_000 do
            small_upload(siteid, token, msg, parms, {:file, msg["fpath"]})
          else
            large_upload(siteid, token, msg, parms, info.size)
          end

          # path = Path.join([path, fname <> ":/content"])
        end
    end
  end

  def get_token(provider) do
    provider = Map.drop(provider, ["_id"])
    tenant = provider["tenant"]

    provider =
      Map.drop(provider, ["tenant"])
      |> Map.merge(%{
        "grant_type" => "client_credentials",
        "scope" => "https://graph.microsoft.com/.default"
      })

    {:ok, res} =
      HTTPoison.post(
        "https://login.microsoftonline.com/" <> tenant <> "/oauth2/v2.0/token",
        {:form,
         Enum.map(
           provider,
           fn x ->
             x
           end
         )}
      )

    body = Jason.decode!(res.body)

    body["access_token"]
  end

  def get_site_id(parms, token) do
    url =
      Path.join([
        "https://graph.microsoft.com/v1.0/sites/",
        parms["host"] <> ":",
        parms["sitepath"]
      ])

    {:ok, res} =
      HTTPoison.get(
        url,
        [{"Authorization", "Bearer " <> token}]
      )

    body = Jason.decode!(res.body)

    body["id"]
  end

  def scan_folder(parms, folder, token, url, nested, rooturl) do
    Enum.each(folder["value"], fn obj ->
      if obj["folder"] do
        url = Path.join(url, obj["name"])

        {:ok, res} =
          HTTPoison.get(
            Path.join(url <> ":", "children"),
            [{"Authorization", "Bearer " <> token}],
            params: [{"select", "name,folder,id,size,@microsoft.graph.downloadUrl"}]
          )

        folder = Jason.decode!(res.body)
        scan_folder(parms, folder, token, url, Path.join(nested, obj["name"]), rooturl)
      else
        IO.puts("Object Path")
        obj_path = Path.join(nested, obj["name"])
        IO.inspect(obj_path)

        if AmpsUtil.match(obj_path, parms) do
          msgid = AmpsUtil.get_id()
          dir = AmpsUtil.tempdir(msgid)
          path = Path.join(dir, obj["name"])
          IO.inspect(path)

          file =
            if obj["size"] > 100_000 do
              download(
                obj["@microsoft.graph.downloadUrl"],
                [{"Authorization", "Bearer " <> token}],
                path
              )

              %{
                "fpath" => path
              }
            else
              {:ok, resp} =
                HTTPoison.get(
                  obj["@microsoft.graph.downloadUrl"],
                  [{"Authorization", "Bearer " <> token}]
                )

                File.write(path, resp.body)

                %{
                  "fpath" => path
                }
            end

          event =
            Map.merge(
              %{
                "msgid" => msgid,
                "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
                "fname" => Path.basename(obj["name"])
              },
              file
            )

          if parms["ackmode"] == "delete" do
            {:ok, res} =
              HTTPoison.delete(
                Path.join([rooturl, "items", obj["id"]]),
                [{"Authorization", "Bearer " <> token}]
              )

            IO.inspect(res)
          end

          event =
            if not AmpsUtil.blank?(parms["format"]) do
              fname = AmpsUtil.format(parms["format"], event)
              Map.merge(event, %{"fname" => fname})
            else
              event
            end

          event = Map.merge(event, %{"temp" => true})

          AmpsEvents.send(event, parms, %{})
        end
      end
    end)
  end

  def download(url, headers, path) do
    # 5 minutes
    timeout = 300_000

    # do_download = fn ->
    {:ok, file} = File.open(path, [:write])

    opts = [stream_to: self(), follow_redirect: true]
    {:ok, %HTTPoison.AsyncResponse{id: id}} = HTTPoison.get(url, headers, opts)

    result =
      receive_data(file, %{
        received_bytes: 0,
        total_bytes: 0,
        id: id
      })

    :ok = File.close(file)

    result
    # end

    # do_download
    # |> Task.async()
    # # blocking a potentially very long process!
    # |> Task.await(timeout)
  end

  defp receive_data(file, %{id: id} = state) do
    receive do
      %HTTPoison.AsyncStatus{code: code, id: id} ->
        case code do
          200 ->
            receive_data(file, %{state | id: id})

          404 ->
            {:error, "File not found"}

          _ ->
            {:error, "Received unexpected status code #{code}"}
        end

      %HTTPoison.AsyncHeaders{headers: headers} ->
        total_bytes =
          headers
          |> Enum.find(fn {name, _} -> name == "Content-Length" end)
          |> elem(1)
          |> String.to_integer()

        receive_data(file, %{state | total_bytes: total_bytes})

      %HTTPoison.AsyncChunk{chunk: chunk, id: ^id} ->
        IO.binwrite(file, chunk)
        new_state = %{state | received_bytes: state.received_bytes + byte_size(chunk)}
        IO.write("\r#{Progress.bar(state.received_bytes, state.total_bytes)}")

        receive_data(file, new_state)

      %HTTPoison.AsyncEnd{id: ^id} ->
        IO.write("\r#{Progress.bar(state.received_bytes, state.total_bytes)}")

        if state.total_bytes === state.received_bytes do
          {:ok, state.received_bytes}
        else
          {:error,
           "Expected to receive #{state.total_bytes} bytes but got #{state.received_bytes}"}
        end

      %HTTPoison.Error{id: ^id, reason: {:closed, :timeout}} ->
        {:error, "Receiving a response chunk timed out"}
    end
  end

  def large_upload(siteid, token, msg, parms, size) do
    path = parms["path"]
    fname = msg["fname"]
    path = Path.join([path, fname <> ":/createUploadSession"])

    url = Path.join(["https://graph.microsoft.com/v1.0/sites/", siteid, "/drive/root:", path])

    IO.inspect(url)

    {:ok, res} =
      HTTPoison.post(
        url,
        Jason.encode!(%{
          "item" => %{
            "@microsoft.graph.conflictBehavior" => "rename"
          }
        }),
        [{"Authorization", "Bearer " <> token}, {"content-type", "application/json"}]
      )

    IO.inspect(res)

    body = Jason.decode!(res.body)
    IO.inspect(body)

    chunk_size =
      if size < 62_914_560 do
        size
      else
        10_485_760
      end

    File.stream!(msg["fpath"], [read_ahead: chunk_size], chunk_size)
    |> Enum.reduce({0, size}, fn chunk, {start, remaining} ->
      {finish, length, done} =
        if remaining > chunk_size do
          {start + chunk_size - 1, chunk_size, false}
        else
          {size - 1, remaining, true}
        end

      # IO.puts(start)
      IO.puts(DateTime.to_iso8601(DateTime.utc_now()))

      {status, res} =
        HTTPoison.put(
          body["uploadUrl"],
          chunk,
          [
            {"Authorization", "Bearer " <> token},
            {"Content-Length", length},
            {"Content-Range", "bytes #{start}-#{finish}/#{size}"}
          ],
          timeout: 60000,
          recv_timeout: 60000
        )

      IO.inspect(status)
      IO.inspect(res)
      IO.puts(DateTime.to_iso8601(DateTime.utc_now()))

      body = Jason.decode!(res.body)
      # IO.inspect(body["nextExpectedRanges"])

      IO.write("\r#{Progress.bar(finish, size)}")

      if not done do
        {finish + 1, remaining - (finish - start)}
      else
        IO.inspect(res)
        res
      end
    end)
  end

  def small_upload(siteid, token, msg, parms, body) do
    fname = msg["fname"]
    path = parms["path"]
    path = Path.join([path, fname <> ":/content"])
    IO.inspect(path)

    url = Path.join(["https://graph.microsoft.com/v1.0/sites/", siteid, "/drive/root:", path])

    IO.inspect(url)

    HTTPoison.put(
      url,
      body,
      [{"Authorization", "Bearer " <> token}]
    )
  end
end
