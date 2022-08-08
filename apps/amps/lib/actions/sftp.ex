defmodule Amps.Actions.SftpPut do
  require Logger

  @doc """

  sftp client action parms may contain the following...

  connect_timeout - opt
  host - required
  password - opt or key_name
  key_name - opt or password
  operation_timeout - opt
  port - required
  user - required

  """

  def run(msg, parms, {_state, env}) do
    Logger.info("SFTP action called")

    config = get_config(parms)
    session = %{"session_id" => AmpsUtil.get_id(), "source" => "workflow"}

    case SFTPClient.connect(config) do
      {:ok, conn} ->
        Logger.info("sftp connected/logged in")

        try do
          deliver_sftp([msg], parms, conn, env)
          Logger.info("SFTP session ended successfully")
          Logger.info("sftp connected/logged in")
          Logger.info("session ended normally")

          SFTPClient.disconnect(conn)
          {:ok, "Delivered"}
        catch
          error ->
            SFTPClient.disconnect(conn)
            AmpsUtil.retry_delay(parms)

            AmpsEvents.session_warning(__MODULE__, session, %{
              text: "sftp failed #{inspect(error)}"
            })

            raise "SFTP session failed put #{inspect(error)}"
        end

      error ->
        AmpsUtil.retry_delay(parms)
        raise "SFTP session failed put #{inspect(error)}"
    end
  end

  def get_config(parms) do
    auth = parms[:auth] || "password"

    if auth == "password" do
      aparms = %{
        host: parms["host"],
        port: parms["port"],
        user: parms["user"],
        password: parms["password"]
      }

      SFTPClient.Config.new(aparms)
    else
      cparms =
        Map.merge(parms, %{"key_cb" => Amps.SSHKeyProvider, "user_dir" => parms["key_name"]})

      aparms = AmpsUtil.keys_to_atoms(cparms)
      SFTPClient.Config.new(aparms)
    end
  end

  defp deliver_sftp([], _parms, _conn, _env) do
    Logger.info("sftp done")
    :ok
  end

  defp deliver_sftp([msg | tail], parms, conn, env) do
    Logger.info("sending sftp message #{inspect(msg)}")
    fspec = parms["format"] || "{fname}"

    {is, _os, _val} = AmpsUtil.get_stream(msg, env)
    fname = AmpsUtil.format(fspec, msg)
    fpath = Path.join(parms["folder"], fname)
    Logger.info("sending file to #{fpath}")

    :ok =
      is
      |> Stream.into(SFTPClient.stream_file!(conn, fpath))
      |> Stream.run()

    deliver_sftp(tail, parms, conn, env)
  end
end

defmodule Amps.SSHKeyProvider do
  @moduledoc """
  A provider that loads keys for authentication from the given location.
  Implements the `:ssh_client_key_api` behavior.
  """

  # @behaviour :ssh_client_key_api

  require Logger

  if String.to_integer(System.otp_release()) >= 23 do
    @impl true
    defdelegate add_host_key(host, port, public_key, opts), to: :ssh_file

    # @impl true
    defdelegate is_host_key(key, host, port, algorithm, opts), to: :ssh_file
  else
    # @impl true
    defdelegate add_host_key(host, public_key, opts), to: :ssh_file

    #  @impl true
    defdelegate is_host_key(key, host, algorithm, opts), to: :ssh_file
  end

  # @impl true
  def user_key(_, opts) do
    keyname = opts[:user_dir]
    config = AmpsDatabase.get_config(keyname)
    priv_key = config["ssh_private_key"]
    decoded_pem = priv_key |> :public_key.pem_decode() |> List.first()
    {:ok, :public_key.pem_entry_decode(decoded_pem)}
  end
end
