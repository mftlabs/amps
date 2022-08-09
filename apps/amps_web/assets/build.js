const esbuild = require("esbuild");
const args = process.argv.slice(2);
const watch = args.includes("--watch");
const deploy = args.includes("--deploy");
const alias = require("esbuild-plugin-alias");

const loader = {
  ".svg": "file",
  ".ttf": "file",
};

const plugins = [
  alias({
    vscode: require.resolve("monaco-languageclient/lib/vscode-compatibility"),
  }),
  // Add and configure plugins here
];

const workerEntryPoints = [
  "vs/editor/editor.worker.js",
  "vs/language/json/json.worker.js",
];

const pdfEntryPoints = ["./node_modules/pdfjs-dist/build/pdf.worker.js"];

esbuild.build({
  entryPoints: workerEntryPoints.map(
    (entry) => `./node_modules/monaco-editor/esm/${entry}`
  ),
  bundle: true,
  format: "iife",
  outbase: "./node_modules/monaco-editor/esm",
  outdir: "../priv/static/assets/js",
});

esbuild.build({
  entryPoints: pdfEntryPoints,
  bundle: true,
  format: "iife",
  outbase: "./node_modules/pdfjs-dist/build",
  outdir: "../priv/static/assets/js",
});

let opts = {
  entryPoints: ["js/app.js"],
  bundle: true,
  target: "es2017",
  outdir: "../priv/static/assets",
  logLevel: "info",
  loader,
  plugins,
};

if (watch) {
  opts = {
    ...opts,
    watch,
    sourcemap: "inline",
  };
}

if (deploy) {
  opts = {
    ...opts,
    minify: true,
  };
}

const promise = esbuild.build(opts);

if (watch) {
  promise.then((_result) => {
    process.stdin.on("close", () => {
      process.exit(0);
    });

    process.stdin.resume();
  });
}
