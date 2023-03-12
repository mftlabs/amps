defmodule Amps.Archive do
  use Task

  def start_link(_) do
    Task.start_link(__MODULE__, :preload, [])
  end

  def preload() do
    archive = System.get_env("AMPS_DEFAULT_ARCHIVE", "false") |> String.to_atom()
    release_name = System.get_env("AMPS_RELEASE_NAME", "amps")

    if !Amps.DB.find_by_id("config", "system") do
      if archive do
        secret = System.get_env("AMPS_ARCHIVE_SECRET")

        archive = %{
          "atype" => "s3",
          "bucket" => "archive",
          "desc" => "archive",
          "host" => "#{release_name}-minio",
          "key" => "admin",
          "name" => "archive_provider",
          "port" => "9000",
          "provider" => "Minio",
          "scheme" => "http://",
          "secret" => "#{secret}",
          "type" => "archive"
        }

        Amps.DB.insert_with_id("providers", archive, "archive")
        config = %{"archive" => true, "aprovider" => "archive"}
        Amps.DB.insert_with_id("config", config, "system")
        Gnat.pub(:gnat, "amps.events.archive.handler.start", "")
      else
        config = %{"archive" => false}
        Amps.DB.insert_with_id("config", config, "system")
      end
    else
      IO.inspect("Config Already Exists")
    end
  end
end
