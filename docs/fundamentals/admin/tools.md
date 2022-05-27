# Tools

The Tools section of AMPS contains convenience utilities for creating data and workflows. Each tool and its description are listed below.

## Wizard

The wizard screen seeks to simplify and pull together one of the central relationships of AMPS, that of the Topic, Subscriber, and Action. As we have discussed, a subscriber receives messages on a specific topic and performs a configured action. To simplify the creation of subscribers, the wizard provides a three-step process where an action is created or selected from the list of existing topics, a topic is created or selected from the list of existing topics, and finally, a subscriber is configured with the action and topic auto-filled. No data is created until the wizard is completed, and links are provided to the newly created, or existing entities.

## Workflows

The workflows screen provides a convenient way to visualize and build workflows. Services, Jobs, and UFA users are listed in their respective tabs and pressing visualize opens a window where you can further specify the starting point for messaging (i.e. select the user for an SFTP server or the Kafka topic for a Kafka consumer.) From the final tab, you can additionally visualize any topic. Pressing Load Workflow loads workflow data into the window. In the base of multiple subscribers at any level, pressing the map button on any subscriber changes the flow of the subsequent steps. Additional subscribers can be configured on any topic at any level by pressing the Configure button which loads a special version of the Wizard with the topic auto-filled. Additionally, from the visualization window, metadata can be specified by pressing the Edit Metadata button.

## Imports

The imports screen allows for the importing of data from .xlsx files. The easiest way to generate these is via importing data exported directly from AMPS. From the imports screen, pressing Load Data brings up the Import form. From here, a user can specify whether they are importing a main field or subfield, which collection they are importing to, whether the provided id should be used for objects or new ids should be generated, and finally, they can select the .xlsx file containing the data. If importing a subfield, the field and entity need to be specified as well. After loading data, the final column in the grid will show the validity state of the data. Clicking on the edit button allows for inline data editing, with the validity state automatically updating when the data is changed. Selecting import valid entries will import all valid entries while ignoring invalid entries, which you can edit after all valid entries have been imported.
