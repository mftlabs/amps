Ext.define("Amps.form.Filter", {
  mixins: {
    field: "Ext.form.field.Field",
  },
  // Fieldset in Column 1 - collapsible via toggle button
  extend: "Ext.form.FieldSet",
  xtype: "filterfield",
  itemId: "parms",
  fields: [],

  flex: 1,
  collapsible: true,

  constructor: function (args) {
    this.callParent([args]);
    this.initField();
    console.log(args);
    var scope = this;
    this.name = args["name"];
    if (args["title"]) {
      this.setTitle(args["title"]);
    }
    console.log(args["types"]);
    if (args["types"]) {
      var types = args["types"];
      if (types.length > 1) {
        args["types"].forEach((type) => {
          scope.down("#addMenu").insert(scope.parmtypes[type]);
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
      Object.entries(this.parmtypes).forEach((type) => {
        console.log(type);
        scope.down("#addMenu").insert(type[1]);
      });
    }
    console.log(scope.down("#addMenu"));
    console.log(args);
    this.setReadOnly(args["readOnly"]);
  },
  getValue: function () {
    var val = [];
    this.fields.forEach((field) => {
      console.log(field);
      var f = amfutil.getElementByID(field);
      if (f) {
        val.push(JSON.parse(f.getValue()));
      }
    });
    console.log(val);

    return JSON.stringify(val);
  },

  setValue: function (val) {
    var scope = this;
    val.forEach((v) => {
      var entry = Object.entries(v)[0];
      var type = entry[0];
      var val = entry[1];
      console.log(type);
      console.log(val);
      scope.insert(
        scope.items.length - 1,
        Ext.create(scope.mapping[type], {
          isFormField: false,
          readOnly: scope.readOnly,
          value: val,
          register: scope.register.bind(scope),
          deregister: scope.deregister.bind(scope),
        })
      );
    });
  },

  register: function (name) {
    this.fields.push(name);
  },
  deregister: function (name) {
    var index = this.fields.indexOf(name);
    if (index > -1) {
      this.fields.splice(index, 1);
    }
  },

  mapping: {
    equalityMatch: "Amps.form.Filter.Equality",
    present: "Amps.form.Filter.Present",
    substrings: "Amps.form.Filter.Substrings",
  },

  parmtypes: {
    equalityMatch: {
      text: "Equality Match",
      // xtype: "button",
      // itemId: "parmbutton",

      handler: function (button, event) {
        var formpanel = button.up("fieldset");

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.Filter.Equality", {
            isFormField: false,
            register: formpanel.register.bind(formpanel),
            deregister: formpanel.deregister.bind(formpanel),
          })
        );
      },
    },
    present: {
      text: "Present",
      // xtype: "button",
      // itemId: "parmbutton",

      handler: function (button, event) {
        var formpanel = button.up("fieldset");

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.Filter.Present", {
            isFormField: false,
            register: formpanel.register.bind(formpanel),
            deregister: formpanel.deregister.bind(formpanel),
          })
        );
      },
    },
    substrings: {
      text: "Substrings",
      // xtype: "button",
      // itemId: "parmbutton",

      handler: function (button, event) {
        var formpanel = button.up("fieldset");

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.Filter.Substrings", {
            isFormField: false,
            register: formpanel.register.bind(formpanel),
            deregister: formpanel.deregister.bind(formpanel),
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
        } else if (Number.isFinite(p.value)) {
          d = Ext.create("Amps.form.Parm.Number", {
            name: scope.name,
          });
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

Ext.define("Amps.form.Filter.Equality", {
  mixins: {
    field: "Ext.form.field.Field",
  },
  extend: "Ext.form.FieldContainer",
  xtype: "filtereq",
  fieldLabel: "Equality Match",
  collapsible: true,
  defaultType: "textfield",
  defaults: { anchor: "100%" },
  layout: "anchor",
  constructor: function (args) {
    this.callParent([args]);
    this.initField();
    var name = "field-" + amfutil.makeRandom();
    this.itemId = name;
    this.name = name;
    args.register(name);
    this.deregister = function () {
      args.deregister(name);
    };
    this.setReadOnly(args["readOnly"]);
  },

  getValue: function () {
    var obj = {};
    var fields = this.query("field");
    fields.forEach((field) => {
      obj[field.name] = field.getValue();
    });

    obj = { equalityMatch: obj };
    console.log(obj);

    return JSON.stringify(obj);
  },

  setValue: function (val) {
    this.down("#key").setValue(val.key);
    this.down("#value").setValue(val.value);
  },
  setReadOnly: function (readOnly) {
    var key = this.down("#key");
    var val = this.down("#value");
    if (key) {
      key.setReadOnly(readOnly);
    }

    if (val) {
      val.setReadOnly(readOnly);
    }
  },
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Key",
          name: "key",
          itemId: "key",
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
          itemId: "value",
          // allowBlank: false,
        },
      ],
    },
    {
      xtype: "button",
      itemId: "parmbutton",
      iconCls: "x-fa fa-trash",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldcontainer").deregister();

        button
          .up("fieldcontainer")
          .up("fieldset")
          .remove(button.up("fieldcontainer"));
      },
    },
  ],
});

