Ext.define("Amps.form.ArrayField", {
  extend: "Ext.form.FieldSet",
  mixins: {
    field: "Ext.form.field.Field",
  },
  flex: 1,
  xtype: "arrayfield",
  scrollable: true,
  fields: [],
  arrayfields: [],
  fieldTitle: "Field",
  layout: {
    type: "vbox",
    align: "stretch",
  },

  constructor: function (args) {
    this.callParent([args]);

    this.fields = [];

    this.arrayfields = args["arrayfields"];
    this.fieldTitle = args["fieldTitle"];

    if (args["title"]) {
      this.setTitle(args["title"]);
    } else {
      this.setTitle("ArrayField");
    }

    this.name = args["name"];

    // this.buildField();
    // this.callParent();

    this.initField();
    var scope = this;

    if (args["value"]) {
      var value = args["value"];
      value.forEach((val) => {
        console.log(val);
        if (args.arrayfields.length == 1) {
          scope.insert(
            scope.items.length - 1,
            Ext.create("Amps.form.ArrayField.Field", {
              readOnly: args["readOnly"],
              register: scope.register.bind(scope),
              deregister: scope.deregister.bind(scope),
              fields: args.arrayfields.map((field) => {
                var f = Object.assign({}, field);
                f.value = val;
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
                var f = Object.assign({}, field);
                f.value = val[field.name];
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
    var val = [];
    this.fields.forEach((field) => {
      console.log(field);
      var f = amfutil.getElementByID(field);
      val.push(f.getValue());
    });
    console.log(val);

    return JSON.stringify(val);
  },

  setValue: function (value) {
    var scope = this;
    value.forEach((val) => {
      console.log(val);
      if (scope.arrayfields.length == 1) {
        scope.insert(
          scope.items.length - 1,
          Ext.create("Amps.form.ArrayField.Field", {
            readOnly: scope["readOnly"],
            register: scope.register.bind(scope),
            deregister: scope.deregister.bind(scope),
            fields: scope.arrayfields.map((field) => {
              var f = Object.assign({}, field);
              f.value = val;
              return f;
            }),
            title: scope.fieldTitle,
          })
        );
      } else {
        scope.insert(
          scope.items.length - 1,
          Ext.create("Amps.form.ArrayField.Field", {
            readOnly: scope["readOnly"],
            register: scope.register.bind(scope),
            deregister: scope.deregister.bind(scope),
            fields: scope.arrayfields.map((field) => {
              var f = Object.assign({}, field);
              f.value = val[field.name];
              return f;
            }),
            title: scope.fieldTitle,
          })
        );
      }
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

  setReadOnly: function (readOnly) {
    var buttons = Ext.ComponentQuery.query("#arraybutton");
    // var fi = Ext.ComponentQuery.query("fields");

    if (readOnly) {
      buttons.forEach((b) => {
        b.setHidden(true);
      });
    }
    this.fields.forEach((field) => {
      console.log(field);
      var f = amfutil.getElementByID(field);
      f.setReadOnly(readOnly);
    });
  },

  loadParms: function (data, readOnly) {
    var scope = this;
    if (data) {
      var parms = Object.entries(data).map((entry) => {
        return { field: entry[0], value: entry[1] };
      });

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
  isFormField: false,
  layout: {
    type: "vbox",
    align: "stretch",
  },
  style: {
    border: "dotted 1px var(--main-color)",
  },

  constructor: function (args) {
    this.callParent([args]);
    console.log(args);
    var name = "field-" + amfutil.makeRandom();
    this.itemId = name;
    this.name = name;
    args.register(name);
    this.deregister = function () {
      args.deregister(name);
    };
    var scope = this;
    this.fields = args["fields"];
    this.insertFields(this.fields);
    // console.log(scope.down("#addMenu"));
    // this.loadParms(args["value"], args["readOnly"]);
    this.setReadOnly(args["readOnly"]);
  },

  getValue: function () {
    var scope = this;
    var data = {};
    console.log(this.fields);
    console.log(this);

    this.fields.forEach((field) => {
      var cmp = amfutil.getElementByID(scope.name + "-" + field.name);
      // console.log(cmp);

      if (cmp) {
        if (cmp.xtype == "arrayfield") {
          data[cmp.name] = JSON.parse(cmp.getValue());
        } else {
          data[cmp.name] = cmp.getValue();
        }
      }
    });
    return data;
  },

  convert: function (v) {
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

    var vbox = {
      xtype: "container",
      layout: {
        type: "vbox",
        align: "stretch",
      },
      padding: 5,

      items: [],
    };

    for (var i = 0; i < fields.length; i++) {
      var ref = this.name + "-" + fields[i].name;
      var field = Object.assign(fields[i], {
        itemId: ref,
        readOnly: this.readOnly,
        isFormField: false,
      });
      console.log(field);
      if (field.row) {
        if (items.length == 2) {
          hbox.items = items;
          vbox.items.push(Ext.create(hbox));
          hbox.items = [field];
          vbox.items.push(Ext.create(hbox));
          items = [];
        } else {
          items.push({
            xtype: "component",
          });
          hbox.items = items;
          vbox.items.push(Ext.create(hbox));
          hbox.items = [field];
          vbox.items.push(Ext.create(hbox));

          items = [];
        }
      } else {
        items.push(field);

        if (items.length == 2) {
          hbox.items = items;
          vbox.items.push(Ext.create(hbox));
          items = [];
        } else if (i == fields.length - 1) {
          items.push({
            xtype: "component",
          });
          hbox.items = items;
          vbox.items.push(Ext.create(hbox));

          items = [];
        }
      }
    }
    console.log(vbox);
    this.insert(0, vbox);
  },

  setReadOnly: function (readOnly) {
    var buttons = Ext.ComponentQuery.query("#fieldbutton");
    // var fi = Ext.ComponentQuery.query("fields");

    if (readOnly) {
      buttons.forEach((b) => {
        b.setHidden(true);
      });
    }
    var scope = this;
    this.fields.forEach((field) => {
      var cmp = amfutil.getElementByID(scope.name + "-" + field.name);
      // console.log(cmp);
      if (cmp) {
        cmp.setReadOnly(readOnly);
      }
    });
  },

  loadParms: function (data, readOnly) {
    var scope = this;
    if (data) {
      var parms = Object.entries(data).map((entry) => {
        return { field: entry[0], value: entry[1] };
      });

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
        button.up("fieldcontainer").deregister();

        button
          .up("fieldcontainer")
          .up("fieldset")
          .remove(button.up("fieldcontainer"));
      },
    },
  ],
});
