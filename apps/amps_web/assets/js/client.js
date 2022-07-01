import { listen } from "@codingame/monaco-jsonrpc";
import * as monaco from "monaco-editor";
import {
  MonacoLanguageClient,
  MessageConnection,
  CloseAction,
  ErrorAction,
  MonacoServices,
  createConnection,
} from "monaco-languageclient";
const normalizeUrl = require("normalize-url");
const ReconnectingWebSocket = require("reconnecting-websocket");

// register Monaco languages
monaco.languages.register({
  id: "python",
  extensions: [".py"],
  aliases: ["PYTHON", "python"],
  mimetypes: ["application/json"],
});

// install Monaco language client services
MonacoServices.install(monaco);

window.createLangClient = function (token) {
  const url = createUrl("/pyserver/websocket", `?token=${token}`);
  const webSocket = createWebSocket(url);
  // listen when the web socket is opened
  listen({
    webSocket,
    onConnection: (connection) => {
      // create and start the language client
      const languageClient = createLanguageClient(connection);
      const disposable = languageClient.start();
      connection.onClose(() => disposable.dispose());
    },
  });
};

// create the web socket

function createLanguageClient(connection) {
  return new MonacoLanguageClient({
    name: "Python Language Client",
    clientOptions: {
      // use a language id as a document selector
      documentSelector: ["python"],
      // disable the default error handler
      errorHandler: {
        error: () => ErrorAction.Continue,
        closed: () => CloseAction.DoNotRestart,
      },
    },
    // create a language client connection from the JSON RPC connection on demand
    connectionProvider: {
      get: (errorHandler, closeHandler) => {
        return Promise.resolve(
          createConnection(connection, errorHandler, closeHandler)
        );
      },
    },
  });
}

function createUrl(path, querystring) {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return normalizeUrl(
    `${protocol}://${location.host}${location.pathname}${path}${querystring}`
  );
}

function createWebSocket(url) {
  const socketOptions = {
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1000,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 10000,
    maxRetries: Infinity,
    debug: false,
  };
  var ws = new ReconnectingWebSocket(url, [], socketOptions);

  ws.onerror = async function () {
    amfutil.renew_session();
  };
  return ws;
}
