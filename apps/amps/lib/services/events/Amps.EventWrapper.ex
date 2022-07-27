# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.EventWrapper do
  use GenServer
  require Logger

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

    GenServer.start_link(__MODULE__, parms)
  end

  def init(opts) do
    Process.flag(:trap_exit, true)
#    Logger.info("starting event listener #{opts[:name]} #{inspect(opts)}")

    Process.register(self(), opts[:name])

    Process.send_after(self(), {:initial_connect, opts}, 0)
    {:ok, opts}
  end

  def child_spec(opts) do
    name = opts[:name]

    %{
      id: name,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  # GenServer callbacks
  def handle_info({:initial_connect, parms}, state) do
    opts = parms[:parms]
    name = Atom.to_string(state[:name])
    pid = Process.whereis(:gnat)
    Process.flag(:trap_exit, true)
    {stream, consumer} = AmpsUtil.get_names(opts, state.env)
    listening_topic = AmpsUtil.env_topic("amps.consumer.#{consumer}", state.env)
    opts = Map.put(opts, "id", name)

    actparms =
      Amps.DB.find_by_id(
        AmpsUtil.index(state.env, "actions"),
        opts["handler"]
      )

    {:ok, pcpid} =
      Amps.EventPullConsumer.start_link(%{
        parms: opts,
        connection_pid: pid,
        stream: stream,
        actparms: actparms,
        listening_topic: listening_topic,
        consumer: consumer,
        env: state.env,
        handler: parms.handler,
        name: String.to_atom(name <> "_pc")
      })

    {:noreply, %{cpid: pid, parms: opts, pcpid: pcpid}}
  end

  def handle_info({:msg, msg}, state) do
    # IO.puts("Message")
    {:ok, file} = File.open("test.txt", [:append])
    IO.write(file, Jason.decode!(msg.body)["msg"]["fname"] <> "\n")

    IO.write(
      file,
      Atom.to_string(Process.info(self())[:registered_name]) <> "\n"
    )

    File.close(file)
    {:noreply, state}
  end

  def handle_info(val, state) do
    IO.puts("got event #{inspect(val)}")
    {:noreply, state}
  end

  def terminate(_reason, state) do
    Logger.info("TERMINATING #{Process.info(self())[:registered_name]}")
    Process.exit(state.cpid, :normal)
  end
end
