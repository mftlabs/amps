# System Configuration

The System Configuration section allows for the configuration of system-wide settings and configurations. The first tab allows for the editing of system default values and settings.

The second tab provides a convenient Logo editor to update the application logo.

## System Settings

| Field                 | Description                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Module Path\*         | The path in which AMPS looks for python modules and services to run. Scripts are namespaced with scripts for the default environment being in the root folder and scripts for a specific environment being in "env/{environment name}"                                   |
| Temp Storage Path\*   | A directory for AMPS to use a temporary directory when performing actions and other message processing actions.                                                                                                                                                          |
| History Interval\*    | For performance purposes, Message Events, System Logs, and other logging services use a system where messages are accumulated and inserted in bulk at a certain interval. This property configures the interval at which such services perform their bulk insert action. |
| Time to Live (Days)\* | The time in days that data should persist in the database after creation.                                                                                                                                                                                                |
| Archive Messages      | A flag indicating whether or not to archive messages.                                                                                                                                                                                                                    |
| Archive Provider      | The configured archive provider to use for archiving.                                                                                                                                                                                                                    |

## Logo Editor

The Logo Editor allows for the convenient update of the application-wide logo. Simply upload an image, adjust it and optionally apply a transparency effect or fill color to the logo. The transparency threshold controls the brightness level above which the color will be removed.
