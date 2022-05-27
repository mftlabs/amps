# Providers

Providers contain the full configuration for connecting to external services such as S3, Kafka, Sharepoint, SMTP, which can then be reused in various actions and services. AMPS has built in support for S3, Kafka, Sharepoint, and SMTP. Additionally, AMPS allows for the configuration of archive providers for archiving messages. Currently the only archive provider type is S3. Administrators can can additionally configure any number of generic providers with a list of key-value pairs. Descriptions and the fields for each type of provider are provided below.

## Common Fields

Required fields are denoted with a \*

| Field           | Description                              |
| --------------- | ---------------------------------------- |
| Name\*          | The provider name                        |
| Description\*   | A description of the provider            |
| Provider Type\* | One of S3, Kafka, Sharepoint, or Generic |

## S3

Provider to connect to an S3 Endpoint

| Field            | Description                                           |
| ---------------- | ----------------------------------------------------- |
| S3 Service\*     | Specifying whether this is a Minio or AWS S3 service. |
| [AWS]-Region\*   | The region the AWS S3 Service is hosted in.           |
| [Minio]-Scheme\* | Either HTTP or HTTPS                                  |
| [Minio]-Host\*   | The host of your Minio service                        |
| [Minio]-Port\*   | The port your Minio service is hosted on.             |
| Access ID\*      | The S3 Access ID                                      |
| Access Key\*     | The S3 Access Key                                     |

## Kafka

Provider to connect to Kafka Brokers.

| Field                                     | Description                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Brokers\*                                 | A list of Kafka broker endpoints. Each broker is a Host-Port pair.                              |
| Authentication\*                          | The type of authentication used by the brokers. Is either none or a permutation of SASL and SSL |
| [SASL]-Mechanism\*                        | The mechanism used for SASL Auth                                                                |
| [SASL]-Username\*                         | The SASL username                                                                               |
| [SASL]-Password\*                         | The SASL password                                                                               |
| [SSL]-Certificate Authority Certificate\* | The CA Certificate for SSL Auth                                                                 |
| [SSL]-Client Certificate\*                | The Client Certificate for SSL Auth                                                             |
| [SSL]-Client Key\*                        | The Client Key for SSL Auth                                                                     |

## SharePoint

Provider to connect to SharePoint site drive.

| Field           | Description                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Tenant\*        | The Tenant ID for your Microsoft Azure Active Directory Application                             |
| Client ID\*     | The Application (Client) ID for your Microsoft Azure Active Directory Application               |
| Client Secret\* | The Client Secret or Application Password for your Microsoft Azure Active Directory Application |

## Archive

A provider type for specifying an archive for AMPS messages.

| Field                | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| [S3]-Archive Type\*  | The type of archive provider to use. Currently only S3 is supported |
| [S3]-S3 Service\*    | Specifying whether this is a Minio or AWS S3 service.               |
| [S3][aws]-Region\*   | The region the AWS S3 Service is hosted in.                         |
| [S3][minio]-Scheme\* | Either HTTP or HTTPS                                                |
| [S3][minio]-Host\*   | The host of your Minio service                                      |
| [S3][minio]-Port\*   | The port your Minio service is hosted on.                           |
| [S3]-Access ID\*     | The S3 Access ID                                                    |
| [S3]-Access Key\*    | The S3 Access Key                                                   |
| [S3]-Bucket\*        | The bucket to use for archiving                                     |

## SMTP

An SMTP Provider for outgoing email messages.

| Field             | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| [SMTP]-Relay\*    | The SMTP Relay                                                            |
| [SMTP]-Username\* | The SMTP Password                                                         |
| [SMTP]-Password\* | The SMTP Password.                                                        |
| [SMTP]-Use Auth\* | Whether to use Authentication **Never**, If **Available**, or **Always**. |
| [SMTP]-Use TLS\*  | Whether to use TLS **Never**, If **Available**, or **Always**.            |
| [SMTP]-Use SSL\*  | Use SSL Instead of TLS for Encryption                                     |

## Generic

A generic provider type to supply any custom credentials or configuration.

| Field    | Description                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| Values\* | A list of key-value pairs, where the value can be a boolean, string, or number. |
