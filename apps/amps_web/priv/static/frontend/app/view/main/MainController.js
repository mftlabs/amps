Ext.define(
  "Amps.form.Rules",
  (function () {
    var self; // This is a variable to store "this"

    return {
      extend: "Ext.form.FieldSet",
      xtype: "formrules",
      title: "Rules",
      collapsible: true,
      constructor: function (args) {
        self = this;
        console.log(args);
        this.callParent(args);
        this.ruleNames = [];
        this.loadRules(args["value"], args["readOnly"]);
        this.setReadOnly(args["readOnly"]);
      },
      loadRules: function (rules, readOnly) {
        var scope = this;
        if (rules) {
          rules.forEach((rule) => {
            scope.addRule(rule, readOnly);
          });
        }
      },
      setReadOnly: function (readOnly) {
        this.query("#rulebutton").forEach((button) => {
          button.setHidden(readOnly);
        });
      },

      addRule: function (rule, readOnly) {
        var scope = this;
        console.log(this);
        console.log(rule);
        scope.insert(
          scope.items.length - 1,
          Ext.create("Amps.form.Rule", {
            register: scope.register,
            deregister: scope.deregister,
            topic: rule.topic,
            patterns: rule.patterns,
            id: rule.id,
            readOnly: readOnly,
          })
        );
      },
      register: function (name) {
        console.log(self);
        self.ruleNames.push(name);
        console.log(self.ruleNames);
      },
      deregister: function (name) {
        var index = self.ruleNames.indexOf(name);
        if (index > -1) {
          self.ruleNames.splice(index, 1);
        }
        console.log(self.ruleNames);
      },
      flex: 1,
      items: [
        {
          xtype: "button",
          itemId: "rulebutton",
          text: "Add",
          handler: function (button, event) {
            var formpanel = button.up();

            formpanel.insert(
              formpanel.items.length - 1,
              Ext.create("Amps.form.Rule", {
                register: formpanel.register,
                deregister: formpanel.deregister,
              })
            );
          },
        },
      ],
    };
  })()
);

