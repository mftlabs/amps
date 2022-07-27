# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.ArchiveConsumer do
  use GenServer
  require Logger
  alias ExAws.S3

  # alias Jetstream.API.{Consumer, Stream}

  def start_link(args) do
    parms = Enum.into(args, %{})

    parms =
      case parms[:env] do
        nil ->
          Map.put(parms, :env, "")

        _ ->
          parms
      end

    IO.inspect("ARCHIVEPARMS")
    IO.inspect(parms)
    IO.puts("starting event listener #{inspect(parms)}")
    GenServer.start_link(__MODULE__, parms)
  end

  def init(opts) do
    IO.inspect("ARCHIVEOPTS")
    IO.inspect(opts)
    Process.send_after(self(), {:initial_connect, opts}, 0)
    {:ok, opts}
  end

  def child_spec(opts) do
    name = opts[:name]
    IO.puts("name #{inspect(name)}")

    %{
      id: name,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  def apath(msg, env) do
    msg =
      if env == "" do
        Map.merge(msg, %{"env" => "default"})
      else
        Map.merge(msg, %{"env" => env})
      end

    AmpsUtil.format("{env}/{service}/{user}/{msgid}", msg)
  end

  defp get_stream(msg, provider, env, _chunk_size) do
    case provider["atype"] do
      "s3" ->
        handler = AmpsUtil.get_env_parm(:actions, :s3)
        req = handler.req(provider, env)

        ExAws.S3.download_file(
          provider["bucket"],
          apath(msg, env),
          :memory
          # if chunk_size do
          #   [chunk_size: chunk_size]
          # else
          #   []
          # end
        )
        |> ExAws.stream!(req)
    end
  end

  def stream(msg, env, chunk_size \\ nil) do
    if Amps.Defaults.get("archive") do
      provider = Amps.Defaults.get("aprovider")

      provider = Amps.DB.find_one(AmpsUtil.index(env, "providers"), %{"_id" => provider})

      get_stream(msg, provider, env, chunk_size)
    else
      raise "Archive not active!"
    end
  end

  def get(msg, env) do
    if Amps.Defaults.get("archive") do
      provider = Amps.Defaults.get("aprovider")

      provider = Amps.DB.find_one(AmpsUtil.index(env, "providers"), %{"_id" => provider})

      get_message(msg, provider, env)
    else
      raise "Archive not active!"
    end
  end

  def get_message(msg, provider, env) do
    case provider["atype"] do
      "s3" ->
        req = AmpsUtil.get_env(:actions)[:s3].req(provider, env)
        IO.puts("DATA")

        resp =
          ExAws.S3.get_object(
            provider["bucket"],
            apath(msg, env)
          )
          |> ExAws.request!(req)

        resp.body
    end
  end

  def get_size(msg, provider, env) do
    case provider["atype"] do
      "s3" ->
        req = AmpsUtil.get_env(:actions)[:s3].req(provider, env)

        resp =
          ExAws.S3.head_object(
            provider["bucket"],
            AmpsUtil.format(
              "{env}/{service}/{user}/{msgid}",
              Map.merge(msg, %{"env" => env})
            )
          )
          |> ExAws.request!(req)

        Enum.into(resp.headers, %{})["Content-Length"] |> String.to_integer()
    end
  end

  def size(msg, env) do
    if Amps.Defaults.get("archive") do
      provider = Amps.Defaults.get("aprovider")

      provider = Amps.DB.find_one(AmpsUtil.index(env, "providers"), %{"_id" => provider})

      get_size(msg, provider, env)
    else
      raise "Archive not active!"
    end
  end

  # GenServer callbacks
  def handle_info({:initial_connect, parms}, state) do
    opts = parms[:parms]
    IO.puts("opts #{inspect(opts)}")
    IO.puts("state #{inspect(state)}")
    name = Atom.to_string(state[:name])
    sub = String.to_atom(name <> "_sup")
    IO.puts("sub: #{inspect(sub)}")

    pid = Process.whereis(:gnat)

    IO.puts("pid #{inspect(pid)}")
    {stream, consumer} = AmpsUtil.get_names(opts, state.env)
    Logger.info("got stream #{stream} #{consumer}")
    opts = Map.put(opts, "id", name)
    listening_topic = AmpsUtil.env_topic("amps.archive.#{consumer}", state.env)

    GenServer.start_link(
      Amps.ArchivePullConsumer,
      %{
        parms: opts,
        connection_pid: pid,
        stream_name: stream,
        listening_topic: listening_topic,
        consumer_name: consumer,
        env: state.env,
        handler: parms.handler
      }
    )

    {:noreply, %{cpid: pid, opts: opts}}
  end

  def handle_info({:msg, _msg}, state) do
    {:noreply, state}
  end

  def handle_info({val, _opts}, state) do
    IO.puts("got event #{inspect(val)}")
    {:noreply, state}
  end
end

defmodule NackError do
  defexception message: "Error Archiving to S3"

  def exception(message) do
    IO.inspect(message)

    case message do
      nil ->
        %NackError{}

      message ->
        cond do
          is_atom(message) ->
            %NackError{message: Atom.to_string(message)}

          is_binary(message) ->
            %NackError{message: message}

          true ->
            %NackError{}
        end
    end
  end
end

defmodule Amps.ArchivePullConsumer do
  use GenServer
  require Logger
  alias ExAws.S3

  def init(%{
        parms: parms,
        connection_pid: connection_pid,
        stream_name: stream_name,
        consumer_name: consumer_name,
        listening_topic: listening_topic,
        handler: handler,
        env: env
      }) do
    # Process.link(connection_pid)
    group = String.replace(parms["name"], " ", "_")
    Logger.info("History queue_group #{group} #{stream_name} #{consumer_name}")

    {:ok, sid} = Gnat.sub(connection_pid, self(), listening_topic, queue_group: group)

    state = %{
      parms: parms,
      stream_name: stream_name,
      consumer_name: consumer_name,
      listening_topic: listening_topic,
      env: env,
      handler: handler,
      index:
        if parms["receipt"] do
          parms["index"]
        else
          nil
        end,
      doc:
        if parms["doc"] do
          parms["doc"]
        else
          nil
        end,
      sid: sid
    }

    {:ok, state}
  end

  def s3_archive(msg, provider, env) do
    handler = AmpsUtil.get_env_parm(:actions, :s3)

    req = handler.req(provider, env)

    apath = Amps.ArchiveConsumer.apath(msg, env)

    resp =
      if msg["data"] do
        ExAws.S3.put_object(
          provider["bucket"],
          apath,
          msg["data"]
        )
        |> ExAws.request(req)
      else
        if msg["fpath"] do
          msg["fpath"]
          |> S3.Upload.stream_file()
          |> S3.upload(provider["bucket"], apath)
          |> ExAws.request(req)
        else
          {:ok, :no_data}
        end
      end

    case resp do
      {:ok, :no_data} ->
        Logger.info("No Data to Archive")

      {:ok, resp} ->
        # Logger.info("Uploaded")
        {:ok, resp}

      {:error, error} ->
        raise NackError, error
        # {:error, error}
    end
  end

  def handle_info({:msg, message}, state) do
    try do
      data = Poison.decode!(message.body)
      msg = data["msg"]
      # Logger.info("Archiving Message #{msg["msgid"]}")

      try do
        archive = Amps.DB.find_one("providers", %{"_id" => Amps.Defaults.get("aprovider")})

        case archive["atype"] do
          "s3" ->
            s3_archive(msg, archive, state.env)

          _ ->
            nil
        end

        # Logger.info("Archived Message #{msg["msgid"]}")

        Jetstream.ack(message)
        Amps.ArchiveHandler.reset_failure(state.handler)
      rescue
        e in NackError ->
          failures = Amps.ArchiveHandler.add_failure(state.handler)

          Logger.error(
            "Archive Failed for message #{msg["msgid"]}\nS3 Issue #{e.message} - Will Retry.\n" <>
              Exception.format(:error, e, __STACKTRACE__)
          )

          backoff =
            if failures > 5 do
              300_000
            else
              failures * 60000
            end

          Process.sleep(backoff)
          Jetstream.nack(message)

        e ->
          Logger.error(
            "Archive Failed: Error parsing message #{msg["msgid"]}, skipping message.\n" <>
              Exception.format(:error, e, __STACKTRACE__)
          )

          Jetstream.ack(message)
      end
    rescue
      e in NackError ->
        failures = Amps.ArchiveHandler.add_failure(state.handler)

        Logger.error(
          "Archive Failed\nS3 Issue #{e.message} - Will Retry.\n" <>
            Exception.format(:error, e, __STACKTRACE__)
        )

        backoff =
          if failures > 10 do
            10000
          else
            failures * 1000
          end

        Process.sleep(backoff)
        Jetstream.nack(message)

      e ->
        Logger.error(
          "Archive Failed: Invalid Message, skipping message.\n" <>
            Exception.format(:error, e, __STACKTRACE__)
        )

        Jetstream.ack(message)
    end

    {:noreply, state}
  end

  def handle_info(other, state) do
    require Logger
    IO.puts("handle info #(inspect(other)) #{inspect(state)}")

    Logger.error(
      "#{__MODULE__} for #{state.stream_name}.#{state.consumer_name} received unexpected message: #{inspect(other)}"
    )

    {:noreply, state}
  end

  def handle_call(parms, _from, state) do
    IO.puts("handler call called #{inspect(parms)}")
    {:reply, :ok, state}
  end

  def terminate(reason, state) do
    Logger.warn("#{inspect(reason)} in terminate")
    Gnat.unsub(:gnat, state.sid)
  end
end
