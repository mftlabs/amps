defmodule Amps.PyService do
  use GenServer
  alias Amps.DB
  require Logger

  def start_link(default) when is_list(default) do
    GenServer.start_link(__MODULE__, default)
  end

  def run(msg, parms, env \\ "") do
    parms =
      if parms["use_provider"] do
        provider = DB.find_one(AmpsUtil.index(env, "providers"), %{"_id" => parms["provider"]})

        provider =
          if provider["type"] == "generic" do
            values =
              Enum.reduce(provider["values"], %{}, fn {key, val}, acc ->
                val =
                  case val do
                    %{"key" => key} ->
                      AmpsUtil.get_key(key)

                    _ ->
                      val
                  end

                Map.put(acc, key, val)
              end)

            Map.put(provider, "values", values)
          else
            if provider["type"] == "json" do
              Map.put(provider, "data", Jason.decode!(provider["data"]))
            else
              provider
            end
          end

        Map.put(
          parms,
          "provider",
          provider
        )
      else
        parms
      end

    path = AmpsUtil.get_mod_path(env)
    util = Path.join(AmpsUtil.get_mod_path(), "util")
    IO.inspect(util)

    tmp = AmpsUtil.get_env(:storage_temp)
    # {:ok, pid} = :python.start([{:python_path, to_charlist(path)}])
    IO.inspect(parms)
    check_script(parms["module"], env)

    parms = Map.put(parms, "env", env)

    module = String.to_atom(parms["module"])
    xparm = %{:msg => msg, :parms => parms, :sysparms => %{"tempdir" => tmp}}
    jparms = Poison.encode!(xparm)

    {:ok, pid} = :pythra.start_link([String.to_charlist(path), String.to_charlist(util)])

    # Process.unlink(pid)

    try do
      action =
        :pythra.init(pid, module, module, [], [
          {:msgdata, jparms}
        ])

      result = :pythra.method(pid, action, :__run__, [])

      :pythra.stop(pid)
      handle_run_result(result, pid)
    rescue
      e ->
        Logger.error(Exception.format(:error, e, __STACKTRACE__))
        {:error, e}
    end
  end

  def check_script(name, env) do
    path = AmpsUtil.get_mod_path(env)
    script_path = Path.join(path, name <> ".py")

    if File.exists?(script_path) do
      :ok
    else
      case DB.find_one(AmpsUtil.index(env, "scripts"), %{"name" => name}) do
        nil ->
          raise "Script does not exist"

        script ->
          File.write(script_path, script["data"])
      end
    end
  end

  def call(msg, parms, env \\ nil) do
    Task.async(fn ->
      :poolboy.transaction(
        :worker,
        fn pid ->
          IO.inspect(self())
          GenServer.call(pid, {:pyrun, msg, parms, env}, 60000)
        end,
        60000
      )
    end)
    |> Task.await(60000)
  end

  def onboard(msg, parms, env \\ nil) do
    Task.async(fn ->
      :poolboy.transaction(
        :worker,
        fn pid ->
          GenServer.call(pid, {:onboard, msg, parms, env}, 60000)
        end,
        60000
      )
    end)
    |> Task.await(60000)
  end

  def to_map(key_value_list) do
    key_value_map =
      key_value_list
      |> Enum.reduce(%{}, fn {key, value}, acc ->
        converted_key = maybe_convert_charlist_to_string(key)

        converted_value =
          case value do
            {'Map', inner_key_value_list} ->
              to_map(inner_key_value_list)

            _ ->
              maybe_convert_charlist_to_string(value)
          end

        Map.put(acc, converted_key, converted_value)
      end)

    key_value_map
  end

  defp maybe_convert_charlist_to_string(value) do
    if is_list(value) do
      case value do
        [head | tail] when is_integer(head) ->
          value
          |> List.to_string()
          |> String.replace("\u{0}", "")
          |> String.replace("\u{a}", "")
          |> String.replace("\u{d}", "")

        _ ->
          Enum.map(value, &maybe_convert_charlist_to_string/1)
          |> maybe_convert_nested_maps
      end
    else
      maybe_convert_nested_maps(value)
    end
  end

  defp maybe_convert_nested_maps(value) do
    if is_map(value) do
      to_map(Map.to_list(value))
    else
      value
    end
  end

  def obj_check(collection) do
    {env, key} = AmpsUtil.env_base(collection)
    obj = DB.find_one("objects", %{"key" => key})

    if obj do
      {obj, {env, key}}
    else
      nil
    end
  end

  def find(collection, clauses \\ {'Map', []}, opts \\ {'Map', []}) do
    if obj_check(collection) || AmpsUtil.base_index(collection) == "users" do
      clauses =
        case clauses do
          {'Map', list} ->
            to_map(list)

          _ ->
            %{}
        end

      opts =
        case opts do
          {'Map', list} ->
            to_map(list)

          _ ->
            %{}
        end

      opts = Map.merge(opts, %{"filters" => clauses})

      Amps.DB.get_rows(collection, opts)
    else
      nil
    end
  end

  def find_one(collection, clauses \\ {'Map', []}, opts \\ {'Map', []}) do
    if obj_check(collection) || AmpsUtil.base_index(collection) == "users" do
      clauses =
        case clauses do
          {'Map', list} ->
            to_map(list)

          _ ->
            %{}
        end

      opts =
        case opts do
          {'Map', list} ->
            to_map(list)

          _ ->
            %{}
        end

      Amps.DB.find_one(collection, clauses, opts)
    else
      nil
    end
  end

  def sanitize(body, obj) do
    fields = obj["fields"]

    Enum.reduce(body, %{}, fn {key, value}, acc ->
      field = Enum.find(fields, &(&1["name"] == key))

      case field do
        nil ->
          acc

        %{"type" => "arrayfield", "name" => name, "arrayfields" => arrayfields} ->
          sanitized_array =
            Enum.map(value, fn item ->
              sanitize(item, %{"fields" => arrayfields})
            end)

          Map.put(acc, name, sanitized_array)

        _ ->
          if value != nil do
            Map.put(acc, key, value)
          else
            acc
          end
      end
    end)
  end

  def create(collection, body) do
    case obj_check(collection) do
      {obj, {env, _}} ->
        {'Map', list} = body

        body = to_map(list) |> sanitize(obj)

        {:ok, id} = Amps.DB.insert(collection, body)
        AmpsUtil.ui_event(collection, id, "create", env)
        id
        %{"success" => true, id => id}

      nil ->
        %{"success" => false, "error" => "Invalid object key"}
    end
  end

  def update(collection, body, id) do
    case obj_check(collection) do
      {obj, {env, _}} ->
        {'Map', list} = body
        body = to_map(list) |> sanitize(obj)

        Amps.DB.update(collection, body, id)
        AmpsUtil.ui_event(collection, id, "update", env)
        %{"success" => true, "new" => Amps.DB.find_by_id(collection, id)}

      nil ->
        %{"success" => false, "error" => "Invalid object key"}
    end
  end

  def delete(collection, clauses) do
    case obj_check(collection) do
      {_, {env, _}} ->
        clauses =
          case clauses do
            {'Map', list} ->
              to_map(list)

            _ ->
              %{}
          end

        object = Amps.DB.find_one(collection, clauses)
        result = Amps.DB.delete(collection, clauses)
        AmpsUtil.ui_delete_event(collection, object, env)
        %{"success" => true, "id" => object["_id"]}

      nil ->
        %{"success" => false, "error" => "Invalid object key"}
    end
  end

  defmodule Users do
    alias Amps.PyService

    def create(body, env) do
      env = List.to_string(env)

      case body do
        {'Map', list} ->
          body = PyService.to_map(list)
          res = Amps.Users.User.create(body, env)

          case res do
            %{"success" => true, "user" => user, "id" => id} ->
              AmpsUtil.ui_event(AmpsUtil.index(env, "users"), id, "create", env)
              %{"success" => true, "id" => id}

            _ ->
              res
          end

        _ ->
          %{"success" => false, "error" => "Malformed Body"}
      end
    end

    def update(id, body, env) do
      env = List.to_string(env)
      id = List.to_string(id)

      case body do
        {'Map', list} ->
          body = PyService.to_map(list)
          res = Amps.Users.User.update(id, body, env)

          case res do
            %{"success" => true, "user" => user, "id" => id} ->
              AmpsUtil.ui_event(AmpsUtil.index(env, "users"), id, "update", env)
              %{"success" => true, "id" => id}

            _ ->
              res
          end

        _ ->
          %{"success" => false, "error" => "Malformed Body"}
      end
    end

    def delete(id, env) do
      env = List.to_string(env)
      id = List.to_string(id)
      col = AmpsUtil.index(env, "users")
      object = Amps.DB.find_by_id(col, id)

      res = Amps.Users.User.delete(id, env)
      AmpsUtil.ui_delete_event(col, object, env)
      res
    end

    def create_session(user, env) do
      env = List.to_string(env)

      case user do
        {'Map', list} ->
          body = PyService.to_map(list)
          user = Amps.Users.authenticate(body, env: "")

          if user do
            Amps.Users.create_session(user, env)
          else
            %{
              "success" => false,
              "error" => "Invalid Credentials"
            }
          end

        _ ->
          %{"success" => false, "error" => "Malformed Body"}
      end
    end

    def authenticate(access_token, env) do
      env = List.to_string(env)
      access_token = List.to_string(access_token)
      Amps.Users.verify_session(access_token, env)
    end

    def renew_session(renewal_token, env) do
      env = List.to_string(env)
      renewal_token = List.to_string(renewal_token)
      Amps.Users.renew_session(renewal_token, env)
    end

    def delete_session(access_token, env) do
      env = List.to_string(env)
      access_token = List.to_string(access_token)
      Amps.Users.delete_session(access_token, env)
    end
  end

  # Callbacks

  @impl true
  def init(_stack) do
    path = AmpsUtil.get_env(:python_path)

    with {:ok, pid} <- :python.start([{:python_path, to_charlist(path)}]) do
      IO.puts("started python worker")
      {:ok, pid}
    end
  end

  @impl true
  def handle_call({:pyrun, msg, parms, env}, _from, _pid) do
    parms =
      if parms["use_provider"] do
        Map.put(
          parms,
          "provider",
          DB.find_one(AmpsUtil.index(env, "providers"), %{"_id" => parms["provider"]})
        )
      else
        parms
      end

    path = AmpsUtil.get_mod_path(env)
    tmp = AmpsUtil.get_env(:storage_temp)
    # {:ok, pid} = :python.start([{:python_path, to_charlist(path)}])
    IO.inspect(parms)
    module = String.to_atom(parms["module"])
    xparm = %{:msg => msg, :parms => parms, :sysparms => %{"tempdir" => tmp}}
    jparms = Poison.encode!(xparm)

    {:ok, pid} = :pythra.start_link([String.to_charlist(path)])
    IO.inspect(self())
    IO.inspect("PYTHON PID")
    IO.inspect(pid)
    # Process.unlink(pid)

    try do
      action =
        :pythra.init(pid, module, module, [], [
          {:msgdata, jparms}
        ])

      result = :pythra.method(pid, action, :__run__, [])
      IO.inspect(result)
      :pythra.stop(pid)
      handle_result(result, pid)
    rescue
      e ->
        {:reply, {:error, e}, pid}
    end
  end

  def handle_call({:onboard, msg, parms, env}, _from, _pid) do
    path = Path.join([:code.priv_dir(:amps), "py", "onboarding"])
    tmp = AmpsUtil.get_env(:storage_temp)
    # {:ok, pid} = :python.start([{:python_path, to_charlist(path)}])
    module = String.to_atom(parms["module"])
    xparm = %{:msg => msg, :parms => parms, :sysparms => %{"tempdir" => tmp}}
    jparms = Poison.encode!(xparm)

    {:ok, pid} = :pythra.start_link([String.to_charlist(path)])

    action =
      :pythra.init(pid, module, module, [], [
        {:msgdata, jparms}
      ])

    try do
      result = :pythra.method(pid, action, :__run__, [])
      :pythra.stop(pid)
      handle_result(result, pid)
    rescue
      e ->
        {:reply, {:error, e}, pid}
    end
  end

  defp handle_run_result(result, pid) do
    case result do
      :undefined ->
        {:error, "Nothing returned from script"}

      result ->
        rparm =
          try do
            Poison.decode!(result)
          rescue
            _ ->
              {:error, "JSON Encoded object not returned from script"}
          end

        if is_map(rparm) do
          status = rparm["status"] || "failed"

          if rparm["error"] do
            {:error, rparm["reason"]}
          else
            {:ok, rparm}
          end
        else
          {:error, "JSON Encoded object not returned from script"}
        end
    end
  end

  defp handle_result(result, pid) do
    case result do
      :undefined ->
        {:reply, {:error, "Nothing returned from script"}, pid}

      result ->
        rparm =
          try do
            Poison.decode!(result)
          rescue
            _ ->
              {:reply, {:error, "JSON Encoded object not returned from script"}, pid}
          end

        if is_map(rparm) do
          status = rparm["status"] || "failed"

          if status == "failed" do
            {:reply, {:error, rparm["reason"]}, pid}
          else
            {:reply, {:ok, rparm}, pid}
          end
        else
          {:reply, {:error, "JSON Encoded object not returned from script"}, pid}
        end
    end
  end

  @impl true
  def handle_cast({:push, element}, state) do
    {:noreply, [element | state]}
  end
end
