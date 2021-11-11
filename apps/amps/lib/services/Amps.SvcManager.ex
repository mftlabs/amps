defmodule Amps.SvcManager do
  use GenServer
  require Logger

  def start_link(_args) do
    Logger.info("starting service manager")
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(opts) do
    load_system_parms()
    Process.send_after(self(), {:initial_connect, opts}, 0)
    {:ok, %{}}
  end

  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  # GenServer callbacks
  def handle_info({:initial_connect, opts}, _state) do
    load_services()
    {:noreply, opts}
  end

  def start_service(svcname) do
    GenServer.call(Amps.SvcManager, {:start_service, svcname})
  end

  def stop_service(svcname) do
    GenServer.call(Amps.SvcManager, {:stop_service, svcname})
  end

  def handle_call({:stop_service, name}, _from, state) do
    res =
      case service_active?(name) do
        nil ->
          IO.inspect("not running")
          {:error, "Service Not Running"}

        pids ->
          service = AmpsDatabase.get_config(name)
          IO.inspect(service)

          Enum.each(pids, fn pid ->
            IO.inspect(pid)
            DynamicSupervisor.terminate_child(Amps.SvcSupervisor, pid)
          end)

          {:ok, true}
      end

    {:reply, res, state}
  end

  def handle_call({:start_service, name}, _from, state) do
    res =
      case service_active?(name) do
        nil ->
          {:ok, load_service(name)}

        pid ->
          {:error, "Service Already Running #{inspect(pid)}"}
      end

    {:reply, res, state}
  end

  def service_types do
    list = AmpsUtil.get_env(:services)
    IO.inspect(list)
    Enum.into(list, %{})
  end

  def get_spec(name, args) do
    types = service_types()
    IO.inspect(args)

    case String.to_atom(args["type"]) do
      #      :sftpd ->
      #        {types[:sftpd], name: name, parms: args}

      :httpd ->
        IO.inspect(args)

        protocol_options = [
          idle_timeout: args["idle_timeout"],
          request_timeout: args["request_timeout"],
          max_keepalive: args["max_keepalive"]
        ]

        if args["tls"] do
          cert = X509.Certificate.from_pem!(args["server_cert"]) |> X509.Certificate.to_der()
          key = X509.PrivateKey.from_pem!(args["key"])
          keytype = Kernel.elem(key, 0)
          key = X509.PrivateKey.to_der(key)

          {Plug.Cowboy,
           scheme: :https,
           plug: types[:httpd],
           options: [
             ref: name,
             port: args["port"],
             cipher_suite: :strong,
             cert: cert,
             key: {keytype, key},
             otp_app: :amps,
             protocol_options: protocol_options
           ]}
        else
          {Plug.Cowboy,
           scheme: :http,
           plug: types[:httpd],
           options: [ref: name, port: args["port"], protocol_options: protocol_options]}
        end

      type ->
        {types[type], name: name, parms: args}
    end
  end

  defp load_services() do
    Logger.info("loading services...")

    case AmpsDatabase.get_config_filter(%{active: true}) do
      [] ->
        :ok

      result ->
        types = service_types()

        Enum.each(result, fn service ->
          if Map.has_key?(types, String.to_atom(service["type"])) do
            Logger.info("loading service #{service["name"]}")
            load_service(service["name"])
          end
        end)
    end

    Logger.info("loading services done")
  end

  def load_service(svcname) do
    Logger.info("load_service loading service #{svcname}")

    case AmpsDatabase.get_config(svcname) do
      nil ->
        Logger.info("service not found #{svcname}")

      parms ->
        opts = Map.delete(parms, "_id")
        count = opts["subs_count"] || 1

        Enum.each(1..count, fn x ->
          name = String.to_atom(svcname <> Integer.to_string(x))
          Amps.SvcSupervisor.start_child(name, get_spec(name, opts))
        end)
    end
  end

  def service_active?(svcname) do
    case AmpsDatabase.get_config(svcname) do
      nil ->
        Logger.info("service not found #{svcname}")

      parms ->
        opts = Map.delete(parms, "_id")
        count = opts["subs_count"] || 1
        # children = Supervisor.which_children(Amps.SvcSupervisor)

        names =
          Enum.reduce(1..count, [], fn x, acc ->
            name = String.to_atom(svcname <> Integer.to_string(x))
            [name | acc]
          end)

        case Enum.reduce(names, [], fn name, acc ->
               case Process.whereis(name) do
                 nil ->
                   acc

                 pid ->
                   [pid | acc]
               end
             end) do
          [] ->
            nil

          list ->
            list
        end
    end
  end

  defp load_system_parms() do
    parms =
      case AmpsDatabase.get_config("SYSTEM")["defaults"] do
        nil ->
          []

        parms ->
          parms
      end

    IO.inspect(parms)

    Enum.each(parms, fn %{"field" => key, "value" => val} ->
      Application.put_env(:amps, String.to_atom(key), val)
    end)
  end
end
