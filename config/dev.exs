import Config

# For development, we disable any cache and enable
# debugging and code reloading.
#
# The watchers configuration can be used to run external
# watchers to your application. For example, we use it
# with esbuild to bundle .js and .css sources.

config :amps,
  secret_key_base: "zwqaerPAMO2UHeKA5ovn+bq0QiaBtrjOtLNEl/pf2WIx1QdWUrg62A6B6AJWp9ZW"

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"
