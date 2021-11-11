defmodule Amps.SftpServer do
  use GenServer
  require Logger

  @moduledoc """
    docs here
  """

  # client

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  def child_spec(opts) do
    name = opts[:name]

    %{
      id: name,
      start: {__MODULE__, :start_link, [opts]}
    }
  end

  def stop_daemon(pid, options \\ nil) do
    GenServer.call(pid, {:stop_daemon, options})
  end

  def start_daemon(pid, options \\ nil) do
    GenServer.call(pid, {:start_daemon, options})
  end

  def status(pid, options \\ nil) do
    GenServer.call(pid, {:status, options})
  end

  def state(pid) do
    GenServer.call(pid, {:state})
  end

  # server

  defp dummy_shell(_args, _opts) do
  end

  defp authenticate(handler) do
    fn username, password, peer_address, state ->
      accepted =
        case handler do
          {module, fun} ->
            apply(module, fun, [username, password, [peer_address: peer_address]])

            #          fun ->
            #            fun.(username, password, peer_address: peer_address)
        end

      {accepted, state}
    end
  end

  defp init_daemon(options) do
    Logger.info("Starting SFTP daemon on #{options["port"]}")

    daemon_opts = [
      shell: &dummy_shell/2,
      subsystems: [
        Amps.SftpChannel.subsystem_spec(
          file_handler: {Amps.SftpHandler, []},
          cwd: '/'
        )
      ]
    ]

    name = options["name"] || ""
    daemon_opts = Keyword.put(daemon_opts, :key_cb, {AmpsKeyCallback, [name]})
    daemon_opts = Keyword.put(daemon_opts, :pwdfun, authenticate({AmpsAuth, :check_cred}))

    case :ssh.daemon(options["port"], daemon_opts) do
      {:ok, d_ref} ->
        {:ok, info} = :ssh.daemon_info(d_ref)
        map = Enum.into(info, %{})
        profile = map[:profile]
        ref = Process.monitor(profile)

        {:ok, profile, ref, options}

      # old code not compiling
      #      {:ok, pid} ->
      #        ref = Process.monitor(pid)
      #        {:ok, pid, ref, options}

      any ->
        IO.puts("process monitor not started #{inspect(any)}")
        any
    end
  end

  def init(args) do
    Process.flag(:trap_exit, true)
    options = args[:parms]
    :ok = :ssh.start()

    case options do
      nil ->
        {:ok, %{options: options, daemons: []}}

      env ->
        case init_daemon(env) do
          {:ok, pid, ref, options} ->
            {:ok, %{options: options, daemons: [%{pid: pid, ref: ref, options: options}]}}

          any ->
            any
        end
    end
  end

  def handle_info({:DOWN, _ref, :process, pid, _reason}, state) do
    daemon = find_daemon_by_pid(state.daemons, pid)

    if daemon do
      Logger.info("Restarting SSH daemon: #{inspect(daemon.options)}")
      GenServer.cast(self(), {:start_daemon, daemon.options})
      {:noreply, state |> Map.put(:daemons, remove_daemon(state.daemons, pid))}
    else
      {:noreply, state}
    end
  end

  def handle_info({:stop_ssh_daemon, pid}, state) do
    :ssh.stop_daemon(pid)
    {:noreply, state}
  end

  def handle_info(_msg, state) do
    {:noreply, state}
  end

  def handle_call({:state}, _from, state) do
    {:reply, state, state}
  end

  def handle_call({:status, options}, _from, state) do
    opts = options || state.options
    daemon = find_daemon(state.daemons, opts)

    if daemon do
      {:reply, :ssh.daemon_info(daemon.pid), state}
    else
      {:reply, {:error, :down}, state}
    end
  end

  def handle_call({:stop_daemon, options}, _from, state) do
    opts = options || state.options
    daemon = find_daemon(state.daemons, opts)

    if daemon do
      Process.send(self(), {:stop_ssh_daemon, daemon.pid}, [])

      {:reply, {:ok, daemon},
       state |> Map.put(:daemons, remove_daemon(state.daemons, daemon.pid))}
    else
      {:reply, {:error, :down}, state}
    end
  end

  def handle_call({:start_daemon, options}, _from, state) do
    opts = options || state.options

    case init_daemon(opts) do
      {:ok, pid, ref, options} ->
        {:reply, {:ok, pid},
         state |> Map.put(:daemons, [%{pid: pid, ref: ref, options: options} | state.daemons])}

      any ->
        {:reply, any, state}
    end
  end

  def terminate(_reason, state) do
    state.daemons
    |> Enum.each(fn d ->
      :ssh.stop_daemon(d.pid)
    end)
  end

  def find_daemon(daemons, opts) do
    port = opts[:port]
    daemons |> Enum.find(&(&1.options[:port] == port))
  end

  def find_daemon_by_pid(daemons, pid) do
    daemons |> Enum.find(&(&1.pid == pid))
  end

  defp remove_daemon(daemons, pid) do
    daemons |> Enum.filter(&(&1.pid != pid))
  end

  def handle_cast({:start_daemon, options}, state) do
    opts = options || state.options

    case init_daemon(opts) do
      {:ok, pid, ref, options} ->
        {:noreply,
         state |> Map.put(:daemons, [%{pid: pid, ref: ref, options: options} | state.daemons])}

      any ->
        Logger.error("Failed to start daemon: #{inspect(any)}")
        {:noreply, state}
    end
  end
