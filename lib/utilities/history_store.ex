defmodule Amps.History do
  @moduledoc """
  Provides the structure of ExampleStore records for a minimal default of Mnesiac.
  """
  use Mnesiac.Store
  import Record, only: [defrecord: 3]

  @doc """
  Record definition for ExampleStore default record.
  """
  Record.defrecord(
    :history,
    __MODULE__,
    name: nil,
    indexes: %{},
    last_message: nil
  )

  @typedoc """
  ExampleStore default record field type definitions.
  """
  @type history ::
          record(
            :history,
            name: atom(),
            indexes: map(),
            last_message: map()
          )

  @impl true
  def store_options,
    do: [
      record_name: :history,
      attributes: history() |> history() |> Keyword.keys(),
      ram_copies: [node()]
    ]

  def put_message(name, message) do
    case get(name) do
      nil ->
        put(name)

      rec ->
        {:atomic, :ok}
    end

    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:history, name}) do
          [] ->
            nil

          [{:history, name, indexes, last_message}] ->
            with {actions, msg} <- message do
              indexes =
                Enum.reduce(actions, indexes, fn {index, op}, indexes ->
                  handle_index(indexes, index, op)
                end)

              :mnesia.write({:history, name, indexes, msg})
            end
        end
      end)
  end

  defp handle_index(indexes, index, op) do
    if Map.has_key?(indexes, index) do
      Map.put(indexes, index, [op | indexes[index]])
    else
      Map.put(indexes, index, [op])
    end
  end

  def clear(name) do
    :mnesia.transaction(fn ->
      case :mnesia.wread({:history, name}) do
        [] ->
          nil

        [{:history, name, indexes, last_message}] ->
          :mnesia.write({:history, name, %{}, nil})
      end
    end)
  end

  def put(name) do
    case get(name) do
      nil ->
        {:atomic, :ok} = :mnesia.transaction(fn -> :mnesia.write({:history, name, %{}, nil}) end)

      rec ->
        {:atomic, :ok}
    end
  end

  def get(name) do
    with {:atomic, res} <-
           :mnesia.transaction(fn -> :mnesia.read({:history, name}) end) do
      case res do
        [{:history, name, indexes, last_message}] ->
          %{"indexes" => indexes, "last_message" => last_message}

        [] ->
          nil
      end
    end
  end
end
