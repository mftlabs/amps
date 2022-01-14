Ext.define("Amps.view.form.LoadKey", {
  extend: "Ext.form.field.ComboBox",
  xtype: "loadkey",
  flex: 1,
  displayField: "name",
  valueField: "_id",
  listeners: {
    beforerender: function (scope) {
      scope.setStore(Ext.create("Amps.store.Key"));
    },
    // change: async function (scope, val) {
    //   var resp = await amfutil.ajaxRequest({
    //     method: "get",
    //     url: "api/keys/" + val,
    //   });
    //   var key = Ext.decode(resp.responseText);
    //   scope.up("fieldcontainer").down("textarea").setValue(key.data);
    //   console.log(resp);
    // },
  },
});
