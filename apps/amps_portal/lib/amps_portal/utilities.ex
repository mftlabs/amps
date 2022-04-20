defmodule AmpsPortal.Util do
  alias Amps.DB

  def agent_rule_creation(user, rule, env) do
    index = index(env, "users")

    DB.find_one_and_update(index, %{"_id" => user["_id"]}, %{
      "ufa" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
      }
    })

    if rule["type"] == "download" do
      IO.inspect(rule)
      config = Map.put(rule, "name", user["username"] <> "_" <> rule["name"])
      create_config_consumer(config, env)
      body = Map.put(rule, "updated", false)
      DB.update_in_field(index, body, user["_id"], "rules", rule["_id"])
    end
  end

  def agent_rule_update(id, rule, env \\ "") do
    index = index(env, "users")

    DB.find_one_and_update(index, %{"_id" => id}, %{
      "ufa" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
      }
    })

    if rule["type"] == "download" do
      if rule["updated"] do
        user = DB.find_one(index, %{"_id" => id})

        config = Map.put(rule, "name", user["username"] <> "_" <> rule["name"])

        delete_config_consumer(config, env)
        create_config_consumer(config, env)
        body = Map.put(rule, "updated", false)
        DB.update_in_field(index, body, id, "rules", rule["_id"])
      end
    end
  end

  def agent_rule_deletion(user, rule, env \\ "") do
    DB.find_one_and_update(index(env, "users"), %{"_id" => user["_id"]}, %{
      "ufa" => %{
        "stime" => DateTime.utc_now() |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
      }
    })

    if rule["type"] == "download" do
      rule = Map.put(rule, "name", user["username"] <> "_" <> rule["name"])
      delete_config_consumer(rule, env)
    end
  end

  def create_config_consumer(body, env \\ nil) do
    {stream, consumer} =
      AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["topic"]}, env)

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

    AmpsUtil.create_consumer(stream, consumer, AmpsUtil.env_topic(body["topic"], env), opts)
  end

  def before_token_create(body, env) do
    Map.merge(body, %{"id" => AmpsUtil.get_id()})
  end

  def after_token_create(user, body, env) do
    tokenid = body["id"]
    index = index(env, "tokens")
    data = Jason.encode!(%{"uid" => user["username"]})

    secret = Phoenix.Token.sign(AmpsPortal.Endpoint, "auth", data)

    case DB.find_one(index, %{"username" => user["username"]}) do
      nil ->
        DB.insert(index, %{"username" => user["username"], tokenid => secret})

      secrets ->
        secrets = Map.put(secrets, tokenid, secret)
        DB.update(index, secrets, secrets["_id"])
    end
  end

  def after_token_delete(user, token, env) do
    case DB.find_one(index(env, "tokens"), %{
           "username" => user["username"]
         }) do
      nil ->
        nil

      secrets ->
        secrets = Map.drop(secrets, [token["id"]])
        DB.update(index(env, "tokens"), secrets, secrets["_id"])
    end
  end

  def delete_config_consumer(body, env \\ nil) do
    {stream, consumer} =
      AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["topic"]}, env)

    AmpsUtil.delete_consumer(stream, consumer)
  end

  def create_filter(qp, filter) do
    filters = Jason.decode!(Map.get(qp, "filters", "{}"))

    Map.put(qp, "params", Jason.encode!(%{filters: Map.merge(filters, filter)}))
  end

  def conn_index(conn, index) do
    index(conn.assigns().env, index)
  end

  def index(env, index) do
    if env == "" do
      index
    else
      if Enum.member?(
           ["config", "demos", "admin", "environments", "system_logs", "ui_audit", "providers"],
           index
         ) do
        index
      else
        env <> "-" <> index
      end
    end
  end

  def verify_token(tokenid, token, env) do
    {:ok, parms} = Phoenix.Token.verify(AmpsPortal.Endpoint, "auth", token, max_age: :infinity)
    %{"uid" => username} = Jason.decode!(parms)

    case DB.find_one(index(env, "tokens"), %{"username" => username}) do
      nil ->
        nil

      secrets ->
        if secrets[tokenid] == token do
          case DB.find_one(index(env, "users"), %{"username" => username}) do
            nil ->
              nil

            user ->
              user["username"]
          end
        else
          nil
        end
    end
  end
end
