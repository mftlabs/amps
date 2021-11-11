defmodule AmpsQueue do
  @doc """
    Queue provider
  """

  def enqueue(qname, msg) do
    msg = Map.merge(msg, %{"qtime" => AmpsUtil.gettime(), "qname" => qname, "status" => "Q"})
    Mongo.insert_one(:mongo, "queue", msg)
  end

  def dequeue(qname) do
    case Mongo.find_one_and_update(
           :mongo,
           "queue",
           %{"$and" => [%{"qname" => qname}, %{"status" => "Q"}]},
           %{"$set" => %{"status" => "A"}},
           limit: 1,
           sort: %{"qtime" => 1}
         ) do
      {:ok, nil} ->
        nil

      {:ok, msg} ->
        {:ok, msg}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def commit(msg) do
    id = msg["_id"] || ""

    {:ok, _} = Mongo.delete_one(:mongo, "queue", %{"_id" => id})
  end

  def rollback(msg) do
    id = msg["_id"] || ""

    {:ok, _} = Mongo.update_one(:mongo, "queue", %{"_id" => id}, %{"$set" => %{"status" => "Q"}})
  end

  def enqueueTx(ctx, qname, msg) do
    msg = Map.merge(msg, %{qtime: AmpsUtil.gettime(), qname: qname, status: "Q"})
    list = ctx[:list] || []
    list = [msg | list]
    Map.put(ctx, :list, list)
  end

  def dequeueTx(qname) do
    case Mongo.find_one_and_update(
           :mongo,
           "queue",
           %{"$and" => [%{"qname" => qname}, %{"status" => "Q"}]},
           %{"$set" => %{"status" => "A"}},
           limit: 1,
           sort: %{"qtime" => 1}
         ) do
      {:ok, nil} ->
        nil

      {:ok, msg} ->
        {val, msg} = Map.pop(msg, "_id", "")
        ctx = %{list: [], current: val}
        {:ok, msg, ctx}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def commitTx(ctx) do
    list = ctx[:list] || []

    if length(list) > 0 do
      {:ok, _val} =
        Mongo.Session.with_transaction(
          :mongo,
          fn opts ->
            :ok = commit_insert(ctx[:list], opts)
            id = ctx[:current] || ""

            if id != "" do
              {:ok, _} = Mongo.delete_one(:mongo, "queue", %{"_id" => id}, opts)
            end
          end,
          w: 1
        )

      Map.merge(ctx, %{list: [], current: ""})
    else
      id = ctx[:current] || ""

      if id != "" do
        {:ok, _} = Mongo.delete_one(:mongo, "queue", %{"_id" => id})
      end

      Map.merge(ctx, %{list: [], current: ""})
    end
  end

  def commit_insert([], _opts) do
    :ok
  end

  def commit_insert([head | tail], opts) do
    {:ok, _} = Mongo.insert_one(:mongo, "queue", head, opts)
    commit_insert(tail, opts)
  end

  def rollbackTx(ctx) do
    id = ctx[:current] || ""

    if id != "" do
      {:ok, _} =
        Mongo.update_one(:mongo, "queue", %{"_id" => id}, %{"$set" => %{"status" => "Q"}})

      Map.merge(ctx, %{list: [], current: ""})
    else
      Map.merge(ctx, %{list: [], current: ""})
    end
  end
end
