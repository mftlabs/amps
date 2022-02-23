defmodule AmpsUtil do
  alias Amps.DB
  require Logger

  def gettime() do
    DateTime.to_iso8601(DateTime.utc_now())
  end

  #  def keys_to_atom(inmap) do
  #    inmap |> Enum.map(fn {x, y} -> {String.to_atom(x), y} end)
  #  end

  def system_time do
    {mega, seconds, ms} = :os.timestamp()
    (mega * 1_000_000 + seconds) * 1000 + :erlang.round(ms / 1000)
  end

  def get_env(key, default \\ "") do
    Application.get_env(:amps, key, default)
  end

  def get_env_parm(section, key) do
    vals = Application.get_env(:amps, section)
    vals[key]
  end

  def get_parm(map, key, default, allow_sys_default \\ true, panic \\ false) do
    val = map[key] || default

    cond do
      val != "" ->
        val

      allow_sys_default ->
        bkey = String.to_atom(key)
        get_env(bkey) || "unknown parm: " <> key

      panic == false ->
        "unknown parm " <> key

      panic == true ->
        raise("unknown parm " <> key)
    end
  end

  def keys_to_atoms(mapin) do
    Map.new(mapin, fn {k, v} -> {String.to_atom(k), v} end)
  end

  def retry_delay(parms) do
    delay =
      parms["retry_delay"] ||
        Application.get_env(:amps, :retry_delay) ||
        120_000

    :timer.sleep(delay)
  end

  def get_id() do
    :uuid.uuid_to_string(:uuid.get_v4(), :binary_standard)
  end

  def parse_edi(msg) do
    try do
      val =
        if msg["fpath"] do
          {:ok, file} = File.read(msg["fpath"])
          {:ok, is} = :file.open(msg["fpath"], [:binary])
          {:ok, val} = :file.pread(is, 0, 200)
          val
        else
          String.slice(msg["data"], 0..200)
        end

      if String.length(val) < 120 do
        msg
      else
        # IO.puts("header: #{inspect(val)}")
        case String.slice(val, 0..2) do
          "UNA" ->
            parse_una(val)

          "UNB" ->
            parse_unb(val)

          "ISA" ->
            parse_isa(val)

          _ ->
            msg
        end
      end
    rescue
      MatchError -> {:error, "error parsing EDI"}
    end
  end

  defp parse_isa(leader) do
    if byte_size(leader) < 107 do
      %{}
    else
      hdr = String.slice(leader, 0..105)
      sep = String.slice(leader, 3..3)

      [_isa, _, _, _, _, squal, sender, rqual, receiver, date, time, _, _ver, icn, _, _test, _] =
        String.split(hdr, sep)

      tval = date <> ":" <> time
      sender = String.trim(squal <> ":" <> sender)
      receiver = String.trim(rqual <> ":" <> receiver)

      {:ok,
       %{
         "edistd" => "ISA",
         "edisender" => sender,
         "edireceiver" => receiver,
         "editime" => tval,
         "ediaprf" => "",
         "ediicn" => icn
       }}
    end
  end

  defp parse_una(leader) do
    una = String.slice(leader, 3..8)
    sub = String.slice(una, 0..0)
    elem = String.slice(una, 1..1)
    term = String.slice(una, 5..5)
    rest = String.slice(leader, 9..200)
    IO.inspect({una, sub, elem, term, rest})
    parse_unb(rest, sub, elem, term)
  end

  defp parse_unb(leader, sub \\ ":", elem \\ "+", term \\ "'") do
    [header | _rest] = leader |> String.replace("\n", "") |> String.split(term)
    IO.inspect(header)

    sections = [
      "edistd",
      "_type",
      "edisender",
      "edireceiver",
      "edidtime",
      "ediicn",
      "_pasw",
      "ediaprf",
      "_ppcode",
      "_ackreq",
      "_iai",
      "_testind"
    ]

    pieces = String.split(header, elem) |> Enum.take(8)

    {idx, meta} =
      Enum.reduce(pieces, {0, %{}}, fn piece, {index, acc} ->
        sec = Enum.at(sections, index)

        if !(String.first(sec) == "_") do
          {index + 1, Map.put(acc, sec, piece)}
        else
          {index + 1, acc}
        end
      end)

    sender = meta["edisender"] |> String.split(sub) |> List.first()
    receiver = meta["edireceiver"] |> String.split(sub) |> List.first()

    meta = meta |> Map.put("edisender", sender) |> Map.put("edireceiver", receiver)

    {:ok, meta}

    # IO.inspect(sender)
    # IO.inspect(receiver)
    # sender =

    # {:ok,
    #  %{
    #    "edistd" => "UNB",
    #    "edisender" => sender,
    #    "edireceiver" => receiver,
    #    "editime" => dtime,
    #    "ediaprf" => aprf,
    #    "ediicn" => icn
    #  }}
  end

  def get_path(msg) do
    case msg["temp"] do
      true ->
        msg["fpath"]

      _ ->
        root = Amps.Defaults.get("storage_root")
        root <> "/" <> msg["fpath"]
    end
  end

  def tempdir(session \\ nil) do
    temp = Amps.Defaults.get("storage_temp")

    case session do
      nil ->
        temp

      _ ->
        dir = temp <> "/" <> session

        case mkdir_p(dir) do
          :ok ->
            dir

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  def mkdir_p(path) do
    #    do_mkdir_p(IO.chardata_to_string(path))
    do_mkdir_p(path)
  end

  defp do_mkdir_p("/") do
    :ok
  end

  defp do_mkdir_p(path) do
    if :filelib.is_dir(path) do
      :ok
    else
      parent = :filename.dirname(path)

      if parent == path do
        # Protect against infinite loop
        {:error, :einval}
      else
        _ = do_mkdir_p(parent)

        case :file.make_dir(path) do
          {:error, :eexist} = error ->
            if :filelib.is_dir(path), do: :ok, else: error

          other ->
            other
        end
      end
    end
  end

  def rmdir(dirname) do
    case :file.list_dir(dirname) do
      {:ok, names} ->
        Enum.each(names, fn x -> :file.delete(dirname <> "/" <> to_string(x)) end)

      other ->
        {other}
    end

    :file.del_dir(dirname)
  end

  def format(format, msg) do
    {:ok, c} = Regex.compile("\{(.*?)\}")
    rlist = Regex.scan(c, format)
    IO.puts("format #{format} #{inspect(rlist)}")
    check(rlist, msg, format)
  end

  defp check([], _msg, fname) do
    fname
  end

  defp check([head | tail], msg, fname) do
    dt = DateTime.utc_now()
    [pat, name] = head
    IO.puts("format #{pat} #{name}")

    case name do
      "YYYY" ->
        fname = get_int_val(fname, pat, dt.year, 4)
        check(tail, msg, fname)

      "YY" ->
        str = Integer.to_string(dt.year)
        yy = String.slice(str, 2..3)
        fname = String.replace(fname, pat, yy)
        check(tail, msg, fname)

      "MM" ->
        fname = get_int_val(fname, pat, dt.month, 2)
        check(tail, msg, fname)

      "DD" ->
        fname = get_int_val(fname, pat, dt.day, 2)
        check(tail, msg, fname)

      "HH" ->
        fname = get_int_val(fname, pat, dt.hour, 2)
        check(tail, msg, fname)

      "mm" ->
        fname = get_int_val(fname, pat, dt.minute, 2)
        check(tail, msg, fname)

      "SS" ->
        fname = get_int_val(fname, pat, dt.second, 2)
        check(tail, msg, fname)

      "MS" ->
        {val, num} = dt.microsecond
        strval = val |> Integer.to_string() |> String.pad_leading(num, "0")
        ms = String.slice(strval, 0..2)
        fname = String.replace(fname, pat, ms)
        check(tail, msg, fname)

      _ ->
        rep = msg[name]

        if rep == nil do
          raise "file name cannot be formatted, missing message metadata [#{name}]"
        end

        fname = String.replace(fname, pat, rep)
        check(tail, msg, fname)
    end
  end

  defp get_int_val(fname, pat, val, pad) do
    strval = val |> Integer.to_string() |> String.pad_leading(pad, "0")
    String.replace(fname, pat, strval)
  end

  def get_stream(msg) do
    if Map.has_key?(msg, "data") do
      {:ok, stream} = msg["data"] |> StringIO.open()
      is = stream |> IO.binstream(:line)

      {:ok, ostream} = StringIO.open("")
      os = ostream |> IO.binstream(:line)

      {is, os, {ostream, nil}}
    else
      msgid = AmpsUtil.get_id()
      tfile = AmpsUtil.tempdir() <> "/" <> msgid <> ".out"

      {File.stream!(msg["fpath"]), File.stream!(tfile), {nil, tfile}}
    end
  end

  def get_istream(msg) do
    if Map.has_key?(msg, "data") do
      {:ok, stream} = msg["data"] |> StringIO.open()
      stream |> IO.binstream(:line)
    else
      File.stream!(msg["fpath"])
    end
  end

  def get_output_msg(msg, {ostream, tfile}, parms \\ %{}) do
    parent = msg["msgid"]
    msgid = AmpsUtil.get_id()

    msg =
      if ostream != nil do
        {_in, out} = StringIO.contents(ostream)
        StringIO.close(ostream)
        Map.merge(msg, %{"msgid" => msgid, "data" => out, "parent" => parent})
      else
        Map.merge(msg, %{"msgid" => msgid, "fpath" => tfile, "temp" => true, "parent" => parent})
      end

    if not blank?(parms["format"]) do
      fname = format(parms["format"], msg)
      Map.merge(msg, %{"fname" => fname})
    else
      msg
    end
  end

  def blank?(str_or_nil),
    do: "" == str_or_nil |> to_string() |> String.trim()

  def get_names(parms) do
    topic = parms["topic"]
    consumer = parms["name"] |> String.replace(" ", "_") |> String.downcase()

    [base, part, _other] = String.split(topic, ".", parts: 3)
    stream = AmpsUtil.get_env_parm(:streams, String.to_atom(base <> "." <> part))
    {stream, consumer}
  end

  def create_consumer(stream, name, filter, opts \\ %{}) do
    gnat = Process.whereis(:gnat)

    case Jetstream.API.Consumer.info(gnat, stream, name) do
      {:ok, res} ->
        Logger.info("Consumer #{name} Already Exists")
        Logger.debug(res)

      {:error, error} ->
        Logger.info(error)
        Logger.info("Creating Consumer #{name}")

        cons =
          Map.merge(
            %Jetstream.API.Consumer{
              name: name,
              stream_name: stream,
              filter_subject: filter
            },
            opts
          )

        Logger.debug(cons)

        case Jetstream.API.Consumer.create(
               gnat,
               cons
             ) do
          {:ok, res} ->
            Logger.debug(res)
            Logger.info("Created Consumer #{name}")

          {:error, error} ->
            Logger.error(error)
        end
    end
  end

  def delete_consumer(stream, name) do
    gnat = Process.whereis(:gnat)

    case Jetstream.API.Consumer.delete(gnat, stream, name) do
      :ok ->
        :ok

      {:error, error} ->
        IO.inspect(error)
    end
  end

  def get_key(id) do
    with {:ok, key} <- VaultDatabase.read("keys", id) do
      key["data"]
    end
  end

  def get_kafka_auth(args, provider) do
    {cacertfile, certfile, keyfile} =
      if String.contains?(provider["auth"], "SSL") do
        cacertfile = Path.join(AmpsUtil.tempdir(args["name"]), "cacert")
        File.write(cacertfile, AmpsUtil.get_key(provider["cacert"]))
        certfile = Path.join(AmpsUtil.tempdir(args["name"]), "cert")
        File.write(certfile, AmpsUtil.get_key(provider["cert"]))
        keyfile = Path.join(AmpsUtil.tempdir(args["name"]), "key")
        File.write(keyfile, AmpsUtil.get_key(provider["key"]))
        {cacertfile, certfile, keyfile}
      else
        {nil, nil, nil}
      end

    config =
      case provider["auth"] do
        "SASL_PLAINTEXT" ->
          [
            # ssl: true,
            sasl:
              {String.to_atom(provider["mechanism"]), provider["username"], provider["password"]}
          ]

        "SASL_SSL" ->
          [
            ssl: [
              cacertfile: cacertfile,
              certfile: certfile,
              keyfile: keyfile
              # verify: :verify_peer
            ],
            sasl:
              {String.to_existing_atom(provider["mechanism"]), provider["username"],
               provider["password"]}
          ]

        "SSL" ->
          [
            ssl: [
              cacertfile: cacertfile,
              certfile: certfile,
              keyfile: keyfile
              # verify: :verify_peer
            ]
          ]

        "NONE" ->
          []
      end
  end

  def match(file, parms) do
    if parms["regex"] do
      if regex_match(file, parms["pattern"]) do
        IO.puts("found match on #{file} and #{parms["pattern"]}")
        true
      else
        IO.puts("didn't match on #{file} and #{parms["pattern"]}")
        false
      end
    else
      if :glob.matches(file, parms["pattern"]) do
        IO.puts("found match on #{file} and #{parms["pattern"]}")
        true
      else
        IO.puts("didn't match on #{file} and #{parms["pattern"]}")

        false
      end
    end
  end

  def regex_match(val, pattern) do
    case Regex.compile(pattern) do
      {:ok, re} ->
        Regex.match?(re, val)

      _ ->
        IO.puts("bad regex, failing")
        false
    end
  end
end