end

defmodule Amps.SftpChannel do
  # @behaviour :ssh_server_channel

  require Logger
  require Record

  Record.defrecord(:state, Record.extract(:state, from_lib: "ssh/src/ssh_sftpd.erl"))
  Record.defrecord(:ssh_xfer, Record.extract(:ssh_xfer, from_lib: "ssh/src/ssh_xfer.erl"))

  def subsystem_spec(options) do
    {'sftp', {Amps.SftpChannel, options}}
  end

  def init(options) do
    :ssh_sftpd.init(options)
  end

  def handle_msg(msg, state) do
    :ssh_sftpd.handle_msg(msg, state)
  end

  defp to_record(record) do
    Enum.map(record, fn {_k, v} -> v end) |> List.insert_at(0, :state) |> List.to_tuple()
  end

  defp populate_file_state(state) do
    file_state = state[:file_state]

    if file_state[:user] do
      file_state
    else
      user_root_dir = file_state[:user_root_dir]

      xf = ssh_xfer(state[:xf])
      [user: username] = :ssh.connection_info(xf[:cm], [:user])

      root_path =
        if is_function(user_root_dir) do
          user_root_dir.(username)
        else
          "#{user_root_dir}/#{username}"
        end

      file_state
      #      |> List.keystore(:event_handler, 0, {:event_handler, event_handler})
      |> List.keystore(:user, 0, {:user, username})
      |> List.keystore(:root_path, 0, {:root_path, root_path})
      |> List.keystore(:flist, 0, {:flist, []})
    end
  end

  def handle_ssh_msg(msg, state) do
    s = state(state)
    file_state = populate_file_state(s)
    new_state = List.keystore(s, :file_state, 0, {:file_state, file_state})
    :ssh_sftpd.handle_ssh_msg(msg, to_record(new_state))
  end

  def terminate(reason, state) do
    :ssh_sftpd.terminate(reason, state)
  end
end

