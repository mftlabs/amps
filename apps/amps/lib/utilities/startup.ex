defmodule Amps.Startup do
  use Task
  require Vault
  import Argon2

  def start_link(_arg) do
    Task.start_link(__MODULE__, :startup, [])
  end

  def startup() do
    nats()
  end

  def nats() do
    gnat = Process.whereis(:gnat)

    create_streams(gnat)
    create_action_consumers(gnat)
  end

  def create_streams(gnat) do
    streams = Application.get_env(:amps, :streams)
    IO.puts("streams")
    IO.inspect(streams)

    streams = Enum.into(streams, %{})
    IO.inspect(streams)

    Enum.each(streams, fn {subjects, name} ->
      subjects = Atom.to_string(subjects)

      case Jetstream.API.Stream.info(gnat, name) do
        {:ok, res} ->
          IO.puts("Stream Data: ")
          IO.inspect(res)

        {:error, error} ->
          IO.inspect(error)
          IO.puts("Creating Stream")
          subjects = subjects <> ".>"

          case Jetstream.API.Stream.create(gnat, %Jetstream.API.Stream{
                 name: name,
                 storage: :file,
                 subjects: [subjects]
               }) do
            {:ok, res} ->
              IO.inspect(res)

            {:error, error} ->
              IO.inspect(error)
          end
      end
    end)
  end

  def create_action_consumers(gnat) do
    actions = Application.get_env(:amps, :actions)
    IO.puts("actions")
    IO.inspect(actions)
    actions = Enum.into(actions, %{})
    IO.inspect(actions)

    Enum.each(actions, fn {topic, module} ->
      topic = Atom.to_string(topic)
      filter = "amps.actions." <> topic <> ".*"
      name = filter |> String.replace("*", "_") |> String.replace(".", "_")
      "amps.actions." <> topic <> ".*"
      # Jetstream.API.Consumer.delete(gnat, "ACTIONS", name)
      # case Jetstream.API.Consumer.info(gnat, "ACTIONS", name) do
      #   {:ok, res} ->
      #     IO.puts("Consumer Data")
      #     IO.inspect(res)

      #   {:error, error} ->
      #     IO.inspect(error)
      #     IO.puts("Creating Consumer")

      #     case Jetstream.API.Consumer.create(gnat, %Jetstream.API.Consumer{
      #            name: name,
      #            stream_name: "ACTIONS",
      #            filter_subject: filter
      #          }) do
      #       {:ok, res} ->
      #         IO.inspect(res)

      #       {:error, error} ->
      #         IO.inspect(error)
      #     end
      # end
    end)
  end
end
