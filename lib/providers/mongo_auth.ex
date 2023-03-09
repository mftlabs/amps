defmodule AmpsAuth do
  import Argon2
  alias Amps.DB

  def mailbox_info(user, mailbox, env) do
    DB.find_one(AmpsUtil.index(env, "users"), %{"username" => user, "mailboxes.name" => mailbox})
  end

  def check_cred(user, pass, env \\ "") do
    IO.puts("checking password #{user} #{pass}")

    case DB.find_one(AmpsUtil.index(env, "users"), %{username: to_string(user)}) do
      nil ->
        IO.puts("not found")
        false

      parms ->
        IO.puts("found #{inspect(parms)}")

        # IO.inspect(pass)

        case check_pass(parms, to_string(pass), hash_key: "password") do
          {:ok, user} ->
            if user["approved"] do
              true
            else
              false
            end

          _ ->
            false
        end

        # val = parms["password"] || ""
        # Plug.Crypto.secure_compare(val, to_string(pass))
    end
  end
end
