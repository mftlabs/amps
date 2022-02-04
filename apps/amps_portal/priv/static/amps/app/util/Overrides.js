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

Ext.override(Ext.data.Store, {
  constructor: function (config) {
    this.callParent([config]);
    this.proxy.on("exception", this.onProxyException, this);
  },
  onProxyException: async function (proxy, response, options, eOpts) {
    var store = this;
    console.log("exception");
    if (response.status == 401) {
      await amfutil.renew_session();
      proxy.setHeaders({
        Authorization: localStorage.getItem("access_token"),
      });
      store.reload();
    }
  },
});
