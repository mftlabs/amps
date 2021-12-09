defmodule KafkaPut do
  require Logger

  def run(msg, parms, _state) do
    IO.inspect(parms)

    config = AmpsUtil.get_kafka_auth(parms)

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
             endpoints: [{parms["host"], parms["port"]}],
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