Ext.define("Amps.form.ArrayField", {
  extend: "Ext.form.FieldSet",
  mixins: {
    field: "Ext.form.field.Field",
  },
  xtype: "arrayfield",
  collapsible: true,
  fields: [],
  arrayfields: [],
  fieldTitle: "Field",

  constructor: function (args) {
    this.callParent(args);
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
  extend: "Ext.form.FieldSet",
  collapsible: true,
  layout: {
    type: "vbox",
    align: "stretch",
  },

  constructor: function (args) {
    this.callParent(args);
    var name = "field-" + amfutil.makeRandom();
    this.itemId = name;
    this.name = name;
    if (args["title"]) {
      this.setTitle(args["title"]);
    } else {
      this.setTitle("Field");
    }
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
        button.up("fieldset").deregister();

        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
  ],
});

Ext.define("Amps.form.Rule", {
  extend: "Ext.form.FieldSet",
  xtype: "rulefield",
  collapsible: true,
  constructor: function (args) {
    console.log(args);
    this.callParent(args);
    var id;

    if (args["id"]) {
      id = args["id"];
    } else {
      id = amfutil.uuid();
    }
    var name = "rule-" + id;
    console.log(name);

    args.register(name);
    this.deregister = function () {
      args.deregister(name);
    };
    console.log(id);
    var items = [
      {
        xtype: "combobox",
        name: name + "-topic",
        value: args["topic"],
        readOnly: args["readOnly"],
        fieldLabel: "Topic",
        listeners: {
          beforerender: async function (scope) {
            scope.setStore(amfutil.createCollectionStore("topics"));
          },
        },
        displayField: "topic",
        valueField: "topic",
        allowBlank: false,
        forceSelection: true,
      },
      {
        xtype: "matchpatterns",
        readOnly: args["readOnly"],

        name: name + "-patterns",
        patterns: args["patterns"],
      },
      {
        xtype: "hidden",
        name: name + "_id",
        value: id,
      },
      {
        xtype: "button",
        itemId: "rulebutton",
        iconCls: "x-fa fa-trash",
        flex: 1,
        handler: function (button, event) {
          console.log(button);
          button.up("fieldset").deregister();

          button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
        },
      },
    ];
    this.insert(0, items);
  },

  title: "Rule",
});

Ext.define("Amps.form.Parms", {
  // Fieldset in Column 1 - collapsible via toggle button
  extend: "Ext.form.FieldSet",
  xtype: "parmfield",
  itemId: "parms",
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
      xtype: "button",
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
      xtype: "button",
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
      xtype: "button",
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

Ext.define("Amps.form.MatchPatterns", {
  xtype: "matchpatterns",
  extend: "Ext.form.FieldSet",
  title: "Match Patterns",
  collapsible: true,
  constructor: function (args) {
    this.callParent(args);
    this.name = args["name"];
    var scope = this;
    console.log(args);
    if (args["patterns"]) {
      this.loadPatterns(args["patterns"], args["readOnly"]);
    }

    this.setReadOnly(args["readOnly"]);
  },

  loadPatterns: function (data, readOnly) {
    var scope = this;
    Object.entries(data).forEach((pattern) => {
      scope.insert(
        scope.items.length - 1,
        Ext.create("Amps.form.Matchpattern", {
          name: scope.name,
          field: pattern[0],
          regex: pattern[1].regex,
          pattern: pattern[1].value,
          readOnly: readOnly,
        })
      );
    });
  },

  setReadOnly: function (readOnly) {
    var buttons = this.query("#patternbutton");
    buttons.forEach((button) => {
      console.log(button);
      button.setHidden(readOnly);
    });
  },

  onAdd: function (component, position) {
    // component.setTitle("Match Pattern" + position);
    console.log(component);
    console.log(position);
  },
  items: [
    {
      xtype: "button",
      text: "Add",
      itemId: "patternbutton",
      handler: function (button, event) {
        var formpanel = button.up();
        console.log(formpanel.name);

        formpanel.insert(
          formpanel.items.length - 1,
          Ext.create("Amps.form.Matchpattern", {
            name: formpanel.name,
          })
        );
      },
    },
  ],
});

Ext.define("Amps.form.Matchpattern", {
  extend: "Ext.form.FieldSet",

  xtype: "matchpattern",
  title: "Match Pattern",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  constructor: function (args) {
    this.callParent(args);
    this.insert({
      xtype: "hidden",
      name: args["name"] ? args["name"] : "patterns",
      itemId: "patternvalue",
    });
    // console.log(args);
    var f = this.down("#field");
    var p = this.down("#pattern");
    var r = this.down("#regex");
    f.setValue(args["field"]);
    p.setValue(args["pattern"]);
    r.setValue(args["regex"]);
    f.setReadOnly(args["readOnly"]);
    p.setReadOnly(args["readOnly"]);

    r.setReadOnly(args["readOnly"]);
  },
  layout: "anchor",
  listeners: {
    beforerender: function (scope, eOpts) {
      var field = scope.down("#field");
      console.log(field);
      // console.log(
      //   `/api/rules/fields/${Ext.util.History.getToken().split("/")[1]}`
      // );
      // scope.down("#field").setStore(
      //   Ext.create("Ext.data.Store", {
      //     proxy: {
      //       type: "rest",
      //       headers: {
      //         Authorization: localStorage.getItem("access_token"),
      //       },
      //       url: `/api/rules/fields/${
      //         Ext.util.History.getToken().split("/")[1]
      //       }`,
      //       reader: {
      //         type: "json",
      //       },
      //     },
      //     listeners: {
      //       load: function (store, records, successful, operation, eOpts) {
      //         console.log(successful);
      //       },
      //     },
      //     autoLoad: true,
      //   })
      // );
    },
  },
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "combobox",
          fieldLabel: "Field",
          allowBlank: false,
          displayField: "description",
          valueField: "field",
          flex: 1,
          name: "field",
          listeners: {
            change: "onChange",
          },
          store: [],
          itemId: "field",
        },
        {
          xtype: "splitter",
          tabIndex: -1,
        },
        {
          xtype: "checkbox",
          fieldLabel: "Regex",

          inputValue: true,
          uncheckedValue: false,
          flex: 1,
          name: "regex",
          listeners: {
            change: "onRegexChange",
          },
          itemId: "regex",
        },
      ],
    },
    {
      xtype: "fieldcontainer",

      // The body area will contain three text fields, arranged
      // horizontally, separated by draggable splitters.
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          fieldLabel: "Pattern",
          name: "pattern",
          flex: 1,
          listeners: {
            change: "onChange",
          },
          allowBlank: false,
          itemId: "pattern",
        },
        {
          xtype: "splitter",
          tabIndex: -1,
        },
        {
          validateOnChange: true,
          xtype: "textfield",
          fieldLabel: "Testcase",
          name: "test",
          flex: 1,
          listeners: {
            change: "onTestChange",
          },
          itemId: "test",
        },
      ],
    },
    {
      xtype: "container",
      height: 30,
      hidden: true,
      itemId: "message_view",
    },
    {
      xtype: "button",
      itemId: "patternbutton",
      iconCls: "x-fa fa-trash",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
  ],
});

Ext.define("Amps.form.Defaults", {
  extend: "Ext.form.FieldSet",
  xtype: "defaults",
  title: "Default Metadata",
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
    {
      xtype: "hidden",
      name: "defaults",
      itemId: "defaultvalue",
    },
  ],
});

Ext.define("Amps.form.Keys", {
  extend: "Ext.container.Container",
  constructor: function (config) {
    var data = {};
    (data.items = [
      {
        xtype: "fieldcontainer",
        layout: "hbox",
        items: [
          {
            xtype: "textfield",
            flex: 1,
            fieldLabel: config.label,
            name: config.name,
            itemId: "value",
          },
        ],
      },
      {
        xtype: "button",
        iconCls: "x-fa fa-trash",
        handler: function (button, event) {
          console.log(button);
          button.up("fieldset").remove(button.up("container"));
        },
      },
    ]),
      this.callParent([data]);

    // console.log(init);
  },
  xtype: "keys",
  title: "Keys",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  style: {
    margin: 5,
  },
  layout: "anchor",
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: this.label,
          name: this.name,
          itemId: "value",
        },
      ],
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
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

