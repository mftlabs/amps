# Services

Services are processes started and managed by AMPS in order to perform or
provide various message-related services. The various service types and their
configurations and features are outlined below.

## Common Fields

Fields that appear in more than one service are listed below. Required fields
are denoted with a\*

| Field              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name\*             | The action name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Description\*      | A description of the action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Service Type\*     | Any of the service types as specified below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| File Name Format\* | How to format the file name of the outgoing message. Text in between {} will be replaced by corresponding metadata. If there was an original file name, it can be referenced via {fname}. A timestamp may be generated using the following tokens. {YYYY} - Four Digit Year \| {YY} - Two Digit Year \| {MM} - Month \| {DD} - Day \| {HH} - Hour \| {mm} - Minute \| {SS} - Second \| {MS} - Millisecond                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Port\*             | The port on which to expose the service.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Consumer Config\*  | A section used to configure a subscriber underlying various services and actions. It specifies a topic to subscribe to and a deliver policy to indicate how messages should be received from this topic on creation. All indicates that the subscriber will receive all messages that have been sent to this topic starting with the earliest message. New indicates that the subscriber will receives all new messages sent to the topic after the creation of the consumer. Last indicates that the subscriber will receive all messages that have been sent to this topic starting with the most recent message. Start Time indicates that the subscriber will receive messages sent to this topic after a specific start time. If it is important that you only consume messages after a certain point in time, use Start Time as it remains the same on any configuration updates. |

## Gateway

An API Gateway which can be configured to expose multiple API endpoints that
each perform a custom python script. Any configured user can call API endpoints.

To authenticate against the Gateway, approved Users can call API endpoints using
an [HTTP Basic Auth Header](https://datatracker.ietf.org/doc/html/rfc7617) that
is set with a user Auth Token ID and corresponding Secret used as the ID and
Password.

| Field             | Description                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Idle Timeout\*    | Maximum length of time in milliseconds that a connection can stay active when no traffic is sent.                                                                                                      |
| Request Timeout\* | Time in milliseconds with no requests before the connection is closed.                                                                                                                                 |
| Max Keep Alive\*  | Maximum number of requests allowed per connection                                                                                                                                                      |
| TLS               | True or False to configure your service to use TLS.                                                                                                                                                    |
| [TLS]-Server Cert | The server certificate if using TLS                                                                                                                                                                    |
| [TLS]-Server Key  | The server key is using TLS                                                                                                                                                                            |
| Routes\*          | A list of [API Endpoints](endpoints.md) to use in the gateway. In the case where multiple endpoints may overlap on certain routes, order the endpoints in the order you would like them to be matched. |

## Kafka

A Kafka Consumer that uses a configured Kafka Provider to receive messages on the specified Kafka Topics.

| Field      | Description                                                |
| ---------- | ---------------------------------------------------------- |
| Provider\* | The preconfigured Kafka Provider to use for this consumer. |
| Topics\*   | A list of Kafka topics to consume from                     |

## Mailbox API

An HTTP Service that exposes an API for interacting with AMPS Mailboxes. Messages sent via this service are both mailboxed and sent to a corresponding service topic.

To authenticate against the Mailbox API, each request expects an HTTP Basic Auth Header to be set with a user Auth Token ID and corresponding Secret used as the Username and Password. All endpoints exposed by the Mailbox API contain a ":user" parameter that the service expects to contain the username of the authenticating user.

### Endpoints

The following section lists all the endpoints exposed by the Mailbox API. Sections of routes preceded by a colon (:) indicated parameters that should be supplied in the URL. A list of the parameters and their descriptions is as follows.

- **username**: The username corresponding to the authenticating user.
- **mailbox**: The name of an existing mailbox.
- **msgid**: A message ID corresponding to an existing message.

#### GET /mailbox/:username

Lists all mailboxes for a specific user. Returns JSON list of mailboxes and associated metadata.

#### GET /mailbox/:username/:mailbox

Lists the messages for a user's specified mailbox. The response is a JSON object that contains a "count" key specifying the number of returned messages and "messages" key with the list of messages. By default, the 100 most recent messages are returned. To override this, you can pass the limit as a query parameter. For example, GET /mailbox/user1/urgent?limit=200 would fetch the 200 most recent messages from user1's urgent mailbox. If there are less than 200 messages in the mailbox, all messages will be returned.

#### POST /mailbox/:username/:mailbox

Creates and puts a message in a user's specified mailbox. Accepts and parses data either directly from the request body or via a file upload of type "multipart/form-data", where the file is the first object specified. On success, return a JSON object with a "status" key set to "accepted" and a "msgid" key with the Message ID of the newly created message.

#### GET /mailbox/:username/:mailbox/message/:msgid

Retrieves a specific message from a user's specified mailbox using the Message ID provided in the URL parameter. If the message is found, the corresponding data or file is streamed in response. If the message is not found, the endpoint sends a 404 Reponse with a "Message Not Found" error.

#### DELETE /mailbox/:username/:mailbox/message/:msgid

Deletes a specific message from a user's specified mailbox using the Message ID provided in the URL parameter. Deletes the message if it is found. Regardless of whether the message is found, the endpoint returns a JSON object with a "status" key set to "deleted" and a "msgid" key with the provided Message ID.

| Field             | Description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Idle Timeout\*    | Maximum length of time in milliseconds that a connection can stay active when no traffic is sent. |
| Request Timeout\* | Time in milliseconds with no requests before the connection is closed.                            |
| Max Keep Alive\*  | Maximum number of requests allowed per connection                                                 |
| TLS               | True or False to configure your service to use TLS.                                               |
| [TLS]-Server Cert | The server certificate if using TLS                                                               |
| [TLS]-Server Key  | The server key is using TLS                                                                       |

## SFTP Server

An SFTP server that any configured User can use to interact with AMPS Mailboxes. Messages sent via SFTP are both mailboxed and sent to a corresponding service topic.

A user authenticates against the SFTP Server using their username and password. After signing in, listing files from the root directory will reveal a list of directories corresponding to the user's mailboxes. Attempting to put a message from the root folder will raise an error, as messages must be put to a specific mailbox. To send a file to a specific mailbox, navigate to the corresponding directory (cd) and put a file from there. New directories can not be made inside mailboxes. To create a new mailbox, make a new directory (mkdir) from the root directory and a mailbox will be created with the directory name.

| Field        | Description                                                                                                                                                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server Key\* | An EC Private Key used as the Host Key for the SFTP Server. It must be an EC Private Key using the "ecdsa-sha2-nistp256" algorithm. One can be generated using openssl by running the following command. openssl ecparam -name prime256v1 -genkey -noout -out sftp_key.pem |

## Subscriber

A subscriber that listens on a topic and performs a specified action to all received messages.

| Field              | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| Subscriber Count\* | The number of concurrent processes to have subscribed to the topic. |
| Action\*           | The configured action to have this subscriber perform.              |

## Custom Python Service

A custom service defined by extending the amps-py [Service](https://mft-labs.github.io/amps-py/#amps.Service) class. It can optionally subscribe to messages from a specific topic and send messages to a specific topic. See the [Python](/fundamentals/python) section for implementation information.

| Field                      | Description                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Service\*                  | The service selected from a dropdown of existing services in the modules directory as detected by AMPS. |
| Config\*                   | An object of additional parameters to pass to the service of type "string", "number", or "boolean".     |
| Receive Messages\*         | Whether this service should receive messages.                                                           |
| Send Output\*              | Whether this service should send messages to an output topic.                                           |
| [Send Output]-Output Topic | The output topic to send messages to if Send Output is enabled.                                         |
