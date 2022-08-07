defmodule Amps.PyHandler do
  @behaviour Amps.Handler
  use Amps.Handler, sub_spec: Amps.PyConsumer

  alias Pow.{Config, Store.CredentialsCache}
  alias PowPersistentSession.Store.PersistentSessionCache

  @impl Amps.Handler
  def initialize(state) do
    env = state.env

    parms = state.parms
    path = AmpsUtil.get_mod_path(env, [parms["service"]])

    {:ok, pid} =
      :pythra.start_link([String.to_charlist(path)], [
        {:cd, String.to_charlist(path)}
      ])

    svc = String.to_atom(parms["service"])

    {:ok, log_handler} = Amps.PyHandler.PyLogger.start_link(parms: parms, env: env)

    output_map =
      Enum.reduce(parms["output_map"], %{}, fn %{
                                                 "name" => name,
                                                 "output" => topic
                                               },
                                               acc ->
        Map.put(acc, name, topic)
      end)

    parms = Map.put(parms, "output_map", output_map)

    service =
      :pythra.init(pid, svc, svc, [], [
        {:parms, Jason.encode!(parms)},
        {:sysparms, Jason.encode!(%{"tempdir" => AmpsUtil.get_env(:storage_temp)})},
        {:pid, self()},
        {:env, env},
        {:lhandler, log_handler}
      ])

    process = %{
      pid: pid,
      service: service
    }

    Map.merge(state, %{
      process: process,
      log_handler: log_handler,
      parms: parms,
      sid: nil
    })
  end

  @impl Amps.Handler
  def create_subscribers(state) do
    state.parms["receive"]
  end

  def send_message(msg, parms, env) do
    if parms["send_output"] do
      msg = Jason.decode!(msg)
      parms = Jason.decode!(parms)

      AmpsEvents.send(
        msg,
        parms,
        %{},
        env
      )
    else
      Logger.warn(
        "Attempted to Send Message in Service #{parms["name"]} when \"Send Output\" disabled."
      )
    end
  end

  def put_response({resp, id}, state) do
    :pythra.method(state.process.pid, state.process.service, :__response__, [
      Jason.encode!(resp),
      id
    ])
  end

  def handle_info({{:new, msg, action, response, timeout}, id}, state) do
    parms = state.parms
    Logger.debug("Handling new message in service #{parms["name"]}")
    msg = Jason.decode!(msg)

    {msg, sid} =
      AmpsEvents.start_session(
        msg,
        %{"service" => parms["name"]},
        state.env
      )

    env = state.env

    msg = Map.merge(msg, %{"service" => parms["name"]})

    msg =
      if msg["user"] do
        msg
      else
        Map.put(msg, "user", "#{parms["name"]} generated")
      end

    topic = parms["output_map"][to_string(action)]

    resp =
      if topic do
        parms = Map.put(parms, "output", topic)

        if response do
          case Amps.AsyncResponder.register([msg], parms, env, timeout) do
            :pending ->
              topics =
                if is_list(parms["output"]) do
                  parms["output"]
                else
                  [parms["output"]]
                end

              topics =
                Enum.reduce(topics, "", fn topic, acc ->
                  acc <> "\t" <> topic <> "\n"
                end)

              %{
                "status" => "pending",
                "response" =>
                  "Action performed successfully\nMessage sent to topic(s):\n" <>
                    topics
              }

            {:resp, responses} ->
              responses =
                Enum.reduce(responses, %{}, fn {action, msgid, response}, acc ->
                  if is_map(response) do
                    if Map.has_key?(response, "async") do
                      async = response["async"]
                      [{key, data}] = Enum.to_list(async)

                      if Map.has_key?(acc, key) do
                        if is_list(acc[key]) do
                          Map.put(acc, key, acc[key] ++ [data])
                        else
                          Map.put(acc, key, [acc[key]] ++ [data])
                        end
                      else
                        Map.put(acc, key, data)
                      end
                    else
                      Map.merge(acc, %{action => %{msgid => response}})
                    end
                  else
                    Map.merge(acc, %{action => %{msgid => response}})
                  end
                end)

              %{
                "status" => "success",
                "response" => responses
              }
          end
        else
          AmpsEvents.send(
            msg,
            parms,
            %{},
            env
          )

          msg["msgod"]
        end
      else
        Logger.warn(
          "Attempted to Send Message in Service #{parms["name"]} with unmapped action #{action}."
        )

        %{
          "status" => "failed",
          "response" => "Unmapped Action: #{action}"
        }
      end

    AmpsEvents.end_session(sid, env)
    put_response({resp, id}, state)

    {:noreply, state}
  end

  def handle_info({{:authenticate, user}, id}, state) do
    # Process.sleep(2000)
    user = Jason.decode!(user)

    resp =
      case custom_auth(user, state.env) do
        {:error, msg} ->
          %{"success" => false, "response" => msg}

        {:ok, {user, access, renew}} ->
          %{
            "success" => true,
            "response" => %{
              "user" => user,
              "access_token" => access,
              "renewal_token" => renew
            }
          }
      end

    put_response({resp, id}, state)
    {:noreply, state}
  end

  def handle_info({{:renew, renewal_token}, id}, state) do
    resp =
      case renew(to_string(renewal_token), state.env) do
        {:error, msg} ->
          %{"success" => false, "response" => msg}

        {:ok, {user, access, renew}} ->
          %{
            "success" => true,
            "response" => %{
              "user" => user,
              "access_token" => access,
              "renewal_token" => renew
            }
          }
      end

    put_response({resp, id}, state)
    {:noreply, state}
  end

  def handle_info({{:fetch, access_token}, id}, state) do
    resp =
      case fetch(to_string(access_token), state.env) do
        {:ok, user} ->
          user

        {:error, _} ->
          false
      end

    put_response({resp, id}, state)
    {:noreply, state}
  end

  def handle_info({{:delete, access_token}, id}, state) do
    access_token = to_string(access_token)
    IO.inspect(access_token)
    :ok = delete(access_token, state.env)
    put_response({%{"success" => true}, id}, state)
    {:noreply, state}
  end

  def custom_auth(params, env) do
    config = config(env)

    # The store caches will use their default `:ttl` settting. To change the
    # `:ttl`, `Keyword.put(store_config, :ttl, :timer.minutes(10))` can be
    # passed in as the first argument instead of `store_config`.

    Amps.Users.authenticate(params, config)
    |> case do
      nil ->
        {:error, "Unable to Authenticate"}

      user ->
        create(user, config)
    end
  end

  def create(user, config) do
    store_config = store_config(config)
    access_token = Pow.UUID.generate()
    renewal_token = Pow.UUID.generate()

    conn =
      %Plug.Conn{
        secret_key_base: Application.get_env(:amps_portal, AmpsPortal.Endpoint)[:secret_key_base]
      }
      |> Plug.Conn.put_private(:pow_config, config)

    access = Pow.Plug.sign_token(conn, "py_auth", access_token, config)
    renew = Pow.Plug.sign_token(conn, "py_auth", renewal_token, config)

    CredentialsCache.put(
      store_config,
      access_token,
      {user, [renewal_token: renewal_token]}
    )

    PersistentSessionCache.put(
      store_config,
      renewal_token,
      {user, [access_token: access_token]}
    )

    {:ok, {user, access, renew}}
  end

  defp store_config(config) do
    backend = Config.get(config, :cache_store_backend, Pow.Store.Backend.EtsCache)

    [backend: backend]
  end

  def renew(renewal_token, env) do
    config = config(env)

    store_config = store_config(config)

    conn =
      %Plug.Conn{
        secret_key_base: Application.get_env(:amps_portal, AmpsPortal.Endpoint)[:secret_key_base]
      }
      |> Plug.Conn.put_private(:pow_config, config)

    {:ok, token} = Pow.Plug.verify_token(conn, "py_auth", renewal_token, config)

    {user, metadata} =
      Pow.Store.Base.get(store_config, PersistentSessionCache.backend_config(store_config), token)

    {user, metadata} =
      Amps.Users.get_by(%{"_id" => user.id}, config)
      |> case do
        nil -> nil
        user -> {user, metadata}
      end

    CredentialsCache.delete(store_config, metadata[:access_token])
    PersistentSessionCache.delete(store_config, token)

    create(user, config)
  end

  def fetch(access_token, env) do
    config = config(env)

    conn =
      %Plug.Conn{
        secret_key_base: Application.get_env(:amps_portal, AmpsPortal.Endpoint)[:secret_key_base]
      }
      |> Plug.Conn.put_private(:pow_config, config)

    with {:ok, token} <- Pow.Plug.verify_token(conn, "py_auth", access_token, config),
         {user, _metadata} <- CredentialsCache.get(store_config(config), token) do
      {:ok, user}
    else
      _any -> {:error, "Unauthenticated"}
    end
  end

  def delete(access_token, env) do
    config = config(env)
    store_config = store_config(config)

    conn =
      %Plug.Conn{
        secret_key_base: Application.get_env(:amps_portal, AmpsPortal.Endpoint)[:secret_key_base]
      }
      |> Plug.Conn.put_private(:pow_config, config)

    with {:ok, token} = Pow.Plug.verify_token(conn, "py_auth", access_token, config),
         {_user, metadata} <- CredentialsCache.get(store_config, token) do
      PersistentSessionCache.delete(store_config, metadata[:renewal_token])
      CredentialsCache.delete(store_config, token)
    else
      _any -> :ok
    end
  end

  defp config(env) do
    [
      mod: AmpsPortal.APIAuthPlug,
      plug: AmpsPortal.APIAuthPlug,
      otp_app: :amps_portal
    ]
    |> Keyword.put(:env, env)
  end

  def log(level, message, md) do
    Logger.log(
      level,
      message,
      Enum.map(md, fn {k, v} ->
        {k, List.to_string(v)}
      end)
    )
  end

  defmodule PyLogger do
    require Logger

    def start_link(args) do
      parms = Enum.into(args, %{})

      parms =
        case parms[:env] do
          nil ->
            Map.put(parms, :env, "")

          _ ->
            parms
        end

      IO.puts("starting event listener #{inspect(parms)}")
      {:ok, pid} = GenServer.start_link(__MODULE__, parms)
    end

    def init(state) do
      {:ok, state}
    end

    def handle_info({:log, {level, message}}, state) do
      Logger.log(level, message)
      {:noreply, state}
    end

    def handle_info(other, state) do
      {:noreply, state}
    end
  end
end
