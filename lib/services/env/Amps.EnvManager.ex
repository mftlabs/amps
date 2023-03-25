defmodule Amps.EnvManager do
  use GenServer
  require Logger

  def start_link(_args) do
    Logger.info("Starting Environment Supervisor")
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(opts) do
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
    load_environments()
    {:noreply, opts}
  end

  def start_env(name) do
    GenServer.call(__MODULE__, {:start_env, name})
  end

  def stop_env(name) do
    # need to implement
    GenServer.call(__MODULE__, {:stop_env, name})
  end

  # def stop_service(svcname) do
  #   GenServer.call(Amps.SvcManager, {:stop_service, svcname})
  # end

  # def handle_call({:stop_service, name}, _from, state) do
  #   AmpsEvents.send_history(
  #     "amps.events.svcs.#{name}.logs",
  #     "service_logs",
  #     %{
  #       "name" => name,
  #       "status" => "stopping"
  #     }
  #   )

  #   res =
  #     case env_active?(name) do
  #       nil ->
  #         IO.inspect("not running")
  #         {:error, "Service Not Running"}

  #       pids ->
  #         service = AmpsDatabase.get_config(name)
  #         IO.inspect(service)

  #         Enum.each(pids, fn pid ->
  #           IO.inspect(pid)
  #           DynamicSupervisor.terminate_child(Amps.SvcSupervisor, pid)
  #         end)

  #         AmpsEvents.send_history(
  #           "amps.events.svcs.#{name}.logs",
  #           "service_logs",
  #           %{
  #             "name" => name,
  #             "status" => "stopped"
  #           }
  #         )

  #         {:ok, true}
  #     end

  #   {:reply, res, state}
  # end

  def handle_call({:start_env, name}, _from, state) do
    res =
      case env_active?(name) do
        nil ->
          load_env(name)
          # res

          Amps.DB.find_one_and_update("environments", %{"name" => name}, %{
            "active" => true
          })

        pid ->
          {:error, "Environment Already Running #{inspect(pid)}"}
      end

    {:reply, res, state}
  end

  def handle_call({:stop_env, _name}, _from, state) do
    # implement the stop
    {:reply, true, state}
  end

  def service_types do
    list = AmpsUtil.get_env(:services)
    Enum.into(list, %{})
  end

  def get_spec(name, args) do
    types = service_types()

    try do
      case String.to_atom(args["type"]) do
        #      :sftpd ->
        #        {types[:sftpd], name: name, parms: args}

        :httpd ->
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
                  raise "Error parsing key and/or certificate #{inspect(e)}"
              end

            {Plug.Cowboy,
             scheme: :https,
             plug: types[:httpd],
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
             plug: types[:httpd],
             options: [
               ref: name,
               port: args["port"],
               protocol_options: protocol_options
             ]}
          end
      end

      #        :kafka ->
      #          provider = Amps.DB.find_one("providers", %{"_id" => args["provider"]})
      #          auth_opts = AmpsUtil.get_kafka_auth(args, provider)
      #
      #          spec = %{
      #            id: name,
      #            start:
      #              {KafkaEx.ConsumerGroup, :start_link,
      #               [
      #                 types[:kafka],
      #                 args["name"],
      #                 args["topics"],
      #                 [
      #                   uris:
      #                     Enum.map(
      #                       provider["brokers"],
      #                       fn %{"host" => host, "port" => port} ->
      #                         {host, port}
      #                       end
      #                     ),
      #                   extra_consumer_args: args
      #                 ] ++
      #                   auth_opts
      #               ]}
      #          }
      #
      #          spec

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

      #        type ->
      #          {types[type], name: name, parms: args}
      #      end
    rescue
      e ->
        Logger.error(Exception.format(:error, e, __STACKTRACE__))
        {:error, e}
    end
  end

  defp load_environments() do
    Logger.info("Loading Environments...")

    case Amps.DB.find("environments", %{active: true}) do
      [] ->
        :ok

      envs ->
        Enum.each(envs, fn env ->
          Logger.info("Loading Environment #{env["name"]}")
          load_env(env["name"])
        end)
    end

    Logger.info("Loading Environments Done")
  end

  def load_env(name) do
    Logger.info("load_service loading service #{name}")

    # AmpsEvents.send_history(
    #   "amps.events.svcs.#{svcname}.logs",
    #   "service_logs",
    #   %{
    #     "name" => svcname,
    #     "status" => "starting"
    #   }
    # )

    case Amps.DB.find_one("environments", %{"name" => name}) do
      nil ->
        Logger.info("Environment not found #{name}")
        {:error, "Service not found"}

      parms ->
        opts = Map.delete(parms, "_id")

        try do
          create_streams(name)
          Amps.EnvSupervisor.start_child(String.to_atom("env-" <> opts["name"]), opts)
          Gnat.pub(:gnat, "amps.events.archive.handler.start.#{name}", "")

          {:ok, "Started #{name}"}
        rescue
          e ->
            {:error, "cannot create supervisor #{inspect(e)}"}
        end
    end
  end

  def create_streams(env) do
    streams = Application.get_env(:amps, :streams)
    # Logger.info("streams")
    # IO.inspect(streams)

    streams = Enum.into(streams, %{})
    # IO.inspect(streams)

    Enum.each(streams, fn {subjects, name} ->
      subjects = Atom.to_string(subjects) |> AmpsUtil.env_topic(env)

      name = String.upcase(env) <> "-" <> name

      create_stream(name, subjects)
    end)
  end

  def create_stream(name, subjects) do
    case Jetstream.API.Stream.info(:gnat, name) do
      {:ok, _res} ->
        Logger.info(name <> " Stream Exists")

      # IO.inspect(res)

      {:error, error} ->
        IO.inspect(error)
        Logger.info("Error Creating Stream " <> name)
        subjects = subjects <> ".>"

        case Jetstream.API.Stream.create(:gnat, %Jetstream.API.Stream{
               name: name,
               storage: :file,
               subjects: [subjects]
             }) do
          {:ok, _res} ->
            Logger.info("Created Stream " <> name)

          # IO.inspect(res)

          {:error, error} ->
            reason = "error creating stream [#{name}] error [#{inspect(error)}]"
            Logger.error(reason)
            Logger.error(reason)

            # IO.inspect(error)
        end
    end
  end

  def env_active?(name) do
    case Amps.DB.find_one("environments", %{"name" => name}) do
      nil ->
        Logger.info("Environment not found #{name}")
        nil

      _parms ->
        Process.whereis(String.to_atom("env-" <> name))
    end
  end
end
