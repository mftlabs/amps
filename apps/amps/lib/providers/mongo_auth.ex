defmodule AmpsAuth do
  def mailbox_info(mailbox, _opts \\ []) do
    Mongo.find_one(:mongo, "mailbox_auth", %{mailbox: mailbox})
  end

  def check_cred(user, pass, _opts \\ []) do
    IO.puts("checking password #{user} #{pass}")

    case Mongo.find_one(:mongo, "mailbox_auth", %{mailbox: to_string(user)}) do
      nil ->
        IO.puts("not found")
        false

      parms ->
        IO.puts("found #{inspect(parms)}")
        val = parms["password"] || ""
        Plug.Crypto.secure_compare(val, to_string(pass))
    end
  end
end
