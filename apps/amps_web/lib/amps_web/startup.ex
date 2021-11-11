defmodule AmpsWeb.Startup do
  use Task
  require Vault
  import Argon2

  def start_link(_arg) do
    Task.start_link(__MODULE__, :startup, [])
  end

  def startup() do
    create_default_account()
    create_defaults_rules()
    create_root()
    setup_jetstream()
  end

  def setup_jetstream() do
    # case Jetstream.API.Stream.info(:gnat, "AMPS") do
    #   {:ok, res} ->
    #     IO.puts("Stream Data: ")
    #     IO.inspect(res)

    #   {:error, error} ->
    #     IO.puts(error)
    #     IO.puts("Creating Stream")

    #     case Jetstream.API.Stream.create(:gnat, %Jetstream.API.Stream{
    #            discard: :old,
    #            max_consumers: -1,
    #            name: "AMPS",
    #            num_replicas: 2,
    #            storage: :file,
    #            subjects: ["AMPS.Events.*"]
    #          }) do
    #       {:ok, res} ->
    #         IO.inspect(res)

    #       {:error, error} ->
    #         IO.inspect(error)
    #     end
    # end

    # case Jetstream.API.Consumer.info(:gnat, "AMPS", "AMPS") do
    #   {:ok, res} ->
    #     IO.puts("Consumer Data")
    #     IO.inspect(res)

    #   {:error, error} ->
    #     IO.puts("Creating Consumer")

    #     case Jetstream.API.Consumer.create(:gnat, %Jetstream.API.Consumer{
    #            deliver_subject: "AMPS.Messages",
    #            name: "AMPS",
    #            ack_wait: 240_000_000_000,
    #            stream_name: "AMPS"
    #          }) do
    #       {:ok, res} ->
    #         IO.inspect(res)

    #       {:error, error} ->
    #         IO.inspect(error)
    #     end
    # end
  end

  def create_default_account() do
    system_account = %{
      "fields" => [
        %{"description" => "File Name", "field" => "fname"},
        %{"description" => "File Size", "field" => "fsize"},
        %{"description" => "File Upload Time", "field" => "ftime"}
      ],
      "systemdefault" => true,
      "username" => "SYSTEM"
    }

    case AmpsWeb.DB.find_one("accounts", %{"username" => "SYSTEM"}) do
      nil ->
        IO.puts("Creating SYSTEM Default Account")
        AmpsWeb.DB.insert("accounts", system_account)

      object ->
        IO.puts("SYSTEM Default Account Already Exists")
    end
  end

  def create_defaults_rules() do
    system_rules = %{
      "name" => "SYSTEM",
      "rules" => [
        %{
          "action" => "hold",
          "active" => true,
          "defaults" => %{},
          "ediflag" => false,
          "name" => "SYSTEM DEFAULT HOLD",
          "parms" => %{
            "reason" => "File Routed via Default Rule",
            "status" => "warning"
          },
          "patterns" => %{"fname" => %{"regex" => false, "value" => "*"}},
          "scanflag" => false
        }
      ],
      "systemdefault" => true
    }

    case AmpsWeb.DB.find_one("rules", %{"name" => "SYSTEM"}) do
      nil ->
        IO.puts("Creating SYSTEM Default Rules")
        AmpsWeb.DB.insert("rules", system_rules)

      object ->
        IO.puts("SYSTEM Default Rules Already Exist")
    end
  end

  def create_root() do
    root = AmpsWeb.DB.find_one("users", %{"systemdefault" => true})
    host = Application.fetch_env!(:amps_web, AmpsWeb.Endpoint)[:vault_addr]

    username = System.get_env("AMPS_ROOT_USER", "root")
    password = System.get_env("AMPS_ROOT_PASS", "ampsadmin")

    if root == nil do
      IO.puts("Creating Root User")
      %{password_hash: hashed} = add_hash(password)

      root = %{
        "approved" => true,
        "email" => "root@email.com",
        "firstname" => "Root",
        "lastname" => "User",
        "phone" => "1234567890",
        "role" => "Admin",
        "username" => username,
        "password" => hashed,
        "systemdefault" => true
      }

      IO.inspect(Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] == "vault")

      if Application.get_env(:amps_web, AmpsWeb.Endpoint)[:authmethod] == "vault" do
        token = AmpsWeb.Vault.get_token(:vaulthandler)
        IO.inspect(token)

        {:ok, vault} =
          Vault.new(
            engine: Vault.Engine.KVV1,
            auth: Vault.Auth.Token,
            host: host,
            credentials: %{token: token}
          )
          |> Vault.auth()

        result =
          Vault.request(vault, :post, "auth/userpass/users/" <> root["username"],
            body: %{"token_policies" => "admin,default", "password" => password}
          )

        IO.inspect(result)
      end

      AmpsWeb.DB.insert("users", root)
    else
      IO.puts("Root User Already Exists")
    end
  end
end
