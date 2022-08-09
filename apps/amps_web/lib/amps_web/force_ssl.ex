defmodule AmpsWeb.UnplugPredicates.ForceSSL do
  @behaviour Unplug.Predicate

  @impl true
  def call(conn, _) do
    Application.get_env(:amps, :use_ssl) && Application.get_env(:amps, :force_ssl)
  end
end
