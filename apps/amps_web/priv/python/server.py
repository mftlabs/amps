from erlport.erlang import set_message_handler, cast
from erlport.erlterms import Atom
import subprocess
import threading
import sys

from pylsp_jsonrpc import streams

import json

server = None

message_handler = None  # reference to the elixir process to send result to


def cast_message(pid, message):
    cast(pid, message)


def start_server(pid):
    # save message handler pid
    global message_handler
    message_handler = pid
    global server
    server = ServerComm()
    server.open()


def handle_message(data):
    try:
        server.on_message(data)

    except Exception as e:
        # you can send error to elixir process here too
        # print e
        cast_message(message_handler, (Atom(
            b'error'), e))


# set handle_message to receive all messages sent to this python instance
set_message_handler(handle_message)


class ServerComm():
    writer = None

    def open(self, *args, **kwargs):
        # log.info("Spawning pyls subprocess")

        # Create an instance of the language server
        proc = subprocess.Popen(
            ['python3', '-m', 'pylsp'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE
        )

        # Create a writer that formats json messages with the correct LSP headers
        self.writer = streams.JsonRpcStreamWriter(proc.stdin)
        # Create a reader for consuming stdout of the language server. We need to
        # consume this in another thread

        def consume():
            # Start a tornado IOLoop for reading/writing to the process in this thread
            while True:
                reader = streams.JsonRpcStreamReader(proc.stdout)
                reader.listen(lambda msg: self.write_message(msg))

        thread = threading.Thread(target=consume)
        thread.daemon = True
        thread.start()

    def on_message(self, message):
        """Forward client->server messages to the endpoint."""
        msg = json.loads(message)
        # print(pid)
        self.writer.write(msg)

    def write_message(self, message):

        if message_handler:
            # build a tuple to atom {:python, result}
            cast_message(message_handler, (Atom(
                b'python'), json.dumps(message)))

    # def write_message(message):
    #     print(message)

    # IOLoop.instance().add_handler(sys.stdin, on_stdin, IOLoop.READ)
    # IOLoop.instance().start()
