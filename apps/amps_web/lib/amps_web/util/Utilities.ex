defmodule AmpsWeb.Util do
  require Logger
  #import Argon2
  #alias Amps.DB
  #alias AmpsWeb.Encryption
  alias Amps.SvcManager
  alias AmpsWeb.Util
  alias AmpsWeb.ServiceController
  alias Elixlsx.Workbook
  alias Elixlsx.Sheet
  @numbers '0123456789'
  @letters 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ'
  @symbols '$@!@#$%&*'

  def create_password do
    numbers = Enum.shuffle(@numbers) |> Enum.take(2)
    symbols = Enum.shuffle(@symbols) |> Enum.take(2)
    letters = Enum.shuffle(@letters) |> Enum.take(16)

    (numbers ++ symbols ++ letters) |> Enum.shuffle() |> List.to_string()
  end

  def create_password_hash do
    password = create_password()
    %{password_hash: hashed} = add_hash(password)
    {password, hashed}
  end

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
            "headers"
          ],
          "kafkaput" => ["provider", "topic"],
          "mailbox" => ["recipient", "mailbox", "format"],
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
          "runscript" => [
            "script_type",
            "module",
            "send_output",
            "output",
            "format",
            "use_provider",
            "provider",
            "parms"
          ],
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
      "endpoints" => %{
        "headers" => ["name", "desc", "method", "path", "action"],
        "subgrids" => nil,
        "types" => nil
      },
      "environments" => %{
        "headers" => ["name", "desc", "active", "archive"],
        "subgrids" => nil,
        "types" => nil
      },
      "fields" => %{
        "headers" => ["field", "desc"],
        "subgrids" => nil,
        "types" => nil
      },
      "groups" => %{
        "headers" => ["name", "phone", "email"],
        "subgrids" => nil,
        "types" => nil
      },
      "keys" => %{
        "headers" => ["name", "user", "usage", "type", "data"],
        "subgrids" => nil,
        "types" => nil
      },
      "providers" => %{
        "headers" => ["name", "desc", "type"],
        "subgrids" => nil,
        "types" => %{
          "archive" => [
            "atype",
            "provider",
            "scheme",
            "host",
            "port",
            "region",
            "key",
            "secret",
            "bucket"
          ],
          "generic" => ["values"],
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
          "s3" => ["provider", "scheme", "host", "port", "region", "key", "secret"],
          "sharepoint" => ["tenant", "client_id", "client_secret"],
          "smtp" => ["etype", "relay", "username", "password", "auth", "tls", "ssl", "port"]
        }
      },
      "rules" => %{
        "headers" => ["name", "desc", "output", "patterns"],
        "subgrids" => nil,
        "types" => nil
      },
      "scheduler" => %{
        "headers" => ["name", "active", "topic", "meta", "type"],
        "subgrids" => nil,
        "types" => %{
          "daily" => ["time", "daily", "weekdays"],
          "days" => ["time", "days"],
          "timer" => ["value", "unit"]
        }
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
          "defaults" => [],
          "gateway" => [
            "port",
            "idle_timeout",
            "request_timeout",
            "max_keepalive",
            "tls",
            "cert",
            "key",
            "router",
            "communication"
          ],
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
          "pyservice" => [
            "service",
            "config",
            "receive",
            "updated",
            "topic",
            "policy",
            "start_time",
            "send_output",
            "output"
          ],
          "sftpd" => ["port", "server_key", "communication"],
          "subscriber" => ["subs_count", "handler", "updated", "topic", "policy", "start_time"]
        }
      },
      "templates" => %{
        "headers" => ["name", "desc", "data"],
        "subgrids" => nil,
        "types" => nil
      },
      "topics" => %{
        "headers" => ["type", "topic", "desc"],
        "subgrids" => nil,
        "types" => nil
      },
      "users" => %{
        "headers" => [
          "group",
          "username",
          "email",
          "firstname",
          "lastname",
          "phone",
          "approved",
          "ufa/stime",
          "ufa/debug",
          "ufa/logfile",
          "ufa/hinterval",
          "ufa/cinterval",
          "ufa/max"
        ],
        "subgrids" => %{
          "mailboxes" => %{
            "headers" => ["name", "desc"],
            "subgrids" => nil,
            "types" => nil
          },
          "rules" => %{
            "headers" => ["name", "type", "active"],
            "subgrids" => nil,
            "types" => %{
              "download" => [
                "fpoll",
                "subs_count",
                "updated",
                "mailbox",
                "topic",
                "policy",
                "start_time",
                "folder",
                "max"
              ],
              "upload" => ["fpoll", "regex", "fmatch", "fmeta", "subs_count", "ackmode"]
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
      "groups",
      "fields",
      "keys",
      "topics",
      "users",
      "rules",
      "users/rules",
      "users/mailboxes",
      "actions",
      "endpoints",
      "services",
      "jobs",
      "templates"
    ]
  end

  def before_create(collection, body, env \\ "") do
    case String.replace(collection, env <> "-", "") do
      "users" ->
        Map.put(body, "password", nil)

      # VaultDatabase.vault_store_key(conn.body_params(), collection, "account", "cred")
      "services" ->
        if body["type"] == "subscriber" ||
             (body["type"] == "pyservice" && body["receive"]) do
          create_config_consumer(body, env)
          body
        end

        body

      _ ->
        body
    end
  end

  def after_create(collection, body, env \\ "") do
    # onb =
    case base_index(env, collection) do
      "users" ->
        if body["approved"] do
          password = create_password()

          # IO.inspect(password)
          %{password_hash: hashed} = add_hash(password)

          DB.find_one_and_update(
            Util.index(env, "users"),
            %{"username" => body["username"]},
            %{
              "password" => hashed
            }
          )

          # fn msg, obj, env ->
          #   obj = obj |> Map.put("password", password)
          #   msg = Map.put(msg, "data", Jason.encode!(obj))

          #   Amps.Onboarding.onboard(
          #     msg,
          #     obj,
          #     env
          #   )

          #   Map.merge(msg, %{"onboarding" => true, "user_id" => obj["_id"]})
          # end
        end

      "services" ->
        types = SvcManager.service_types()

        if body["type"] == "subscriber" ||
             (body["type"] == "pyservice" && body["receive"]) do
          DB.find_one_and_update(
            Util.index(env, "services"),
            %{"name" => body["name"]},
            %{
              "updated" => false
            }
          )
        end

        topic =
          if env == "" do
            "amps.events.svcs.handler.#{body["name"]}.start"
          else
            "amps.#{env}.events.svcs.handler.#{body["name"]}.start"
          end

        if Map.has_key?(types, String.to_atom(body["type"])) do
          Gnat.pub(:gnat, topic, "")
        end

        nil

      "jobs" ->
        case env do
          "" ->
            Amps.Scheduler.load(body["name"])

          env ->
            Amps.EnvScheduler.load(body["name"], env)
        end

        nil

      "actions" ->
        if body["type"] == "batch" do
          create_batch_consumer(body)
        end

        nil

      "environments" ->
        Gnat.pub(:gnat, "amps.events.env.handler.#{body["name"]}.start", "")
        nil

      _ ->
        nil
    end

    ui_event(collection, body["_id"], "create", env)

    # AmpsEvents.send()
  end

  def before_update(collection, id, body, env, old) do
    case base_index(env, collection) do
      "actions" ->
        case old["type"] do
          "batch" ->
            Util.delete_batch_consumer(old)
            body

          _ ->
            body
        end

      _ ->
        body
    end
  end

  def after_update(collection, id, body, env, old) do
    case base_index(env, collection) do
      "config" ->
        config = DB.find_one("config", %{"_id" => id})

        if config["name"] == "SYSTEM" do
          Amps.SvcManager.load_system_parms()
          archive = Amps.Defaults.get("archive")
          IO.inspect(old["archive"])
          IO.inspect(archive)

          if old["archive"] != archive do
            action =
              if archive do
                "start"
              else
                "stop"
              end

            Gnat.pub(:gnat, "amps.events.archive.handler.#{action}", "")
          end
        end

      "services" ->
        service = DB.find_one(collection, %{"_id" => id})

        if service["type"] == "subscriber" ||
             (body["type"] == "pyservice" && body["receive"]) do
          if service["updated"] do
            Util.delete_config_consumer(old, env)

            Util.create_config_consumer(body, env)
          end
        end

        types = SvcManager.service_types()

        if Map.has_key?(service, "type") do
          if Map.has_key?(types, String.to_atom(service["type"])) do
            Gnat.pub(
              :gnat,
              AmpsUtil.env_topic(
                "amps.events.svcs.handler.#{service["name"]}.restart",
                env
              ),
              ""
            )
          end
        end

      "environments" ->
        envaction =
          if body["active"] do
            "start"
          else
            "stop"
          end

        archaction =
          if body["active"] && body["archive"] do
            "start"
          else
            "stop"
          end

        Gnat.pub(
          :gnat,
          "amps.events.env.handler.#{body["name"]}.#{envaction}",
          ""
        )

        Gnat.pub(
          :gnat,
          "amps.events.archive.handler.#{archaction}.#{body["name"]}",
          ""
        )

      "actions" ->
        # _action = DB.find_one(Util.index(conn.assigns().env, "actions"), %{"_id" => id})

        if body["type"] == "batch" do
          Util.create_batch_consumer(body)
        end

      "jobs" ->
        case env do
          "" ->
            Amps.Scheduler.update(body["name"])

          env ->
            Amps.EnvScheduler.update(body["name"], env)
        end

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
    # fun =
    case collection do
      "services" ->
        case field do
          "defaults" ->
            Application.put_env(
              :amps,
              String.to_atom(body["field"]),
              body["value"]
            )

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

    Util.ui_field_event(collection, id, field, fieldid, "create", env)
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
    if env == "" do
      collection
    else
      if Enum.member?(
           [
             "config",
             "demos",
             "admin",
             "environments",
             "system_logs",
             "ui_audit",
             "providers"
           ],
           collection
         ) do
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

  def create_config_consumer(body, env \\ nil) do
    {stream, consumer} =
      AmpsUtil.get_names(
        body,
        env
      )

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

    AmpsUtil.create_consumer(
      stream,
      consumer,
      AmpsUtil.env_topic(body["topic"], env),
      opts
    )
  end

  def delete_config_consumer(body, env \\ nil) do
    :rpc.multicall(AmpsWeb.Util, :do_delete, [body, env])
  end

  def do_delete(body, env) do
    {stream, consumer} =
      AmpsUtil.get_names(
        body,
        env
      )

    AmpsUtil.delete_consumer(stream, consumer)
  end

  def test() do
    service = %{
      "router" => [
        %{
          "method" => "POST",
          "path" => "place/it",
          "script" => %{
            "module" => "sqlpost",
            "parms" => %{},
            "provider" => "cw-DAYABhcJry1M9LMrG",
            "script_type" => "python",
            "use_provider" => true
          }
        },
        %{
          "method" => "GET",
          "path" => "place/it/:table/:id",
          "script" => %{
            "module" => "sqlget",
            "parms" => %{},
            "provider" => "cw-DAYABhcJry1M9LMrG",
            "script_type" => "python",
            "use_provider" => true
          }
        }
      ],
      "name" => "httpapi"
    }

    Plug.Cowboy.http(Amps.Gateway, [env: "giftshop", opts: service],
      ref: "test",
      port: 4444,
      otp_app: :amps
    )
  end

  def ui_event(index, id, action, env, fun \\ nil) do
    Task.start_link(fn ->
      msg = %{
        "msgid" => AmpsUtil.get_id(),
        "action" => action,
        "service" => "UI Actions"
      }

      {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "UI Actions"}, env)

      obj = Amps.DB.find_by_id(index, id)

      msg =
        if fun do
          fun.(msg, obj, env)
        else
          msg
        end

      msg =
        Map.put(
          msg,
          "data",
          Jason.encode!(obj |> AmpsUtil.filter())
          |> Jason.Formatter.pretty_print()
        )

      AmpsEvents.send(
        msg,
        %{
          "output" =>
            AmpsUtil.env_topic(
              "amps.objects.#{base_index(env, index)}.#{action}",
              env
            )
        },
        %{}
      )

      AmpsEvents.end_session(sid, env)
    end)
  end

  def ui_delete_event(index, body, env, fun \\ nil) do
    Task.start_link(fn ->
      msg = %{
        "msgid" => AmpsUtil.get_id(),
        "action" => "delete",
        "service" => "UI Actions"
      }

      {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "UI Actions"}, env)

      msg =
        if fun do
          fun.(msg, body, env)
        else
          msg
        end

      msg =
        Map.put(
          msg,
          "data",
          Jason.encode!(body |> AmpsUtil.filter())
          |> Jason.Formatter.pretty_print()
        )

      AmpsEvents.send(
        msg,
        %{
          "output" =>
            AmpsUtil.env_topic(
              "amps.objects.#{base_index(env, index)}.delete",
              env
            )
        },
        %{}
      )

      AmpsEvents.end_session(sid, env)
    end)
  end

  def ui_field_event(index, id, field, fieldid, action, env, fun \\ nil) do
    Task.start_link(fn ->
      body = Amps.DB.find_by_id(index, id)

      msg = %{
        "msgid" => AmpsUtil.get_id(),
        "data" =>
          Jason.encode!(body |> AmpsUtil.filter())
          |> Jason.Formatter.pretty_print(),
        "field" => field,
        "fieldid" => fieldid,
        "action" => action,
        "service" => "UI Actions"
      }

      {msg, sid} = AmpsEvents.start_session(msg, %{"service" => "UI Actions"}, env)

      msg =
        if fun do
          fun.(msg, body, env)
        else
          msg
        end

      AmpsEvents.send(
        msg,
        %{
          "output" =>
            AmpsUtil.env_topic(
              "amps.objects.#{base_index(env, index)}.#{field}.#{action}",
              env
            )
        },
        %{}
      )

      AmpsEvents.end_session(sid, env)
    end)
  end
end
