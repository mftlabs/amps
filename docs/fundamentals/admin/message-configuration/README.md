# Message Configuration

The **Message Configuration** section of AMPS contains all the fields pertinent to handling message workflows (retrieval, transformation, and transfer). Each field and a brief description of each are listed below.

- [Topics](topics.md): Topics are period (".") delimited strings that represent different endpoints in a message workflow.
- [Actions](actions.md): Actions are performed on messages to transform them or performed in order to receive messages.
- [Services](services.md): Services are processes managed by AMPS to facilitate message retrieval, transformation, and transfer.
- [Scripts](scripts.md): Scripts are executed in scripting actions and receive message and action data.
- [Templates](templates.md): Templates are for convenience and are python scripts whose function is to provide a starting point for creating scripts from the scripts screen.
- [Routing Rules](routing-rules.md): Routing rules are used in Router actions in order to route messages to various topics based on the message metadata.
- [Metadata Fields](metadata-fields.md): Metadata Fields can be defined to keep track of various custom metadata fields you may utilize in your AMPS workflows.
- [Keys](keys.md): Keys such as certificates, signing keys, encryption keys, etc, can be stored in AMPS for use in Providers, Services, etc.
- [Jobs](jobs.md): Jobs are events sent to a specific topic, on a configured cron-like schedule, with optional additional metadata in order to trigger subscribers to perform their actions.
