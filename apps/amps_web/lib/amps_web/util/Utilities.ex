defmodule AmpsWeb.Util do
  alias Amps.DB

  def before_create(collection, body) do
    case collection do
      "users" ->
        Map.put(body, "password", nil)

      # VaultDatabase.vault_store_key(conn.body_params(), collection, "account", "cred")
      "services" ->
        if body["type"] == "subscriber" do
          {stream, consumer} = AmpsUtil.get_names(body)
          AmpsUtil.create_consumer(stream, consumer, body["topic"])
        end

        body

      _ ->
        body
    end
  end

  def after_create(collection, body) do
    case collection do
      "services" ->
        types = SvcManager.service_types()

        if Map.has_key?(types, String.to_atom(body["type"])) do
          Amps.SvcManager.load_service(body["name"])
        end

      "scheduler" ->
        Amps.Scheduler.load(body["name"])

      "actions" ->
        if body["type"] == "batch" do
          create_batch_consumer(body)
        end

        body

      _ ->
        nil
    end
  end

  def after_field_create(collection, id, field, fieldid, body, updated) do
    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.put_env(:amps, String.to_atom(body["field"]), body["value"])

          _ ->
            nil
        end

      "users" ->
        case field do
          "rules" ->
            body = Map.put(body, "_id", fieldid)
            AmpsPortal.Util.agent_rule_creation(updated, body)

          _ ->
            nil
        end

      _ ->
        nil
    end
  end

  def create_batch_consumer(body) do
    if body["inputtype"] == "topic" do
      {stream, consumer} = AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["input"]})

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

      AmpsUtil.create_consumer(stream, consumer, body["input"], opts)
    end
  end

  def delete_batch_consumer(body) do
    if body["inputtype"] == "topic" do
      {stream, consumer} = AmpsUtil.get_names(%{"name" => body["name"], "topic" => body["input"]})

      AmpsUtil.delete_consumer(stream, consumer)
    end
  end
end
