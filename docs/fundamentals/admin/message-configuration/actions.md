# Actions

Actions are performed both to transform received messages, and also to receive messages. AMPS comes built in with a variety of actions for convenience, however, for additional functionality, the Run Script action allows for full freedom in writing scripts to perform any action on a message or retrieving data from any source. The various actions and their fields are specified below.

## Common Fields

This section describes fields that appear in all or many different actions. Required field are denoted with a \*

| Field            | Description                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name\*           | The action name                                                                                                                                                                                                                                                                                                                                                                                           |
| Description\*    | A description of the action                                                                                                                                                                                                                                                                                                                                                                               |
| Action Type\*    | Any of the action types as specified below                                                                                                                                                                                                                                                                                                                                                                |
| Output Topic\*   | For actions that have it, Output Topic specifies where to send the message resulting from the action                                                                                                                                                                                                                                                                                                      |
| File Name Format | How to format the file name of the outgoing message. Text in between {} will be replaced by corresponding metadata. If there was an original file name, it can be referenced via {fname}. A timestamp may be generated using the following tokens. {YYYY} - Four Digit Year \| {YY} - Two Digit Year \| {MM} - Month \| {DD} - Day \| {HH} - Hour \| {mm} - Minute \| {SS} - Second \| {MS} - Millisecond |

## Batch

The batch action fetches messages from either a data topic on which they have accumulated, or from a User’s mailbox from within a certain time period. The action expects fetched messages to be binary and combines them uses a user-specified delimiter.

| Field                         | Description                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Input Type\*                  | One of two input types: Data Topic or Mailbox.                                                                  |
| [Data Topic]-Input Topic\*    | The data topic from which this action will fetch messages.                                                      |
| [Data Topic]-Deliver Policy\* | The policy to use when fetching messages from the data topic.                                                   |
| [Mailbox]-Mailbox\*           | The mailbox from which to fetch messages.                                                                       |
| [Mailbox]-Send From\*         | The point in time in seconds prior to action execution from which to fetch messages from the specified mailbox. |
| Delimiter\*                   | The delimiter to use when batching.                                                                             |

## Webservice Call

Calls an HTTP Webservice using the incoming message. For PUT and POST requests, the message data is sent in the request body. For GET, PUT, and POST requests, the response body can optionally be sent to an output topic, and response headers can optionally be added to the message metadata.

