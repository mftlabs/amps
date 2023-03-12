defmodule Amps.Archive do
  use Task

  def start_link(arg) do
    Task.start_link(__MODULE__, :preload, [])
  end

  def preload() do
    archive = System.get_env("AMPS_DEFAULT_ARCHIVE", "false") |> String.to_atom()
    release_name = System.get_env("AMPS_RELEASE_NAME", "amps")

    config =
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
        %{"archive" => true, "aprovider" => "archive"}
      else
        %{"archive" => false}
      end

    if !Amps.DB.find_by_id("config", "system") do
      IO.inspect("Config Already Exists")
      Amps.DB.insert_with_id("config", config, "system")
    end
  end
end
