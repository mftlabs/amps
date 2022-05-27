# Auth Tokens

Auth Tokens are ID-Secret pairs used to authenticate an AMPS User on any AMPS Service or UFA Agent. Auth Tokens can be created by specifying a name, and a Token ID and Token Secret are automatically generated and stored. The Token Secret can be retrieved from the UI by pressing the key icon in the grid.

When using Auth Tokens to authenticate an AMPS HTTP Service (Mailbox API or Gateway) the ID and Secret are provided as the username and password, respectively, in an [HTTP Basic Auth Header](https://datatracker.ietf.org/doc/html/rfc7617). When downloading a UFA Agent, users are required to specify a corresponding auth token to use for authenticating on behalf of the user, which is subsequently downloaded in the configuration file alongside the agent.

In order to revoke an Auth Token, it can simply be deleted from the UI, after which it will no longer be able to authenticate.
