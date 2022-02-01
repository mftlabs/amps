Ext.define("Amps.form.ArrayField", {
  extend: "Ext.form.FieldSet",
  mixins: {
    field: "Ext.form.field.Field",
  },
  flex: 1,
  xtype: "arrayfield",
  collapsible: true,
  fields: [],
  arrayfields: [],
  fieldTitle: "Field",

  constructor: function (args) {
    this.callParent([args]);
    console.log(args);

    this.fields = [];

    this.arrayfields = args["arrayfields"];
    this.fieldTitle = args["fieldTitle"];

    if (args["title"]) {
      this.setTitle(args["title"]);
    } else {
      this.setTitle("ArrayField");
    }

    console.log(this);

    this.name = args["name"];

    // this.buildField();
    // this.callParent();

    this.initField();
    var scope = this;

    if (args["value"]) {
      var value = args["value"];
      value.forEach((val) => {
        if (args.arrayfields.length == 1) {
          scope.insert(
            scope.items.length - 1,
            Ext.create("Amps.form.ArrayField.Field", {
              readOnly: args["readOnly"],
              register: scope.register.bind(scope),
              deregister: scope.deregister.bind(scope),
              fields: args.arrayfields.map((field) => {
                var f = Object.assign({ value: val }, field);
                return f;
              }),
              title: args.fieldTitle,
            })
          );
        } else {
          scope.insert(
            scope.items.length - 1,
            Ext.create("Amps.form.ArrayField.Field", {
              readOnly: args["readOnly"],
              register: scope.register.bind(scope),
              deregister: scope.deregister.bind(scope),
              fields: args.arrayfields.map((field) => {
                var f = Object.assign({ value: val[field.name] }, field);
                return f;
              }),
              title: args.fieldTitle,
            })
          );
        }
      });
    }

    this.setReadOnly(args["readOnly"]);
  },

  getValue: function () {
    console.log(this);
    var val = [];
    this.fields.forEach((field) => {
      var f = amfutil.getElementByID(field);
      console.log(f);
      console.log(f.getValue());
      val.push(f.getValue());
    });
    console.log(JSON.stringify(val));
    return JSON.stringify(val);
  },

  register: function (name) {
    console.log(this);
    this.fields.push(name);
    console.log(this.fields);
  },
  deregister: function (name) {
    var index = this.fields.indexOf(name);
    if (index > -1) {
      this.fields.splice(index, 1);
    }
    console.log(this.fields);
  },

  setReadOnly: function (readOnly) {
    console.log(readOnly);
    var buttons = Ext.ComponentQuery.query("#arraybutton");
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
      itemId: "arraybutton",
      text: "Add",
      handler: function (button, event) {
        var formpanel = button.up("fieldset");

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.ArrayField.Field", {
            register: formpanel.register.bind(formpanel),
            deregister: formpanel.deregister.bind(formpanel),
            fields: formpanel.arrayfields,
            title: formpanel.fieldTitle,
          })
        );
      },
    },
  ],
});

Ext.define("Amps.form.ArrayField.Field", {
  extend: "Ext.form.FieldContainer",
  collapsible: true,
  layout: {
    type: "vbox",
    align: "stretch",
  },

  constructor: function (args) {
    this.callParent([args]);
    var name = "field-" + amfutil.makeRandom();
    this.itemId = name;
    this.name = name;
    args.register(name);
    this.deregister = function () {
      args.deregister(name);
    };
    console.log(args);
    this.fields = args["fields"];
    this.insertFields(args["fields"]);
    // console.log(scope.down("#addMenu"));
    // this.loadParms(args["value"], args["readOnly"]);
    this.setReadOnly(args["readOnly"]);
  },

  getValue: function () {
    var scope = this;
    console.log(scope);
    var data = {};
    console.log(this.fields);
    this.fields.forEach((field) => {
      var cmp = amfutil.getElementByID(scope.name + "-" + field.name);
      data[cmp.name] = cmp.getValue();
      console.log(cmp);
    });
    return data;
  },

  convert: function (v) {
    console.log(v);
    return v;
  },

  insertFields: function (fields) {
    var items = [];

    var hbox = {
      xtype: "container",
      layout: {
        type: "hbox",
        align: "stretch",
      },
      defaults: {
        margin: 5,
        flex: 1,
      },
    };

    for (var i = 0; i < fields.length; i++) {
      var ref = this.name + "-" + fields[i].name;
      console.log(ref);
      var field = Object.assign({ id: ref, isFormField: false }, fields[i]);
      items.push(field);
      if (items.length == 2) {
        hbox.items = items;
        this.insert(0, hbox);
        items = [];
      } else if (i == fields.length - 1) {
        hbox.items = items;
        this.insert(0, hbox);
        items = [];
      }
    }
  },

  setReadOnly: function (readOnly) {
    console.log(readOnly);
    var buttons = Ext.ComponentQuery.query("#fieldbutton");
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
      itemId: "fieldbutton",
      iconCls: "x-fa fa-trash",
      flex: 1,
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
