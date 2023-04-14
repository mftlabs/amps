defmodule Amps.PyService do
  use GenServer
  alias Amps.DB

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
      IO.inspect(result)
      :pythra.stop(pid)
      handle_run_result(result, pid)
    rescue
      e ->
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
    key_value_map = key_value_list
      |> Enum.reduce(%{}, fn {key, value}, acc ->
        converted_key = maybe_convert_charlist_to_string(key)
        converted_value = case value do
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
    if is_list(value) && Enum.all?(value, &is_integer/1) do
      List.to_string(value)
    else
      value
    end
  end

  def find(collection, clauses \\ {'Map', []}) do
    clauses =
      case clauses do
        {'Map', list} ->
          to_map(list)
      end
      IO.inspect(clauses)

    res = Amps.DB.find(collection, clauses)
    IO.inspect(res)
    res
  end

  def find_one(collection, clauses \\ {'Map', []}) do
    clauses =
      case clauses do
        {'Map', list} ->
          to_map(list)
      end
      IO.inspect(clauses)

    Amps.DB.find_one(collection, clauses)
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
