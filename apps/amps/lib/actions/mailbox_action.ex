defmodule MailboxAction do
  require Logger

  def run(msg, parms, {state, env}) do
    recipient = parms["recipient"] || "unknown"
    mailbox = parms["mailbox"]

    case AmpsAuth.mailbox_info(recipient, mailbox, env) do
      nil ->
        Logger.warning("mailbox #{mailbox} not found for #{recipient}")
        {:error, "recipient does not have a registered mailbox #{recipient}"}

      _found ->
        newmsg =
          Map.merge(msg, %{
            "fname" => AmpsUtil.format(parms["format"], msg)
          })

        AmpsEvents.send(
          newmsg,
          %{"output" => AmpsUtil.env_topic("amps.mailbox.#{recipient}.#{mailbox}", env)},
          state
        )

        # AmpsMailbox.add_message(recipient, newmsg, env)
        Logger.warning("put message in mailbox #{recipient}")

        {:ok, "mailboxed with recipient #{recipient} to mailbox #{mailbox}"}
    end
  end
end
