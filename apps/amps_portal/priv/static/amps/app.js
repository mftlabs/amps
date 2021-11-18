/*
 * This call registers your application to be launched when the browser is ready.
 */
Ext.application({
  extend: "Amps.Application",

  name: "Amps",

  requires: [
    // This will automatically load all classes in the Amps namespace
    // so that application classes do not need to require each other.
    "Amps.*",
  ],
});
