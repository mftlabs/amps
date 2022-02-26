defmodule KafkaPut do
  require Logger
  alias Amps.DB

  def run(msg, parms, _state) do
    provider = DB.find_one("providers", %{"_id" => parms["provider"]})

    auth_opts = AmpsUtil.get_kafka_auth(parms, provider)
    worker = String.to_atom(parms["name"] <> "-" <> AmpsUtil.get_id())

    value =
      if msg["data"] do
        msg["data"]
      else
        {:ok, binary} = File.read(msg["fpath"])
        binary
      end

    KafkaEx.create_worker(
      worker,
      [
        uris:
          Enum.map(
            provider["brokers"],
            fn %{"host" => host, "port" => port} ->
              {host, port}
            end
          )
      ] ++ auth_opts
    )

    KafkaEx.produce(
      %KafkaEx.Protocol.Produce.Request{
        topic: parms["topic"],
        partition: 0,
        required_acks: 1,
        messages: [%KafkaEx.Protocol.Produce.Message{value: value}]
      },
      worker_name: worker
    )

    # KafkaEx.stop_worker(worker)

    # connection = String.to_atom("elsa_" <> parms["name"])

    # IO.inspect(value)

    # with {:ok, pid} <-
    #        Elsa.Supervisor.start_link(
    #          config: config,
    #          endpoints:
    #            Enum.map(
    #              provider["brokers"],
    #              fn %{"host" => host, "port" => port} ->
    #                {host, port}
    #              end
    #            ),
    #          connection: connection,
    #          producer: [
    #            topic: parms["topic"]
    #          ]
    #        ) do
    #   Elsa.Producer.ready?(connection)
    #   Elsa.Producer.produce(connection, parms["topic"], value)
    #   Process.unlink(pid)
    #   Supervisor.stop(pid)
    # end
  end
end
