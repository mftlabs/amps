Ext.define("Amps.view.form.LoadKey", {
  extend: "Ext.form.FieldContainer",
  xtype: "loadkey",
  layout: "hbox",
  flex: 1,
  // defaults: {
  //   margin: 5,
  // },
  constructor(args) {
    this.callParent(args);
    this.itemId = args["itemId"];
    var name = args["name"];
    var fieldLabel = args["fieldLabel"];
    var items = [
      {
        xtype: "textarea",
        name: name,
        fieldLabel: fieldLabel,
        flex: 1,
        allowBlank: false,
        value: args["value"],
        readOnly: true,
        hidden: args["hidden"],
        disabled: args["disabled"],
        style: {
          marginRight: 5,
        },
      },
      {
        xtype: "combobox",
        flex: 1,
        isFormField: false,
        hidden: args["hidden"],
        disabled: args["disabled"],
        hidden: args["readOnly"],
        displayField: "name",
        valueField: "_id",
        listeners: {
          beforerender: function (scope) {
            scope.setStore(Ext.create("Amps.store.Key"));
          },
          change: async function (scope, val) {
            var resp = await amfutil.ajaxRequest({
              method: "get",
              url: "api/keys/" + val,
            });
            var key = Ext.decode(resp.responseText);
            scope.up("fieldcontainer").down("textarea").setValue(key.data);
            console.log(resp);
          },
        },
      },
    ];
    this.insert(0, items);
  },
});
