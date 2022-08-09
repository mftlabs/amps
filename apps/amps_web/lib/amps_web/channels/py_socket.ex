defmodule AmpsWeb.PySocket do
  @behaviour Phoenix.Socket.Transport
  alias AmpsWeb.Python
  alias AmpsWeb.APIAuthPlug
  import Plug.Conn

  def child_spec(opts) do
    # We won't spawn any process, so let's return a dummy task
    %{
      id: __MODULE__,
      start: {Task, :start_link, [fn -> :ok end]},
      restart: :transient
    }
  end

  def connect(state) do
    # config = state.options[:connect_info][:pow_config]
    # token = state.params["token"]

    # %Plug.Conn{secret_key_base: state.endpoint.config(:secret_key_base)}
    # |> APIAuthPlug.get_credentials(token, config)
    # |> case do
    #   nil ->
    #     :error

    #   {user, metadata} ->
    #     fingerprint = Keyword.fetch!(metadata, :fingerprint)
    #     user = DB.find_by_id("admin", user.id)

    #     state =
    #       state
    #       |> Map.put(:session_fingerprint, fingerprint)
    #       |> Map.put(:user_id, user.id)
    #       |> Map.put(:env, user["config"]["env"])

    {:ok, state}
    # end
  end

  def init(state) do
    {:ok, session} =
      :pythra.start_link([
        # String.to_charlist(AmpsUtil.get_mod_path(state.env)),
        String.to_charlist(Path.join(AmpsUtil.get_mod_path(), "util")),
        String.to_charlist(Path.join([:code.priv_dir(:amps_web), "python"]))
      ])

    :pythra.pythra_call(session, :server, :start_server, [self()])

    state = Map.put(state, :pyserver, session)

    {:ok, state}
  end

  def handle_in({text, _opts}, state) do
    :pythra.cast(state.pyserver, text)
    {:ok, state}
  end

  def handle_info({:python, text}, state) do
    {:push, {:text, text}, state}
  end

  def handle_info(_, state) do
    {:ok, state}
  end

  def terminate(_reason, state) do
    if Map.has_key?(state, :pyserver) do
      :pythra.stop(state.pyserver)
    end

    :ok
  end
end
