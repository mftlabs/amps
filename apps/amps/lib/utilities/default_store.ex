defmodule Amps.Defaults do
  @moduledoc """
  Provides the structure of ExampleStore records for a minimal default of Mnesiac.
  """
  use Mnesiac.Store
  import Record, only: [defrecord: 3]

  @doc """
  Record definition for ExampleStore default record.
  """
  Record.defrecord(
    :default,
    __MODULE__,
    key: nil,
    value: nil
  )

  @typedoc """
  ExampleStore default record field type definitions.
  """
  @type default ::
          record(
            :default,
            key: String.t(),
            value: String.t()
          )

  @impl true
  def store_options,
    do: [
      record_name: :default,
      attributes: default() |> default() |> Keyword.keys(),
      disc_copies: [node()]
    ]

  def put(key, val) do
    {:atomic, :ok} = :mnesia.transaction(fn -> :mnesia.write({:default, key, val}) end)
  end

  def get(key, default \\ nil) do
    with {:atomic, res} <-
           :mnesia.transaction(fn -> :mnesia.read({:default, key}) end) do
      case res do
        [{:default, key, val}] ->
          val

        [] ->
          default
      end
    end
  end
end