Ext.define("Amps.form.FileMetaData", {
  extend: "Ext.form.FieldSet",
  xtype: "filemetadata",
  title: "File Metadata",
  collapsible: true,
  defaultType: "textfield",
  controller: "agentputcontroller",
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
          fieldLabel: "Key",
          name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "field",
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
        },
      ],
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
    {
      xtype: "hidden",
      name: "fmeta",
      itemId: "filemetadatavalue",
    },
  ],
});

Ext.define("Amps.form.add", {
  extend: "Ext.window.Window",
  modal: true,
  minWidth: 500,
  maxWidth: 700,
  maxHeight: 600,
  scrollable: true,
  resizable: false,
  layout: "fit",
  loadForm: function (item, fields, process = (form, val) => val) {
    this.item = item;
    this.title = "Add " + item;
    this.process = process;

    fields.forEach((field) => {
      // field.flex = 1;
      this.down("form").insert(field);
    });
  },

  items: [
    {
      xtype: "form",
      bodyPadding: 10,
      defaults: {
        padding: 5,
        labelWidth: 100,
      },
      layout: {
        type: "vbox",
        vertical: true,
        align: "stretch",
      },
      scrollable: true,
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var grid = amfutil.getElementByID("main-grid");
              var form = btn.up("form").getForm();
              var values = form.getValues();
              console.log(values);

              values = this.up("window").process(btn.up("form"), values);
              console.log(values);
              values = amfutil.convertNumbers(form, values);
              console.log(values);

              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/" + Ext.util.History.getToken(),
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: values,
                success: function (response) {
                  mask.hide();
                  var item = btn.up("window").item;
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast(`${item} created`);
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  var tokens = Ext.util.History.getToken().split("/");
                  if (tokens.length > 1) {
                    amfutil
                      .getElementByID(`${tokens[0]}-${tokens[2]}`)
                      .getStore()
                      .reload();
                  } else {
                    amfutil.getElementByID("main-grid").getStore().reload();
                  }
                  btn.up("window").close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  amfutil.onFailure("Failed to Create User", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              this.up("window").close();
            },
          },
        },
      ],
    },
  ],
});

