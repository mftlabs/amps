defmodule RegisterHandler do
  require Logger

  @doc """

  """
  def run(msg, mqstate) do
    mailbox = msg["mailbox"]
    sid = AmpsUtil.get_id()
    msg = Map.put(msg, "session", sid)
    session = %{"session_id" => sid, "source" => "register"}
    AmpsEvents.message(msg)
    AmpsEvents.session_start(session)

    case register(mailbox, msg, mqstate) do
      {:ok, status} ->
        AmpsEvents.session_end(sid, status, "")
        :ok

      {:error, reason} ->
        Logger.info("failed here...")
        AmpsEvents.session_end(sid, "failed", reason)
        :error
    end
  end

  defp register(user, msg, mqstate) do
    case evaluate(user, msg) do
      {msg, nil} ->
        # no user rules found, try system defaults
        case evaluate("SYSTEM", msg) do
          {_msg, nil} ->
            {:error, "system error - no default rule"}

          {msg, rule} ->
            # found system rule
            process_action(msg, rule, mqstate)
        end

      {msg, rule} ->
        # found user rule
        process_action(msg, rule, mqstate)
    end
  end

  defp checkparsing(opts, msg) do
    case opts do
      [:edi] ->
        case msg["edistd"] do
          nil ->
            # edi not parsed yet
            case AmpsUtil.parse_edi(msg) do
              {:ok, vals} ->
                # found edi standard
                {:ok, Map.merge(msg, vals)}

              _ ->
                # edi not found
                {:ok, Map.put(msg, "edistd", "none")}
            end

          _ ->
            # parsed edi already
            {:ok, msg}
        end

      _ ->
        # no need to parse for edi
        {:ok, Map.put(msg, "edistd", "none")}
    end
  end

  defp evaluate(user, msg) do
    case AmpsDatabase.get_rules(user) do
      nil ->
        {msg, nil}

      result ->
        rules = result["rules"]

        case checkparsing(rules, msg) do
          {:ok, msg} ->
            msg = Map.delete(msg, "header")

            case find_rule(rules, msg) do
              false ->
                {msg, nil}

              {:ok, rule} ->
                {msg, rule}
            end
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

      :matched ->
        # match found, return with the current rule
        {:ok, head}
    end
  end

  defp find_pattern([], _msg) do
    # matched all patterns for this rule
    :matched
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
        Logger.info("doesn't match")
        false
      end
    else
      if :glob.matches(matchval, pattern) do
        Logger.info("found match on #{key} => #{pattern} and #{matchval}")
        find_pattern(tail, msg)
      else
        Logger.info("doesn't match")
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

  defp process_action(msg, rule, _mqstate) do
    parms = rule["parms"]

    case rule["action"] do
      "queue" ->
        # queue for asynchronous processing
        qname = parms["queue"]
        priority = parms["priority"] || "5"
        itinerary = parms["itinerary"] || ""
        qparms = Map.merge(msg, %{"itinerary" => itinerary, "priority" => priority})
        # Amps.MqService.send_tx(qname, qparms, mqstate)
        AmpsQueue.enqueue(qname, qparms)
        {:ok, "received"}

      "mailbox" ->
        # store in recipient mailbox for pickup
        recipient = parms["recipient"] || "unknown"

        case AmpsAuth.mailbox_info(recipient) do
          nil ->
            {:error, "recipient does not have a registered mailbox #{recipient}"}

          _found ->
            AmpsMailbox.add_message(recipient, msg)
            {:ok, "mailboxed with recipient #{recipient}"}
        end

      "hold" ->
        # ignore this message
        status = parms["status"] || "held"
        reason = parms["reason"] || "held by rule"
        {:ok, "held with status #{status}, reason #{reason}"}

      "reject" ->
        # reject this message
        reason = parms["reason"]
        AmpsStorage.delete(msg)
        {:error, "rejected by rule with reason #{reason}"}
    end
  end
end
