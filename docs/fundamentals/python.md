# Python

Python plays a big role in customizing how you utilize and extend AMPS. Python can be used to create custom actions, perform API endpoint actions, and create custom AMPS-managed python services that can hook into AMPS topic-based messaging to both receive messages and send out new messages.

## Structure and Naming Convention

Actions, Endpoints, and Services are stored in a specific format in the configured module_path, and are additionally subject to a strong naming convention enforced by AMPS. The structure is outlined as follows.

### Actions and Endpoints

- Actions and Endpoints consist of a single python file located in {module_path}/{script name} or {module_path}/env/{environment}/{script name}
  - For example, script action my_action in environment testing would be located at {modulepath}/env/testing/my_action.py.
- Each Action or Endpoint script must contain a class name that matches the filename (i.e. A file named my_action.py will have a class named my_action that extends the Action or Endpoint classes.)

### Services

- Services are hosted in a directory as opposed to a single python script as they may contain more complex structures with single page applications or configuration files, etc. Accordingly, they consist of a single directory located in {module_path}/{service name} or {module_path}/env/{environment}/{service name}
  - For example, service webapp in environment testing would be located at {module_path}/env/testing/webapp.
- Minimally, each Service must contain a single python script with the same name as the service directory. Within that script must be a python class with the same name as the service directory that extends the Service class.
  - For example, service webapp would contain within its directory a webapp.py script that contains a webapp class that extends Service.

## Documentation

The documentation for the amps-py package is available at the [amps-py repository](https://mft-labs.github.io/amps-py).
