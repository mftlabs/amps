defmodule Amps.PyService do
  use GenServer

  def start_link(default) when is_list(default) do
    GenServer.start_link(__MODULE__, default)
  end

  def call(msg, parms) do
    Task.async(fn ->
      :poolboy.transaction(
        :worker,
        fn pid ->
          GenServer.call(pid, {:pyrun, msg, parms}, 60000)
        end,
        60000
      )
    end)
    |> Task.await(60000)
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
  def handle_call({:pyrun, msg, parms}, _from, _pid) do
    path = AmpsUtil.get_env(:python_path)
    tmp = AmpsUtil.get_env(:storage_temp)
    {:ok, pid} = :python.start([{:python_path, to_charlist(path)}])
    IO.inspect(parms)
    module = String.to_atom(parms["module"])
    xparm = %{:msg => msg, :parms => parms, :sysparms => %{"tempdir" => tmp}}
    jparms = Poison.encode!(xparm)

    try do
      result = :python.call(pid, module, :run, [jparms])

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
              {:reply, {:error, result["reason"]}, pid}
            else
              {:reply, {:ok, rparm}, pid}
            end
          else
            {:reply, {:error, "JSON Encoded object not returned from script"}, pid}
          end
      end
    rescue
      e ->
        {:reply, {:error, e}, pid}
    end
  end

  @impl true
  def handle_cast({:push, element}, state) do
    {:noreply, [element | state]}
  end
end
