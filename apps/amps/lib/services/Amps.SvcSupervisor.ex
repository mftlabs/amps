defmodule Amps.SvcSupervisor do
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

      # Amps.SvcHandler.start_monitor(pid)

      {:error, error} ->
        Logger.error("Could not start #{name} - Error: #{inspect(error)}")
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
