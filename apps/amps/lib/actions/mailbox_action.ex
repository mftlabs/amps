defmodule MailboxAction do
  require Logger

  def run(msg, parms, _state) do
    recipient = parms["recipient"] || "unknown"

    case AmpsAuth.mailbox_info(recipient) do
      nil ->
        Logger.warning("mailbox not found for #{recipient}")
        {:error, "recipient does not have a registered mailbox #{recipient}"}

      _found ->
        newmsg = Map.merge(msg, %{"recipient" => recipient, "status" => "mailboxed"})
        AmpsMailbox.add_message(recipient, newmsg)
        Logger.warning("put message in mailbox #{recipient}")

        {:ok, "mailboxed with recipient #{recipient}"}
    end
  end
end
