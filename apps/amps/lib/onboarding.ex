# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.Onboarding do
  require Logger

  def providers(type) do
    %{
      "aws" => {:python, "aws_user_onboarding"},
      "sfg" => {:python, "sfg_user_onboarding"}
    }[type]
  end

  def profiles(type) do
    %{
      "cd" => {:python, "cd_onboarding_sspcm"}
    }[type]
  end

  def key_mapping(prof_or_provider, type) do
    %{
      profiles: %{
        "cd" => ["cert"],
        "test" => []
      },
      providers: %{
        "aws" => [],
        "sfg" => [],
        "test" => []
      }
    }[prof_or_provider][type]
  end

  defp replace_keys(object, prof_or_provider, env) do
    mapping = key_mapping(prof_or_provider, object["type"])

    Enum.reduce(mapping, object, fn k, acc ->
      case Amps.DB.find_by_id(AmpsUtil.index(env, "keys"), object[k]) do
        nil ->
          raise "Could not find key with id #{object[k]}"

        key ->
          Map.put(acc, k, key["data"])
      end
    end)
  end

  defp replace_provider(object) do
    if object["provider"] do
      case Amps.DB.find_by_id("provider", object["provider"]) do
        nil ->
          raise "Could not find provider with id #{object["provider"]}"

        provider ->
          Map.put(object, "provider", provider)
      end
    else
      object
    end
  end

  def set_synchronize(env \\ "") do
    index = AmpsUtil.index(env, "users")
    users = Amps.DB.find(index)

    Enum.each(users, fn user ->
      auths = verify(user, env)

      if not all_active(auths) do
        Amps.DB.find_one_and_update(index, %{"username" => user["username"]}, %{
          "synchronize" => true
        })
      end
    end)
  end

  def check_node(env \\ "") do
    heartbeat =
      Amps.DB.find_one(
        "heartbeat",
        %{"node" => Atom.to_string(node()), "etime" => %{"$lt" => AmpsUtil.get_offset(-60000)}},
        sort: %{"etime" => -1}
      )

    actions =
      case heartbeat do
        nil ->
          Logger.info("No prior heartbeat found for node #{node()} - treating as new node.")
          index = AmpsUtil.index(env, "users")
          users = Amps.DB.find(index)

          Enum.map(users, fn user ->
            IO.inspect(%{
              "topic" => AmpsUtil.env_topic("amps.objects.users.create", env),
              "status" => "received",
              "onboarding" => true,
              "action" => "create",
              "user_id" => user["_id"]
            })

            ev =
              Amps.DB.find_one(
                "message_events",
                %{
                  "topic" => AmpsUtil.env_topic("amps.objects.users.create", env),
                  "status" => "received",
                  "onboarding" => true,
                  "action" => "create",
                  "user_id" => user["_id"]
                }
              )

            create(ev, env)
            %{"action" => "created", "user" => user}
          end)

        heartbeat ->
          evaluate(env, heartbeat["etime"])
      end

    Amps.DB.insert(AmpsUtil.index(env, "reports"), %{
      "type" => "onboarding",
      "actions" => actions,
      "node" => Atom.to_string(node()),
      "rtime" => AmpsUtil.gettime()
    })
  end

  def evaluate(env, from, to \\ nil) do
    events =
      Amps.DB.find(
        "message_events",
        %{
          "topic" => %{"$regex" => AmpsUtil.env_topic("amps.objects.users.*", env)},
          "etime" =>
            if to do
              %{"$gt" => from, "$lt" => to}
            else
              %{"$gt" => from}
            end,
          "status" => "received",
          "onboarding" => true
        },
        %{sort: %{"etime" => 1}}
      )

    users =
      Enum.reduce(events, %{}, fn event, acc ->
        uid = event["user_id"]

        if Map.has_key?(acc, uid) do
          Map.put(acc, uid, acc[uid] ++ [event])
        else
          Map.put(acc, uid, [event])
        end
      end)

    Enum.map(users, fn {_, v} ->
      handle_events(v, env)
    end)
  end

  def handle_events(v, env) do
    first = Enum.at(v, 0)
    recent = List.last(v)

    cond do
      recent["action"] == "delete" ->
        user = Jason.decode!(recent["data"])
        do_local_onboard(recent, user, env)
        %{"action" => "deleted", "user" => user}

      first["action"] == "create" or first["action"] == "approve_user" ->
        create(first, env)

      true ->
        %{"action" => "updated", "user" => Jason.decode!(recent["data"])}
    end
  end

  def create(ev, env) do
    data = Jason.decode!(ev["data"])
    password = AmpsWeb.Util.create_password()
    user = Map.put(data, "password", password)
    IO.inspect(user)
    first = Map.put(ev, "data", Jason.encode!(user))
    do_local_onboard(first, user, env)
    %{"action" => "created", "user" => data}
  end

  def all_active(auths) do
    Enum.reduce(auths, true, fn auth, active ->
      active && auth["status"]
    end)
  end

  def synchronize(user, env \\ "") do
    msg = %{
      "data" => Jason.encode!(user),
      "action" => "update"
    }

    synchronize_local_onboard(msg, user, env)
  end

  def verify(user, env \\ "") do
    group = Amps.DB.find_by_id(AmpsUtil.index(env, "groups"), user["group"])

    Enum.reduce(group["providers"], [], fn provider, acc ->
      provider = Amps.DB.find_by_id("providers", provider)

      msg = %{
        "data" => Jason.encode!(user),
        "action" => "status"
      }

      if provider["local"] do
        {replies, badnodes} =
          :rpc.multicall(Amps.Onboarding, :do_verify, [provider, msg, user, env])

        acc ++
          replies ++
          Enum.map(badnodes, fn node ->
            %{
              "name" => provider["name"],
              "providerid" => provider["_id"],
              "node" => node,
              "status" => false
            }
          end)
      else
        [Map.drop(do_verify(provider, msg, user, env), ["node"]) | acc]
      end
    end)
  end

  def do_verify(provider, msg, _user, env) do
    provider = provider |> replace_env()

    handler = providers(provider["atype"])

    result =
      try do
        case handler do
          {:python, module} ->
            parms = %{
              "module" => module,
              "provider" => provider,
              "use_provider" => true
            }

            Amps.PyService.onboard(msg, parms, env)

          {:action, module} ->
            parms = %{
              "provider" => provider
            }

            module.run(msg, parms, env)
        end
      rescue
        e ->
          Logger.error(Exception.format(:error, e, __STACKTRACE__))
          IO.inspect(e)
          {:error, "Failed to verify"}
      end

    case result do
      {:ok, %{"msg" => %{"data" => status}}} ->
        %{
          "name" => provider["name"],
          "providerid" => provider["_id"],
          "node" => Node.self(),
          "status" => status
        }

      {:error, reason} ->
        Logger.error(reason)
        %{"name" => provider["name"], "providerid" => provider["_id"], "status" => false}
    end
  end

  def onboard(msg, user, env) do
    do_onboard(msg, user, env)
  end

  def synchronize_local_onboard(msg, user, env) do
    group = Amps.DB.find_by_id(AmpsUtil.index(env, "groups"), user["group"])

    Logger.info("Starting onboarding tasks for user #{user["firstname"]} #{user["lastname"]}")

    Enum.each(group["providers"], fn provider ->
      provider = Amps.DB.find_by_id("providers", provider)

      if provider["local"] do
        :rpc.multicall(Amps.Onboarding, :onboard_provider, [provider, msg, user, env])
      end
    end)

    Logger.info(
      "Completed onboarding update tasks for user #{user["firstname"]} #{user["lastname"]}"
    )
  end

  def do_local_onboard(msg, user, env) do
    group = Amps.DB.find_by_id(AmpsUtil.index(env, "groups"), user["group"])

    Logger.info("Starting onboarding tasks for user #{user["firstname"]} #{user["lastname"]}")

    Enum.each(group["providers"], fn provider ->
      provider = Amps.DB.find_by_id("providers", provider)

      if provider["local"] do
        onboard_provider(provider, msg, user, env)
      end
    end)

    Logger.info(
      "Completed onboarding update tasks for user #{user["firstname"]} #{user["lastname"]}"
    )
  end

  def do_onboard(msg, user, env) do
    group = Amps.DB.find_by_id(AmpsUtil.index(env, "groups"), user["group"])

    Logger.info("Starting onboarding tasks for user #{user["firstname"]} #{user["lastname"]}")

    Enum.each(group["providers"], fn provider ->
      provider = Amps.DB.find_by_id("providers", provider)

      if provider["local"] do
        res = :rpc.multicall(Amps.Onboarding, :onboard_provider, [provider, msg, user, env])
        IO.inspect(res)
      else
        onboard_provider(provider, msg, user, env)
      end
    end)

    Logger.info(
      "Completed onboarding update tasks for user #{user["firstname"]} #{user["lastname"]}"
    )
  end

  def onboard_provider(provider, msg, user, env) do
    provider = provider |> replace_env()

    Logger.info(
      "Starting onboarding task for user #{user["firstname"]} #{user["lastname"]} to #{provider["atype"]} on node #{node()}"
    )

    handler = providers(provider["atype"])
    Logger.debug("#{inspect(handler)}")

    result =
      try do
        case handler do
          {:python, module} ->
            parms = %{
              "module" => module,
              "provider" => provider,
              "use_provider" => true
            }

            Amps.PyService.onboard(msg, parms, env)

          {:action, module} ->
            parms = %{
              "provider" => provider
            }

            module.run(msg, parms, env)
        end
      rescue
        e ->
          Logger.error(Exception.format(:error, e, __STACKTRACE__))
          {:error, "Failed to run onboarding handler"}
      end

    case result do
      {:ok, _result} ->
        Logger.info(
          "Completed onboarding task for user #{user["firstname"]} #{user["lastname"]} to #{provider["atype"]} on node #{node()}"
        )

      {:error, reason} ->
        Logger.info(
          "Failed onboarding task for user #{user["firstname"]} #{user["lastname"]} to #{provider["atype"]} on node #{node()}"
        )

        Logger.error(reason)
    end
  end

  def replace_env(provider) do
    AmpsUtil.scan(provider, fn v ->
      cond do
        is_binary(v) ->
          if String.starts_with?(v, "(ENV)") do
            key = String.replace(v, "(ENV)", "")
            System.get_env(key, "Default")
          else
            v
          end

        true ->
          v
      end
    end)
  end

  def onboard_profile(user, profid, env) do
    profile = Enum.find(user["oprofiles"] || [], fn prof -> prof["_id"] == profid end)

    if profile do
      msg = %{
        "action" => "create",
        "data" => Jason.encode!(user)
      }

      if profile["local"] do
        res = :rpc.multicall(Amps.Onboarding, :do_profile_onboard, [profile, msg, user, env])
        IO.inspect(res)
      else
        do_profile_onboard(profile, msg, user, env)
      end
    else
      Logger.warn("Profile #{profid} for user #{user["username"]} not found")
    end
  end

  def do_profile_onboard(profile, msg, user, env) do
    profile = profile |> replace_env() |> replace_keys(:profiles, env) |> replace_provider()

    Logger.info(
      "Onboarding profile #{profile["name"]} for user #{user["username"]} to #{profile["type"]} on node #{node()}"
    )

    handler = profiles(profile["type"])
    Logger.debug("#{inspect(handler)}")

    result =
      try do
        case handler do
          {:python, module} ->
            parms =
              Map.merge(profile, %{
                "module" => module,
                "use_provider" => true
              })

            Amps.PyService.onboard(msg, parms, env)

          {:action, module} ->
            parms = profile

            module.run(msg, parms, env)
        end
      rescue
        e ->
          {:error, "Failed to run onboarding handler #{inspect(e)}"}
      end

    case result do
      {:ok, _result} ->
        Logger.info(
          "Completed Onboarding profile #{profile["name"]} for user #{user["username"]} to #{profile["type"]} on node #{node()}"
        )

      {:error, reason} ->
        Logger.info(
          "Failed profile #{profile["name"]} for user #{user["username"]} to #{profile["type"]} on node #{node()}"
        )

        Logger.error(reason)
    end
  end
end
