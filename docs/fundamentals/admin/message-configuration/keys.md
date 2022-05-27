# Keys

Keys are sensitive, often crytographic, strings used in a variety of contexts such as HTTP server security when using TLS, Kafka Authentication when using SSL Auth, SFTP Server encryption etc. Keys can be defined in AMPS and used in various places throughout the application. The fields for keys are defined below.

| Field       | Description                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------- |
| Key Name\*  | An identifiable name for the key.                                                             |
| Key Usage\* | A broad description of the usage of the key selected from a dropdown.                         |
| Type\*      | Whether this key is public, private, or other if it is a different type of key.               |
| Key\*       | The actual key data. Can be pasted directly into the textarea or can be imported from a file. |