Ext.define("Amps.form.Filter.Present", {
  extend: "Ext.form.FieldContainer",
  mixins: {
    field: "Ext.form.field.Field",
  },
  constructor: function (args) {
    this.callParent([args]);
    this.initField();
    var name = "field-" + amfutil.makeRandom();
    this.itemId = name;
    this.name = name;
    args.register(name);
    this.deregister = function () {
      args.deregister(name);
    };
    this.setReadOnly(args["readOnly"]);
  },
  xtype: "filterpresent",
  fieldLabel: "Present",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  layout: "anchor",

  getValue: function () {
    var obj = {};
    var fields = this.query("field");
    fields.forEach((field) => {
      obj[field.name] = field.getValue();
    });

    obj = { present: obj.field };

    console.log(obj);

    return JSON.stringify(obj);
  },

  setValue: function (val) {
    this.down("#field").setValue(val);
  },

  setReadOnly: function (readOnly) {
    this.down("#field").setReadOnly(readOnly);
  },
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Key",
          isFormField: false,
          name: "field",
          itemId: "field",
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
        button.up("fieldcontainer").deregister();

        button
          .up("fieldcontainer")
          .up("fieldset")
          .remove(button.up("fieldcontainer"));
      },
    },
  ],
});

Ext.define("Amps.form.Filter.Substrings", {
  mixins: {
    field: "Ext.form.field.Field",
  },
  extend: "Ext.form.FieldContainer",
  constructor: function (args) {
    this.callParent([args]);
    this.initField();
    var name = "field-" + amfutil.makeRandom();
    this.itemId = name;
    this.name = name;
    args.register(name);
    this.deregister = function () {
      args.deregister(name);
    };
    this.setReadOnly(args["readOnly"]);
  },
  getValue: function () {
    var obj = {};
    var fields = this.query("field");
    console.log(fields);
    var key = amfutil.getElementByID("key");
    var keyval;
    if (key) {
      keyval = key.getValue();
    }

    var matchers = amfutil.getElementByID("matchers");

    if (matchers) {
      var matchval = JSON.parse(matchers.getValue());
    }

    var ret = { substrings: { key: keyval, matchers: matchval } };

    console.log(ret);

    return JSON.stringify(ret);
  },

  setReadOnly: function (readOnly) {
    var key = this.down("#key");
    var matchers = this.down("#matchers");
    if (key) {
      key.setReadOnly(readOnly);
    }

    if (matchers) {
      matchers.setReadOnly(readOnly);
    }
  },

  setValue: function (val) {
    var keyval = val["key"];
    var matcherval = val["matchers"];
    var key = this.down("#key");
    var matchers = this.down("#matchers");
    console.log(matchers);

    if (key) {
      key.setValue(keyval);
    }

    if (matchers) {
      matchers.setValue(matcherval);
    }
  },
  xtype: "filtersubstrings",
  fieldLabel: "Substrings",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  layout: "anchor",
  items: [
    {
      xtype: "fieldcontainer",
      layout: {
        type: "vbox",
        align: "stretch",
      },
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Key",
          name: "key",
          itemId: "key",
          allowBlank: false,
          isFormField: false,
        },
        {
          xtype: "arrayfield",
          fieldLabel: "Matchers",
          flex: 1,

          name: "matchers",
          isFormField: false,
          fieldTitle: "matcher",
          itemId: "matchers",
          arrayfields: [
            {
              xtype: "combobox",
              minChars: 1,
              typeAhead: true,
              queryMode: "local",
              name: "matcher",
              fieldLabel: "Matcher",
              displayField: "label",
              valueField: "field",
              store: [
                { field: "any", label: "Contains" },
                { field: "initial", label: "Starts With" },
                { field: "final", label: "Ends With" },
              ],
              allowBlank: false,
            },
            {
              xtype: "textfield",
              flex: 1,
              fieldLabel: "Value",
              name: "value",
              itemId: "value",
              allowBlank: false,
            },
          ],
        },
      ],
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      itemId: "parmbutton",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldcontainer").deregister();

        button
          .up("fieldcontainer")
          .up("fieldset")
          .remove(button.up("fieldcontainer"));
      },
    },
  ],
});
