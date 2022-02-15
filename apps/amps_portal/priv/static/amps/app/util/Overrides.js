Ext.define("Override.route.Route", {
  override: "Ext.route.Route",

  compatibility: "6.6.0",

  execute: function (token, argConfig) {
    var promise = this.callParent([token, argConfig]);

    return promise["catch"](Ext.bind(this.onRouteReject, this));
  },

  onRouteReject: function () {
    Ext.fireEvent("routereject", this);
  },
});

// Ext.define("Amps.form.field.Number", {
//   override: "Ext.form.field.Number",

//   parseValue: function (val) {
//     console.log(val);
//     return parseInt(val);
//   },
// });
