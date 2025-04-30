defmodule Amps.ArchiveSupervisor do
  use DynamicSupervisor
  require Logger

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(name, spec) do
    Logger.info("starting child #{name}")
    spec = Supervisor.child_spec(spec, restart: :transient)
    # mod = String.to_atom("Elixir." <> args["module"])
    # spec = {mod, name: name, parms: args}
    # {Plug.Cowboy, scheme: :http, plug: MyApp, options: [port: 4040]}
    case DynamicSupervisor.start_child(__MODULE__, spec) do
      {:ok, pid} ->
        IO.inspect(name)
        Process.register(pid, name)

      # AmpsEvents.send_history(
      #   "amps.events.svcs.#{config["name"]}.logs",
      #   "service_logs",
      #   %{
      #     "name" => config["name"],
      #     "status" => "started"
      #   }
      # )

      # Amps.SvcHandler.start_monitor(pid)

      {:error, error} ->
        Logger.error("Could not start #{name} - Error: #{inspect(error)}")

        # This match pattern worked for kafka errors in my local testing, but I worry it is too specific.

        {:shutdown,
         {:failed_to_start_child, _module, {{:badmatch, {:error, {e, _stacktrace}}}, _}}} =
          error

        if e.message do
          e.message
        else
          "#{inspect(error)}"
        end
    end
  end

  def stop_child(env) do
    atom =
      if env == "" do
        :archive
      else
        :"#{env}-archive"
      end

    try do
      case Process.whereis(atom) do
        nil ->
          Logger.info("Archive #{env} not running")
          {:error, "Not Running"}

        pid ->
          {:ok, DynamicSupervisor.terminate_child(__MODULE__, pid)}
      end
    rescue
      e ->
        {:error, e}
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
