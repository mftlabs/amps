defmodule AmpsWeb.FileHandler do
  def handle_message(message) do
    data = Jason.decode!(message.body)
    handle_events(data["Records"])
  end

  defp handle_events([]) do
    :ok
  end

  defp handle_events([head | tail]) do
    {{type, status}, event} = parse(head)

    event =
      if Map.has_key?(event, "fname") do
        Map.put(event, "fname", URI.decode_www_form(event["fname"]))
      else
        event
      end

    res =
      case type do
        :heartbeat ->
          doHeartbeat(event)

        :upload ->
          doUpload(event)

        :status ->
          doActivity(event, status)

        :reprocess ->
          doReprocess(event)

        _ ->
          :ok
      end

    handle_events(tail)
  end

  defp parse(rec) do
    IO.inspect(rec)

    data = %{
      "account" => rec["requestParameters"]["principalId"],
      "mtime" => rec["eventTime"],
      "bucket" => rec["s3"]["bucket"]["name"],
      "fname" => Path.basename(URI.decode(rec["s3"]["object"]["key"])),
      "fsize" => rec["s3"]["object"]["size"]
    }

    val = rec["s3"]["object"]["userMetadata"] || %{}

    meta =
      val
      |> Map.new(fn {key, value} ->
        {String.downcase(String.replace(key, "X-Amz-Meta-", "")), value}
      end)

    meta = Map.delete(meta, "content-type")
    meta = update_missing(meta)
    IO.puts("meta: #{inspect(meta)}")
    {gettype(rec), Map.merge(data, meta)}
  end

  defp update_missing(map) do
    if Map.has_key?(map, "msgid") do
      map
    else
      Map.merge(map, %{
        "msgid" => UUID.uuid4(),
        "direct" => "true"
      })
    end
  end

  defp gettype(rec) do
    # IO.puts("event #{inspect(rec)}")
    folder = Path.dirname(URI.decode(rec["s3"]["object"]["key"]))

    case rec["eventName"] do
      "s3:ObjectCreated:Put" ->
        case folder do
          "heartbeat" ->
            {:heartbeat, ""}

          "inbox" ->
            {:status, "mailboxed"}

          _ ->
            {:upload, "uploaded"}
        end

      "s3:ObjectCreated:CompleteMultipartUpload" ->
        case folder do
          "heartbeat" ->
            {:heartbeat, ""}

          "inbox" ->
            {:status, "mailboxed"}

          _ ->
            {:upload, "uploaded"}
        end

      "s3:ObjectAccessed:Get" ->
        case folder do
          "inbox" ->
            # need to check if principal is the UI admin or agent
            {:status, "downloaded"}

          "schedule" ->
            {:ignore, ""}

          _ ->
            {:ignore, ""}
        end

      "s3:ObjectRemoved:Delete" ->
        {:ignore, "deleted"}

      "s3:ObjectCreated:Copy" ->
        case folder do
          "archive" ->
            # need to check if principal is the UI admin or agent
            {:status, "archived"}

          "schedule" ->
            {:ignore, ""}

          "stage" ->
            {:reprocess, "reprocessed"}

          _ ->
            {:ignore, ""}
        end

      "s3:ObjectAccessed:Head" ->
        {:ignore, ""}

        #      _ ->
        #        {:status, "unknown event"}
    end
  end

  defp doHeartbeat(event) do
    IO.puts("heartbeat received #{inspect(event)}")
    event = Map.drop(event, ["fsize", "fname"])
    Amps.DB.insert("sysstatus", event)
    :ok
  end

  defp doUpload(event) do
    # do rules
    # send event
    IO.puts("upload event received #{inspect(event)}")
    Amps.DB.insert("messages", event)
    bucket = event["bucket"]
    {status, reason, action, current} = register(bucket, event)
    update_message_status(status, reason, action, current)
    :ok
  end

  defp doReprocess(event) do
    # do rules
    # send event
    IO.puts("reprocess event received #{inspect(event)}")
    # Amps.DB.insert("messages", event)
    bucket = event["bucket"]
    IO.inspect("event")
    IO.inspect(event)
    event = Map.drop(event, ["reprocess"])
    {status, reason, action, current} = register(bucket, event)
    update_message_status(status, reason, action, current)
    :ok
  end

  defp doActivity(event, status) do
    IO.puts("other event reecieved #{inspect(event)}")
    update_message_status(status, "", "", event)
  end

  defp register(user, msg) do
    case evaluate(user, msg) do
      {msg, nil} ->
        # no user rules found, try system defaults
        case evaluate("SYSTEM", msg) do
          {_msg, nil} ->
            {"error", "system error - no default rule", "none", nil}

          {msg, rule} ->
            # found system rule
            process_action(msg, rule)
        end

      {msg, rule} ->
        # found user rule
        IO.inspect("processed")
        processed = process_action(msg, rule)
        IO.inspect(processed)
        processed
    end
  end

  defp evaluate(user, msg) do
    case Amps.DB.find_one("rules", %{name: user}) do
      nil ->
        {msg, nil}

      result ->
        rules = result["rules"]

        case find_rule(rules, msg) do
          false ->
            {msg, nil}

          {:ok, rule} ->
            {msg, rule}
        end
    end
  end

  defp find_rule([], _msg) do
    # end of list and no rule found
    false
  end

  defp find_rule([head | tail], msg) do
    IO.inspect(head)

    if head["active"] do
      pmap = head["patterns"]
      plist = Map.to_list(pmap)

      if find_pattern(plist, msg) do
        # match found, return with the current rule
        {:ok, head}
      else
        # match not found, try again
        find_rule(tail, msg)
      end
    else
      find_rule(tail, msg)
    end
  end

  defp find_pattern([], _msg) do
    # matched all patterns for this rule
    true
  end

  defp find_pattern([{key, pmap} | tail], msg) do
    matchval = msg[key] || ""
    pattern = pmap["value"] || "*"
    IO.puts("matching on #{key} => #{pattern} and #{matchval}")
    regex_flag = pmap["regex"] || false

    if regex_flag do
      if regex_match(matchval, pattern) do
        IO.puts("found match on #{key} => #{pattern} and #{matchval}")
        find_pattern(tail, msg)
      else
        IO.puts("doesn't match")
        false
      end
    else
      if :glob.matches(matchval, pattern) do
        IO.puts("found match on #{key} => #{pattern} and #{matchval}")
        find_pattern(tail, msg)
      else
        IO.puts("doesn't match")
        false
      end
    end
  end

  defp regex_match(val, pattern) do
    case Regex.compile(pattern) do
      {:ok, re} ->
        Regex.match?(re, val)

      _ ->
        IO.puts("bad regex, failing")
        false
    end
  end

  defp process_action(event, rule) do
    action = rule["action"] || ""

    try do
      case action do
        "mailbox" ->
          # store in recipient mailbox for pickup
          do_mailbox_action(event, rule)

        "hold" ->
          # ignore this message, i.e. do nothing
          do_hold_action(event, rule)

        other ->
          drule = %{"name" => "held due to invalid action [#{other}]", "status" => "held"}
          do_hold_action(event, drule)
      end
    rescue
      e in ExAws.Error ->
        val =
          Regex.named_captures(
            ~r/\<Message\>(?<message>.*?)\<\/Message\>/,
            e.message
          )

        parms = rule["parms"]
        name = parms["name"] || "unknown action"
        message = val["message"] || "unknown reason"
        {"failed", message, name, nil}

      error ->
        text = Exception.format(:error, error, __STACKTRACE__)
        IO.puts("process failed 2 #{inspect(text)}")
        {"failed", text, action, nil}
    end
  end

  defp do_mailbox_action(event, rule) do
    parms = rule["parms"]
    name = parms["name"]
    fname = event["fname"]
    from = event["bucket"]
    from_path = "stage/" <> fname
    to = parms["bucket"] || parms["mailbox"]

    to_path = "inbox/" <> parms["prefix"] <> fname

    defaults = rule["defaults"] || %{}
    meta = Map.merge(event, defaults)

    Amps.DB.find_one_and_update("messages", %{"msgid" => event["msgid"]}, meta)

    result =
      put_object_copy(to, to_path, from, from_path,
        metadata_directive: :REPLACE,
        meta:
          Enum.reduce(meta, [], fn {k, v}, acc ->
            [{k, v} | acc]
          end)
      )
      |> ExAws.request!()

    IO.inspect(result)

    case parms["ackmode"] do
      "delete" ->
        ExAws.S3.delete_object(from, from_path) |> ExAws.request!()
        {"mailboxed", to, name, event}

      _ ->
        archive = "archive/" <> parms["prefix"] <> fname

        archreq =
          put_object_copy(from, archive, from, from_path,
            metadata_directive: :REPLACE,
            meta:
              Enum.reduce(meta, [], fn {k, v}, acc ->
                [{k, v} | acc]
              end)
          )

        IO.inspect(archreq)

        archresult = archreq |> ExAws.request!()

        IO.inspect(archresult)

        ExAws.S3.delete_object(from, from_path) |> ExAws.request!()
        current = Map.put(event, "location", archive)
        {"mailboxed", to, name, current}
    end
  end

  def put_object_copy(to, to_path, from, from_path, opts \\ []) do
    req = ExAws.S3.put_object_copy(to, to_path, from, from_path, opts)
    %ExAws.Operation.S3{headers: headers} = req
    %{"x-amz-copy-source" => path} = headers

    Map.put(
      req,
      :headers,
      Map.merge(headers, %{"x-amz-copy-source" => URI.decode_www_form(path)})
    )
  end

  defp do_hold_action(event, parms) do
    # either leave in folder or move to archive

    name = parms["name"]
    status = parms["status"] || "held"
    reason = parms["reason"] || "held per rule [#{name}]"
    current = Map.put(event, "location", "stage/" <> event["fname"])
    {status, reason, name, current}
  end

  defp update_message_status(status, reason, action, event) do
    msgid = event["msgid"]
    stime = DateTime.to_iso8601(DateTime.utc_now())

    ev = %{
      msgid: msgid,
      status: status,
      action: action,
      stime: stime,
      reason: reason
    }

    Amps.DB.insert("message_status", ev)
    location = event["location"] || ""
    # improve error handling here...
    if location != "" do
      {:ok, val} =
        Amps.DB.find_one_and_update(
          "messages",
          %{msgid: msgid},
          %{location: location, status: status, stime: stime}
        )

      IO.puts("updated status and location #{inspect(val)}")
    else
      {:ok, val} =
        Amps.DB.find_one_and_update(
          "messages",
          %{msgid: msgid},
          %{status: status, stime: stime}
        )

      IO.puts("updated status #{inspect(val)}")
    end
  end
end