defmodule Amps.SftpHandler do
  def close(io_device, state) do
    # does this get closed on download?  If so we need to check
    # if upload or download
    download = state[:download]
    nstate = List.keystore(state, :download, 0, {:download, nil})
    # download
    # upload
    if download != nil do
      IO.puts("close download")
      result = :file.close(io_device)
      # using temp file
      if download != "" do
        :file.delete(download)
      end

      {result, nstate}
    else
      IO.puts("close upload")
      # check result
      _result = :file.close(io_device)
      user = to_string(state[:user])

      msg = %{
        "mailbox" => user,
        "service" => "sftpd",
        "msgid" => state[:msgid],
        "fsize" => state[:fsize],
        "fpath" => state[:fpath],
        "fname" => state[:fname],
        "dirname" => state[:dirname],
        "temp" => true,
        "ftime" => DateTime.to_iso8601(DateTime.utc_now())
      }

      opt = state[:options]
      service = opt[:name]
      user = state[:user]
      topic = "amps.svc.#{service}.#{user}"
      Amps.EventPublisher.send(topic, Poison.encode!(msg))
    end
  end

  def delete(path, state) do
    mailbox = to_string(state[:user])
    msgid = state[:current]["msgid"]
    fname = Path.basename(path)

    if fname == state[:current]["fname"] do
      {AmpsMailbox.delete_message(mailbox, msgid), state}
    end

    nstate = List.keystore(state, :current, 0, {:current, %{}})
    {:ok, nstate}
  end

  def del_dir(_path, state) do
    {:ok, state}
  end

  def get_cwd(state) do
    IO.puts("get_cwd: #{inspect(state)}")
    {{:ok, '/'}, state}
  end

  def is_dir(abs_path, state) do
    IO.puts("is_dir: #{inspect(state)}")

    if abs_path == '/' do
      {true, state}
    else
      {false, state}
    end
  end

  def list_dir(_abs_path, state) do
    IO.puts("ls_dir: #{inspect(state)}")
    limit = 100
    flist = AmpsMailbox.list_messages(to_string(state[:user]), limit)
    IO.inspect(flist)
    # hlist = Enum.into(flist, %{})
    newstate = List.keystore(state, :flist, 0, {:flist, flist})

    # need to format vals !!!!
    vals =
      Enum.map(flist, fn x ->
        x["fname"] || "message.dat"
        #        {x["fname"] || "message.dat", x["fsize"] || "99", x["qtime"]}
      end)

    {{:ok, vals}, newstate}
  end

  #  defp get_name(val) do
  #    nval = String.replace(val, "inbox/", "")
  #    String.split(nval, "||")[0]
  #  end

  def make_dir(_dir, state) do
    {:ok, state}
  end

  def make_symlink(_path2, _path, state) do
    IO.puts("make symlink called, not supported")
    {{:error, "not supported"}, state}
  end

  def open(path, flags, state) do
    IO.puts("open called #{path}")

    case Enum.find(flags, :nak, fn x -> x == :write end) do
      :write ->
        # put

        fname = Path.basename(path)
        msgid = AmpsUtil.get_id()
        fpath = AmpsUtil.get_env(:storage_temp) <> "/" <> msgid
        dirname = Path.dirname(path)

        case :file.open(fpath, flags) do
          {:ok, pid} ->
            newstate =
              List.keystore(state, :fname, 0, {:fname, fname})
              |> List.keystore(:msgid, 0, {:msgid, msgid})
              |> List.keystore(:fpath, 0, {:fpath, fpath})
              |> List.keystore(:dirname, 0, {:dirname, dirname})
              |> List.keystore(:fsize, 0, {:fsize, 0})
              |> List.keystore(:flist, 0, {:flist, nil})

            {{:ok, pid}, newstate}

          other ->
            {other, state}
        end

      _ ->
        # get
        IO.puts("starting get")
        mailbox = to_string(state[:user])
        bname = Path.basename(path)
        msg = state[:current]

        if msg["fname"] == bname do
          get_file(msg, flags, state)
        else
          case AmpsMailbox.get_message(mailbox, bname) do
            nil ->
              IO.puts("not found")
              {{:error, :enoent}, state}

            msg ->
              get_file(msg, flags, state)
          end
        end
    end
  end

  def get_file(msg, flags, state) do
    path = AmpsUtil.get_path(msg)

    case File.stat(path) do
      {:ok, _result} ->
        # have data in cache
        nstate = List.keystore(state, :download, 0, {:download, ""})
        {:file.open(path, flags), nstate}

      _err ->
        # get data
        nstate = List.keystore(state, :download, 0, {:download, ""})
        {{:error, "file not found"}, nstate}
    end
  end

  def position(io_device, offs, state) do
    {:file.position(io_device, offs), state}
  end

  def read(io_device, len, state) do
    {:file.read(io_device, len), state}
  end

  def read_link(_path, state) do
    # never a link
    IO.puts("read_link")

    {{:error, :einval}, state}
  end

  def read_link_info(path, state) do
    IO.puts("read_link_info")
    fname = Path.basename(path)
    mailbox = to_string(state[:user])
    IO.puts("read_link_info #{mailbox} #{fname}")
    #    msg = Enum.find(flist, nil, fn x -> x["fname"] == fname end)
    case AmpsMailbox.get_message(mailbox, fname) do
      nil ->
        ftime = DateTime.utc_now()
        finfo = get_file_info(0, ftime)
        {{:ok, finfo}, state}

      msg ->
        IO.puts("found")
        fsize = msg["fsize"] || 99
        ft = msg["ftime"] || DateTime.to_iso8601(DateTime.utc_now())
        IO.inspect(ft)
        {:ok, ftime, _off} = DateTime.from_iso8601(ft)
        finfo = get_file_info(fsize, ftime)
        nstate = List.keystore(state, :current, 0, {:current, msg})
        {{:ok, finfo}, nstate}
    end
  end

  def read_file_info(path, state) do
    IO.puts("called file info #{path}")
    read_link_info(path, state)
  end

  def get_file_info(fsize, ftime) do
    IO.puts("get_file_info")

    {:file_info, fsize, :regular, :read_write,
     {{ftime.year, ftime.month, ftime.day}, {ftime.hour, ftime.minute, ftime.second}},
     {{ftime.year, ftime.month, ftime.day}, {ftime.hour, ftime.minute, ftime.second}},
     {{ftime.year, ftime.month, ftime.day}, {ftime.hour, ftime.minute, ftime.second}}, 33206, 1,
     3, 0, 0, 0, 0}
  end

  def rename(_path, _path2, state) do
    IO.puts("rename called, not supported")
    {:ok, state}
  end

  def write(io_device, data, state) do
    total = String.to_integer(to_string(state[:fsize])) + byte_size(data)
    newstate = List.keystore(state, :fsize, 0, {:fsize, total})
    {:file.write(io_device, data), newstate}
  end

  def write_file_info(_path, _info, state) do
    IO.puts("write_file_info not supported")
    {:ok, state}
  end
end

defmodule AmpsKeyCallback do
  #  @behaviour :ssh_server_key_api

  def host_key(algorithm, opts) do
    al = String.to_atom("ecdsa-sha2-nistp256")

    if algorithm == al do
      val = Enum.into(opts, %{})
      [name] = val[:key_cb_private]
      # IO.puts("sftp svc: #{name}")
      cfg = AmpsDatabase.get_config(name)
      val = cfg["server_key"]
      [data] = :public_key.pem_decode(val)
      dec = :public_key.pem_entry_decode(data)
      {:ok, dec}
    end
  end

  def is_auth_key(_publicKey, _user, _daemonOptions) do
    true
  end
end
