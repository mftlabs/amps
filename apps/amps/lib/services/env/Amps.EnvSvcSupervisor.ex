# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.EnvSvcSupervisor do
  use DynamicSupervisor
  require Logger

  def start_link([env]) do
    DynamicSupervisor.start_link(__MODULE__, env, name: String.to_atom(env <> "-svcspvsr"))
  end

  def start_child(name, spec, config) do
    Logger.info("starting child #{name}")
    spec = Supervisor.child_spec(spec, restart: :transient)
    # mod = String.to_atom("Elixir." <> args["module"])
    # spec = {mod, name: name, parms: args}
    # {Plug.Cowboy, scheme: :http, plug: MyApp, options: [port: 4040]}
    case DynamicSupervisor.start_child(__MODULE__, spec) do
      {:ok, pid} ->
        IO.inspect(name)
        Process.register(pid, name)

        AmpsEvents.send_history(
          "amps.events.svcs.#{config["name"]}.logs",
          "service_logs",
          %{
            "name" => config["name"],
            "status" => "started"
          }
        )

      # Amps.SvcHandler.start_monitor(pid)

      {:error, error} ->
        Logger.error("Could not start #{name} - Error: #{inspect(error)}")

        # This match pattern worked for kafka errors in my local testing, but I worry it is too specific.

        {:shutdown, {:failed_to_start_child, _module, {{:badmatch, {:error, {e, _tacktrace}}}, _}}} =
          error

        error =
          if e.message do
            e.message
          else
            "#{inspect(error)}"
          end

        AmpsEvents.send_history(
          "amps.events.svcs.#{config["name"]}.logs",
          "service_logs",
          %{
            "name" => config["name"],
            "status" => "failed",
            "reason" => error
          }
        )
    end
  end

  @impl true
  def init(_init_arg) do
    Logger.info("dynamic supervisor started")

    DynamicSupervisor.init(
      strategy: :one_for_one
      #      extra_arguments: [init_arg]
    )
  end
end
