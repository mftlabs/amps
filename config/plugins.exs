# import Config

# config :amps,
#   plugins: [Amps.Kafka]

# config :amps, :services, kafka: Amps.Services.KafkaConsumer
# config :amps, :actions, kafkaput: Amps.Actions.KafkaPut

# config :kafka_ex,
#   kafka_version: "kayrock",
#   disable_default_worker: true

# config :amps_web, :headers, %{
#   "actions" => %{
#     "types" => %{"kafkaput" => ["provider", "topic"]}
#   },
#   "providers" => %{
#     "types" => %{
#       "kafka" => [
#         "brokers",
#         "auth",
#         "mechanism",
#         "username",
#         "password",
#         "cacert",
#         "cert",
#         "key"
#       ]
#     }
#   },
#   "services" => %{
#     "types" => %{
#       "kafka" => ["provider", "topics", "format", "communication"]
#     }
#   }
# }
