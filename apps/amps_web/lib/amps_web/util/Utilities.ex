defmodule AmpsWeb.Util do
  require Logger
  import Argon2
  alias Amps.DB
  alias Amps.SvcManager
  alias AmpsWeb.Util

  @numbers "0123456789"
  @letters "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ"
  @symbols "$@!@#$%&*"

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
          "aws" => ["action", "output"],
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
          "ldap" => [
            "provider",
            "timeout",
            "base",
            "scope",
            "sizeLimit",
            "filter",
            "attributes",
            "output"
          ],
          "mailbox" => ["recipient", "mailbox", "overwrite", "format"],
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
            "count",
            "bucket",
            "path",
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
      "admin" => %{
        "headers" => [
          "firstname",
          "lastname",
          "role",
          "username",
          "phone",
          "email",
          "provider",
          "approved"
        ],
        "subgrids" => nil,
        "types" => nil
      },
      "endpoints" => %{
        "headers" => ["name", "desc", "method", "path", "timeout", "action"],
        "subgrids" => nil,
        "types" => nil
      },
      "environments" => %{
        "headers" => ["name", "desc", "host", "active", "archive"],
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
      "jobs" => %{
        "headers" => ["name", "active", "topic", "meta", "type"],
        "subgrids" => nil,
        "types" => %{
          "daily" => ["time", "daily", "weekdays"],
          "days" => ["time", "days"],
          "timer" => ["value", "unit"]
        }
      },
      "keys" => %{
        "headers" => ["name", "user", "usage", "type", "data"],
        "subgrids" => nil,
        "types" => nil
      },
      "message_events" => %{
        "headers" => [
          "msgid",
          "action",
          "user",
          "parent",
          "fname",
          "fsize",
          "etime",
          "topic",
          "status"
        ],
        "subgrids" => nil,
        "types" => nil
      },
      "packages" => %{
        "headers" => ["name", "desc"],
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
          "aws" => ["key", "secret"],
          "generic" => ["values"],
          "ldap" => ["server", "port", "ssl", "username", "password"],
          "s3" => ["provider", "scheme", "host", "port", "region", "key", "secret"],
          "sharepoint" => ["tenant", "client_id", "client_secret"],
          "smtp" => ["etype", "relay", "username", "password", "auth", "tls", "ssl", "port"]
        }
      },
      "queues" => %{
        "headers" => ["name", "type", "description"],
        "subgrids" => nil,
        "types" => nil
      },
      "rules" => %{
        "headers" => ["name", "desc", "output", "patterns"],
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
          "defaults" => [],
          "gateway" => [
            "port",
            "idle_timeout",
            "request_timeout",
            "max_keepalive",
            "tls",
            "cert",
            "key",
            "router"
          ],
          "httpd" => [
            "port",
            "idle_timeout",
            "request_timeout",
            "max_keepalive",
            "overwrite",
            "tls",
            "cert",
            "key",
            "communication"
          ],
          "nats" => ["topic", "format", "communication"],
          "pyservice" => [
            "service",
            "config",
            "receive",
            "subs_count",
            "ack_wait",
            "rmode",
            "rlimit",
            "backoff",
            "updated",
            "topic",
            "policy",
            "start_time",
            "output_map"
          ],
          "sftpd" => ["port", "server_key", "overwrite", "communication"],
          "sqs" => ["queue_name", "owner_id", "provider", "wait_time_seconds", "communication"],
          "subscriber" => [
            "subs_count",
            "ack_wait",
            "rmode",
            "rlimit",
            "backoff",
            "handler",
            "updated",
            "topic",
            "policy",
            "start_time"
          ]
        }
      },
      "sessions" => %{
        "headers" => ["msgid", "sid", "service", "start", "end", "stime", "status"],
        "subgrids" => nil,
        "types" => nil
      },
      "system_logs" => %{
        "headers" => ["etime", "sid", "node", "level", "message"],
        "subgrids" => nil,
        "types" => nil
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
      "ui_audit" => %{
        "headers" => ["user", "action", "entity", "etime"],
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
          "logs" => %{
            "headers" => ["etime", "operation", "rule", "msgid", "fname", "status"],
            "subgrids" => nil,
            "types" => nil
          },
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

    pheaders = Application.get_env(:amps_web, :headers, %{})
    IO.inspect(pheaders)

    headers = deep_merge(headers, pheaders)
    IO.inspect(headers)

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

  def deep_merge(left, right) do
    Map.merge(left, right, &deep_resolve/3)
  end

  # Key exists in both maps, and both values are maps as well.
  # These can be merged recursively.
  defp deep_resolve(_key, left = %{}, right = %{}) do
    deep_merge(left, right)
  end

  # Key exists in both maps, but at least one of the values is
  # NOT a map. We fall back to standard merge behavior, preferring
  # the value on the right.
  defp deep_resolve(_key, _left, right) do
    right
  end

  def order() do
    [
      "groups",
      "fields",
      "keys",
      "topics",
      "users",
      "rules",
      "users/mailboxes",
      "users/rules",
      "actions",
      "endpoints",
      "services",
      "jobs",
      "templates"
    ]
  end

  def before_create(collection, body, %{env: env, current_user: adminuser}) do
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

      "actions" ->
        if body["type"] == "mailbox" do
          index = index(env, "users")
          user = DB.find_one(index, %{"username" => body["recipient"]})

          exists =
            Enum.find(user["mailboxes"], fn mbox ->
              mbox["name"] == body["mailbox"]
            end)

          name = adminuser.firstname <> " " <> adminuser.lastname
          time = AmpsUtil.gettime()

          if !exists do
            DB.add_to_field(
              index,
              %{
                "name" => body["mailbox"],
                "desc" => body["mailbox"],
                "created" => time,
                "createdBy" => name,
                "modifiedBy" => name,
                "modified" => time
              },
              user["_id"],
              "mailboxes"
            )
          end
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
          #   msg = Map.put(msg, "data", JSON.encode!(obj))

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

  def before_update(collection, _id, body, env, old) do
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
          Amps.SvcManager.check_util()

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
            DB.find_one_and_update(collection, %{"_id" => id}, %{"updated" => false})
          end
        end

        types = SvcManager.service_types()

        if Map.has_key?(service, "type") do
          if Map.has_key?(types, String.to_atom(service["type"])) do
            AmpsEvents.send(
              %{},
              %{
                "output" => "amps.events.svcs.handler.#{service["name"]}.restart"
              },
              %{},
              env
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

        subs = DB.find(Util.index(env, "services"), %{"type" => "subscriber", "handler" => id})

        Enum.each(subs, fn sub ->
          AmpsEvents.send(
            %{},
            %{
              "output" => "amps.events.svcs.handler.#{sub["name"]}.restart"
            },
            %{},
            env
          )
        end)

      "jobs" ->
        case env do
          "" ->
            Amps.Scheduler.update(body["name"])

          env ->
            Amps.EnvScheduler.update(body["name"], env)
        end

      "endpoints" ->
        gateways = DB.find(Util.index(env, "services"), %{"type" => "gateway", "router" => id})

        Enum.each(gateways, fn gw ->
          AmpsEvents.send(
            %{},
            %{
              "output" => "amps.events.svcs.handler.#{gw["name"]}.restart"
            },
            %{},
            env
          )
        end)

      _ ->
        nil
    end
  end

  def before_field_create(collection, _id, field, body, env) do
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
             "packages",
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

  def create_config_consumer(body, env \\ nil, opts \\ %{}) do
    {stream, consumer} =
      AmpsUtil.get_names(
        body,
        env
      )

    policy =
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

    opts = Map.merge(policy, opts)

    ack_wait = body["ack_wait"] || 30

    AmpsUtil.create_consumer(
      stream,
      consumer,
      AmpsUtil.env_topic(body["topic"], env),
      Map.merge(
        %{
          ack_wait: ack_wait * 1_000_000_000,
          max_ack_pending: body["subs_count"]
        },
        opts
      )
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
          JSON.encode!(obj |> AmpsUtil.filter())
          |> JSON.Formatter.pretty_print()
        )

      AmpsEvents.send(
        msg,
        %{
          "output" => "amps.objects.#{base_index(env, index)}.#{action}"
        },
        %{},
        env
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
          JSON.encode!(body |> AmpsUtil.filter())
          |> JSON.Formatter.pretty_print()
        )

      AmpsEvents.send(
        msg,
        %{
          "output" => "amps.objects.#{base_index(env, index)}.delete"
        },
        %{},
        env
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
          JSON.encode!(body |> AmpsUtil.filter())
          |> JSON.Formatter.pretty_print(),
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
          "output" => "amps.objects.#{base_index(env, index)}.#{field}.#{action}"
        },
        %{},
        env
      )

      AmpsEvents.end_session(sid, env)
    end)
  end

  def force_ssl(val) do
    result = DB.find_one_and_update("config", %{"name" => "SYSTEM"}, %{"force_ssl" => val})
    Amps.SvcManager.load_system_parms()
  end
end
