# Topics

Topics are period (".") delimited strings that represent different endpoints in a message workflow. For example, if an administrator creates an sftp service named "sftp_server", and a user with username "test123" uploads a file via that service, that file will be sent to the topic amps.svcs.sftp_server.test123. Topics can use wildcards for example, to listen to all message events that occur on a particular. For example, to monitor all requests made to a Gateway Service named "apiv1", topic amps.svcs.apiv1.\* could be created and assigned to a subscriber in order to create a workflow for all incoming requests.

## Topic Builder

Topics are created using the topic builder which allows for the selection of a topic type, and additional information depending on the type. The topic types, and how topics are built for each type are specified in the following list.

- **Action**: The action topic type inserts "action" into the second segment of the topic, provides a dropdown of action types to specify the third segment of the topic, and finally provides a field for the user to customize the final segment of the topic.

- **Service**: The service topic type insert "svcs" into the second segment of the topic, and provides a dropdown of existing communication services (SFTP Servers, HTTP Mailbox Servers, Kafka Consumer, and Gateways) to fill the third segment of the topic with the service name. For each service type it allows for wildcarding the topic or selecting from one of the following dropdowns which are used to fill in the final segment of the topic:
  - **SFTP**: A dropdown of all users who may use the SFTP server.
  - **HTTP**: A dropdown of all users who may use the SFTP server.
  - **Gateway**: A dropdown of all configured routes in the format {method}{path}
  - **Kafka Consumer**: A dropdown of all configured topics, formatted to replace all reserved character (".", ">", "\*") with underscores ("\_")
- **Data**: The data topic type inserts "data" into the second segment of the topic and provides a field for customizing the final segments of the topic.
- **Mailbox**: The mailbox topic type inserts "mailbox" into the second segment of the topic and fills the third segment with a username selected from a dropdown of all user usernames. Finally a field is provided for customizing the final segment of the topic.
- **Object**: The object topic type inserts "object" into the second segment of the topic and fills the third segment with an object selected from a dropdown of all AMPS objects. For each service type it allows for wildcarding the topic or specifying a custom string for specifying the specific operation (create, delete, etc.) or subfield operation (mailboxes.create, rules.delete, etc.)

## Topic Fields

Required fields are denoted with a \*

| Field        | Description                            |
| ------------ | -------------------------------------- |
| Topic Type\* | The topic type.                        |
| Description  | An optional description of this topic. |
