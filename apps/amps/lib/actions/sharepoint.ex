defmodule Amps.Actions.SharePoint do
  alias Amps.DB
  require Logger

  def run(msg, parms, {_state, env}) do
    provider = DB.find_one(AmpsUtil.index(env, "providers"), %{"_id" => parms["provider"]})

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

        if Map.has_key?(folder, "error") do
          raise "Folder Not Found"
        else
          events = scan_folder(parms, folder, token, url, "", rooturl, [])


          events =
            if parms["ackmode"] == "delete" do
              Enum.map(events, fn {event, obj} ->
                {:ok, _res} =
                  HTTPoison.delete(
                    Path.join([rooturl, "items", obj["id"]]),
                    [{"Authorization", "Bearer " <> token}]
                  )

                event
              end)
            else
              Enum.map(events, fn {event, _} ->
                event
              end)
            end

          {:send, events}
        end

      "upload" ->
        if msg["data"] do
          small_upload(siteid, token, msg, parms, msg["data"])
        else
          size = AmpsUtil.get_size(msg, env)

          if size < 4_000_000 do
            small_upload(siteid, token, msg, parms, {:stream, AmpsUtil.stream(msg, env)})
          else
            large_upload(siteid, token, msg, parms, size, env)
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

  def scan_folder(parms, folder, token, url, nested, rooturl, acc) do
    Enum.each(folder["value"], fn obj ->
      if obj["folder"] do
        if parms["scan"] do
          url = Path.join(url, obj["name"])

          {:ok, res} =
            HTTPoison.get(
              Path.join(url <> ":", "children"),
              [{"Authorization", "Bearer " <> token}],
              params: [{"select", "name,folder,id,size,@microsoft.graph.downloadUrl"}]
            )

          folder = Jason.decode!(res.body)
          scan_folder(parms, folder, token, url, Path.join(nested, obj["name"]), rooturl, acc)
        else
          acc
        end
      else
        obj_path = Path.join(nested, obj["name"])

        if AmpsUtil.match(obj_path, parms) do
          msgid = AmpsUtil.get_id()
          dir = AmpsUtil.tempdir(msgid)
          path = Path.join(dir, obj["name"])

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

          event =
            if not AmpsUtil.blank?(parms["format"]) do
              fname = AmpsUtil.format(parms["format"], event)
              Map.merge(event, %{"fname" => fname})
            else
              event
            end

          event = Map.merge(event, %{"temp" => true})
          [{event, obj} | acc]
          # AmpsEvents.send(event, parms, %{})
        else
          acc
        end
      end
    end)
  end

  def download(url, headers, path) do
    # 5 minutes
    _timeout = 300_000

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

        receive_data(file, new_state)

      %HTTPoison.AsyncEnd{id: ^id} ->
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

  def large_upload(siteid, token, msg, parms, size, env) do
    path = parms["path"]
    fname = msg["fname"]
    path = Path.join([path, fname <> ":/createUploadSession"])

    url = Path.join(["https://graph.microsoft.com/v1.0/sites/", siteid, "/drive/root:", path])

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

    body = Jason.decode!(res.body)

    chunk_size =
      if size < 62_914_560 do
        size
      else
        10_485_760
      end

    AmpsUtil.stream(msg, env, chunk_size)
    |> Enum.reduce({0, size}, fn chunk, {start, remaining} ->
      {finish, length, done} =
        if remaining > chunk_size do
          {start + chunk_size - 1, chunk_size, false}
        else
          {size - 1, remaining, true}
        end

      # IO.puts(start)

      {_status, res} =
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

      _body = Jason.decode!(res.body)
      # IO.inspect(body["nextExpectedRanges"])

      if not done do
        {finish + 1, remaining - (finish - start)}
      else
        {:ok, res}
      end
    end)
  end

  def small_upload(siteid, token, msg, parms, body) do
    fname = msg["fname"]
    path = parms["path"]
    path = Path.join([path, fname <> ":/content"])

    url = Path.join(["https://graph.microsoft.com/v1.0/sites/", siteid, "/drive/root:", path])

    resp =
      HTTPoison.put(
        url,
        body,
        [{"Authorization", "Bearer " <> token}]
      )

    {:ok, resp}
  end
end
