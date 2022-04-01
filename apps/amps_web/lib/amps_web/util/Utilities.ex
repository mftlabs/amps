defmodule AmpsWeb.Util do
  require Logger
  import Argon2
  alias Amps.DB
  alias AmpsWeb.Encryption
  alias Amps.SvcManager
  alias AmpsWeb.Util
  alias AmpsWeb.ServiceController
  alias Elixlsx.Workbook
  alias Elixlsx.Sheet

  def headers(collection \\ nil, field \\ nil) do
    headers = %{
      "actions" => %{
        "headers" => ["name", "desc", "type"],
        "subgrids" => nil,
        "types" => %{
          "batch" => [
            "inputtype",
            "input",
            "policy",
            "start_time",
            "mailbox",
            "from_time",
            "output",
            "format",
            "delimiter"
          ],
          "http" => [
            "url",
            "method",
            "send_output",
            "output",
            "store_headers",
            "format",
            "headers",
            "oauth",
            "oauthurl",
            "oauthuser",
            "oauthpassword"
          ],
          "kafkaput" => ["provider", "topic"],
          "mailbox" => ["recipient", "format"],
          "pgpdecrypt" => ["key", "passphrase", "verify", "signing_key", "format", "output"],
          "pgpencrypt" => [
            "key",
            "compress",
            "armor",
            "signing_key",
            "passphrase",
            "format",
            "output"
          ],
          "router" => ["parse_edi", "rules"],
          "runscript" => ["script_type", "module", "send_output", "output", "format", "parms"],
          "s3" => [
            "provider",
            "operation",
            "bucket",
            "prefix",
            "pattern",
            "regex",
            "ackmode",
            "format",
            "output"
          ],
          "sftpput" => ["host", "port", "folder", "format", "user", "password"],
          "sharepoint" => [
            "provider",
            "operation",
            "host",
            "sitepath",
            "path",
            "regex",
            "pattern",
            "scan",
            "ackmode",
            "output"
          ],
          "strrepl" => ["from", "to", "output"],
          "unzip" => ["maxfiles", "output"],
          "zip" => ["format", "output"]
        }
      },
      "customers" => %{
        "headers" => ["name", "phone", "email", "active"],
        "subgrids" => nil,
        "types" => nil
      },
      "environments" => %{
        "headers" => ["name", "desc", "active"],
        "subgrids" => nil,
        "types" => nil
      },
      "fields" => %{
        "headers" => ["field", "desc"],
        "subgrids" => nil,
        "types" => nil
      },
      "keys" => %{
        "headers" => ["name", "usage", "type", "data"],
        "subgrids" => nil,
        "types" => nil
      },
      "providers" => %{
        "headers" => ["name", "desc", "type"],
        "subgrids" => nil,
        "types" => %{
          "kafka" => [
            "brokers",
            "auth",
            "mechanism",
            "username",
            "password",
            "cacert",
            "cert",
            "key"
          ],
          "s3" => [
            "provider",
            "scheme",
            "host",
            "port",
            "region",
            "key",
            "secret",
            "proxy",
            "proxy_url",
            "proxy_username",
            "proxy_password"
          ],
          "sharepoint" => ["tenant", "client_id", "client_secret"]
        }
      },
      "rules" => %{
        "headers" => ["name", "desc", "output", "patterns"],
        "subgrids" => nil,
        "types" => nil
      },
      "scheduler" => %{
        "headers" => [
          "name",
          "active",
          "type",
          "time",
          "daily",
          "weekdays",
          "value",
          "unit",
          "days",
          "topic",
          "meta"
        ],
        "subgrids" => nil,
        "types" => nil
      },
      "scripts" => %{
        "headers" => ["name", "data"],
        "subgrids" => nil,
        "types" => nil
      },
      "services" => %{
        "headers" => ["name", "desc", "active", "type"],
        "subgrids" => nil,
        "types" => %{
          "httpd" => [
            "port",
            "idle_timeout",
            "request_timeout",
            "max_keepalive",
            "tls",
            "cert",
            "key",
            "communication"
          ],
          "kafka" => ["provider", "topics", "format", "communication"],
          "sftpd" => ["port", "server_key", "communication"],
          "subscriber" => ["subs_count", "handler", "topic"]
        }
      },
      "topics" => %{
        "headers" => ["type", "topic", "desc"],
        "subgrids" => nil,
        "types" => nil
      },
      "users" => %{
        "headers" => [
          "customer",
          "username",
          "firstname",
          "lastname",
          "phone",
          "email",
          "approved",
          "ufa/stime",
          "ufa/debug",
          "ufa/logfile",
          "ufa/hinterval",
          "ufa/cinterval",
          "ufa/max"
        ],
        "subgrids" => %{
          "rules" => %{
            "headers" => ["name", "type", "active"],
            "subgrids" => nil,
            "types" => %{
              "download" => [
                "fpoll",
                "subs_count",
                "updated",
                "topic",
                "policy",
                "start_time",
                "folder",
                "max"
              ],
              "upload" => ["fpoll", "fretry", "regex", "fmatch", "fmeta", "subs_count", "ackmode"]
            }
          },
          "tokens" => %{"headers" => ["name"], "subgrids" => nil, "types" => nil}
        },
        "types" => nil
      }
    }

    if collection do
      if Map.has_key?(headers, collection) do
        if field do
          headers[collection]["subgrids"][field]
        else
          headers[collection]
        end
      else
        nil
      end
    else
      headers
    end
  end

  def order() do
    [
      "customers",
      "fields",
      "keys",
      "topics",
      "providers",
      "users",
      "rules",
      "actions",
      "services",
      "scheduler",
      "users/rules"
    ]
  end

  def before_create(collection, body, env \\ "") do
    case String.replace(collection, env <> "-", "") do
      "users" ->
        Map.put(body, "password", nil)

      # VaultDatabase.vault_store_key(conn.body_params(), collection, "account", "cred")
      "services" ->
        if body["type"] == "subscriber" do
          {stream, consumer} = AmpsUtil.get_names(body, env)
          AmpsUtil.create_consumer(stream, consumer, AmpsUtil.env_topic(body["topic"], env))
        end

        body

      _ ->
        body
    end
  end

  def after_create(collection, body, env \\ "") do
    case base_index(env, collection) do
      "services" ->
        types = SvcManager.service_types()

        topic =
          if env == "" do
            "amps.events.svcs.handler.#{body["name"]}.start"
          else
            "amps.#{env}.events.svcs.handler.#{body["name"]}.start"
          end

        if Map.has_key?(types, String.to_atom(body["type"])) do
          Gnat.pub(:gnat, topic, "")
        end

      "scheduler" ->
        case env do
          "" ->
            Amps.Scheduler.load(body["name"])

          env ->
            Amps.EnvScheduler.load(body["name"], env)
        end

      "actions" ->
        if body["type"] == "batch" do
          create_batch_consumer(body)
        end

        body

      "environments" ->
        Amps.EnvManager.start_env(body["name"])

      _ ->
        nil
    end
  end

  def before_field_create(collection, id, field, body, env) do
    case collection do
      "users" ->
        case field do
          "tokens" ->
            AmpsPortal.Util.before_token_create(body, env)

          _ ->
            body
        end

      _ ->
        body
    end
  end

  def after_field_create(collection, id, field, fieldid, body, updated, env) do
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
            AmpsPortal.Util.agent_rule_creation(updated, body, env)

          "tokens" ->
            AmpsPortal.Util.after_token_create(updated, body, env)

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

  def get_nodes do
    [node() | Node.list()]
  end

  def index(env, collection) do
    if Enum.member?(
         ["config", "demos", "admin", "environments", "system_logs", "ui_audit"],
         collection
       ) do
      collection
    else
      if env == "" do
        collection
      else
        env <> "-" <> collection
      end
    end
  end

  def base_index(env, collection) do
    String.replace(collection, env <> "-", "")
  end

  def get_logo() do
    sysconfig = DB.find_one("config", %{"name" => "SYSTEM"})
    Base.decode64(sysconfig["logo"])
  end
end
