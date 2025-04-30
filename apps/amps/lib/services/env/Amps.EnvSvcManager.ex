defmodule Amps.EnvSvcManager do
  use GenServer
  require Logger
  alias Amps.DB

  def start_link(env) do
    Logger.info("starting service manager")
    GenServer.start_link(__MODULE__, env, name: String.to_atom("#{env}-svcmgr"))
  end

  def init(env) do
    Process.send_after(self(), {:initial_connect, env}, 0)
    {:ok, %{}}
  end

  def child_spec(env) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, env}
    }
  end

  # GenServer callbacks
  def handle_info({:initial_connect, env}, _state) do
    load_services(env)
    {:noreply, env}
  end

  # def start_service(svcname) do
  #   GenServer.call(Amps.SvcManager, {:start_service, svcname})
  # end

  # def stop_service(svcname) do
  #   GenServer.call(Amps.SvcManager, {:stop_service, svcname})
  # end

  def handle_call({:stop_service, name}, _from, state) do
    AmpsEvents.send_history(
      AmpsUtil.env_topic("amps.events.svcs.#{name}.logs", state),
      "service_logs",
      %{
        "name" => name,
        "status" => "stopping"
      }
    )

    IO.inspect(state)

    res =
      case service_active?(name, state) do
        nil ->
          IO.inspect("not running")
          {:error, "Service Not Running"}

        pids ->
          Enum.each(pids, fn pid ->
            IO.inspect(pid)

            DynamicSupervisor.terminate_child(
              String.to_atom("#{state}-svcspvsr"),
              pid
            )
          end)

          AmpsEvents.send_history(
            AmpsUtil.env_topic("amps.events.svcs.#{name}.logs", state),
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
      case service_active?(name, state) do
        nil ->
          res = load_service(name, state)
          IO.inspect(res)
          # res

          DB.find_one_and_update(
            AmpsUtil.index(state, "services"),
            %{"name" => name},
            %{
              "active" => true
            }
          )

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

  def get_spec(name, args, env) do
    types = service_types()
    IO.inspect(args)
    default = [:subscriber, :sftpd, :pyservice, :sqs, :nats]
    type = String.to_atom(args["type"])

    try do
      cond do
        type == :httpd ->
          protocol_options = [
            idle_timeout: args["idle_timeout"],
            request_timeout: args["request_timeout"],
            max_keepalive: args["max_keepalive"]
          ]

          if args["tls"] do
            {cert, key} =
              try do
                #                cert = AmpsUtil.get_key(args["cert"], env)
                cert = Amps.DB.find_by_id(AmpsUtil.index(env, "keys"), args["cert"])["data"]
                #                key = AmpsUtil.get_key(args["key"], env)
                key = Amps.DB.find_by_id(AmpsUtil.index(env, "keys"), args["key"])["data"]

                cert = X509.Certificate.from_pem!(cert) |> X509.Certificate.to_der()

                key = X509.PrivateKey.from_pem!(key)
                keytype = Kernel.elem(key, 0)
                key = X509.PrivateKey.to_der(key)
                {cert, {keytype, key}}
              rescue
                e ->
                  raise "Error parsing key and/or certificate #{inspect(e)}"
              end

            {Plug.Cowboy,
             scheme: :https,
             plug: {types[:httpd], [env: env, opts: args]},
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
             plug: {types[:httpd], [env: env, opts: args]},
             options: [
               ref: name,
               port: args["port"],
               protocol_options: protocol_options
             ]}
          end

        type == :gateway ->
          protocol_options = [
            idle_timeout: args["idle_timeout"],
            request_timeout: args["request_timeout"],
            max_keepalive: args["max_keepalive"]
          ]

          router =
            Enum.reduce(args["router"], [], fn id, acc ->
              case DB.find_by_id(AmpsUtil.index(env, "endpoints"), id) do
                nil ->
                  acc

                endpoint ->
                  [endpoint | acc]
              end
            end)
            |> Enum.reverse()

          [{plug, _}] =
            EEx.eval_file(Path.join([:code.priv_dir(:amps), "gateway", "Amps.Gateway.eex"]),
              name: args["name"],
              router: router,
              env: env
            )
            |> Code.compile_string("Amps.Gateway.eex")

          if args["tls"] do
            {cert, key} =
              try do
                #                cert = AmpsUtil.get_key(args["cert"], env)
                #                key = AmpsUtil.get_key(args["key"], env)
                cert = Amps.DB.find_by_id(AmpsUtil.index(env, "keys"), args["cert"])["data"]
                key = Amps.DB.find_by_id(AmpsUtil.index(env, "keys"), args["key"])["data"]

                cert = X509.Certificate.from_pem!(cert) |> X509.Certificate.to_der()

                key = X509.PrivateKey.from_pem!(key)
                keytype = Kernel.elem(key, 0)
                key = X509.PrivateKey.to_der(key)
                {cert, {keytype, key}}
              rescue
                e ->
                  raise "Error parsing key and/or certificate #{inspect(e)}"
              end

            {Plug.Cowboy,
             scheme: :https,
             plug: {plug, [env: env, opts: args]},
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
             plug: {plug, [env: env, opts: args]},
             options: [
               ref: name,
               port: args["port"],
               protocol_options: protocol_options
             ]}
          end

        Enum.member?(default, type) ->
          {types[type], name: name, parms: args, env: env}

        true ->
          types[type].get_spec(name, args, env)
      end
    rescue
      e ->
        Logger.error(Exception.format(:error, e, __STACKTRACE__))
        {:error, e}
    end
  end

  defp load_services(env) do
    Logger.info("Loading services for environment #{env}...")

    case Amps.DB.find(AmpsUtil.index(env, "services"), %{active: true}) do
      [] ->
        :ok

      result ->
        types = service_types()

        Enum.each(result, fn service ->
          if Map.has_key?(types, String.to_atom(service["type"])) do
            Logger.info("loading service #{service["name"]}")
            load_service(service["name"], env)
          end
        end)
    end

    Logger.info("Done loading services for environment #{env}")
  end

  def load_service(svcname, env) do
    Logger.info("Loading service in environment #{svcname}")

    AmpsEvents.send_history(
      AmpsUtil.env_topic("amps.events.svcs.#{svcname}.logs", env),
      "service_logs",
      %{
        "name" => svcname,
        "status" => "starting"
      }
    )

    case Amps.DB.find_one(AmpsUtil.index(env, "services"), %{name: svcname}) do
      nil ->
        Logger.info("Service not found #{svcname}")
        {:error, "Service not found"}

      parms ->
        opts = Map.delete(parms, "_id")
        count = opts["subs_count"] || 1

        try do
          if parms["type"] == "subscriber" || parms["type"] == "pyservice" do
            name = String.to_atom(env <> "-" <> svcname)
            start_child(name, get_spec(name, opts, env), parms, env)
          else
            Enum.each(1..count, fn x ->
              name = String.to_atom(env <> "-" <> svcname <> Integer.to_string(x))

              case get_spec(name, opts, env) do
                {:error, error} ->
                  Logger.warning("Service #{name} could not be started. Error: #{inspect(error)}")

                  raise error

                spec ->
                  start_child(name, spec, parms, env)
              end
            end)
          end

          {:ok, "Started #{svcname}"}
        rescue
          e ->
            error = "#{inspect(e)}"

            AmpsEvents.send_history(
              AmpsUtil.env_topic("amps.events.svcs.#{svcname}.logs", env),
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

  def start_child(name, spec, config, env) do
    case DynamicSupervisor.start_child(String.to_atom("#{env}-svcspvsr"), spec) do
      {:ok, pid} ->
        IO.inspect(name)
        Process.register(pid, name)

        AmpsEvents.send_history(
          AmpsUtil.env_topic("amps.events.svcs.#{config["name"]}.logs", env),
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

        {:shutdown,
         {:failed_to_start_child, _module, {{:badmatch, {:error, {e, _stacktrace}}}, _}}} =
          error

        error =
          if e.message do
            e.message
          else
            "#{inspect(error)}"
          end

        AmpsEvents.send_history(
          AmpsUtil.env_topic("amps.events.svcs.#{config["name"]}.logs", env),
          "service_logs",
          %{
            "name" => config["name"],
            "status" => "failed",
            "reason" => error
          }
        )
    end
  end

  def service_active?(svcname, env) do
    case Amps.DB.find_one(AmpsUtil.index(env, "services"), %{"name" => svcname}) do
      nil ->
        Logger.info("Service not found #{svcname} for environment #{env}")
        nil

      parms ->
        opts = Map.delete(parms, "_id")
        count = opts["subs_count"] || 1
        # children = Supervisor.which_children(Amps.SvcSupervisor)

        if parms["type"] == "subscriber" || parms["type"] == "pyservice" do
          name = String.to_atom(env <> "-" <> svcname)

          case Process.whereis(name) do
            nil ->
              nil

            pid ->
              [pid]
          end
        else
          names =
            Enum.reduce(1..count, [], fn x, acc ->
              name = String.to_atom(env <> "-" <> svcname <> Integer.to_string(x))
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

    IO.inspect(parms)

    Enum.each(parms, fn {key, val} ->
      res = Amps.Defaults.put(key, val)
      IO.inspect(res)
      Application.put_env(:amps, String.to_atom(key), val)
    end)
  end
end
