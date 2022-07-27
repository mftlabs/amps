# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.Actions.AWS do
  require Logger
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
  def run(msg, parms, {_state, env}) do
    Logger.info("AWS Action Called")

    apply(__MODULE__, String.to_atom(parms["action"]), [msg, parms, env])
  end

  def parse_bucket_event(msg, parms, env) do
    try do
      body = AmpsUtil.get_data(msg, env)
      event = Jason.decode!(body)
      [ev] = event["Records"]
      IO.inspect(ev)

      meta =
        case ev["eventSource"] do
          "aws:s3" ->
            region = ev["awsRegion"]
            bucket = get_in(ev, ["s3", "bucket", "name"])

            objkey = get_in(ev, ["s3", "object", "key"])

            user = get_in(ev, ["userIdentity", "principalId"]) || parms["name"]

            %{
              "region" => region,
              "s3provider" => "aws",
              "bucket" => bucket,
              "objkey" => objkey,
              "data" => body,
              "user" => user
            }

          "minio:s3" ->
            bucket = get_in(ev, ["s3", "bucket", "name"])

            objkey = get_in(ev, ["s3", "object", "key"])

            user = get_in(ev, ["userIdentity", "principalId"]) || parms["name"]

            %{
              "s3provider" => "minio",
              "bucket" => bucket,
              "objkey" => objkey,
              "data" => body,
              "user" => user
            }

          _ ->
            raise "Not Minio or AWS S3 Event"
        end

      {:send, [Map.merge(msg, meta)]}
    rescue
      e ->
        raise "Invalid Message Data #{inspect(e)}"
    end
  end
end
