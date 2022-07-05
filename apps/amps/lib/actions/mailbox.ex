defmodule Amps.Actions.Mailbox do
  require Logger

  def run(msg, parms, {state, env}) do
    recipient = parms["recipient"] || "unknown"

    mailbox =
      if AmpsUtil.blank?(parms["mailbox"]) do
        "default"
      else
        parms["mailbox"]
      end

    case AmpsAuth.mailbox_info(recipient, mailbox, env) do
      nil ->
        Logger.warning("mailbox #{mailbox} not found for #{recipient}")
        raise "recipient does not have a registered mailbox #{recipient}"

      _found ->
        newmsg =
          Map.merge(msg, %{
            "fname" => AmpsUtil.format(parms["format"], msg)
          })

        {newmsg, to_delete} =
          AmpsMailbox.overwrite(recipient, mailbox, newmsg, parms["overwrite"], env)

        AmpsEvents.send(
          newmsg,
          %{"output" => "amps.mailbox.#{recipient}.#{mailbox}"},
          state,
          env
        )

        AmpsMailbox.delete_message(
          recipient,
          mailbox,
          to_delete["msgid"],
          env
        )

        # AmpsMailbox.add_message(recipient, newmsg, env)
        Logger.info("put message in mailbox #{recipient}")

        {:ok, "mailboxed with recipient #{recipient} to mailbox #{mailbox}"}
    end
  end
end
