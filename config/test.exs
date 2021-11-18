import Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :amps_portal, AmpsPortal.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "3nOR8993EE48opsXL4tho24dGipKQ+EVD2yP4Udl470x2yOxYgI99H16QtEpPh79",
  server: false

# We don't run a server during test. If one is required,
# you can enable the server option below.

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :amps_web, AmpsWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "p5jRHg2qmR4aYJ2CgAnkAWqJXFYWRyUib19G83MIU2JLB3YA4E/1ruHQATCg3q6B",
  server: false

# Print only warnings and errors during test
config :logger, level: :warn

# In test we don't send emails.
config :amps, Amps.Mailer, adapter: Swoosh.Adapters.Test

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime
