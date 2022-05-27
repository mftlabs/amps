# Mailboxes

In AMPS, End Users have Mailboxes to which messages can be sent and from which messages can be retrieved. Mailboxes can be created by Admin Users from the Admin Portal, or by End Users from either the User Portal or via SFTP. There are multiple ways to put a file into a user's mailbox:

- Performing a POST request on a ​[Mailbox API](/fundamentals/admin/message-configuration/services?id=mailbox-api)
- Setting up a [Mailbox Action](/fundamentals/admin/message-configuration/actions?id=mailbox) and attaching it to a subscriber.
- Putting a file via SFTP to a mailbox-corresponding directory.
- Sending messages to the corresponding Mailbox Topic
  - Each user mailbox corresponds to a specific mailbox topic, with the format being "amps.mailbox.{username}.{mailbox name}". For example, if user test1 created a mailbox named "urgent", messages sent to "amps.mailbox.test1.urgent" would be mailboxed to test1's urgent mailbox. Similarly, to subscribe to messages for a specific mailbox, messages could be fetched from the corresponding mailbox topic.

In the User Portal, all mailboxed messages are listed in the user Inbox, and messages can be subsequently filtered by mailbox. The fields for creating a mailbox in the UI are described in the table below.

| Field         | Description                   |
| ------------- | ----------------------------- |
| Name\*        | The mailbox name.             |
| Description\* | A description of the mailbox. |
