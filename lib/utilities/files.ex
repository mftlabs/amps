defmodule Amps.Files do
  use GenServer

  def start_link(_) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    {:ok, %{files: []}}
  end

  @impl true
  def handle_call({:open_file, path, modes}, _from, state) do
    case File.open(path, modes) do
      {:ok, file} ->
        IO.inspect(file)
        {:reply, {:ok, file}, update_in(state, [:files], fn files -> [file | files] end)}

      {:error, error} ->
        {:reply, {:error, error}, state}
    end
  end

  def handle_call({:close_file, pid}, _from, state) do
    {:reply, :ok, update_in(state, [:files], fn files -> List.delete(files, pid) end)}
  end

  def handle_call(:list, _from, state) do
    {:reply, state, state}
  end

  def open(path, modes \\ [:read, :binary]) do
    GenServer.call(__MODULE__, {:open_file, path, modes})
  end

  def stream(msg, env, chunk_size \\ nil) do
    AmpsUtil.stream(msg, env, chunk_size)
  end

  def close(pid) do
    GenServer.call(__MODULE__, {:close_file, pid})
  end

  def list() do
    GenServer.call(__MODULE__, :list)
  end
end
