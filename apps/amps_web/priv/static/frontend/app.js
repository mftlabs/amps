/*
 * This file launches the application by asking Ext JS to create
 * and launch() the Application class.
 */
Ext.application({
  extend: "AmpsDasboard.Application",

  name: "AmpsDasboard",

  requires: [
    // This will automatically load all classes in the AmpsDasboard namespace
    // so that application classes do not need to require each other.
    "AmpsDasboard.*",
  ],

  // The name of the initial view to create.
  //mainView: 'AmpsDasboard.view.main.Main'
});
