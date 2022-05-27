defmodule Amps.Startup do
  use Task
  require Vault
  #import Argon2
  require Logger

  def start_link(_arg) do
    Task.start_link(__MODULE__, :startup, [])
  end

  def startup() do
    nats()
    # python()
  end

  def nats() do
    gnatconf = Application.fetch_env!(:amps, :gnat)

    {:ok, gnat} = Gnat.start_link(%{host: gnatconf[:host], port: gnatconf[:port]})
    # gnat = Process.whereis(gnat)

    create_streams(gnat)
    # create_action_consumers(gnat)
  end

  def python() do
    args = [
      "-m",
      "pip",
      "install",
      "--user",
      "-r",
      Path.join([:code.priv_dir(:amps), "py", "requirements.txt"])
    ]

    Logger.info("Installing python dependencies from requirements.txt")

    {res, code} = System.cmd("python3", args, stderr_to_stdout: true)

    case code do
      0 ->
        Logger.info("Successfully Installed python package requirements")
        res

      _ ->
        Logger.error("Failed to install python package requirements")
        res
    end
  end

  def create_streams(gnat) do
    streams = Application.get_env(:amps, :streams)
    # Logger.info("streams")
    # IO.inspect(streams)

    streams = Enum.into(streams, %{})
    # IO.inspect(streams)

    Enum.each(streams, fn {subjects, name} ->
      subjects = Atom.to_string(subjects)

      create_stream(gnat, name, subjects, 0)
    end)
  end

  def create_stream(gnat, name, subjects, retries) do
    if retries < 5 do
      case Jetstream.API.Stream.info(gnat, name) do
        {:ok, _res} ->
          Logger.info(name <> " Stream Exists")

        # IO.inspect(res)

        {:error, _error} ->
          # IO.inspect(error)
          Logger.info("Creating Stream " <> name)
          subjects = subjects <> ".>"

          case Jetstream.API.Stream.create(gnat, %Jetstream.API.Stream{
                 name: name,
                 storage: :file,
                 subjects: [subjects]
               }) do
            {:ok, _res} ->
              Logger.info("Created Stream " <> name)

            # IO.inspect(res)

            {:error, error} ->
              Logger.info("Couldn't Create Stream " <> name)
              Logger.error(error)
              Process.sleep(1000)
              create_stream(gnat, name, subjects, retries + 1)

              # IO.inspect(error)
          end
      end
    end
  end
end
