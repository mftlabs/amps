defmodule AmpsPortal.Util do
  alias Amps.DB

  def agent_rule_creation(user, rule) do
    DB.find_one_and_update("users", %{"_id" => user["_id"]}, %{
      "ufa" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
      }
    })

    if rule["type"] == "download" do
      IO.inspect(rule)
      config = Map.put(rule, "name", user["username"] <> "_" <> rule["name"])
      create_config_consumer(config)
      body = Map.put(rule, "updated", false)
      DB.update_in_field("users", body, user["_id"], "rules", rule["_id"])
    end
  end

  def agent_rule_update(id, rule) do
    DB.find_one_and_update("users", %{"_id" => id}, %{
      "ufa" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
      }
    })

    if rule["type"] == "download" do
      if rule["updated"] do
        user = DB.find_one("users", %{"_id" => id})

        config = Map.put(rule, "name", user["username"] <> "_" <> rule["name"])
        delete_config_consumer(config)
        create_config_consumer(config)
        body = Map.put(rule, "updated", false)
        DB.update_in_field("users", body, id, "rules", rule["_id"])
      end
    end
  end

  def agent_rule_deletion(user, rule) do
    DB.find_one_and_update("users", %{"_id" => user["_id"]}, %{
      "ufa" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
      }
    })

    if rule["type"] == "download" do
      rule = Map.put(rule, "name", user["username"] <> "_" <> rule["name"])
      delete_config_consumer(rule)
    end
  end

  def create_config_consumer(body) do
    {stream, consumer} = AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["topic"]})

    opts =
      if body["policy"] == "by_start_time" do
        %{
          deliver_policy: String.to_atom(body["policy"]),
          opt_start_time: body["start_time"]
        }
      else
        %{
          deliver_policy: String.to_atom(body["policy"])
        }
      end

    AmpsUtil.create_consumer(stream, consumer, body["topic"], opts)
  end

  def delete_config_consumer(body) do
    {stream, consumer} = AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["topic"]})
    AmpsUtil.delete_consumer(stream, consumer)
  end

  def create_filter(qp, filter) do
    params = Jason.decode!(Map.get(qp, "params", "{}"))
    filters = Map.get(params, "filters", %{})

    params = Map.put(params, "filters", Map.merge(filters, filter))
    Map.put(qp, "params", Jason.encode!(params))
  end
end
