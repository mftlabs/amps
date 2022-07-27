defmodule Amps.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    Application.put_env(:amps, :initialized, false)
    task = Task.async(Amps.Startup, :startup, [])
    Task.await(task, 300_000)

    children = [
      Gnat.ConnectionSupervisor.child_spec(get_gnat_config()),
      {Phoenix.PubSub, name: Amps.PubSub},
      {Mnesiac.Supervisor,[[name: Amps.MnesiacSupervisor]]},
      {Pow.Store.Backend.MnesiaCache, extra_db_nodes: {Node, :list, []}},
      {Mongo, get_mongo_spec()},
      Pow.Store.Backend.MnesiaCache.Unsplit,
      Amps.SvcHandler,
      Amps.SvcSupervisor,
      Amps.SvcManager,
      Amps.EnvHandler,
      Amps.EnvSupervisor,
      Amps.EnvManager,
      Amps.ArchiveSupervisor,
      Amps.ArchiveManager,
      get_spec("event_handler", 3,"amps.events.*"),
      get_spec("ufa_logs", 3,"amps.events.ufa.*.logs"),
      get_spec("service_logs", 3,"amps.events.svcs.*.logs"),
      get_spec("data_handler", 3, "amps.data.>", true, "message_events"),
      get_spec("service_handler", 3, "amps.svcs.>", true, "message_events"),
      get_spec("action_handler", 3, "amps.actions.>", true, "message_events"),
      get_spec("object_handler", 3, "amps.objects.>", true, "message_events"),
      get_spec("mailbox_handler", 3, "amps.mailbox.>", true, ["message_events", "mailbox"], get_doc()),


#      AmpsWeb.Vault,
      # add this to db config...

      # worker pool to run python actions
      :poolboy.child_spec(
        :worker,
        Application.get_env(:amps, :pyworker)[:config]
      )
    ]

    children =
      if Application.get_env(:amps, :use_ssl) and Application.get_env(:amps, :gen_certs) do
        children ++ [{Amps.SSL, Amps.Proxy}]
      else
        children ++ [Amps.Proxy]
      end

    res =
      Supervisor.start_link(children,
        strategy: :one_for_one,
        name: Amps.Supervisor
      )

    Application.put_env(:amps, :initialized, true)
    res
  end

  defp get_gnat_config() do
    gnatconf = Application.fetch_env!(:amps, :gnat)
    %{
      # (required) the registered named you want to give the Gnat connection
      name: :gnat,
      # number of milliseconds to wait between consecutive reconnect attempts (default: 2_000)
      backoff_period: 4_000,
      connection_settings: [
        %{host: gnatconf[:host], port: gnatconf[:port]}
      ]
    }
  end

  defp get_mongo_spec() do
    [
      name: :mongo,
      database: "amps",
      url: System.get_env("AMPS_MONGO_ADDR", "mongodb://localhost:27017/amps"),
      pool_size: 15
    ]
  end

  defp get_spec(name, count, topic, receipt_flag \\ false, index \\ nil, doc \\ nil) do
    %{
      id: name,
      start:
        {Amps.HistoryHandler, :start_link,
         [
           %{
             "name" => name,
             "subs_count" => count,
             "topic" => topic,
             "receipt" => receipt_flag,
             "index" => index,
             "doc" => doc
           }
         ]}
    }
  end

  defp get_doc() do
    fn topic, data ->
      pieces =
        String.split(topic, ".")
        |> Enum.take(-2)

      Map.merge(data, %{
        "recipient" => Enum.at(pieces, 0),
        "status" => "mailboxed",
        "mailbox" => Enum.at(pieces, 1),
        "mtime" => DateTime.utc_now() |> DateTime.to_iso8601()
      })
    end
  end
end
