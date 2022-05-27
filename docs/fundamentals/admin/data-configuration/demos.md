# Demos

Demos are an importable snapshot of Message Configuration entities that generally serve to represent a particular messaging workflow. Demos can be imported into an environment such that the messaging workflow represented in the demo can be conveniently loaded into your own AMPS application. Demos exported from environments are automatically structured in the manner expected by the demo parser. To add a demo, AMPS expects a zip file with the following structure:

- **README.MD**: Contains detailed instructions and information about the demo.
- **\*.xlsx**: Any number of .xlsx files that contain exported data, and are referenced by demo.json.
- **demo.json**: Serves as a manifest for the demo. The root object contains "name" to specify the demo name, "desc" to give a description, "scripts" to specify the relative path to the directory that contains scripts to import, and "imports" which lists the imports in the demo. The first table below lists the various importable items in AMPS and their corresponding key values. The second table specifies the structure of each import in the list of imports. To understand this better, see the Import form on the Imports Screen under [Tools](../tools.md), as the JSON objects mirror the output of the form.

## Entity Keys

| Entity                | Key                                   |
| --------------------- | ------------------------------------- |
| Groups                | groups                                |
| Users                 | users                                 |
| Topics                | topics                                |
| Actions               | actions                               |
| Services              | services                              |
| Templates             | templates                             |
| Routing Rules         | rules                                 |
| Metadata Fields       | fields                                |
| Keys                  | keys                                  |
| Jobs                  | scheduler                             |
| Providers             | providers                             |
| Environments          | environments                          |
| Demos                 | demos                                 |
| Users/Mailboxes       | collection: users \| field: mailboxes |
| Users/UFA Agent Rules | collection: users \| field: rules     |

## Import Object Fields

| Field          | Description                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------- |
| collection\*   | The collection in which data is being imported. See the above table for the correct values.   |
| file\*         | The file containing the collection data.                                                      |
| idtype\*       | Either provided to preserve ids found on objects or generated to generate a new id on import. |
| type\*         | Either collection for a top-level entity, or field for a sub-entity of a top-level entity.    |
| [field]-entity | The id for the top-level entity whose sub-entity we are importing                             |
| [field]-field  | The field to which we are importing. See the above table for correct values.                  |
