defmodule Amps.Onboarding do
  require Logger
  alias Amps.DB

  def providers(type) do
    %{
      "aws" => {:python, "aws_user_onboarding"},
      "sfg" => {:python, "sfg"}
    }[type]
  end

  def create(msg, body, env) do
    :rpc.multicall(Node.list(), Amps.Onboarding, :do_create, [msg, body, env])
  end

  def do_create(msg, body, env) do
    group = DB.find_one(AmpsUtil.index(env, "groups"), %{"name" => body["group"]})

    Enum.each(group["providers"], fn provider ->
      provider = DB.find_by_id("providers", provider)

      Logger.info(
        "Start onboarding create task for user #{body["firstname"]} #{body["lastname"]} to #{provider["atype"]}"
      )

      Logger.info(
        "Completed onboarding create task for user #{body["firstname"]} #{body["lastname"]} to #{provider["atype"]}"
      )
    end)
  end

  def update(msg, body, env) do
    do_update(msg, body, env)
    :rpc.multicall(Node.list(), Amps.Onboarding, :do_update, [msg, body, env])
  end

  def do_update(msg, body, env) do
    group = DB.find_one(AmpsUtil.index(env, "groups"), %{"name" => body["group"]})

    Logger.info(
      "Starting onboarding update tasks for user #{body["firstname"]} #{body["lastname"]}"
    )

    Enum.each(group["providers"], fn provider ->
      provider = DB.find_by_id("providers", provider)

      Logger.info(
        "Starting onboarding update task for user #{body["firstname"]} #{body["lastname"]} to #{provider["atype"]}"
      )

      handler = providers(provider["atype"])
      Logger.debug("#{inspect(handler)}")

      result =
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

      case result do
        {:ok, result} ->
          Logger.info(
            "Completed onboarding update task for user #{body["firstname"]} #{body["lastname"]} to #{provider["atype"]}"
          )

        {:error, reason} ->
          Logger.info(
            "Failed onboarding update task for user #{body["firstname"]} #{body["lastname"]} to #{provider["atype"]}"
          )

          Logger.error(reason)
      end
    end)

    Logger.info(
      "Completed onboarding update tasks for user #{body["firstname"]} #{body["lastname"]}"
    )
  end
end
