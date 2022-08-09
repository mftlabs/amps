// We import the CSS which is extracted to its own file by esbuild.
// Remove this line if you add a your own CSS build pipeline (e.g postcss).
import "../css/app.css";
import "cropperjs/dist/cropper.css";

// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "./vendor/some-package.js"
//
// Alternatively, you can `npm install some-package` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";
import * as monaco from "monaco-editor";
import Cropper from "cropperjs";
const pdfjsLib = require("pdfjs-dist/build/pdf");

pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/js/pdf.worker.js";

let csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute("content");
let liveSocket = new LiveSocket("/live", Socket, {
  params: { _csrf_token: csrfToken },
});

// let userSocket = new Socket("/socket", {
//   params: { _csrf_token: csrfToken },
// });
// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", (info) => topbar.show());
window.addEventListener("phx:page-loading-stop", (info) => topbar.hide());

// connect if there are any LiveViews on the page
liveSocket.connect();

// require.config({ paths: { vs: "../vendor/min/vs" } });
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === "json") {
      return "./assets/js/vs/language/json/json.worker.js";
    }
    return "./assets/js/vs/editor/editor.worker.js";
  },
};
monaco.editor.setTheme("vs-dark");
// monaco.editor.create(document.getElementById("container"), {
//   value: ["def test:"].join("\n"),
//   language: "python",
// });
// userSocket.connect();

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket;
// window.userSocket = userSocket;
window.pSocket = Socket;
window.monaco = monaco;
window.cropper = Cropper;
window.pdfjsLib = pdfjsLib;
require("./client");
