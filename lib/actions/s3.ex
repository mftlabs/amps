defmodule Amps.Actions.S3 do
  require Logger
  alias Amps.DB
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

  def run(msg, parms, {state, env}) do
    Logger.info("S3 Action Called")

    provider =
      DB.find_one(AmpsUtil.index(env, "providers"), %{
        "_id" => parms["provider"]
      })

    req = req(provider, env)

    try do
      case parms["operation"] do
        "get" ->
          case parms["count"] do
            "many" ->
              opts =
                if parms["prefix"] do
                  [prefix: parms["prefix"]]
                else
                  []
                end

              case ExAws.S3.list_objects(parms["bucket"], opts)
                   |> ExAws.request(req) do
                {:ok, %{body: body, headers: _headers, status_code: 200}} ->
                  list = body.contents
                  Logger.info("Got #{Enum.count(list)} objects")

                  events =
                    Enum.reduce(list, [], fn obj, acc ->
                      if(AmpsUtil.match(obj.key, parms)) do
                        [get_message(req, parms, obj.key) | acc]
                      else
                        acc
                      end
                    end)

                  events =
                    if parms["ackmode"] == "delete" do
                      Enum.map(events, fn {event, path} ->
                        ExAws.S3.delete_object(parms["bucket"], path)
                        |> ExAws.request(req)

                        event
                      end)
                    else
                      Enum.map(events, fn {event, _} ->
                        event
                      end)
                    end

                  {:send, events}

                {:error, {:http_error, 404, _}} ->
                  raise "Bucket does not exist"

                {:error, error} ->
                  raise "Error #{inspect(error)} "
              end

            "one" ->
              parms = format(msg, parms)
              {event, path} = get_message(req, parms, parms["path"])

              if parms["ackmode"] == "delete" do
                ExAws.S3.delete_object(parms["bucket"], path)
                |> ExAws.request(req)
              end

              {:send, [event]}
          end

        "put" ->
          _opts =
            if parms["prefix"] do
              [prefix: parms["prefix"]]
            else
              []
            end

          resp =
            if msg["data"] do
              ExAws.S3.put_object(
                parms["bucket"],
                Path.join(parms["prefix"], msg["fname"]),
                AmpsUtil.get_data(msg, env)
              )
              |> ExAws.request(req)
            else
              if msg["fsize"] > 5_242_880 do
                fun = fn stream ->
                  ExAws.S3.upload(
                    stream,
                    parms["bucket"],
                    Path.join(parms["prefix"], msg["fname"])
                  )
                  |> ExAws.request(req)
                end

                AmpsUtil.stream(msg, env, nil, fun)
              else
                ExAws.S3.put_object(
                  parms["bucket"],
                  Path.join(parms["prefix"], msg["fname"]),
                  AmpsUtil.get_data(msg, env)
                )
                |> ExAws.request(req)
              end
            end

          case resp do
            {:ok, _resp} ->
              Logger.info("Uploaded")
              {:ok, resp}

            {:error, error} ->
              raise "#{inspect(error)}"
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

            keys =
              Enum.reduce(list, [], fn obj, acc ->
                if(AmpsUtil.match(obj.key, parms)) do
                  Logger.info("Deleting #{obj.key}")

                  ExAws.S3.delete_object(parms["bucket"], obj.key)
                  |> ExAws.request(req)
                end

                [obj.key | acc]
              end)

            {:ok, Jason.encode!(keys)}
          end
      end
    catch
      e ->
        raise e
    end
  end

  def req(provider, env) do
    req = [
      refreshable: false,
      access_key_id: provider["key"],
      secret_access_key: provider["secret"]
    ]

    req =
      case provider["provider"] do
        "AWS" ->
          req ++ [region: provider["region"]]

        "Minio" ->
          req ++
            [
              host: provider["host"],
              port: provider["port"],
              scheme: provider["scheme"]
            ]
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

  def get_message(req, parms, path) do
    bucket = parms["bucket"]

    msgid = AmpsUtil.get_id()
    tmp = AmpsUtil.tempdir(msgid)

    fpath = Path.join(tmp, Path.basename(path))

    message =
      case ExAws.S3.head_object(bucket, path)
           |> ExAws.request!(req) do
        %{status_code: 200, headers: headers} ->
          with {"Content-Length", fsize} <-
                 List.keyfind(headers, "Content-Length", 0) do
            fsize = String.to_integer(fsize)

            if fsize <= 10000 do
              {:ok, msg} = ExAws.S3.get_object(bucket, path) |> ExAws.request(req)

              File.write(fpath, msg.body)
              {:ok, msg}
            else
              ExAws.S3.download_file(
                bucket,
                path,
                fpath
              )
              |> ExAws.request(req)
            end
          end

        {:error, error} ->
          raise error
      end

    case message do
      {:ok, _msg} ->
        # case msg do
        #   :done ->
        info = File.stat!(fpath)

        event = %{
          "service" => parms["name"],
          "msgid" => msgid,
          "bucket" => parms["bucket"],
          "prefix" => Path.dirname(path),
          "user" => parms["name"],
          "fpath" => fpath,
          "fsize" => info.size,
          "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
          "fname" => Path.basename(path)
        }

        #   msg ->
        #     %{
        #       "service" => parms["name"],
        #       "msgid" => msgid,
        #       "bucket" => parms["bucket"],
        #       "prefix" => parms["prefix"],
        #       "data" => msg.body,
        #       "ftime" => DateTime.to_iso8601(DateTime.utc_now()),
        #       "fname" => Path.basename(obj.key)
        #     }
        # end

        event =
          if not AmpsUtil.blank?(parms["format"]) do
            fname = AmpsUtil.format(parms["format"], event)
            Map.merge(event, %{"fname" => fname})
          else
            event
          end

        event = Map.merge(event, %{"temp" => true})
        {event, path}

      {:error, error} ->
        raise error
    end
  end

  def format(msg, parms) do
    bucket = AmpsUtil.format(parms["bucket"], msg)
    path = AmpsUtil.format(parms["path"], msg)

    Map.merge(parms, %{
      "bucket" => bucket,
      "path" => path
    })
  end
end
