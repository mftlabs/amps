defimpl Jason.Encoder, for: BSON.ObjectId do
  def encode(val, _opts \\ []) do
    BSON.ObjectId.encode!(val)
    |> Jason.encode!()
  end
end

defimpl Poison.Encoder, for: BSON.ObjectId do
  def encode(id, options) do
    BSON.ObjectId.encode!(id) |> Poison.Encoder.encode(options)
  end
end

defmodule Amps.DB do
  require Logger

  alias Amps.DB.Postgres
  alias Amps.DB.MongoDB
  alias Amps.DB.Elastic
  alias Amps.VaultDatabase

  def db() do
    Application.get_env(:amps, :db)
  end

  def id_to_string(id) do
    case db() do
      "mongo" ->
        BSON.ObjectId.encode!(id)

      _ ->
        id
    end
  end

  def get_db() do
    case db() do
      "mongo" ->
        {Mongo,
         [
           name: :mongo,
           database: "amps",
           url: Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:mongo_addr],
           pool_size: 4
         ]}

      "os" ->
        {Amps.Cluster, []}
    end
  end

  def path(collection) do
    if Application.get_env(:amps, :env) == :test do
      "test-" <> collection
    else
      collection
      # if Enum.member?(["config", "demos", "admin"], collection) do
      #   collection
      # else
      #   if Amps.Defaults.get("sandbox") do
      #     "sb-" <> collection
      #   else
      #     collection
      #   end
      # end
    end
  end

  def vault_collection(collection) do
    collection = String.split(collection, "-")

    collection =
      if Enum.count(collection) == 1 do
        Enum.at(collection, 0)
      else
        Enum.at(collection, 1)
      end

    collections = [
      "keys",
      "demos",
      "tokens"
    ]

    Enum.member?(collections, collection)
  end

  def aggregate_field(collection, field) do
    case db() do
      "mongo" ->
        {:ok, vals} = Mongo.distinct(:mongo, collection, field, %{})
        vals

      "os" ->
        Elastic.aggregate_field(collection, field)
    end
  end

  def insert(collection, body) do
    if vault_collection(collection) do
      VaultDatabase.insert(collection, body)
    else
      case db() do
        "pg" ->
          Postgres.create(collection, body)

        "mongo" ->
          MongoDB.create(collection, body)

        "os" ->
          Elastic.insert(collection, body)
      end
    end
  end

  def insert_with_id(collection, body, id) do
    if vault_collection(collection) do
      VaultDatabase.insert_with_id(collection, body, id)
    else
      case db() do
        "pg" ->
          Postgres.create(collection, body)

        "mongo" ->
          case Mongo.replace_one!(:mongo, collection, %{"_id" => MongoDB.objectid(id)}, body,
                 upsert: true
               ) do
            %Mongo.UpdateResult{:acknowledged => _acknowledged} ->
              {:ok, id}
          end

        "os" ->
          Elastic.insert_with_id(collection, body, id)
      end
    end
  end

  def delete(collection, clauses) do
    case db() do
      "pg" ->
        Postgres.delete(collection, clauses)

      "mongo" ->
        clauses = convert_id(clauses)
        MongoDB.delete(collection, clauses)

      "os" ->
        Elastic.delete(collection, clauses)
    end
  end

  def delete_by_id(collection, id) do
    if vault_collection(collection) do
      {:ok, resp} = VaultDatabase.delete(collection, id)
      resp
    else
      case db() do
        "pg" ->
          Postgres.delete_one(collection, %{"_id" => id})

        "mongo" ->
          clauses = convert_id(%{"_id" => id})

          MongoDB.delete_one(collection, clauses)

        "os" ->
          Elastic.delete_one(collection, %{"_id" => id})
      end
    end
  end

  def delete_one(collection, clauses) do
    case db() do
      "pg" ->
        Postgres.delete_one(collection, clauses)

      "mongo" ->
        clauses = convert_id(clauses)

        MongoDB.delete_one(collection, clauses)

      "os" ->
        Elastic.delete_one(collection, clauses)
    end
  end

  def delete_index(collection) do
    case db() do
      "mongo" ->
        MongoDB.delete_index(collection)

      "os" ->
        Elastic.delete_index(collection)
    end
  end

  def get_rows(conn, %{
        "collection" => collection
      }) do
    if vault_collection(collection) do
      query = conn.query_params

      params =
        if query["params"] do
          Jason.decode!(query["params"])
        else
          %{}
        end

      filters =
        if params["filters"] != nil do
          params["filters"]
        else
          %{}
        end

      VaultDatabase.get_rows(collection, filters)
    else
      case db() do
        "pg" ->
          Postgres.get_rows(conn, %{
            "collection" => collection
          })

        "mongo" ->
          MongoDB.get_rows(conn, %{
            "collection" => collection
          })

        "os" ->
          Elastic.get_rows(conn, %{
            "collection" => collection
          })
      end
    end
  end

  def update(collection, body, id) do
    if vault_collection(collection) do
      {:ok, resp} = VaultDatabase.update(collection, body, id)
      resp
    else
      case db() do
        "pg" ->
          Postgres.update(collection, body, id)

        "mongo" ->
          MongoDB.update(collection, body, id)

        "os" ->
          Elastic.update(collection, body, id)
      end
    end
  end

  def find_one_and_update(collection, clauses, body) do
    case db() do
      "pg" ->
        Postgres.find_one_and_update(collection, clauses, body)

      "mongo" ->
        Mongo.find_one_and_update(:mongo, collection, convert_id(clauses), %{
          "$set": body
        })

      "os" ->
        Elastic.find_one_and_update(collection, clauses, body)
    end
  end

  def convert_id(clauses) do
    cond do
      Map.has_key?(clauses, "_id") ->
        if is_binary(clauses["_id"]) do
          Map.put(
            clauses,
            "_id",
            MongoDB.objectid(Map.get(clauses, "_id"))
          )
        else
          clauses
        end

      Map.has_key?(clauses, :_id) ->
        if is_binary(clauses[:_id]) do
          Map.put(
            clauses,
            :_id,
            MongoDB.objectid(Map.get(clauses, :_id))
          )
        else
          clauses
        end

      true ->
        clauses
    end
  end

  def find(collection, clauses \\ %{}, opts \\ %{}) do
    if vault_collection(collection) do
      VaultDatabase.find(collection, clauses)
    else
      case db() do
        "pg" ->
          Postgres.find(collection, clauses)

        "mongo" ->
          clauses = convert_id(clauses)
          clauses = Filter.parse(clauses)
          cursor = Mongo.find(:mongo, collection, clauses, Enum.into(opts, []))

          cursor
          |> Enum.to_list()

        "os" ->
          Elastic.find(collection, clauses, opts)
      end
    end
  end

  def find_by_id(collection, id, opts \\ []) do
    if vault_collection(collection) do
      {:ok, data} = VaultDatabase.read(collection, id)
      data
    else
      case db() do
        "pg" ->
          Postgres.find_one(collection, %{"_id" => id})

        "mongo" ->
          clauses = convert_id(%{"_id" => id})

          Mongo.find_one(:mongo, collection, clauses, opts)

        "os" ->
          Elastic.find_by_id(collection, id, Enum.into(opts, %{}))
      end
    end
  end

  def find_one(collection, clauses, opts \\ []) do
    if vault_collection(collection) do
      {:ok, data} = VaultDatabase.find_one(collection, clauses)
      data
    else
      case db() do
        "pg" ->
          Postgres.find_one(collection, clauses)

        "mongo" ->
          clauses = convert_id(clauses)

          Mongo.find_one(:mongo, collection, clauses, opts)

        "os" ->
          Elastic.find_one(collection, clauses, Enum.into(opts, %{}))
      end
    end
  end

  def add_to_field(collection, body, id, field) do
    fieldid = AmpsUtil.get_id()
    body = Map.put(body, "_id", fieldid)

    case db() do
      "pg" ->
        Postgres.add_to_field(collection, body, id, field)

      "mongo" ->
        MongoDB.add_to_field(collection, body, id, field)

      "os" ->
        Elastic.add_to_field(collection, body, id, field)
    end

    fieldid
  end

  def add_to_field_with_id(collection, body, id, field, fieldid) do
    body = Map.put(body, "_id", fieldid)

    case db() do
      "pg" ->
        Postgres.add_to_field(collection, body, id, field)

      "mongo" ->
        MongoDB.add_to_field(collection, body, id, field)

      "os" ->
        Elastic.add_to_field(collection, body, id, field)
    end

    fieldid
  end

  def get_in_field(collection, id, field, idx) do
    case db() do
      "pg" ->
        Postgres.get_in_field(collection, id, field, idx)

      "mongo" ->
        MongoDB.get_in_field(collection, id, field, idx)

      "os" ->
        Elastic.get_in_field(collection, id, field, idx)
    end
  end

  def update_in_field(collection, body, id, field, idx) do
    case db() do
      "pg" ->
        Postgres.update_in_field(collection, body, id, field, idx)

      "mongo" ->
        MongoDB.update_in_field(collection, body, id, field, idx)

      "os" ->
        Elastic.update_in_field(collection, body, id, field, idx)
    end
  end

  def delete_from_field(collection, body, id, field, idx) do
    case db() do
      "pg" ->
        Postgres.delete_from_field(collection, body, id, field, idx)

      "mongo" ->
        MongoDB.delete_from_field(collection, body, id, field, idx)

      "os" ->
        Elastic.delete_from_field(collection, body, id, field, idx)
    end
  end

  def bulk_insert(doc) do
    case db() do
      "mongo" ->
        Mongo.BulkOps.get_insert_one(doc)

      "os" ->
        %Snap.Bulk.Action.Create{
          doc: doc
        }
    end
  end

  def bulk_perform(ops, index) do
    case db() do
      "mongo" ->
        res =
          Mongo.UnorderedBulk.write(ops, :mongo, index, 100_000)
          |> Stream.run()

      "os" ->
        Snap.Bulk.perform(ops, Amps.Cluster, index, [])
    end
  end

  defmodule MongoDB do
    def objectid(id) do
      if is_binary(id) do
        BSON.ObjectId.decode!(id)
      else
        id
      end
    end

    def add_to_field(collection, body, id, field) do
      {:ok, _result} =
        Mongo.update_one(
          :mongo,
          collection,
          %{"_id" => objectid(id)},
          %{
            "$push": %{field => body}
          }
        )

      Mongo.find_one(
        :mongo,
        collection,
        %{"_id" => objectid(id)},
        projection: %{field => true}
      )
    end

    def get_in_field(collection, id, field, fieldid) do
      result =
        Mongo.find_one(
          :mongo,
          collection,
          %{"_id" => objectid(id)}
        )

      Enum.find(result[field], fn obj ->
        obj["_id"] == fieldid
      end)
    end

    def update_in_field(collection, body, id, field, idx) do
      {:ok, _result} =
        Mongo.update_one(
          :mongo,
          collection,
          %{"_id" => objectid(id)},
          %{
            "$set": %{(field <> "." <> idx) => body}
          }
        )

      Mongo.find_one(:mongo, collection, %{"_id" => objectid(id)})
    end

    def delete_from_field(collection, body, id, field, _idx) do
      {:ok, _result} =
        Mongo.update_one(
          :mongo,
          collection,
          %{"_id" => objectid(id)},
          %{
            "$pull": %{field => body}
          }
        )

      Mongo.find_one(:mongo, collection, %{"_id" => id})
    end

    def create(collection, body) do
      case Mongo.insert_one(:mongo, collection, body) do
        {:ok, result} ->
          %Mongo.InsertOneResult{:acknowledged => _acknowledged, :inserted_id => id} = result
          {:ok, id}

        {:error, error} ->
          error
      end
    end

    def delete(collection, clauses) do
      case Mongo.delete_one(:mongo, collection, clauses) do
        {:ok, result} ->
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          result.acknowledged

        {:error, error} ->
          error
      end
    end

    def delete_one(collection, clauses) do
      case Mongo.delete_one(:mongo, collection, clauses) do
        {:ok, result} ->
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          result.acknowledged

        {:error, error} ->
          error
      end
    end

    def get_rows(conn, %{"collection" => collection}) do
      query = conn.query_params()

      limit =
        if query["limit"] != nil do
          query["limit"]
        else
          "0"
        end

      startRow =
        if query["start"] != nil do
          query["start"]
        else
          "0"
        end

      sort =
        if query["sort"] != nil do
          Jason.decode!(query["sort"])
        else
          %{}
        end

      params =
        if query["params"] do
          Jason.decode!(query["params"])
        else
          %{}
        end

      filters =
        if params["filters"] != nil do
          params["filters"]
        else
          %{}
        end

      fields =
        if params["fields"] do
          params["fields"]
        else
          nil
        end

      projection =
        if fields do
          Enum.reduce(fields, %{}, fn field, proj ->
            Map.put(proj, field, 1)
          end)
        end

      preparedFilter = Filter.parse(filters)

      preparedSort =
        if sort != nil do
          Enum.reduce(sort, %{}, fn x, acc ->
            dir =
              if x["direction"] == "ASC" do
                1
              else
                -1
              end

            Map.put(acc, x["property"], dir)
          end)
        else
          %{}
        end

      cursor =
        Mongo.find(:mongo, collection, preparedFilter,
          sort: preparedSort,
          limit: Integer.parse(limit) |> elem(0),
          skip: Integer.parse(startRow) |> elem(0),
          projection:
            if projection do
              %{projection => 1}
            else
              nil
            end
        )

      data =
        cursor
        |> Enum.to_list()

      count = Mongo.count_documents!(:mongo, collection, preparedFilter)

      %{rows: data, success: true, count: count}
    end

    def update(collection, body, id) do
      body = Map.drop(body, ["_id"])

      {:ok, result} =
        Mongo.update_one(
          :mongo,
          collection,
          %{"_id" => objectid(id)},
          %{"$set": body}
        )

      result.acknowledged
    end

    def delete_index(collection) do
      Mongo.show_collections(:mongo)
      |> Enum.each(fn collection ->
        if Regex.match?(Regex.compile!(collection), collection) do
          Mongo.drop_collection(collection)
        end
      end)
    end
  end

  defmodule Postgres do
    def test do
    end

    def single_quote(val) do
      "'" <> val <> "'"
    end

    def regex(val) do
      "'%" <> val <> "%'"
    end

    def parse_filters(filters) do
      filters =
        Enum.reduce(filters, "", fn {key, values}, acc ->
          curr =
            if Kernel.is_map(values) do
              Enum.reduce(values, "", fn {op, val}, acc2 ->
                acc2 <>
                  case op do
                    "$gt" ->
                      "cast(" <>
                        "data ->> " <>
                        single_quote(key) <>
                        " as integer) > " <> Integer.to_string(val)

                    "$lt" ->
                      "cast(" <>
                        "data ->> " <>
                        single_quote(key) <>
                        " as integer) < " <> Integer.to_string(val)

                    "$regex" ->
                      "data ->> " <>
                        single_quote(key) <>
                        " LIKE " <> regex(val)
                  end <>
                  " AND "
              end)
            else
              "data ->> " <>
                single_quote(key) <> " = " <> single_quote(values) <> " AND "
            end

          acc <> curr
        end)

      _filters = String.trim(filters, " AND ")
    end

    def parse_sort(collection, sort) do
      sort =
        if sort != nil do
          Enum.reduce(sort, "", fn x, acc ->
            {:ok, %Postgrex.Result{rows: data}} =
              Postgrex.query(
                :postgres,
                "SELECT data ->> '" <> x["property"] <> "' FROM " <> collection <> " LIMIT 1;",
                []
              )

            item =
              case data do
                [[item]] ->
                  item

                [] ->
                  nil
              end

            if item != nil do
              if Kernel.is_integer(item) do
                acc <>
                  "cast(data ->>" <>
                  single_quote(x["property"]) <> "as integer) " <> x["direction"] <> ","
              else
                acc <>
                  "data ->>" <>
                  single_quote(x["property"]) <> " " <> x["direction"] <> ","
              end
            end
          end)
        else
          %{}
        end

      String.trim(sort, ",")
    end

    def handle_table(collection) do
      Postgrex.query(:postgres, "CREATE TABLE IF NOT EXISTS " <> collection <> " (
        id serial NOT NULL PRIMARY KEY,
        data jsonb NOT NULL
        );", [])
    end

    def find_one_and_update(collection, clauses, body) do
      body =
        if Map.has_key?(body, "_id") do
          Map.drop(body, ["_id"])
        else
          body
        end

      Enum.reduce(body, "", fn {key, value}, _acc ->
        key =
          if Kernel.is_atom(key) do
            Atom.to_string(key)
          else
            key
          end

        encoded = Jason.encode!(value)

        set =
          "SET data = jsonb_set(data, '{" <>
            key <> "}', '" <> encoded <> "', TRUE)"

        query = "UPDATE " <> collection <> " " <> set <> where(clauses) <> ";"

        case Postgrex.query(:postgres, query, []) do
          {:ok, request} ->
            request

          {:error, error} ->
            error
        end
      end)

      {:ok, find_one(collection, clauses)}
    end

    def update(collection, body, id) do
      body =
        if Map.has_key?(body, "_id") do
          Map.drop(body, ["_id"])
        else
          body
        end

      Enum.reduce(body, "", fn {key, value}, _acc ->
        encoded = Jason.encode!(value)

        set =
          "SET data = jsonb_set(data, '{" <>
            key <> "}', '" <> encoded <> "', TRUE)"

        query =
          "UPDATE " <> collection <> " " <> set <> " WHERE data->>'_id' = " <> single_quote(id)

        case Postgrex.query(:postgres, query, []) do
          {:ok, request} ->
            request

          {:error, error} ->
            error
        end
      end)

      :ok
    end

    def add_to_field(collection, body, id, field) do
      query =
        "UPDATE " <>
          collection <>
          " SET data = jsonb_set(data, '{" <>
          field <>
          "}', data ->" <>
          single_quote(field) <>
          " || " <>
          single_quote(Jason.encode!(body)) <>
          ", TRUE)" <>
          " WHERE data->>'_id' = " <> single_quote(id) <> ";"

      {:ok, _result} = Postgrex.query(:postgres, query, [])
      find_one(collection, %{"_id" => id})
    end

    def update_in_field(collection, body, id, field, idx) do
      query =
        "UPDATE " <>
          collection <>
          " SET data = jsonb_set(data, '{" <>
          field <>
          "," <>
          idx <>
          "}'," <>
          single_quote(Jason.encode!(body)) <>
          ", TRUE)" <>
          " WHERE data->>'_id' = " <> single_quote(id) <> ";"

      {:ok, _result} = Postgrex.query(:postgres, query, [])
      find_one(collection, %{"_id" => id})
    end

    def delete_from_field(collection, _body, id, field, idx) do
      query =
        "UPDATE " <>
          collection <>
          " SET data = data #- '{" <>
          field <>
          "," <>
          idx <>
          "}'" <>
          " WHERE data->>'_id' = " <> single_quote(id) <> ";"

      {:ok, _result} = Postgrex.query(:postgres, query, [])
      find_one(collection, %{"_id" => id})
    end

    # Update accounts set data = jsonb_set(data,'{fields}', data->'fields' || '{ "text": "thing" }', TRUE) where data->>'_id' = '6d2a826b-db3a-49ce-af6e-64f80400ffed';
    def where(clauses) do
      where =
        Enum.reduce(clauses, "", fn {key, value}, acc ->
          key =
            if Kernel.is_atom(key) do
              Atom.to_string(key)
            else
              key
            end

          acc <> "data ->> " <> single_quote(key) <> " = " <> single_quote(value) <> " AND "
        end)

      where = String.trim(where, " AND ")
      " WHERE " <> where
    end

    def find(collection, clauses) do
      {:ok, _result} = handle_table(collection)

      query =
        "SELECT (data) FROM " <>
          collection <> where(clauses) <> ";"

      {:ok, %Postgrex.Result{num_rows: _count, rows: data}} = Postgrex.query(:postgres, query, [])

      data = Enum.reverse(data)

      Enum.reduce(data, [], fn [row], acc ->
        [row | acc]
      end)
    end

    def find_one(collection, clauses) do
      {:ok, _result} = handle_table(collection)

      query =
        "SELECT (data) FROM " <>
          collection <> where(clauses) <> " LIMIT 1;"

      {:ok, %Postgrex.Result{num_rows: _count, rows: data}} = Postgrex.query(:postgres, query, [])

      data = Enum.reverse(data)

      data =
        Enum.reduce(data, [], fn [row], acc ->
          [row | acc]
        end)

      Enum.at(data, 0)
    end

    def delete(collection, clauses) do
      query = "DELETE FROM " <> collection <> where(clauses) <> ";"

      case Postgrex.query(:postgres, query, []) do
        {:ok, _request} ->
          :ok

        {:error, error} ->
          error
      end
    end

    def delete_one(collection, clauses) do
      query = "DELETE FROM " <> collection <> where(clauses) <> ";"

      case Postgrex.query(:postgres, query, []) do
        {:ok, _request} ->
          :ok

        {:error, error} ->
          error
      end
    end

    def insert(collection, body) do
      id = UUID.uuid4()
      body = Map.put(body, "_id", id)
      {:ok, _result} = handle_table(collection)
      body = Jason.encode!(body)

      case Postgrex.query(:postgres, "INSERT INTO " <> collection <> " (data)
      VALUES('" <> body <> "') RETURNING data->'_id';", []) do
        {:ok, _result} ->
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          id

        {:error, error} ->
          error
      end
    end

    # defp delete_id(collection, id) do
    #   query = "DELETE FROM " <> collection <> " WHERE data->>'_id' = " <> single_quote(id) <> ";"

    #   case Postgrex.query(:postgres, query, []) do
    #     {:ok, request} ->
    #       :ok

    #     {:error, error} ->
    #       error
    #   end
    # end

    def create(collection, body) do
      {:ok, _result} = handle_table(collection)
      insert(collection, body)
    end

    def get_rows(conn, %{
          "collection" => collection
        }) do
      query = conn.query_params()
      {:ok, _result} = handle_table(collection)

      limit =
        if query["limit"] != nil do
          query["limit"]
          " LIMIT " <> query["limit"] <> " "
        else
          ""
        end

      offset =
        if query["start"] != nil do
          query["start"]
          " OFFSET " <> query["start"] <> " "
        else
          ""
        end

      # projection = query["projection"]

      filters =
        if query["filters"] != nil do
          Jason.decode!(query["filters"])
        else
          %{}
        end

      sort =
        if query["sort"] != nil do
          Jason.decode!(query["sort"])
        else
          %{}
        end

      sort = parse_sort(collection, sort)

      preparedFilter = parse_filters(filters)
      # preparedFilter = Filter.convert_sencha_filter(filters)
      # startRow = body["start"]
      # endRow = body["end"]
      # df = body["filterDateFields"]

      preparedFilter =
        if preparedFilter != "" do
          " WHERE " <> preparedFilter
        else
          preparedFilter
        end

      preparedSort =
        if sort != "" do
          " ORDER BY " <> sort
        else
          " ORDER BY id "
        end

      query =
        "SELECT (data) FROM " <>
          collection <>
          preparedFilter <>
          preparedSort <>
          limit <>
          offset <>
          ";"

      case Postgrex.query(
             :postgres,
             query,
             []
           ) do
        {:ok, %Postgrex.Result{num_rows: count, rows: data}} ->
          data = Enum.reverse(data)

          data =
            Enum.reduce(data, [], fn [row], acc ->
              [row | acc]
            end)

          %{rows: data, success: true, count: count}

        {:error, error} ->
          error
      end
    end
  end

  defmodule Elastic do
    def query(collection, query) do
      case Snap.Search.search(
             Amps.Cluster,
             Amps.DB.path(collection),
             query
           ) do
        {:ok, response} ->
          %Snap.SearchResponse{aggregations: nil, hits: hits} = response

          rows =
            Enum.reduce(hits, [], fn val, acc ->
              item = %{} |> Map.put("_id", val.id) |> Map.merge(val.source)

              [item | acc]
            end)
            |> Enum.reverse()

          %{rows: rows, success: true, count: response.hits.total["value"]}

        {:error, error} ->
          case error do
            %Snap.ResponseError{status: 404} ->
              %{rows: [], success: true, count: 0}

            _ ->
              {:error, error}
          end
      end
    end

    def delete_index(collection) do
      Amps.Cluster.delete(Amps.DB.path(collection))
    end

    def get_rows(conn, %{
          "collection" => collection
        }) do
      query = conn.query_params()

      size =
        if query["limit"] != nil do
          query["limit"]
        else
          10000
        end

      from =
        if query["start"] != nil do
          query["start"]
        else
          0
        end

      # projection = query["projection"]

      params =
        if query["params"] do
          Jason.decode!(query["params"])
        else
          %{}
        end

      filters =
        if params["filters"] != nil do
          params["filters"]
        else
          %{}
        end

      filters = convert_search(filters)

      sort =
        if query["sort"] != nil do
          convert_sort(collection, Jason.decode!(query["sort"]))
        else
          []
        end

      fields =
        if params["fields"] do
          params["fields"]
        else
          nil
        end

      IO.inspect(fields)

      query =
        if fields do
          %{
            query: filters,
            sort: sort,
            from: from,
            size: size,
            _source: %{"includes" => fields}
            # track_total_hits: true
          }
        else
          %{
            query: filters,
            sort: sort,
            from: from,
            size: size
            # track_total_hits: true
          }
        end

      case query(collection, query) do
        {:error, error} ->
          Logger.error(error)
          {:error, error}

        res ->
          res
      end
    end

    def find(collection, clauses, opts \\ %{}) do
      %{rows: rows, success: _success, count: _count} =
        query(
          collection,
          Map.merge(
            %{
              query: convert_search(clauses),
              size: 10000
            },
            opts
          )
        )

      rows
    end

    def find_by_id(collection, id, opts \\ %{}) do
      case Amps.Cluster.get(Path.join([Amps.DB.path(collection), "_doc", id])) do
        {:ok, resp} ->
          if resp["found"] do
            Map.put(resp["_source"], "_id", id)
          else
            nil
          end

        {:error, error} ->
          Logger.error(error)
          nil
      end
    end

    def find_one(collection, clauses, opts \\ %{}) do
      case query(
             Amps.DB.path(collection),
             Map.merge(
               %{
                 query: convert_search(clauses),
                 size: 1
               },
               opts
             )
           ) do
        %{rows: [one], success: true, count: _} ->
          one

        %{rows: [], success: true, count: 0} ->
          nil

        nil ->
          nil

        {:error, error} ->
          Logger.error(error)
          nil
      end
    end

    def find_one_and_update(collection, clauses, body) do
      item = find_one(collection, clauses)
      {:ok, update(collection, body, item["_id"])}
    end

    def format_search(map) do
      if Kernel.is_map(map) do
        Enum.reduce(map, %{}, fn clause, acc ->
          case clause do
            {"$date", date} ->
              date

            {k, v} ->
              k =
                if is_binary(k) do
                  if String.starts_with?(k, "$") do
                    String.replace(k, "$", "")
                  else
                    k
                  end
                else
                  k
                end

              Map.put(acc, k, format_search(v))
          end
        end)
      else
        map
      end
    end

    def convert_search(search) do
      search =
        search
        |> format_search()
        |> Enum.reduce([], fn {k, v}, acc ->
          filter =
            case k do
              "exists" ->
                %{k => v}

              "bool" ->
                %{k => v}

              _ ->
                if Kernel.is_map(v) do
                  case v do
                    %{"exists" => val} ->
                      m =
                        if val do
                          "must"
                        else
                          "must_not"
                        end

                      %{
                        "bool" => %{
                          m => %{
                            "exists" => %{
                              "field" => k
                            }
                          }
                        }
                      }

                    %{"regex" => val} ->
                      %{
                        "query_string" => %{
                          "query" => "*" <> val <> "*",
                          "fields" => [
                            k <> ".keyword"
                          ]
                        }
                      }

                    %{"ne" => val} ->
                      %{
                        "bool" => %{
                          "must_not" => [
                            %{
                              "match" => %{
                                k => val
                              }
                            }
                          ]
                        }
                      }

                    %{"in" => val} ->
                      %{
                        "terms" => %{
                          (k <> ".keyword") => val
                        }
                      }

                    %{"gt" => _gt} ->
                      %{
                        range: %{k => v}
                      }

                    %{"lt" => _lt} ->
                      %{
                        range: %{k => v}
                      }

                    _ ->
                      %{
                        match: %{
                          k => v
                        }
                      }
                  end
                else
                  if is_list(v) do
                    %{
                      terms: %{
                        k => v
                      }
                    }
                  else
                    %{
                      match: %{
                        k => v
                      }
                    }
                  end
                end
            end

          [filter | acc]
        end)

      %{
        bool: %{
          must: search
        }
      }
    end

    def convert_sort(collection, sort) do
      case Amps.Cluster.get(Amps.DB.path(collection)) do
        {:error, _e} ->
          []

        {:ok,
         %{
           ^collection => %{
             "mappings" => %{
               "properties" => properties
             }
           }
         }} ->
          Enum.reduce(sort, [], fn %{"direction" => dir, "property" => field}, acc ->
            dir =
              cond do
                is_binary(dir) ->
                  String.downcase(dir)

                is_integer(dir) ->
                  case dir do
                    1 -> "asc"
                    -1 -> "desc"
                    _ -> nil
                  end
              end

            sortfield =
              case properties[field]["type"] do
                "date" ->
                  %{field => dir}

                "text" ->
                  %{
                    (field <> ".keyword") => dir
                  }
              end

            [sortfield | acc]
          end)

        {:ok,
         %{
           ^collection => %{
             "mappings" => %{}
           }
         }} ->
          []
      end
    end

    def insert(collection, body) do
      case Amps.Cluster.post(Amps.DB.path(collection) <> "/_doc", body, %{
             "refresh" => true
           }) do
        {:ok, response} ->
          {:ok, response["_id"]}

        {:error, reason} ->
          {:error, reason}
      end
    end

    def insert_with_id(collection, body, id) do
      case Amps.Cluster.put(Amps.DB.path(collection) <> "/_doc/" <> id, body, %{
             "refresh" => true
           }) do
        {:ok, response} ->
          {:ok, response["_id"]}

        {:error, reason} ->
          {:error, reason}
      end
    end

    def update(collection, body, id) do
      body = Map.drop(body, ["_id"])

      case(
        Amps.Cluster.post(
          Amps.DB.path(collection) <> "/_update/" <> id,
          %{
            "doc" => body
          },
          %{
            "refresh" => true
          }
        )
      ) do
        {:ok, response} ->
          response

        {:error, reason} ->
          reason
      end
    end

    def delete(collection, clauses) do
      case Amps.Cluster.post(
             Amps.DB.path(collection) <> "/_delete_by_query",
             %{
               query: convert_search(clauses)
             },
             %{
               refresh: true
             }
           ) do
        {:ok, result} ->
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          result["deleted"]

        {:error, error} ->
          error
      end
    end

    def delete_one(collection, clauses) do
      case Amps.Cluster.post(
             Amps.DB.path(collection) <> "/_delete_by_query",
             %{
               query: convert_search(clauses)
             },
             %{
               max_docs: 1,
               refresh: true
             }
           ) do
        {:ok, result} ->
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          result["deleted"]

        {:error, error} ->
          error
      end
    end

    def aggregate_field(collection, field, size \\ 10000) do
      {:ok, result} =
        Amps.Cluster.post(
          Path.join(Amps.DB.path(collection), "/_search"),
          %{
            "aggs" => %{
              field => %{
                "terms" => %{"field" => field <> ".keyword", "size" => size}
              }
            },
            "size" => 0
          }
        )

      Enum.reduce(result["aggregations"][field]["buckets"], [], fn bucket, acc ->
        [bucket["key"] | acc]
      end)
    end

    def add_to_field(collection, body, id, field) do
      res =
        Amps.Cluster.post(
          Amps.DB.path(collection) <> "/_update_by_query",
          %{
            "script" => %{
              "inline" =>
                "if (ctx._source.containsKey(\"#{field}\")) {ctx._source.#{field}.add(params.body);} else {ctx._source.#{field} = [params.body];}",
              "params" => %{"body" => body}
            },
            "query" => convert_search(%{"_id" => id})
          },
          %{
            "refresh" => true
          }
        )

      case res do
        {:ok, _resp} ->
          find_one(
            collection,
            %{"_id" => id}
          )

        {:error, error} ->
          IO.inspect(error)
          Logger.error(error)
      end
    end

    def get_in_field(collection, id, field, fieldid) do
      item =
        find_one(
          collection,
          %{"_id" => id},
          %{"fields" => [field]}
        )

      Enum.find_value(item[field], fn obj ->
        if obj["_id"] == fieldid do
          obj
        end
      end)

      # Enum.at(item[field], String.to_integer(idx))
    end

    @spec update_in_field(any, any, any, any, any) :: any
    def update_in_field(collection, body, id, field, fieldid) do
      {:ok, _result} =
        Amps.Cluster.post(
          Amps.DB.path(collection) <> "/_update_by_query",
          %{
            "script" => %{
              "inline" => "
              for (obj in ctx._source.#{field}) {
                if (obj._id.equals(\"#{fieldid}\")) {
                  ctx._source.#{field}.set(ctx._source.#{field}.indexOf(obj), params.body);
                  break;
                }
              }



              ",
              "params" => %{"body" => body}
            },
            "query" => convert_search(%{"_id" => id})
          },
          %{
            "refresh" => true
          }
        )

      find_one(collection, %{"_id" => id})
    end

    def delete_from_field(collection, _body, id, field, fieldid) do
      {:ok, _result} =
        Amps.Cluster.post(
          Amps.DB.path(collection) <> "/_update_by_query",
          %{
            "script" => %{
              "inline" => "
              for (obj in ctx._source.#{field}) {
                if (obj._id.equals(\"#{fieldid}\")) {
                  ctx._source.#{field}.remove(ctx._source.#{field}.indexOf(obj));
                  break;
                }
              }
              "
            },
            "query" => convert_search(%{"_id" => id})
          },
          %{
            "refresh" => true
          }
        )

      find_one(
        collection,
        %{"_id" => id}
      )
    end
  end
end
