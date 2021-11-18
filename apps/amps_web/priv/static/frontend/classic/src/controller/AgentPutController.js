Ext.define("Amps.controller.AgentPutController", {
  extend: "Ext.app.ViewController",

  alias: "controller.agentputcontroller",

  require: ["Amps.view.main.Main"],
  init: function () {},

  onDefaultChange: function () {
    var defaultvalue = this.getView().down("#filemetadatavalue");
    var field = this.getView().down("#field").value;
    var value = this.getView().down("#value").value;
    defaultvalue.setValue(
      JSON.stringify({
        field: field,
        value: value,
      })
    );
  },
});