| Field                                   | Description                                                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL\*                                   | The URL for the request. Can either be specified directly, or built using a tokenized string using any metadata (i.e. https://api.site.com/{refno}?user={user}) |
| Method\*                                | Whether to perform a GET, POST, PUT, or DELETE request.                                                                                                         |
| Headers                                 | A list of key-value pairs specifying the headers for the HTTP request.                                                                                          |
| [GET, POST, PUT]-Send Output            | Whether to send the output of the GET request response.                                                                                                         |
| [Send Output]-Store Headers as Metadata | If sending output, whether to store the response headers as metadata on the outgoing message.                                                                   |

## Kafka PUT

Send the message to a specified Kafka Topic

| Field            | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| Kafka Provider\* | The preconfigured Kafka Provider to use when sending this message. |
| Topic\*          | The Kafka Topic to send this message to.                           |

## Mailbox

Send the message to a specified user's mailbox.

| Field       | Description                                       |
| ----------- | ------------------------------------------------- |
| Recipient\* | The User who owns the mailbox                     |
| Mailbox\*   | The specific mailbox to which to send the message |

## PGP Decrypt

Decrypt a PGP Encrypted Message. When decrypting be sure to use a private PGP key and passphrase for decrypting and a public PGP key for signature verification.

| Field                       | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| Decrypt Key\*               | The configured private PGP Key to use for Decryption. |
| Decryption Key Passphrase\* | The passphrase for the PGP Decryption Key             |
| Verify Signature            | Whether to verify the file signature.                 |
| Partner Signing Key\*       | The key to use when verifying the signature.          |

## PGP Encrypt

PGP Encrypt a Message. When encrypting, be sure to use a public PGP key for encryption and a private PGP key and passphrase for signing.

| Field                    | Description                                      |
| ------------------------ | ------------------------------------------------ |
| Encryption Key\*         | The recipient public encryption key.             |
| Compress                 | Whether or not to compress the message.          |
| Armor                    | Whether or not to ASCII Armor the message.       |
| Signing Key\*            | The private key to use when signing the message. |
| Signing Key Passphrase\* | The passphrase for the signing key.              |

## Router

Route a message to different topics based on configured [Routing Rules](routing-rules.md)

| Field     | Description                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parse EDI | If this is an EDI message, Parse and add Metadata from the message.                                                                                                                                                       |
| Rules\*   | A list of configured Routing Rules. Routing Rules execute in order until all of a rule's match patterns are met, so in order to ensure your messages are routed properly, order the rules from most to least restrictive. |

## Run Script

Run a script on a message to perform any custom action. AMPS expects each script to adhere to the structure outlined in the [Python](/fundamentals/python) section. Each script should have a class that extends either the AMPS **Action** or **Endpoint** classes. See the [documentation](https://mft-labs.github.io/amps-py) for more context on how to create custom Actions.

| Field                     | Description                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script Type\*             | Currently only Python scripts are supported.                                                                                                                            |
| Script Name\*             | Select the script from the list of scripts available in your modules directory.                                                                                         |
| Send Output               | Whether to send the python script output to another topic. Allows for specifying both the output topic and the filename format.                                         |
| Use Provider              | Whether to pass the values of a preconfigured provider to the script.                                                                                                   |
| [Use Provider]-Provider\* | If using a provider, specifies the provider to pass to the script.                                                                                                      |
| Extra Parameters          | A list of key value parameters to pass to the script. The values can be either a string, boolean, or number. These will be available to the script under the parms key. |

## Sharepoint

Perform an Upload or Download operation on a SharePoint Cloud Site.

| Field                           | Description                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| SharePoint Provider\*           | The preconfigured SharePoint credentials for the endpoint.                                                         |
| Operation\*                     | Whether this is an Upload or Download action.                                                                      |
| Host\*                          | The root host for the SharePoint site.                                                                             |
| Site Path\*                     | Relative path to the desired sub site.                                                                             |
| [Download]-Folder Path\*        | Path to the folders to scan.                                                                                       |
| [Download]-Regex                | Whether the File Match Pattern uses Regex.                                                                         |
| [Download]-File Match Pattern\* | The file match pattern to use when deciding which files to fetch. Defaults to Glob unless Regex is checked.        |
| [Download]-Scan Subdirectories  | Whether this action should recursively scan subdirectories for matching files.                                     |
| [Download]-Acknowledgement Mode | Whether to acknowledge successfully downloading of a file by either doing nothing, or deleting it from SharePoint. |
| [Upload]-Upload Path            | The path on the specified to site to upload this file.                                                             |

## SFTP PUT

Put a message via SFTP

| Field           | Description                           |
| --------------- | ------------------------------------- |
| Host\*          | The host for the SFTP recipient       |
| Port            | The Port to use when sending via SFTP |
| Folder          | The optional folder to put to.        |
| SFTP Username\* | The SFTP Username                     |
| SFTP Password\* | The SFTP Password                     |

## String Replace

Replace an occurrence of a string with another string throughout a message.

| Field  | Description                          |
| ------ | ------------------------------------ |
| From\* | The string to replace.               |
| To\*   | The string to insert into the place. |

## S3

Perform a GET, PUT, or DELETE Operation on an S3 Bucket

| Field                         | Description                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| S3 Provider\*                 | The preconfigured S3 Provider to use when performing this action.                                                       |
| Operation\*                   | Whether to perform a GET, PUT, or DELETE Operation                                                                      |
| [GET, PUT, DELETE]-Bucket\*   | The bucket on which to perform this action.                                                                             |
| [GET, PUT, DELETE]-Prefix\*   | The bucket prefix from which to either GET, PUT, or DELETE the messages.                                                |
| [GET]-File Match Pattern\*    | The match pattern to use when fetching files.                                                                           |
| [GET]-Regex                   | Whether the match pattern uses Regex.                                                                                   |
| [GET]-Acknowledgement\*       | How to acknowledge the successful fetching of a message, either by doing nothing or deleting the message in SharePoint. |
| [DELETE]-Path Match Pattern\* | The match pattern to use when deleting files.                                                                           |

## Unzip

Unzip a certain number of files from a given message.

| Field       | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| Max Files\* | The max number of files to fetch from the unzipped message. |

## Zip

Zips and Compresses a given message.
