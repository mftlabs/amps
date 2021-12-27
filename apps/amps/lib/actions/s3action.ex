defmodule S3Action do
  require Logger
  alias AmpsWeb.DB
  alias ExAws.S3

  @doc """

  sftp client action parms may contain the following...

  connect_timeout - opt
  host - required
  password - opt or key_name
  key_name - opt or password
  operation_timeout - opt
  port - required
  user - required

  """

  def test() do
    parms = DB.find_one("actions", %{"_id" => "61c26b29376f1c25dac499b4"})
    run(%{"fpath" => "/private/tmp/0ebe5547-bf8d-4881-8ca4-01501515ecdb/Project #5.logicx.zip", "fname" => "proj #5.zip"}, parms, %{})
  end

  def run(msg, parms, _state) do
    Logger.info("S3 Action Called")

    req = req(parms)

    try do
      case parms["operation"] do
        "get" ->
          opts =
            if parms["prefix"] do
              [prefix: parms["prefix"]]
            else
              []
            end

          with {:ok, %{body: body, headers: _headers, status_code: 200}} <-
                 ExAws.S3.list_objects(parms["bucket"], opts)
                 |> ExAws.request(req) do
            list = body.contents
            Logger.info("Got #{Enum.count(list)} objects")

            Enum.each(list, fn obj ->
              if(AmpsUtil.match(obj.key, parms)) do
                get_message(req, parms, obj)
              end
            end)
          end

        "put" ->
          opts =
            if parms["prefix"] do
              [prefix: parms["prefix"]]
            else
              []
            end

          if msg["data"] do
            ExAws.S3.put_object(
              parms["bucket"],
              Path.join(parms["prefix"], msg["fname"]),
              msg["data"]
            )
            |> ExAws.request(req)
          else
            resp = msg["fpath"]
            |> S3.Upload.stream_file()
            |> S3.upload(parms["bucket"], Path.join(parms["prefix"], msg["fname"]))
            |> ExAws.request(req)
            IO.inspect(resp)
          end

        "delete" ->
          opts =
            if parms["prefix"] do
              [prefix: parms["prefix"]]
            else
              []
            end

          with {:ok, %{body: body, headers: _headers, status_code: 200}} <-
                 ExAws.S3.list_objects(parms["bucket"], opts)
                 |> ExAws.request(req) do
            list = body.contents
            Logger.info("Got #{Enum.count(list)} objects to delete")

            Enum.each(list, fn obj ->
              if(AmpsUtil.match(obj.key, parms)) do
                Logger.info("Deleting #{obj.key}")
                ExAws.S3.delete_object(parms["bucket"], obj.key) |> ExAws.request(req)
              end
            end)
          end
      end
    catch
      e ->
        raise e
    end

    :ok
  end

  defp req(parms) do
    provider = DB.find_one("providers", %{"_id" => parms["provider"]})

    req = [
      access_key_id: provider["key"],
      secret_access_key: provider["secret"]
    ]

    req =
      case provider["provider"] do
        "AWS" ->
          req ++ [region: provider["region"]]

        "Minio" ->
          req ++ [host: provider["host"], port: provider["port"], scheme: provider["scheme"]]
      end

    if provider["proxy"] do
      url =
        provider["proxy_username"] <>
          ":" <> provider["proxy_password"] <> "@" <> provider["proxy_url"]

      req ++ [http_opts: [proxy: url]]
    else
      req
    end
  end

  def get_message(req, parms, obj) do
    bucket = parms["bucket"]
    path = obj.key

    msgid = AmpsUtil.get_id()

    message =
      case ExAws.S3.head_object(bucket, path)
           |> ExAws.request!(req) do
        %{status_code: 200, headers: headers} ->
          with {"Content-Length", fsize} <- List.keyfind(headers, "Content-Length", 0) do
            fsize = String.to_integer(fsize)

            if fsize <= 10000 do
              ExAws.S3.get_object(bucket, path)
              |> ExAws.request(req)
            else
              tmp = AmpsUtil.tempdir(msgid)

              ExAws.S3.download_file(
                bucket,
                path,
                Path.join(tmp, Path.basename(path))
              )
              |> ExAws.request(req)
            end
          end

        {:error, error} ->
          raise error
      end

    case message do
      {:ok, msg} ->
        event =
          case msg do
            :done ->
              path = Path.join(AmpsUtil.tempdir(msgid), Path.basename(path))
              IO.inspect(File.stat(path))

              %{
                "service" => parms["name"],
                "msgid" => msgid,
                "bucket" => parms["bucket"],
                "prefix" => parms["prefix"],
                "fpath" => path,
                "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
                "fname" => Path.basename(obj.key)
              }

            msg ->
              IO.inspect(msg.body)

              %{
                "service" => parms["name"],
                "msgid" => msgid,
                "bucket" => parms["bucket"],
                "prefix" => parms["prefix"],
                "data" => msg.body,
                "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
                "fname" => Path.basename(obj.key)
              }
          end

        if parms["ackmode"] == "delete" do
          IO.inspect(ExAws.S3.delete_object(bucket, path) |> ExAws.request(req))
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

      {:error, error} ->
        raise error
    end
  end
end
