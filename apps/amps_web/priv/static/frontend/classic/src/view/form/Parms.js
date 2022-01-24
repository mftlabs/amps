Ext.define("Amps.form.Parms", {
  // Fieldset in Column 1 - collapsible via toggle button
  extend: "Ext.form.FieldSet",
  xtype: "parmfield",
  itemId: "parms",
  flex: 1,
  collapsible: true,

  constructor: function (args) {
    this.callParent(args);

    console.log(args);
    var scope = this;
    this.name = args["name"];
    if (args["title"]) {
      this.setTitle(args["title"]);
    }
    if (args["types"]) {
      var types = args["types"];
      if (types.length > 1) {
        args["types"].forEach((type) => {
          scope.down("#addMenu").insert(scope.types[type]);
        });
      } else {
        this.removeAll();
        args["types"].forEach((type) => {
          var button = Object.assign(
            { itemId: "parmbutton" },
            scope.types[type]
          );
          button.text = "Add";
          scope.insert(button);
        });
      }
    } else {
      Object.entries(this.types).forEach((type) => {
        console.log(type);
        scope.down("#addMenu").insert(type[1]);
      });
    }
    console.log(scope.down("#addMenu"));
    this.loadParms(args["value"], args["readOnly"]);
    this.setReadOnly(args["readOnly"]);
  },

  types: {
    bool: {
      text: "Boolean",
      // xtype: "button",
      // itemId: "parmbutton",

      handler: function (button, event) {
        var formpanel = button.up("fieldset");

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.Parm.Bool", {
            name: formpanel.name,
            title: formpanel.title,
          })
        );
      },
    },
    string: {
      text: "String",
      // xtype: "button",
      // itemId: "parmbutton",

      handler: function (button, event) {
        var formpanel = button.up("fieldset");

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.Parm.String", {
            name: formpanel.name,
            title: formpanel.title,
          })
        );
      },
    },
    number: {
      text: "Number",
      // xtype: "button",
      // itemId: "parmbutton",

      handler: function (button, event) {
        var formpanel = button.up("fieldset");

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.Parm.Number", {
            name: formpanel.name,
            title: formpanel.title,
          })
        );
      },
    },
  },

  setReadOnly: function (readOnly) {
    console.log(readOnly);
    var buttons = Ext.ComponentQuery.query("#parmbutton");
    // var fi = Ext.ComponentQuery.query("fields");

    console.log(buttons);
    if (readOnly) {
      buttons.forEach((b) => {
        console.log(b);
        b.setHidden(true);
      });
    }
  },

  loadParms: function (data, readOnly) {
    var scope = this;
    if (data) {
      var parms = Object.entries(data).map((entry) => {
        return { field: entry[0], value: entry[1] };
      });

      console.log(parms);

      parms.forEach(function (p) {
        var length = scope.items.length;
        var d;
        if (typeof p.value === "boolean") {
          d = Ext.create("Amps.form.Parm.Bool", {
            name: scope.name,
          });

          scope.insert(length - 1, d);
        } else {
          d = Ext.create("Amps.form.Parm.String", {
            name: scope.name,
          });
        }
        var f = d.down("#field");
        var v = d.down("#value");
        f.setValue(p.field);
        v.setValue(p.value);
        f.setReadOnly(readOnly);
        v.setReadOnly(readOnly);
        scope.insert(length - 1, d);
      });
    }
  },
  items: [
    {
      xtype: "button",
      text: "Add",
      itemId: "parmbutton",
      menu: {
        itemId: "addMenu",
        items: [],
      },
    },
  ],
});

Ext.define("Amps.form.Parm.Bool", {
  extend: "Ext.form.FieldSet",
  xtype: "formbool",
  title: "Parameter",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  layout: "anchor",
  constructor: function (args) {
    this.callParent(args);
    var name;
    if (args) {
      name = args["name"] ? args["name"] : "parms";
    } else {
      name = "parms";
    }
    this.insert({
      xtype: "hidden",
      name: name,
      itemId: "defaultvalue",
    });
  },
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Field",
          name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "field",
          allowBlank: false,
        },
        {
          xtype: "splitter",
          tabIndex: -1,
        },
        {
          xtype: "checkbox",
          fieldLabel: "Value",

          inputValue: true,
          uncheckedValue: false,
          flex: 1,
          name: "value",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "value",
        },

        // {
        //   xtype: "textfield",
        //   fieldLabel: "Value",
        //   flex: 1,
        //   name: "value",
        //   listeners: {
        //     change: "onDefaultChange",
        //   },
        //   itemId: "value",
        // },
      ],
    },
    {
      xtype: "button",
      itemId: "parmbutton",
      iconCls: "x-fa fa-trash",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
  ],
});

Ext.define("Amps.form.Parm.String", {
  extend: "Ext.form.FieldSet",
  constructor: function (args) {
    this.callParent(args);
    var name;
    if (args) {
      name = args["name"] ? args["name"] : "parms";
    } else {
      name = "parms";
    }
    this.insert({
      xtype: "hidden",
      name: name,
      itemId: "defaultvalue",
    });
  },
  xtype: "formstring",
  title: "Parameter",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  layout: "anchor",
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Field",
          name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "field",
          allowBlank: false,
        },
        {
          xtype: "splitter",
          tabIndex: -1,
        },

        {
          xtype: "textfield",
          fieldLabel: "Value",
          flex: 1,
          name: "value",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "value",
          allowBlank: false,
        },
      ],
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      itemId: "parmbutton",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
  ],
});

Ext.define("Amps.form.Parm.Number", {
  extend: "Ext.form.FieldSet",
  constructor: function (args) {
    this.callParent(args);
    var name;
    if (args) {
      name = args["name"] ? args["name"] : "parms";
    } else {
      name = "parms";
    }
    this.insert(0, {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Field",
          name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "field",
          allowBlank: false,
        },
        {
          xtype: "splitter",
          tabIndex: -1,
        },

        {
          xtype: "numberfield",
          fieldLabel: "Value",
          flex: 1,
          name: "value",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "value",
          allowBlank: false,
        },
      ],
    });
    this.insert({
      xtype: "hidden",
      name: name,
      itemId: "defaultvalue",
    });
  },
  xtype: "formnumber",
  title: "Parameter",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  layout: "anchor",
  items: [
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      itemId: "parmbutton",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
  ],
});
