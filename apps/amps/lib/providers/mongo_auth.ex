defmodule AmpsAuth do
  import Argon2

  def mailbox_info(mailbox, _opts \\ []) do
    Mongo.find_one(:mongo, "mailbox_auth", %{mailbox: mailbox})
  end

  def check_cred(user, pass, _opts \\ []) do
    # IO.puts("checking password #{user} #{pass}")

    case Mongo.find_one(:mongo, "users", %{username: to_string(user)}) do
      nil ->
        IO.puts("not found")
        false

      parms ->
        # IO.puts("found #{inspect(parms)}")

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
