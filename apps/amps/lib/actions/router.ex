# Copyright 2022 Agile Data, Inc <code@mftlabs.io>

defmodule Amps.Actions.Router do
  require Logger

  @doc """

  """

  def run(msg, parms, {state, env}) do
    Logger.info("input #{inspect(msg)}")
    Logger.info("state #{inspect(state)}")

    msg =
      if parms["parse_edi"] do
        {:ok, meta} = AmpsUtil.parse_edi(msg)
        Map.merge(msg, meta)
      else
        msg
      end

    rule = evaluate(parms, msg, env)
    Logger.info("rule #{inspect(rule)}")
    msgid = AmpsUtil.get_id()

    msg =
      Map.merge(msg, %{
        "msgid" => msgid,
        "parent" => msg["msgid"],
        "topic" => rule["output"]
      })

    {:send, [msg], rule["output"]}
  end

  def evaluate(parms, msg, env \\ "") do
    rules =
      Enum.reduce(parms["rules"], [], fn id, acc ->
        rule = Amps.DB.find_one(AmpsUtil.index(env, "rules"), %{"_id" => id})

        case rule do
          nil ->
            acc

          rule ->
            List.insert_at(acc, -1, rule)
        end
      end)

    case find_rule(rules, msg) do
      false ->
        nil

      {:ok, rule} ->
        rule
    end
  end

  defp find_rule([], _msg) do
    # end of list and no rule found
    false
  end

  defp find_rule([head | tail], msg) do
    pmap = head["patterns"]
    plist = Map.to_list(pmap)

    case find_pattern(plist, msg) do
      false ->
        # match not found, try again
        find_rule(tail, msg)

      true ->
        # match found, return with the current rule
        {:ok, head}
    end
  end

  defp find_pattern([], _msg) do
    # matched all patterns for this rule
    true
  end

  defp find_pattern([{key, pmap} | tail], msg) do
    matchval = msg[key] || ""
    pattern = pmap["value"] || "*"
    Logger.info("matching on #{key} => #{matchval} and #{pattern}")
    regex_flag = pmap["regex"] || false

    if regex_flag do
      if regex_match(matchval, pattern) do
        Logger.info("found match on #{key} => #{matchval} and #{pattern}")
        find_pattern(tail, msg)
      else
        # Logger.info("doesn't match")
        false
      end
    else
      if :glob.matches(matchval, pattern) do
        Logger.info("found match on #{key} => #{matchval} and #{pattern}")
        find_pattern(tail, msg)
      else
        # Logger.info("doesn't match")
        false
      end
    end
  end

  defp regex_match(val, pattern) do
    case Regex.compile(pattern) do
      {:ok, re} ->
        Regex.match?(re, val)

      _ ->
        Logger.info("bad regex, failing")
        false
    end
  end
end
