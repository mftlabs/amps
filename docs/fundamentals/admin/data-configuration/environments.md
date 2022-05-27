# Environments

Environments are independent, namespaced environments in which messaging workflows can be created and exported as Demos. Every environment has a distinct set of consumers and collections of the entities specified in Onboarding and Message Configuration. For example, a subscriber created in an environment "test1" would be authenticated by users in "test1" and perform actions created in "test1". A new environment "test2" would not have access to these resources in "test1".

## Grid Actions

- Toggle Archive: Whether or not this environment should archive messages.
- Clear Environment: Conveniently clears an environment, deleting all data and resetting all consumers.
- Export Environment as Demo: Export all data from the environment as a zip file that can be loaded into Demos.

| Field         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| Name\*        | The environment name, unlike other names, this must be lowercase.         |
| Description\* | A description of the environment.                                         |
| Active\*      | A flag indicating whether or not the environment is active.               |
| Archive\*     | A flag indicating whether or not to archive messages in this environment. |