Ext.define("Amps.view.main.MainController", {
  itemId: "maincontroller",
  extend: "Ext.app.ViewController",

  alias: "controller.main",
  requires: ["Amps.view.main.SearchWindow"],

  listen: {
    controller: {
      "*": {
        welcome: "greet",
      },
    },
  },

  routes: {
    logout: "onLogout",
  },

  // onRoute: function () {
  //   console.log("Triggering routes");
  //   console.log(this);

  //   console.log(Ext.util.History.currentToken);
  //   token = Ext.util.History.currentToken;
  // },

  onLogout: function () {
    amfutil.logout();
  },

  showUploads: function () {
    console.log("Uploads");
    amfuploads.show();
  },

  greet: function () {
    console.log("Greetings triggered");
  },

  //onItemSelected: function (sender, record) {
  //  Ext.Msg.confirm("Confirm", "Are you sure?", "onConfirm", this);
  //},

  onConfirm: function (choice) {
    console.log("Choice seleted:" + choice);
    if (choice === "yes") {
      //
      console.log("Confirmed.");
      this.redirectTo("/users", { replace: true });
    }
  },

  // Component forms

  onAddNewButtonClicked: function (btn) {
    componentname = amfutil.getElementByID("addnewbtn").componentname;
    var route = Ext.util.History.currentToken;
    var tokens = route.split("/");
    console.log(route);
    switch (route) {
      case "accounts":
        console.log("Render accounts form");
        this.addAccounts(btn);
        break;
      case "admin":
        this.addUser(btn);
        break;
      case "topics":
        this.createForm(btn, route);
        break;
      case "services":
        this.addService(btn);
        break;
      default:
        this.createForm(btn, route);
    }
  },

  createForm: function (btn, route) {
    var grid = amfutil.getElementByID("main-grid");
    // scope = btn.lookupController();

    var config = ampsgrids.grids[route];

    var win = Ext.create("Amps.form.add", config.window);
    win.loadForm(config.object, config.fields, (form, values) => {
      if (config.add && config.add.process) {
        values = config.add.process(form, values);
      }
      return values;
    });
    win.show();
  },

  addBucket: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
        width: 400,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Bucket Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          allowBlank: false,
          itemId: "bucket",
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            change: amfutil.uniqueBucket,
            blur: function (item) {
              //  amfutil.removeSpaces(item.itemId);
            },
          },
          width: 400,
        },
        {
          xtype: "combobox",
          fieldLabel: "Account",
          allowBlank: false,
          displayField: "username",
          valueField: "username",
          forceSelection: true,
          flex: 1,
          name: "account",
          store: Ext.create("Ext.data.Store", {
            proxy: {
              type: "rest",
              headers: {
                Authorization: localStorage.getItem("access_token"),
              },
              extraParams: { projection: "username" },
              url: `/api/accounts`,
              reader: {
                type: "json",
                rootProperty: "rows",
              },
            },
            listeners: {
              load: function (store, records, successful, operation, eOpts) {
                console.log(records);
                console.log(successful);
              },
            },
            autoLoad: true,
          }),
        },
      ],
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var values = form.getValues();
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              var bucket = {};
              bucket.account = values.account;
              bucket.name = values.name;
              bucket.rules = [];
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/" + Ext.util.History.getToken(),
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: bucket,
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Bucket created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  amfutil.onFailure("Failed to Create User", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Bucket",
      modal: true,
      width: 500,
      height: 600,
      scrollable: true,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  addAction: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    // scope = btn.lookupController();
    var actions = ampsgrids.grids["actions"];
    var win = Ext.create("Amps.form.add", {
      width: 650,
      defaults: {
        labelWidth: 200,
      },
    });
    win.loadForm("Action", actions.fields, actions.add.process);
    win.show();
  },

  addTopic: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    // scope = btn.lookupController();

    var win = Ext.create("Amps.form.add");
    win.loadForm("Topic", ampsgrids.grids["topics"].fields, (values) => {
      return values;
    });
    win.show();
  },

  addService: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    var services = ampsgrids.grids["services"].types;

    var win = new Ext.window.Window({
      title: "Add Service",
      modal: true,
      width: 600,
      height: 500,
      scrollable: true,
      resizable: false,
      layout: "card",
      bodyPadding: 15,
      defaults: {
        border: false,
        listeners: {
          activate: function (card) {
            var idx = card.id.split("-")[1];
            console.log(idx);
            if (idx > 0) {
              win.down("#card-prev").show();
              win.down("#create").show();
            } else {
              win.down("#card-prev").hide();
              win.down("#create").hide();
            }
          },
          scope: this,
        },
      },

      defaultListenerScope: true,

      items: [
        {
          itemId: "card-0",
          xtype: "container",
          layout: {
            type: "vbox",
            // The total column count must be specified here
          },
          flex: 1,
          items: [],
        },
        {
          itemId: "card-1",
          xtype: "form",
          items: [
            {
              xtype: "component",
              itemId: "servicetitle",
              html: "<h2>Adding Service </h2>",
            },
            {
              xtype: "container",
              itemId: "formbox",
              layout: { type: "vbox", align: "stretch" },
              items: [
                {
                  xtype: "container",
                  layout: {
                    type: "hbox",
                    align: "stretch",
                  },
                  defaults: {
                    margin: 5,
                  },
                  items: [
                    {
                      xtype: "textfield",
                      fieldLabel: "Test",
                      flex: 1,
                    },
                    {
                      xtype: "textfield",
                      fieldLabel: "Test2",
                      flex: 1,
                    },
                  ],
                },
              ],
            },
          ],
          bbar: [
            {
              itemId: "card-prev",
              scale: "medium",
              text: "&laquo; Previous",
              handler: function (scope) {
                scope.up("window").setActiveItem(0);
              },
            },
            "->",
            {
              xtype: "button",
              itemId: "create",
              formBind: true,
              scale: "medium",
              text: "Create",
              handler: async function (btn) {
                var form = btn.up("form").getForm();
                var data;
                if (win.service.process) {
                  data = await win.service.process(form);
                } else {
                  data = await form.getValues();
                }
                data.type = win.service.type;

                data.active = true;

                win.service.fields.forEach((field) => {
                  if (field.xtype == "numberfield") {
                    data[field.name] = parseInt(data[field.name]);
                  }
                });

                console.log(data);
                btn.setDisabled(true);
                var mask = new Ext.LoadMask({
                  msg: "Please wait...",
                  target: grid,
                });
                amfutil.ajaxRequest({
                  headers: {
                    Authorization: localStorage.getItem("access_token"),
                  },
                  url: "api/services",
                  method: "POST",
                  jsonData: data,
                  success: function (response) {
                    btn.setDisabled(false);
                    var data = Ext.decode(response.responseText);
                    Ext.toast("Service added");
                    amfutil.broadcastEvent("update", {
                      page: Ext.util.History.getToken(),
                    });
                    grid.getStore().reload();
                    mask.hide();
                    win.close();
                  },
                  failure: function (response) {
                    mask.hide();
                    btn.setDisabled(false);
                    amfutil.onFailure("Failed to Create Service", response);
                  },
                });
                console.log(data);
              },
            },
          ],
          scrollable: true,
        },
      ],

      loadForm: function (btn, service) {
        var form = this.down("#card-1").down("container");
        var title = this.down("#servicetitle");
        title.setHtml(`<h2>Configure ${service.name} service</h2>`);
        console.log(form);
        this.service = service;
        form.removeAll();

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

        var items = [];
        var fields = [];
        fields = fields.concat(ampsgrids.grids["services"].fields);
        fields = fields.concat(service.fields);
        console.log(fields);

        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (field.row) {
            if (items.length) {
              var row = hbox;
              items.push({ flex: 1 });
              row.items = items;

              form.insert(row);
              items = [];
            }
            form.insert(field);
          } else {
            items.push(field);
            if (items.length == 2) {
              var row = hbox;
              row.items = items;

              form.insert(row);
              items = [];
            } else if (i == fields.length - 1) {
              var row = hbox;
              row.items = items;
              items.push({
                xtype: "displayfield",
              });
              form.insert(row);
              items = [];
            }
          }
        }

        this.getLayout().setActiveItem(1);
      },
    });
    var hbox = {
      xtype: "container",
      layout: "hbox",
      width: "100%",
      defaults: {
        height: 50,
        margin: 5,
      },
    };

    var items = [];

    var store = grid.getStore();

    Object.values(services).forEach((service, idx) => {
      console.log(idx);
      items.push({
        xtype: "button",
        text: service.name,
        height: 100,
        iconCls: service.iconCls ? service.iconCls : null,
        flex: 1,
        handler: function (btn, e) {
          btn.up("window").loadForm(btn, service);
        },
        scale: "medium",
        disabled: false,
        listeners: {
          beforerender: async function (scope) {
            if (service.singleton) {
              var rows = await amfutil.getCollectionData("services", {
                type: service.type,
              });
              if (rows.length) {
                scope.setDisabled(true);
              }
            }
          },
        },
      });
      if (items.length == 3) {
        var row = hbox;
        row.items = items;
        win.down("#card-0").insert(row);
        items = [];
      } else if (idx == Object.values(services).length - 1) {
        var num = 3 - items.length;
        for (var i = 0; i < num; i++) {
          console.log("adding");
          items.push({
            xtype: "button",
            style: {
              background: "white",
              border: "none",
              outline: "none",
            },
            disabled: true,
            height: 100,
            flex: 1,
            scale: "medium",
          });
        }
        var row = hbox;
        row.items = items;
        win.down("#card-0").insert(row);
        items = [];
      }
    });

    // scope = btn.lookupController();

    win.show();
  },

  addUser: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "username",
          fieldLabel: "User Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          vtype: "alphnumVtype",
          vtypeText: "Please enter a valid user name",
          allowBlank: false,
          itemId: "username",
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            blur: function (item) {
              //  amfutil.removeSpaces(item.itemId);
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
            change: async function (cmp, value, oldValue, eOpts) {
              var duplicate = await amfutil.checkDuplicate({
                users: { username: value },
              });

              if (duplicate) {
                cmp.setActiveError("User Already Exists");
                cmp.setValidation("User or Bucket Already Exists");
                // cmp.isValid(false);
              } else {
                cmp.setActiveError();
                cmp.setValidation();
              }
            },
          },
          width: 400,
        },
        {
          xtype: "textfield",
          name: "password",
          fieldLabel: "Password",
          inputType: "password",
          allowBlank: false,
          maskRe: /[^\^ ]/,
          vtype: "passwordCheck",
          itemId: "password",
          enableKeyEvents: true,
          width: 400,
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "new-password",
              });
            },
            keypress: function (me, e) {
              var charCode = e.getCharCode();
              if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(false);
              } else {
                me.isValid();
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(true);
              }
            },
            change: function (me, e) {
              confPassword = amfutil.getElementByID("confirmpwd").getValue();
              password = me.value;
              if (confPassword.length != 0) {
                if (password != confPassword) {
                  amfutil.getElementByID("addaccount").setDisabled(true);
                  //amfutil.getElementByID('confpasswd').focus();
                  var m = Ext.getCmp("confpasswd_id");
                  m.setActiveError("Passwords doesn't match");
                } else {
                  if (
                    amfutil.getElementByID("username").isValid() === true &&
                    amfutil.getElementByID("given_name").isValid() === true &&
                    amfutil.getElementByID("surname").isValid() === true &&
                    amfutil.getElementByID("email").isValid() === true &&
                    amfutil.getElementByID("phone_number").isValid() === true
                  ) {
                    amfutil.getElementByID("addaccount").setDisabled(false);
                  }
                  var m = Ext.getCmp("confpasswd_id");
                  m.unsetActiveError();
                }
              }
            },
          },
        },
        {
          xtype: "textfield",
          name: "confirmpwd",
          fieldLabel: "Confirm Password",
          inputType: "password",
          maskRe: /[^\^ ]/,
          id: "confpasswd_id",
          allowBlank: false,
          vtype: "passwordMatch",
          itemId: "confirmpwd",
          enableKeyEvents: true,
          width: 400,
          listeners: {
            keypress: function (me, e) {
              var charCode = e.getCharCode();
              if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(false);
              } else {
                me.isValid();
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(true);
              }
            },
          },
        },
        {
          html: '<p style="color:red;font-weight:600;margin-left:168px;"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Caps lock is on</p>',
          itemId: "user_capslock_id",
          hidden: true,
        },
        {
          xtype: "textfield",
          name: "given_name",
          itemId: "given_name",
          fieldLabel: "Given Name",
          vtype: "textbox",
          vtypeText: "Please enter a valid given name",
          allowBlank: false,
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
            change: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
        {
          xtype: "textfield",
          name: "surname",
          itemId: "surname",
          fieldLabel: "Surname",
          allowBlank: false,
          vtype: "textbox",
          vtypeText: "Please enter a valid surname",
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
        {
          xtype: "textfield",
          itemId: "email",
          name: "email",
          vtype: "email",
          fieldLabel: "Email",
          allowBlank: false,
          //  minLength:MftDashboard.util.FieldValidations.EMAIL_MIN_LENTGH,
          //   maxLength:MftDashboard.util.FieldValidations.EMAIL_MAX_LENTGH,
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
        {
          xtype: "textfield",
          name: "phone",
          fieldLabel: "Phone Number",
          allowBlank: false,
          itemId: "phone_number",
          vtype: "phone",
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
      ],
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              username = form.findField("username").getSubmitValue();
              password = form.findField("password").getSubmitValue();
              given_name = form.findField("given_name").getSubmitValue();
              surname = form.findField("surname").getSubmitValue();
              email = form.findField("email").getSubmitValue();
              phone_number = form.findField("phone").getSubmitValue();
              // page_size = grid.store.pageSize;
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/user/reg",
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: {
                  username: username,
                  password: password,
                  firstname: given_name,
                  lastname: surname,
                  email: email,
                  phone: phone_number,
                },
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("User created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Create User", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add User",
      modal: true,
      width: 450,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  addAccounts: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
        width: 400,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "username",
          fieldLabel: "User Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          // vtype: "bucketUsernameVtype",
          allowBlank: false,
          itemId: "username",
          validateOnBlur: false,
          validator: function (value) {
            console.log(value);
            var reg = new RegExp("^[0-9a-z.-]+$");
            if (value.length >= 3) {
              if (reg.test(value)) {
                return true;
              } else {
                return "Username must be lowercase and contain only letters, numbers, hyphens, and periods.";
              }
            } else {
              return "Username must be between 8 and 40 characters";
            }
          },
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            change: amfutil.uniqueBucket,
            blur: function (cmp, event, eOpts) {
              console.log(event);
              //  amfutil.removeSpaces(item.itemId);
            },
          },
          width: 400,
        },
        {
          xtype: "textfield",
          name: "given_name",
          itemId: "given_name",
          fieldLabel: "Given Name",
          vtype: "textbox",
          vtypeText: "Please enter a valid given name",
          allowBlank: false,
          width: 400,
          listeners: {
            blur: function (field) {},
            change: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "surname",
          itemId: "surname",
          fieldLabel: "Surname",
          allowBlank: false,
          vtype: "textbox",
          vtypeText: "Please enter a valid surname",
          width: 400,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          itemId: "email",
          name: "email",
          vtype: "email",
          fieldLabel: "Email",
          allowBlank: false,
          //  minLength:MftDashboard.util.FieldValidations.EMAIL_MIN_LENTGH,
          //   maxLength:MftDashboard.util.FieldValidations.EMAIL_MAX_LENTGH,
          width: 400,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "phone_number",
          fieldLabel: "Phone Number",
          allowBlank: false,
          itemId: "phone_number",
          vtype: "phone",
          width: 400,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "ufa_home_folder",
          itemId: "ufa_home_folder",
          fieldLabel: "UFA Home Folder",
          allowBlank: false,
          listeners: {
            change: function (obj) {
              log_file_path = amfutil.getElementByID("log_file_path");
              log_file_path.setValue(obj.getValue() + "/logs");
            },
          },
        },

        {
          xtype: "textfield",
          name: "config_polling_interval",
          itemId: "config_polling_interval",
          fieldLabel: "Configuration Polling Interval(Sec)",
          value: "2",
        },
        {
          xtype: "textfield",
          name: "heartbeat_polling_interval",
          itemId: "heartbeat_polling_interval",
          fieldLabel: "Hearbeat Polling Interval(Sec)",
          value: "2",
        },
        {
          xtype: "textfield",
          name: "log_file_path",
          itemId: "log_file_path",
          fieldLabel: "Log File Path",
        },
        {
          xtype: "checkboxfield",
          name: "debug_logging",
          itemId: "debug_logging",
          fieldLabel: "Debug Logging",
          value: false,
        },
        // {
        //   xtype: "textfield",
        //   name: "aws_access_key_id",
        //   itemId: "aws_access_key_id",
        //   fieldLabel: "Access Key Id",
        // },
        // {
        //   xtype: "textfield",
        //   name: "aws_secret_access_key",
        //   itemId: "aws_secret_access_key",
        //   fieldLabel: "Secret Access Key",
        //   inputType: "password",
        // },
      ],
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              username = form.findField("username").getSubmitValue();
              given_name = form.findField("given_name").getSubmitValue();
              surname = form.findField("surname").getSubmitValue();
              email = form.findField("email").getSubmitValue();
              phone_number = form.findField("phone_number").getSubmitValue();
              // page_size = grid.store.pageSize;
              ufa_home_folder = form
                .findField("ufa_home_folder")
                .getSubmitValue();
              config_polling_interval = form
                .findField("config_polling_interval")
                .getSubmitValue();
              heartbeat_polling_interval = form
                .findField("heartbeat_polling_interval")
                .getSubmitValue();
              log_file_path = form.findField("log_file_path").getSubmitValue();
              debug_logging = form.findField("debug_logging").getValue();
              // console.log(password);
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/accounts",
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: {
                  username: username,
                  given_name: given_name,
                  surname: surname,
                  given_name: given_name,
                  email: email,
                  phone_number: phone_number,
                  ufahome: ufa_home_folder,
                  cinterval: config_polling_interval,
                  hinterval: heartbeat_polling_interval,
                  logpath: log_file_path,
                  debug: debug_logging,
                  fields: [],
                  rules: [],
                },
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Account created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Create Account", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Account",
      modal: true,
      width: 500,
      height: 600,
      scrollable: true,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  onRefreshButtonClicked: function () {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    grid.getStore().reload();
  },

  onSearchPanel: function (btn) {
    var treenav = Ext.ComponentQuery.query("#treenavigation")[0];
    treenav.setSelection(0);
    console.log(btn.iconCls);
    var grid = this.getView().down("#main-grid");

    var window = this.getView().down("searchwindow");

    window.loadForm();

    console.log(this);
    // window.show();
    if (!window.isVisible()) {
      btn.setIconCls("x-fa fa-angle-double-right");
      window.show();
      var viewport = amfutil.getElementByID("main-viewport");
      window.setPosition(
        amfutil.getElementByID("center-main").getBox().width -
          window.getSize().width,
        0
      );
      console.log("showing");

      /*if(currentNode== '0'){
                  MftDashboard.util.Utilities.loadMessageActivity();
              }
              if(currentNode== '1'){
                  MftDashboard.util.Utilities.loadSessionActivity();
              }*/
    } else {
      // elem2 = Ext.ComponentQuery.query("#searchpanel")[0];
      // elem2.setHidden(true);
      btn.setIconCls("x-fa fa-search");
      window.hide();
      console.log("hiding");
    }
  },
  onClearFilter: function () {
    amfutil.clearFilter();
  },

  addAgentGet: function () {
    grid = amfutil.getElementByID("main-grid");
    var form = new Ext.form.Panel({
      defaults: {
        padding: 10,
        labelWidth: 180,
        width: 500,
        labelStyle: "white-space: nowrap;",
      },
      items: [
        {
          xtype: "textfield",
          name: "rule_name",
          itemId: "rule_name",
          fieldLabel: "Rule Name",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "rule_type",
          itemId: "rule_type",
          fieldLabel: "Rule Type",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "bpoll",
          itemId: "bpoll",
          fieldLabel: "Bucket Polling Interval(Sec)",
          allowBlank: false,
          value: "300",
        },
        {
          xtype: "textfield",
          name: "bretry",
          itemId: "bretry",
          fieldLabel: "Get Failure Retry Wait",
          value: "5",
        },
        {
          xtype: "textfield",
          name: "bucket",
          itemId: "bucket",
          fieldLabel: "Bucket Name",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "prefix",
          itemId: "prefix",
          fieldLabel: "Bucket Path Prefix",
          value: "inbox/",
        },
        {
          xtype: "textfield",
          name: "folder",
          itemId: "folder",
          fieldLabel: "Download Folder Name",
          allowBlank: false,
        },
        {
          xtype: "radiogroup",
          fieldLabel: "Acknowledgment Mode",
          itemId: "ackmode",
          allowBlank: false,
          columns: 3,
          width: 400,
          items: [
            {
              boxLabel: "None",
              inputValue: "none",
              name: "ackmode",
              checked: true,
            },
            {
              boxLabel: "Archive",
              name: "ackmode",
              inputValue: "archive",
            },
            {
              boxLabel: "Delete",
              name: "ackmode",
              inputValue: "delete",
            },
          ],
          /*listeners: {
            change: function (obj) {
              if (obj.value == "move:tofolder") {
                fname = amfutil.getElementByID("get_fname");
                fname.setHidden(false);
                fname.setValue("");
              } else {
                fname = amfutil.getElementByID("get_fname");
                fname.setHidden(true);
              }
            },
          },*/
        },
        /*{
          xtype: "textfield",
          name: "get_fname",
          itemId: "get_fname",
          hidden: true,
          fieldLabel: "Folder Name",
        },*/
      ],
      buttons: [
        {
          xtype: "button",
          text: "Save",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              rule_name = form.findField("rule_name").getSubmitValue();
              rule_type = form.findField("rule_type").getSubmitValue();
              bpoll = form.findField("bpoll").getSubmitValue();
              bretry = form.findField("bretry").getSubmitValue();
              bucket = form.findField("bucket").getSubmitValue();
              prefix = form.findField("prefix").getSubmitValue();
              folder = form.findField("folder").getSubmitValue();
              ackmode = form.findField("ackmode").getGroupValue();
              //fname = form.findField("get_fname").getSubmitValue();
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/agentget",
                method: "POST",
                jsonData: {
                  name: rule_name,
                  rtype: rule_type,
                  bpoll: bpoll,
                  bretry: bretry,
                  bucket: bucket,
                  prefix: prefix,
                  folder: folder,
                  ackmode: ackmode,
                  //"fname": fname,
                  active: true,
                },
                success: function (response) {
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Agent get added");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  grid.getStore().reload();
                  mask.hide();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  amfutil.onFailure(
                    "Failed to Create Agent Get Rule",
                    response
                  );
                },
              });
            },
          },
        },
        {
          xtype: "button",
          text: "Cancel",
          cls: "button_class",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Agent Get",
      modal: true,
      layout: "fit",
      width: 550,
      height: 550,
      items: [form],
    });
    win.show();
  },

  addAgentPut: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 10,
        labelWidth: 160,
        width: 400,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "put_rule_name",
          itemId: "put_rule_name",
          fieldLabel: "Rule Name",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "put_rule_type",
          itemId: "put_rule_type",
          fieldLabel: "Rule Type",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "fpoll",
          fieldLabel: "File Polling Interval(Sec)",
          maskRe: /[0-9]/,
          vtype: "alphnumVtype",
          vtypeText: "Please enter a valid file polling interval",
          itemId: "fpoll",
          value: "300",
        },
        {
          xtype: "textfield",
          name: "fretry",
          fieldLabel: "Failure Retry Wait",
          maskRe: /[0-9]/,
          vtypeText: "Please enter a valid Failure Retry Wait",
          itemId: "fretry",
          value: "5",
        },
        {
          xtype: "checkboxfield",
          name: "regex",
          itemId: "regex",
          fieldLabel: "Regex Flag",
          value: false,
        },
        {
          xtype: "textfield",
          itemId: "fmatch",
          name: "fmatch",
          fieldLabel: "File Match Pattern",
          value: "*",
          width: 400,
        },
        {
          xtype: "textfield",
          name: "bucket",
          fieldLabel: "Upload Bucket Name",
          allowBlank: false,
          itemId: "bucket",
        },
        {
          xtype: "textfield",
          name: "bpath",
          fieldLabel: "Upload Bucket Path",
          itemId: "bpath",
        },
        /* {
          xtype: "textfield",
          name: "fmeta",
          fieldLabel: "File Metadata",
          itemId: "fmeta",
          width: 400,
        }, */ {
          // Fieldset in Column 1 - collapsible via toggle button
          xtype: "fieldset",
          title: "File Metadata",
          collapsible: true,
          margin: { left: 10 },
          onAdd: function (component, position) {
            // component.setTitle("Match Pattern" + position);
            console.log(component);
            console.log(position);
          },
          items: [
            {
              xtype: "button",
              text: "Add",
              handler: function (button, event) {
                var formpanel = button.up();

                formpanel.insert(
                  formpanel.items.length - 1,
                  Ext.create("Amps.form.FileMetaData")
                );
              },
            },
          ],
        },
        {
          xtype: "radiogroup",
          fieldLabel: "Acknowledgment Mode",
          itemId: "ackmode",
          allowBlank: false,
          columns: 3,
          width: 400,
          items: [
            {
              boxLabel: "None",
              inputValue: "none",
              name: "put_ackmode",
              checked: true,
            },
            {
              boxLabel: "Archive",
              name: "put_ackmode",
              inputValue: "archive",
            },
            {
              boxLabel: "Delete",
              name: "put_ackmode",
              inputValue: "delete",
            },
          ],
          /*listeners: {
            change: function (obj) {
              if (obj.value == "move:tofolder") {
                fname = amfutil.getElementByID("fname");
                fname.setHidden(false);
                fname.setValue("");
              } else {
                fname = amfutil.getElementByID("fname");
                fname.setHidden(true);
              }
            },
          },*/
        },
        /*{
          xtype: "textfield",
          name: "foldername",
          itemId: "fname",
          hidden: true,
          fieldLabel: "Folder Name",
          //value:record.fname
        },*/
      ],
      buttons: [
        {
          text: "Save",
          itemId: "addagentput",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              rule_name = form.findField("put_rule_name").getSubmitValue();
              rule_type = form.findField("put_rule_type").getSubmitValue();
              fpoll = form.findField("fpoll").getSubmitValue();
              fretry = form.findField("fretry").getSubmitValue();
              regex = form.findField("regex").getValue();
              fmatch = form.findField("fmatch").getSubmitValue();
              bucket = form.findField("bucket").getSubmitValue();
              bpath = form.findField("bpath").getSubmitValue();
              ackmode = form.findField("put_ackmode").getGroupValue();
              //fname = form.findField("foldername").getSubmitValue();
              values = form.getValues();
              console.log(values);
              fmeta = values.field;
              field_metadata = [];
              if (Array.isArray(values.field) && Array.isArray(values.value)) {
                lengthis = values.field.length;
                console.log(lengthis);
                for (let i = 0; i < lengthis; i++) {
                  field_metadata.push({
                    key: values.field[i],
                    value: values.value[i],
                  });
                }
              } else {
                field_metadata = [{ key: values.field, value: values.value }];
              }

              // page_size = grid.store.pageSize;
              console.log(field_metadata);
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/agentput",
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: {
                  name: rule_name,
                  rtype: rule_type,
                  fpoll: fpoll,
                  fretry: fretry,
                  regex: regex,
                  fmatch: fmatch,
                  bucket: bucket,
                  bpath: bpath,
                  fmeta: field_metadata,
                  ackmode: ackmode,
                  //"movetofolder_name": fname,
                  active: true,
                },
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Agent Put created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure(
                    "Failed to Create Agent Put Rule",
                    response
                  );
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "agentput_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Agent Put",
      modal: true,
      width: 550,
      height: 600,
      scrollable: true,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  onResetPassword: function () {
    var user = amfutil.get_user();
    amfutil.ajaxRequest({
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      url: "/api/user/reset-password/",
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "POST",
      jsonData: {
        user: {
          email: user.email,
        },
      },
      timeout: 30000,
      params: {},
      success: function (response) {
        localStorage.clear();
        Ext.toast("Password Reset Email Sent!");
      },
      failure: function (response) {
        console.log("Could not send password reset email");
      },
    });
  },
  onLogout() {
    amfutil.logout();
  },
});
