defmodule RouterAction do
  require Logger

  @doc """

  """
  def run(subject, body) do
    try do
      data = Poison.decode!(body)
      msg = data[:msg]
      state = data[:state]

      case evaluate(subject, msg) do
        nil ->
          # no user rules found, try system defaults
          Logger.info("eval system rules")

          case evaluate("SYSTEM", msg) do
            nil ->
              Logger.info("rule not found")
              {:error, "system error - no default rule"}

            rule ->
              # found system rule
              Logger.info("rule found #{inspect(rule)}")
              process_action(msg, rule, state)
          end

        rule ->
          # found user rule
          process_action(msg, rule, state)
      end
    rescue
      error ->
        Logger.warning("invalid message #{inspect(error)}")
    end
  end

  defp evaluate(subject, msg) do
    case AmpsDatabase.get_rules(subject) do
      nil ->
        nil

      result ->
        rules = result["rules"]

        case find_rule(rules, msg) do
          false ->
            nil

          {:ok, rule} ->
            rule
        end
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
    Logger.info("matching on #{key} => #{pattern} and #{matchval}")
    regex_flag = pmap["regex"] || false

    if regex_flag do
      if regex_match(matchval, pattern) do
        Logger.info("found match on #{key} => #{pattern} and #{matchval}")
        find_pattern(tail, msg)
      else
        # Logger.info("doesn't match")
        false
      end
    else
      if :glob.matches(matchval, pattern) do
        Logger.info("found match on #{key} => #{pattern} and #{matchval}")
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

  defp process_action(msg, rule, state) do
    raction = rule["action"]

    case raction do
      "hold" ->
        Logger.info("*** message held")

      other ->
        case AmpsDatabase.get_action(other) do
          nil ->
            Logger.warning("*** action not found")

          aparms ->
            apply(String.to_atom("Elixir." <> aparms["module"]), :run, [msg, aparms, state])
        end
    end

    #    output = state["output"] || []
    #    newlist = List.flatten([output | state["input"]])
    #    Map.put(state, "input", newlist)
  end
end
