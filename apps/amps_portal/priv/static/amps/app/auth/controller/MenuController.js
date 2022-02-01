Ext.define("Amps.controller.MenuController", {
  extend: "Ext.app.ViewController",

  alias: "controller.menu",

  // routes: {
  //   user: "onUser",
  // },

  treeNodeSelect: function (sender, info, eOpts) {
    console.log(info);
    item = info.item;
    console.log(item);
    console.log(info.node.childNodes.length);
    if (info.node.childNodes.length) {
    } else {
      console.log(item._rowCls);
      this.redirectTo(item._rowCls);
      var route = Ext.util.History.getToken();
      if (this.getStore()) {
        newSelection = this.getStore().findRecord("rowCls", route);
        console.log(newSelection);
      }
    }
  },

  onUser: function () {
    console.log("User screen will be rendered here");
  },

  toggleNavType: function (btn, pressed) {
    var menu = this.getView();
    console.log(menu);
    var treenav = menu.down("treenav");
    console.log(treenav);

    var usermenu = menu.down("#usermenu");
    console.log(usermenu);
    var user = JSON.parse(localStorage.getItem("user"));

    if (treenav.getMicro()) {
      usermenu.setText(user.firstname + " " + user.lastname);
      usermenu.setIconCls("x-fa fa-user");
    } else {
      usermenu.setText("");
      usermenu.setIconCls("");
    }

    treenav.setMicro(!treenav.getMicro());
    menu.setWidth(treenav.getMicro() ? 50 : 250);
    // if (btn.iconCls == "x-fa fa-chevron-circle-left") {
    //   //treelist.setUi(null);
    //   treelist.setMicro(true);
    //   ct.setWidth(50);
    //   ct.setMinWidth(50);
    //   mainmenuObj.setWidth(50);
    //   mainmenuObj.setMinWidth(50);
    //   leftnav.setWidth(50);
    //   leftnav.setMinWidth(50);
    //   //ct['removeCls']('treelist-with-nav')
    //   treelist.setExpanderFirst(false);
    //   treelist.setHighlightPath(true);
    //   btn.setIconCls("x-fa fa-chevron-circle-right");
    // } else {
    //   //treelist.setUi('nav');
    //   treelist.setMicro(false);
    //   ct.setWidth(250);
    //   leftnav.setWidth(250);
    //   leftnav.setMinWidth(50);
    //   mainmenuObj.setWidth(250);
    //   mainmenuObj.setMinWidth(50);
    //   //ct.setMinWidth(200);

    //   treelist.setExpanderFirst(true);
    //   treelist.setHighlightPath(false);
    //   //ct['addCls']('treelist-with-nav')
    //   btn.setIconCls("x-fa fa-chevron-circle-left");
    // }
  },

  onLogout: function () {
    ampsutil.logout();
  },

  showUploads: function () {
    console.log("Uploads");
    amfuploads.show();
  },
});

Ext.define("Amps.form.Parms", {
  // Fieldset in Column 1 - collapsible via toggle button
  extend: "Ext.form.FieldSet",
  xtype: "parmfield",
  //   flex: 1,
  collapsible: true,
  constructor: function (args) {
    this.callParent([args]);
    console.log(args);
    var scope = this;
    console.log(args["types"]);
    if (args["types"]) {
      var types = args["types"];
      if (types.length > 1) {
        args["types"].forEach((type) => {
          scope.down("#addMenu").insert(-1, scope.parmtypes[type]);
        });
      } else {
        this.removeAll();
        args["types"].forEach((type) => {
          console.log(scope);
          var button = Object.assign(scope.parmtypes[type], {
            itemId: "parmbutton",
            xtype: "button",
          });
          button.text = "Add";
          console.log(scope);
          scope.insert(0, button);
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
    console.log(args);
    this.setReadOnly(args["readOnly"]);
  },
  parmtypes: {
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
  controller: "matchpattern",
  title: "Parameter",
  collapsible: true,
  defaultType: "textfield",
  defaults: { anchor: "100%" },
  layout: "anchor",
  constructor: function (args) {
    this.callParent([args]);
    var name;
    if (args) {
      name = args["name"] ? args["name"] : "parms";
    } else {
      name = "parms";
    }
    this.insert({
      xtype: "hiddenfield",
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
          label: "Field",
          isFormField: false,

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
          label: "Value",
          isFormField: false,

          inputValue: true,
          uncheckedValue: false,
          flex: 1,
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "value",
        },

        // {
        //   xtype: "textfield",
        //   label: "Value",
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
  controller: "matchpattern",

  constructor: function (args) {
    this.callParent([args]);
    var name;
    if (args) {
      name = args["name"] ? args["name"] : "parms";
    } else {
      name = "parms";
    }
    this.insert(0, {
      xtype: "hiddenfield",
      name: name,
      itemId: "defaultvalue",
    });
  },
  xtype: "formstring",
  title: "Parameter",
  collapsible: true,
  defaultType: "textfield",
  defaults: { anchor: "100%" },
  // layout: "anchor",
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          label: "Field",
          isFormField: false,

          // name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "field",
          allowBlank: false,
        },
        // {
        //   xtype: "splitter",
        //   tabIndex: -1,
        // },

        {
          xtype: "textfield",
          label: "Value",
          flex: 1,
          // name: "value",
          isFormField: false,

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
  controller: "matchpattern",

  constructor: function (args) {
    this.callParent([args]);
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
          label: "Field",
          // name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          isFormField: false,
          itemId: "field",
          allowBlank: false,
        },
        // {
        //   xtype: "splitter",
        //   tabIndex: -1,
        // },

        {
          xtype: "numberfield",
          label: "Value",
          flex: 1,
          // name: "value",
          listeners: {
            change: "onDefaultChange",
          },
          isFormField: false,

          itemId: "value",
          allowBlank: false,
        },
      ],
    });
    this.insert({
      xtype: "hiddenfield",
      name: name,
      itemId: "defaultvalue",
    });
  },
  xtype: "formnumber",
  title: "Parameter",
  collapsible: true,
  defaultType: "textfield",
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
