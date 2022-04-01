defmodule Amps.Startup do
  use Task
  require Vault
  import Argon2
  require Logger

  def start_link(_arg) do
    Task.start_link(__MODULE__, :startup, [])
  end

  def startup() do
    nats()
  end

  def nats() do
    gnat = Process.whereis(:gnat)

    create_streams(gnat)
    # create_action_consumers(gnat)
  end

  def create_streams(gnat) do
    streams = Application.get_env(:amps, :streams)
    # Logger.info("streams")
    # IO.inspect(streams)

    streams = Enum.into(streams, %{})
    # IO.inspect(streams)

    Enum.each(streams, fn {subjects, name} ->
      subjects = Atom.to_string(subjects)

      create_stream(name, subjects)
    end)
  end

  def create_stream(name, subjects) do
    case Jetstream.API.Stream.info(:gnat, name) do
      {:ok, res} ->
        Logger.info(name <> " Stream Exists")

      # IO.inspect(res)

      {:error, error} ->
        # IO.inspect(error)
        Logger.info("Creating Stream " <> name)
        subjects = subjects <> ".>"

        case Jetstream.API.Stream.create(:gnat, %Jetstream.API.Stream{
               name: name,
               storage: :file,
               subjects: [subjects]
             }) do
          {:ok, res} ->
            Logger.info("Created Stream " <> name)

          # IO.inspect(res)

          {:error, error} ->
            Logger.info("Couldn't Create Stream " <> name)
            Logger.error(error)

            # IO.inspect(error)
        end
    end
  end
end
