/*
 * This file launches the application by asking Ext JS to create
 * and launch() the Application class.
 */
Ext.application({
  extend: "Amps.Application",

  name: "Amps",

  requires: [
    // This will automatically load all classes in the Amps namespace
    // so that application classes do not need to require each other.
    "Amps.*",
  ],

  // The name of the initial view to create.
  //mainView: 'Amps.view.main.Main'
});
