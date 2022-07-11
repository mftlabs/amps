defmodule Amps.SvcManager do
  use GenServer
  require Logger
  alias Amps.DB

  def start_link(_args) do
    Logger.info("starting service manager")
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(opts) do
    load_system_parms()
    check_util()
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
    AmpsEvents.send_history(
      "amps.events.svcs.#{name}.logs",
      "service_logs",
      %{
        "name" => name,
        "status" => "stopping"
      }
    )

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

          AmpsEvents.send_history(
            "amps.events.svcs.#{name}.logs",
            "service_logs",
            %{
              "name" => name,
              "status" => "stopped"
            }
          )

          {:ok, true}
      end

    {:reply, res, state}
  end

  def handle_call({:start_service, name}, _from, state) do
    res =
      case service_active?(name) do
        nil ->
          res = load_service(name)
          IO.inspect(res)
          res

          DB.find_one_and_update("services", %{"name" => name}, %{
            "active" => true
          })

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
    default = [:subscriber, :sftpd, :pyservice, :sqs, :nats]

    type = String.to_atom(args["type"])

    try do
      cond do
        type == :httpd ->
          IO.inspect(args)

          protocol_options = [
            idle_timeout: args["idle_timeout"],
            request_timeout: args["request_timeout"],
            max_keepalive: args["max_keepalive"]
          ]

          if args["tls"] do
            {cert, key} =
              try do
                cert = AmpsUtil.get_key(args["cert"])
                key = AmpsUtil.get_key(args["key"])

                cert = X509.Certificate.from_pem!(cert) |> X509.Certificate.to_der()

                key = X509.PrivateKey.from_pem!(key)
                keytype = Kernel.elem(key, 0)
                key = X509.PrivateKey.to_der(key)
                {cert, {keytype, key}}
              rescue
                e ->
                  raise "Error parsing key and/or certificate"
              end

            {Plug.Cowboy,
             scheme: :https,
             plug: {types[:httpd], [opts: args]},
             options: [
               ref: name,
               port: args["port"],
               cipher_suite: :strong,
               cert: cert,
               key: key,
               otp_app: :amps,
               protocol_options: protocol_options
             ]}
          else
            {Plug.Cowboy,
             scheme: :http,
             plug: {types[:httpd], [opts: args]},
             options: [
               ref: name,
               port: args["port"],
               protocol_options: protocol_options
             ]}
          end

        # init_opts = [
        #   group: args["name"],
        #   topics: args["topics"],
        #   # assignment_received_handler: assignment_received_handler(),
        #   # assignments_revoked_handler: assignments_revoked_handler(),
        #   handler: types[:kafka],
        #   handler_init_args: args
        #   # config: consumer_config()
        # ]

        # config = AmpsUtil.get_kafka_auth(args, provider)

        # {
        #   Elsa.Supervisor,
        #   config: config,
        #   endpoints:
        #     Enum.map(
        #       provider["brokers"],
        #       fn %{"host" => host, "port" => port} ->
        #         {host, port}
        #       end
        #     ),
        #   connection: String.to_atom("elsa_" <> args["name"]),
        #   group_consumer: init_opts
        # }

        type == :gateway ->
          IO.inspect(args)

          protocol_options = [
            idle_timeout: args["idle_timeout"],
            request_timeout: args["request_timeout"],
            max_keepalive: args["max_keepalive"]
          ]

          router =
            Enum.reduce(args["router"], [], fn id, acc ->
              case DB.find_by_id("endpoints", id) do
                nil ->
                  acc

                endpoint ->
                  [endpoint | acc]
              end
            end)
            |> Enum.reverse()

          string =
            EEx.eval_file(Path.join([:code.priv_dir(:amps), "gateway", "Amps.Gateway.eex"]),
              name: args["name"],
              router: router,
              env: nil
            )

          [{plug, _}] = Code.compile_string(string, "Amps.Gateway.eex")

          if args["tls"] do
            {cert, key} =
              try do
                cert = AmpsUtil.get_key(args["cert"])
                key = AmpsUtil.get_key(args["key"])

                cert = X509.Certificate.from_pem!(cert) |> X509.Certificate.to_der()

                key = X509.PrivateKey.from_pem!(key)
                keytype = Kernel.elem(key, 0)
                key = X509.PrivateKey.to_der(key)
                {cert, {keytype, key}}
              rescue
                e ->
                  raise "Error parsing key and/or certificate"
              end

            {Plug.Cowboy,
             scheme: :https,
             plug: {plug, [opts: args]},
             options: [
               ref: name,
               port: args["port"],
               cipher_suite: :strong,
               cert: cert,
               key: key,
               otp_app: :amps,
               protocol_options: protocol_options
             ]}
          else
            {Plug.Cowboy,
             scheme: :http,
             plug: {plug, [opts: args]},
             options: [
               ref: name,
               port: args["port"],
               protocol_options: protocol_options
             ]}
          end

        Enum.member?(default, type) ->
          {types[type], name: name, parms: args}

        true ->
          types[type].get_spec(name, args)
      end
    rescue
      e ->
        Logger.error(Exception.format(:error, e, __STACKTRACE__))
        {:error, e}
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

    AmpsEvents.send_history(
      "amps.events.svcs.#{svcname}.logs",
      "service_logs",
      %{
        "name" => svcname,
        "status" => "starting"
      }
    )

    case AmpsDatabase.get_config(svcname) do
      nil ->
        Logger.info("service not found #{svcname}")
        {:error, "Service not found"}

      parms ->
        opts = Map.delete(parms, "_id")
        count = opts["subs_count"] || 1

        try do
          if parms["type"] == "subscriber" do
            name = String.to_atom(svcname)
            Amps.SvcSupervisor.start_child(name, get_spec(name, opts), parms)
          else
            Enum.each(1..count, fn x ->
              name = String.to_atom(svcname <> Integer.to_string(x))

              case get_spec(name, opts) do
                {:error, error} ->
                  Logger.warn("Service #{name} could not be started. Error: #{inspect(error)}")

                  raise error

                spec ->
                  Amps.SvcSupervisor.start_child(name, spec, parms)
              end
            end)
          end

          {:ok, "Started #{svcname}"}
        rescue
          e ->
            error = "#{inspect(e)}"

            AmpsEvents.send_history(
              "amps.events.svcs.#{svcname}.logs",
              "service_logs",
              %{
                "name" => svcname,
                "status" => "failed",
                "reason" => error
              }
            )

            {:error, e}
        end
    end
  end

  def service_active?(svcname) do
    case AmpsDatabase.get_config(svcname) do
      nil ->
        Logger.info("service not found #{svcname}")
        nil

      parms ->
        opts = Map.delete(parms, "_id")
        count = opts["subs_count"] || 1
        # children = Supervisor.which_children(Amps.SvcSupervisor)

        if parms["type"] == "subscriber" do
          name = String.to_atom(svcname)

          case Process.whereis(name) do
            nil ->
              nil

            pid ->
              [pid]
          end
        else
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
  end

  def load_system_parms() do
    parms =
      case Amps.DB.find_one("config", %{"name" => "SYSTEM"}) do
        nil ->
          %{}

        parms ->
          parms |> Map.drop(["_id", "name"])
      end

    Enum.each(parms, fn {key, val} ->
      res = Amps.Defaults.put(key, val)
      Application.put_env(:amps, String.to_atom(key), val)
    end)
  end

  def check_util() do
    utils = DB.find("utilscripts", %{})

    case AmpsUtil.get_mod_path() do
      nil ->
        :ok

      modpath ->
        path = Path.join(modpath, "util")

        Enum.each(utils, fn util ->
          script_path = Path.join(path, util["name"] <> ".py")

          if File.exists?(script_path) do
            :ok
          else
            File.write(script_path, util["data"])
          end
        end)
    end
  end
end
