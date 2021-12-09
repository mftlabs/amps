defmodule AmpsWeb.DB do
  require Logger

  alias AmpsWeb.DB.Postgres
  alias AmpsWeb.DB.MongoDB
  alias AmpsWeb.DB.Elastic

  defp db() do
    Application.get_env(:amps, :db)
  end

  def insert(collection, body) do
    case db() do
      "pg" ->
        Postgres.create(collection, body)

      "mongo" ->
        MongoDB.create(collection, body)

      "es" ->
        Elastic.insert(collection, body)
    end
  end

  def delete(collection, clauses) do
    case db() do
      "pg" ->
        IO.puts("pg")
        Postgres.delete(collection, clauses)

      "mongo" ->
        clauses = convert_id(clauses)
        MongoDB.delete(collection, clauses)

      "es" ->
        Elastic.delete(collection, clauses)
    end
  end

  def delete_one(collection, clauses) do
    case db() do
      "pg" ->
        IO.puts("pg")
        Postgres.delete_one(collection, clauses)

      "mongo" ->
        clauses = convert_id(clauses)

        MongoDB.delete_one(collection, clauses)

      "es" ->
        Elastic.delete_one(collection, clauses)
    end
  end

  def get_rows(conn, %{
        "collection" => collection
      }) do
    case db() do
      "pg" ->
        Postgres.get_rows(conn, %{
          "collection" => collection
        })

      "mongo" ->
        MongoDB.get_rows(conn, %{
          "collection" => collection
        })

      "es" ->
        Elastic.get_rows(conn, %{
          "collection" => collection
        })
    end
  end

  def update(collection, body, id) do
    case db() do
      "pg" ->
        Postgres.update(collection, body, id)

      "mongo" ->
        MongoDB.update(collection, body, id)

      "es" ->
        Elastic.update(collection, body, id)
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

      "es" ->
        Elastic.find_one_and_update(collection, clauses, body)
    end
  end

  def convert_id(clauses) do
    cond do
      Map.has_key?(clauses, "_id") ->
        Map.put(
          clauses,
          "_id",
          AmpsWeb.DataController.objectid(Map.get(clauses, "_id"))
        )

      Map.has_key?(clauses, :_id) ->
        Map.put(
          clauses,
          :_id,
          AmpsWeb.DataController.objectid(Map.get(clauses, :_id))
        )

      true ->
        clauses
    end
  end

  def find(collection, clauses) do
    case db() do
      "pg" ->
        Postgres.find(collection, clauses)

      "mongo" ->
        clauses = convert_id(clauses)

        cursor = Mongo.find(:mongo, collection, clauses)

        cursor
        |> Enum.to_list()

      "es" ->
        Elastic.find(collection, clauses)
    end
  end

  def find_one(collection, clauses) do
    case db() do
      "pg" ->
        Postgres.find_one(collection, clauses)

      "mongo" ->
        clauses = convert_id(clauses)

        Mongo.find_one(:mongo, collection, clauses)

      "es" ->
        Elastic.find_one(collection, clauses)
    end
  end

  def add_to_field(collection, body, id, field) do
    case db() do
      "pg" ->
        Postgres.add_to_field(collection, body, id, field)

      "mongo" ->
        MongoDB.add_to_field(collection, body, id, field)

      "es" ->
        Elastic.add_to_field(collection, body, id, field)
    end
  end

  def get_in_field(collection, id, field, idx) do
    case db() do
      "pg" ->
        Postgres.update_in_field(collection, id, field, idx)

      "mongo" ->
        MongoDB.get_in_field(collection, id, field, idx)

      "es" ->
        Elastic.update_in_field(collection, id, field, idx)
    end
  end

  def update_in_field(collection, body, id, field, idx) do
    case db() do
      "pg" ->
        Postgres.update_in_field(collection, body, id, field, idx)

      "mongo" ->
        MongoDB.update_in_field(collection, body, id, field, idx)

      "es" ->
        Elastic.update_in_field(collection, body, id, field, idx)
    end
  end

  def delete_from_field(collection, body, id, field, idx) do
    case db() do
      "pg" ->
        Postgres.delete_from_field(collection, body, id, field, idx)

      "mongo" ->
        MongoDB.delete_from_field(collection, body, id, field, idx)

      "es" ->
        Elastic.delete_from_field(collection, body, id, field, idx)
    end
  end

  defmodule MongoDB do
    def add_to_field(collection, body, id, field) do
      {:ok, result} =
        Mongo.update_one(
          :mongo,
          collection,
          %{"_id" => AmpsWeb.DataController.objectid(id)},
          %{
            "$push": %{field => body}
          }
        )

      IO.inspect(result)

      Mongo.find_one(
        :mongo,
        collection,
        %{"_id" => AmpsWeb.DataController.objectid(id)},
        projection: %{field => true}
      )
    end

    def get_in_field(collection, id, field, idx) do
      result =
        Mongo.find_one(
          :mongo,
          collection,
          %{"_id" => AmpsWeb.DataController.objectid(id)}
        )

      Enum.at(result[field], String.to_integer(idx))
    end

    def update_in_field(collection, body, id, field, idx) do
      {:ok, _result} =
        Mongo.update_one(
          :mongo,
          collection,
          %{"_id" => AmpsWeb.DataController.objectid(id)},
          %{
            "$set": %{(field <> "." <> idx) => body}
          }
        )

      Mongo.find_one(:mongo, collection, %{"_id" => AmpsWeb.DataController.objectid(id)})
    end

    def delete_from_field(collection, body, id, field, _idx) do
      {:ok, _result} =
        Mongo.update_one(
          :mongo,
          collection,
          %{"_id" => AmpsWeb.DataController.objectid(id)},
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
          IO.inspect(id)
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          id

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

      projection = query["projection"]

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
          %{"_id" => AmpsWeb.DataController.objectid(id)},
          %{"$set": body}
        )

      result.acknowledged
    end
  end

  defmodule Postgres do
    def test do
      IO.puts("test")
    end

    def single_quote(val) do
      "'" <> val <> "'"
    end

    def regex(val) do
      "'%" <> val <> "%'"
    end

    def parse_filters(filters) do
      IO.puts("filters")

      filters =
        Enum.reduce(filters, "", fn {key, values}, acc ->
          IO.puts("filter")
          IO.inspect(key)
          IO.inspect(values)

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

      IO.inspect(filters)
      filters = String.trim(filters, " AND ")
      IO.inspect(filters)
    end

    def parse_sort(collection, sort) do
      IO.inspect(sort)

      sort =
        if sort != nil do
          Enum.reduce(sort, "", fn x, acc ->
            IO.inspect(x)

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

            IO.inspect(item)

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
      IO.inspect(body)

      body =
        if Map.has_key?(body, "_id") do
          Map.drop(body, ["_id"])
        else
          body
        end

      IO.inspect(body)

      Enum.reduce(body, "", fn {key, value}, _acc ->
        key =
          if Kernel.is_atom(key) do
            Atom.to_string(key)
          else
            key
          end

        IO.inspect(value)
        encoded = Jason.encode!(value)

        set =
          "SET data = jsonb_set(data, '{" <>
            key <> "}', '" <> encoded <> "', TRUE)"

        query = "UPDATE " <> collection <> " " <> set <> where(clauses) <> ";"

        case Postgrex.query(:postgres, query, []) do
          {:ok, request} ->
            request

          {:error, error} ->
            IO.inspect(error)
            error
        end
      end)

      {:ok, find_one(collection, clauses)}
    end

    def update(collection, body, id) do
      IO.inspect(body)

      body =
        if Map.has_key?(body, "_id") do
          Map.drop(body, ["_id"])
        else
          body
        end

      IO.inspect(body)

      Enum.reduce(body, "", fn {key, value}, _acc ->
        IO.inspect(value)
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
            IO.inspect(error)
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

      IO.inspect(query)

      {:ok, result} = Postgrex.query(:postgres, query, [])
      IO.inspect(result)
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

      IO.inspect(query)
      {:ok, result} = Postgrex.query(:postgres, query, [])
      IO.inspect(result)
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

      IO.inspect(query)

      {:ok, result} = Postgrex.query(:postgres, query, [])
      IO.inspect(result)
      find_one(collection, %{"_id" => id})
    end

    # Update accounts set data = jsonb_set(data,'{fields}', data->'fields' || '{ "text": "thing" }', TRUE) where data->>'_id' = '6d2a826b-db3a-49ce-af6e-64f80400ffed';
    def where(clauses) do
      IO.inspect(clauses)

      where =
        Enum.reduce(clauses, "", fn {key, value}, acc ->
          key =
            if Kernel.is_atom(key) do
              Atom.to_string(key)
            else
              key
            end

          IO.inspect(value)

          acc <> "data ->> " <> single_quote(key) <> " = " <> single_quote(value) <> " AND "
        end)

      IO.inspect(where)
      where = String.trim(where, " AND ")
      " WHERE " <> where
    end

    def find(collection, clauses) do
      {:ok, _result} = handle_table(collection)

      query =
        "SELECT (data) FROM " <>
          collection <> where(clauses) <> ";"

      {:ok, %Postgrex.Result{num_rows: _count, rows: data}} = Postgrex.query(:postgres, query, [])

      # IO.inspect(data)
      data = Enum.reverse(data)

      Enum.reduce(data, [], fn [row], acc ->
        [row | acc]
      end)
    end

    def find_one(collection, clauses) do
      IO.inspect(clauses)
      {:ok, _result} = handle_table(collection)

      query =
        "SELECT (data) FROM " <>
          collection <> where(clauses) <> " LIMIT 1;"

      IO.inspect(query)
      {:ok, %Postgrex.Result{num_rows: _count, rows: data}} = Postgrex.query(:postgres, query, [])

      IO.inspect(data)
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
        {:ok, request} ->
          IO.inspect(request)
          :ok

        {:error, error} ->
          IO.inspect(error)
          error
      end
    end

    def delete_one(collection, clauses) do
      query = "DELETE FROM " <> collection <> where(clauses) <> ";"

      case Postgrex.query(:postgres, query, []) do
        {:ok, request} ->
          IO.inspect(request)
          :ok

        {:error, error} ->
          IO.inspect(error)
          error
      end
    end

    def insert(collection, body) do
      IO.inspect(collection)
      IO.inspect(body)
      id = UUID.uuid4()
      body = Map.put(body, "_id", id)
      {:ok, _result} = handle_table(collection)
      body = Jason.encode!(body)

      case Postgrex.query(:postgres, "INSERT INTO " <> collection <> " (data)
      VALUES('" <> body <> "') RETURNING data->'_id';", []) do
        {:ok, result} ->
          IO.inspect(result)
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          id

        {:error, error} ->
          IO.inspect(error)
          error
      end
    end

    # defp delete_id(collection, id) do
    #   query = "DELETE FROM " <> collection <> " WHERE data->>'_id' = " <> single_quote(id) <> ";"
    #   IO.inspect(query)

    #   case Postgrex.query(:postgres, query, []) do
    #     {:ok, request} ->
    #       IO.inspect(request)
    #       :ok

    #     {:error, error} ->
    #       IO.inspect(error)
    #       error
    #   end
    # end

    def create(collection, body) do
      IO.inspect(body)
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

      IO.inspect(query)

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
      IO.inspect(sort)
      IO.inspect(filters)
      preparedFilter = parse_filters(filters)
      IO.inspect(preparedFilter)
      # preparedFilter = Filter.convert_sencha_filter(filters)
      # startRow = body["start"]
      # endRow = body["end"]
      # df = body["filterDateFields"]

      IO.inspect(preparedFilter)

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

      IO.inspect(query)

      case Postgrex.query(
             :postgres,
             query,
             []
           ) do
        {:ok, %Postgrex.Result{num_rows: count, rows: data}} ->
          IO.inspect(data)
          data = Enum.reverse(data)

          data =
            Enum.reduce(data, [], fn [row], acc ->
              [row | acc]
            end)

          %{rows: data, success: true, count: count}

        {:error, error} ->
          IO.inspect(error)
          error
      end
    end
  end

  defmodule Elastic do
    def query(collection, query) do
      IO.inspect(query)

      case Snap.Search.search(
             Amps.Elastic,
             path(collection),
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

          IO.inspect(rows)

          %{rows: rows, success: true, count: response.hits.total["value"]}

        {:error, error} ->
          case error do
            %Snap.ResponseError{status: 404} ->
              IO.inspect("404 Index")
              %{rows: [], success: true, count: 0}

            _ ->
              error
          end
      end
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

      filters =
        if query["filters"] != nil do
          Jason.decode!(query["filters"])
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

      query = %{
        query: filters,
        sort: sort,
        from: from,
        size: size
      }

      query(collection, query)
    end

    def find(collection, clauses) do
      %{rows: rows, success: true, count: count} =
        query(collection, %{
          query: convert_search(clauses),
          size: 10000
        })

      rows
    end

    def find_one(collection, clauses) do
      case query(collection, %{
             query: convert_search(clauses),
             size: 1
           }) do
        %{rows: [one], success: true, count: count} ->
          one

        %{rows: [], success: true, count: count} ->
          nil

        nil ->
          nil
      end
    end

    def find_one_and_update(collection, clauses, body) do
      item = find_one(collection, clauses)
      IO.puts(item["_id"])
      {:ok, update(collection, body, item["_id"])}
    end

    def path(collection) do
      pfx = Application.get_env(:amps_web, AmpsWeb.Endpoint)[:elastic_prefix]
      path = pfx <> "-" <> collection
    end

    def format_search(map) do
      if Kernel.is_map(map) do
        Enum.reduce(map, %{}, fn clause, acc ->
          case clause do
            {"$date", date} ->
              date

            {k, v} ->
              k =
                if k == "$regex" || k == "$gt" || k == "$lt" do
                  String.replace(k, "$", "")
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
            if Kernel.is_map(v) do
              case v do
                %{"regex" => val} ->
                  %{
                    wildcard: %{
                      k => %{
                        "value" => "*" <> val <> "*"
                      }
                    }
                  }

                %{"gt" => gt} ->
                  IO.inspect(v)

                  %{
                    range: %{k => v}
                  }

                %{"lt" => lt} ->
                  IO.inspect(v)

                  %{
                    range: %{k => v}
                  }

                _ ->
                  %{
                    match: %{
                      k => v
                    }
                  }

                  IO.inspect(v)
              end
            else
              %{
                match: %{
                  k => v
                }
              }
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
      {:ok,
       %{
         "amf-accounts" => %{
           "mappings" => %{
             "properties" => properties
           }
         }
       }} = Amps.Elastic.get(path(collection))

      IO.inspect(properties)

      Enum.reduce(sort, [], fn %{"direction" => dir, "property" => field}, acc ->
        IO.inspect(field)
        dir = String.downcase(dir)

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
    end

    def insert(collection, body) do
      case Amps.Elastic.post(path(collection) <> "/" <> collection, body, %{
             "refresh" => true
           }) do
        {:ok, response} ->
          response

        {:error, reason} ->
          reason
      end
    end

    def update(collection, body, id) do
      body = Map.drop(body, ["_id"])

      case(
        Amps.Elastic.post(
          path(collection) <> "/_update/" <> id,
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
      IO.inspect(convert_search(clauses))

      case Amps.Elastic.post(
             path(collection) <> "/_delete_by_query",
             %{
               query: convert_search(clauses)
             },
             %{
               refresh: true
             }
           ) do
        {:ok, result} ->
          IO.inspect(result)
          # AmpsWeb.Endpoint.broadcast("notifications", "update", %{page: collection})
          result["deleted"]

        {:error, error} ->
          IO.inspect(error)
          error
      end
    end

    def delete_one(collection, clauses) do
      case Amps.Elastic.post(
             path(collection) <> "/_delete_by_query",
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

    def add_to_field(collection, body, id, field) do
      {:ok, result} =
        Amps.Elastic.post(
          path(collection) <> "/_update_by_query",
          %{
            "script" => %{
              "inline" => "ctx._source.#{field}.add(params.body)",
              "params" => %{"body" => body}
            },
            "query" => convert_search(%{"_id" => id})
          },
          %{
            "refresh" => true
          }
        )

      IO.inspect(result)

      find_one(
        collection,
        %{"_id" => id}
      )
    end

    def update_in_field(collection, body, id, field, idx) do
      {:ok, result} =
        Amps.Elastic.post(
          path(collection) <> "/_update_by_query",
          %{
            "script" => %{
              "inline" => "ctx._source.#{field}.set(#{idx}, params.body)",
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

    def delete_from_field(collection, body, id, field, idx) do
      {:ok, result} =
        Amps.Elastic.post(
          path(collection) <> "/_update_by_query",
          %{
            "script" => %{
              "inline" => "ctx._source.#{field}.remove(#{idx})"
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
