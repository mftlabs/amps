Ext.define(
  "Amps.form.Rules",
  (function () {
    var self; // This is a variable to store "this"

    return {
      extend: "Ext.form.FieldSet",
      xtype: "formrules",
      title: "Rules",
      border: 0,
      constructor: function (args) {
        self = this;
        console.log(args);
        this.callParent([args]);
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
Ext.define("Amps.form.Rule", {
  extend: "Ext.form.FieldSet",
  xtype: "rulefield",
  layout: {
    type: "vbox",
    align: "stretch",
  },
  collapsible: true,
  constructor: function (args) {
    console.log(args);
    this.callParent([args]);
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
      amfutil.dynamicCreate(
        amfutil.combo(
          "Output Topic",
          name + "-topic",
          amfutil.createCollectionStore("topics"),
          "topic",
          "topic",
          {
            value: args["topic"],
            readOnly: args["readOnly"],
            tooltip:
              "The topic to route the message if it matches all match patterns.",
          }
        ),
        "topics"
      ),
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
    this.insert(0, amfutil.scanFields(items));
  },

  title: "Rule",
});

Ext.define("Amps.form.MatchPatterns", {
  xtype: "matchpatterns",
  extend: "Ext.form.FieldSet",
  border: 0,

  title: "Match Patterns",
  collapsible: true,
  constructor: function (args) {
    this.callParent([args]);
    this.name = args["name"];
    var scope = this;
    console.log(args);
    if (args["patterns"]) {
      this.loadPatterns(args["patterns"], args["readOnly"]);
    }

    if (args["value"]) {
      this.loadPatterns(args["value"], args["readOnly"]);
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
  extend: "Ext.form.FieldContainer",

  xtype: "matchpattern",
  title: "Match Pattern",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",

  layout: {
    type: "hbox",
    align: "stretch",
  },
  constructor: function (args) {
    this.callParent([args]);
    this.insert(0, [
      {
        xtype: "fieldcontainer",
        layout: "anchor",
        defaults: { anchor: "100%" },
        flex: 1,
        items: [
          {
            xtype: "fieldcontainer",
            layout: "hbox",
            items: [
              amfutil.tooltip(
                {
                  xtype: "combobox",
                  fieldLabel: "Field",
                  allowBlank: false,
                  isFormField: false,
                  displayField: "desc",
                  tooltip: "The Metadata Field to match on",
                  valueField: "field",
                  flex: 1,
                  name: "field",
                  listeners: {
                    change: "onChange",
                  },
                  store: "metadata",
                  itemId: "field",
                },
                {
                  flex: 1,
                }
              ),
              {
                xtype: "splitter",
                tabIndex: -1,
              },
              amfutil.tooltip(
                {
                  xtype: "checkbox",
                  isFormField: false,

                  fieldLabel: "Regex",
                  tooltip: "Whether to match using regex",

                  inputValue: true,
                  uncheckedValue: false,
                  flex: 1,
                  name: "regex",
                  listeners: {
                    render: function (scope) {
                      scope.setValue(false);
                    },
                    change: "onRegexChange",
                  },
                  itemId: "regex",
                },
                {
                  flex: 1,
                }
              ),
            ],
          },
          {
            xtype: "fieldcontainer",

            // The body area will contain three text fields, arranged
            // horizontally, separated by draggable splitters.
            layout: "hbox",
            items: [
              amfutil.tooltip(
                {
                  xtype: "textfield",
                  fieldLabel: "Pattern",
                  isFormField: false,

                  name: "pattern",
                  tooltip:
                    "The pattern to match against the specified metadata field value",

                  flex: 1,
                  listeners: {
                    change: "onChange",
                  },
                  allowBlank: false,
                  itemId: "pattern",
                },
                {
                  flex: 1,
                }
              ),
              {
                xtype: "splitter",
                tabIndex: -1,
              },
              {
                xtype: "container",
                layout: {
                  type: "vbox",
                  align: "stretch",
                },
                flex: 1,
                items: [
                  amfutil.tooltip({
                    validateOnChange: true,
                    xtype: "textfield",
                    fieldLabel: "Testcase",
                    isFormField: false,
                    readOnly: args["readOnly"],
                    tooltip: "A field to test a potential metadata value",
                    name: "test",
                    flex: 1,
                    listeners: {
                      change: "onTestChange",
                    },
                    itemId: "test",
                  }),
                  {
                    xtype: "container",
                    layout: "center",
                    items: [
                      {
                        xtype: "component",
                        hidden: true,
                        style: { "font-size": "1rem" },

                        itemId: "message_view",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        xtype: "button",
        itemId: "patternbutton",
        margin: { left: 5 },
        width: 50,
        iconCls: "x-fa fa-trash",
        handler: function (button, event) {
          console.log(button);
          button.up("fieldset").remove(button.up("fieldcontainer"));
        },
      },
    ]);
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
});
