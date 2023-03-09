defmodule Amps.Responders do
  @moduledoc """
  Provides the structure of ExampleStore records for a minimal default of Mnesiac.
  """
  use Mnesiac.Store
  import Record, only: [defrecord: 3]

  @doc """
  Record definition for ExampleStore default record.
  """
  Record.defrecord(
    :responder,
    __MODULE__,
    id: nil,
    pid: nil,
    node: nil,
    pending: [],
    responses: []
  )

  @typedoc """
  ExampleStore default record field type definitions.
  """
  @type responder ::
          record(
            :responder,
            id: String.t(),
            pid: pid(),
            node: atom(),
            pending: list(),
            responses: list()
          )

  @impl true
  def store_options,
    do: [
      record_name: :responder,
      attributes: responder() |> responder() |> Keyword.keys(),
      ram_copies: [node()]
    ]

  def put_pending(id, ctxid) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:responder, id}) do
          [] ->
            nil

          [{:responder, id, pid, node, pending, responses}] ->
            pending = [ctxid | pending]
            :mnesia.write({:responder, id, pid, node, pending, responses})
            {:responder, id, pid, node, pending, responses}
        end
      end)

    res
  end

  def delete_pending(id, ctxid) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:responder, id}) do
          [] ->
            nil

          [{:responder, id, pid, node, pending, responses}] ->
            pending = List.delete(pending, ctxid)
            :mnesia.write({:responder, id, pid, node, pending, responses})
            {:responder, id, pid, node, pending, responses}
        end
      end)

    res
  end

  def put_response(id, ctxid, response) do
    {:atomic, res} =
      :mnesia.transaction(fn ->
        case :mnesia.wread({:responder, id}) do
          [] ->
            nil

          [{:responder, id, pid, node, pending, responses}] ->
            responses = responses ++ [response]

            pending = List.delete(pending, ctxid)

            :mnesia.write({:responder, id, pid, node, pending, responses})
            {:responder, id, pid, node, pending, responses}
        end
      end)

    res
  end

  def delete(id) do
    {:atomic, :ok} = :mnesia.transaction(fn -> :mnesia.delete({:responder, id}) end)
  end

  def put(id, pid) do
    {:atomic, :ok} =
      :mnesia.transaction(fn -> :mnesia.write({:responder, id, pid, node(), [], []}) end)
  end

  def get(id) do
    with {:atomic, res} <-
           :mnesia.transaction(fn -> :mnesia.read({:responder, id}) end) do
      case res do
        [{:responder, id, pid, node, pending, responses}] ->
          [rec] = res
          rec

        [] ->
          nil
      end
    end
  end
end
