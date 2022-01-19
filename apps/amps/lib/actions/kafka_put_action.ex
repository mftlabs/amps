defmodule KafkaPut do
  require Logger
  alias AmpsWeb.DB

  def run(msg, parms, _state) do
    provider = DB.find_one("providers", %{"_id" => parms["provider"]})

    config = AmpsUtil.get_kafka_auth(parms, provider)

    connection = String.to_atom("elsa_" <> parms["name"])

    value =
      if msg["data"] do
        msg["data"]
      else
        {:ok, binary} = File.read(msg["fpath"])
        binary
      end

    IO.inspect(value)

    with {:ok, pid} <-
           Elsa.Supervisor.start_link(
             config: config,
             endpoints:
               Enum.map(
                 provider["brokers"],
                 fn %{"host" => host, "port" => port} ->
                   {host, port}
                 end
               ),
             connection: connection,
             producer: [
               topic: parms["topic"]
             ]
           ) do
      Elsa.Producer.ready?(connection)
      Elsa.Producer.produce(connection, parms["topic"], value)
      Process.unlink(pid)
      Supervisor.stop(pid)
    end
  end
end
