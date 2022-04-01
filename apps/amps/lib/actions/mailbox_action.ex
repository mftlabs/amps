defmodule MailboxAction do
  require Logger

  def run(msg, parms, {state, env}) do
    recipient = parms["recipient"] || "unknown"

    case AmpsAuth.mailbox_info(recipient, env) do
      nil ->
        Logger.warning("mailbox not found for #{recipient}")
        {:error, "recipient does not have a registered mailbox #{recipient}"}

      _found ->
        newmsg =
          Map.merge(msg, %{
            "recipient" => recipient,
            "status" => "mailboxed",
            "fname" => AmpsUtil.format(parms["format"], msg),
            "mtime" => DateTime.utc_now() |> DateTime.to_iso8601()
          })

        AmpsMailbox.add_message(recipient, newmsg, env)
        Logger.warning("put message in mailbox #{recipient}")

        {:ok, "mailboxed with recipient #{recipient}"}
    end
  end
end
