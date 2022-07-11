Ext.define("Amps.form.CollectionGrid", {
  extend: "Ext.form.FieldContainer",
  xtype: "collectionlist",
  // title: "Rules",
  mixins: {
    field: "Ext.form.field.Field",
  },
  // flex: 1,
  width: 600,
  constructor: function (args) {
    this.callParent([args]);
    this.setLoading(true);
    var collection = args["collection"];
    var filter = {};
    if (args["filter"]) {
      filter = args["filter"];
    }
    var config = ampsgrids.grids[collection]();
    console.log(config);
    var scope = this;
    var gridstore = Ext.create("Ext.data.Store", {
      proxy: {
        type: "memory",
        reader: "array",
      },
    });
    var grid = Ext.create({
      xtype: "grid",
      sortableColumns: false,
      title: config.title,
      itemId: "rules",
      store: gridstore,
      reloadRules: function () {
        var gridstore = this.getStore();
        Promise.all([amfutil.getCollectionData(collection, filter)]).then(
          (values) => {
            var items = values[0];
            var ids = gridstore.data.items.map((rec) => rec.data._id);

            console.log(ids);
            console.log(items);

            console.log(gridstore);
            var filtered = [];

            ids.forEach((id) => {
              var rule = items.find((rule) => rule._id == id);
              if (rule) {
                filtered.push(rule);
              }
            });

            gridstore.loadData(filtered);
            grid.setLoading(false);
          }
        );
      },
      listeners: {
        dblclick: {
          element: "body", //bind to the underlying body property on the panel
          fn: function (e) {
            var record = e.record.data;
            var fields = config.fields;
            if (config.update && config.update.fields) {
              fields.concat(config.update.fields);
            }

            var myForm = Ext.create("Amps.form.update");
            myForm.loadForm(config, record, false, collection);

            var form = this.up("form");

            var win = new Ext.window.Window({
              width: 600,
              height: 600,
              title: "Edit Rule",
              modal: true,
              layout: "fit",
              items: [myForm],
              listeners: {
                hide: function () {
                  console.log(grid);
                  grid.reloadRules();
                },
              },
            });

            win.show();
          },
        },
      },
      tbar: args["readOnly"]
        ? []
        : [
            {
              xtype: "container",
              width: 400,
              layout: {
                type: "vbox",
                align: "stretch",
              },
              items: [
                amfutil.dynamicCreate(
                  amfutil.combo(
                    config.title,
                    config.field,
                    amfutil.createCollectionStore(collection, filter, {
                      autoLoad: true,
                    }),
                    "_id",
                    "desc",
                    {
                      itemId: "obj",
                      isFormField: false,
                      allowBlank: true,
                    }
                  ),
                  collection
                ),
              ],
            },

            // "->",
            {
              xtype: "button",
              text: "Add to List",
              handler: function (scope) {
                var rule = amfutil.getElementByID("obj").getSelectedRecord();
                console.log(rule);
                var error = amfutil.getElementByID("error");

                if (rule) {
                  var gridstore = scope.up("grid").getStore();

                  var curr = gridstore.getData().items;

                  var present = curr.findIndex(
                    (rec) => rec.data._id == rule.data._id
                  );

                  if (present >= 0) {
                    error.setHtml("Item is already in list.");
                  } else {
                    error.setHtml("");

                    curr.push(rule);
                    gridstore.loadData(curr);
                  }
                } else {
                  error.setHtml("Select an item");
                }
              },
            },
            {
              xtype: "container",
              items: [
                {
                  xtype: "component",
                  style: {
                    color: "red",
                  },
                  itemId: "error",
                  html: "",
                },
              ],
            },
          ],

      enableLocking: true,
      columns: [
        {
          header: "Name",
          dataIndex: "name",
          flex: 1,
        },
        {
          header: "Description",
          dataIndex: "desc",
          flex: 1,
        },
      ]
        .concat(args["columns"] ? args["columns"] : [])
        .concat(
          args["readOnly"]
            ? []
            : [
                {
                  xtype: "actioncolumn",
                  text: "Actions",
                  dataIndex: "actions",
                  flex: 1,
                  items: [
                    {
                      iconCls: "x-fa fa-trash",
                      handler: function (scope, rowIndex) {
                        console.log(scope);
                        var gridstore = scope.ownerGrid.getStore();
                        gridstore.removeAt(rowIndex);
                      },
                    },
                  ],
                },
              ]
        ),
      viewConfig: args["readOnly"]
        ? {}
        : {
            plugins: {
              gridviewdragdrop: {
                dragText: "Drag and drop to reorganize",
              },
            },
          },
    });

    this.setReadOnly(args["readOnly"]);

    this.insert(grid);

    if (args["value"]) {
      grid.setLoading(true);
      Promise.all([amfutil.getCollectionData(collection, filter)]).then(
        (values) => {
          var rules = values[0];
          var ids = args["value"];
          var filtered = [];

          ids.forEach((id) => {
            var rule = rules.find((rule) => rule._id == id);
            if (rule) {
              filtered.push(rule);
            }
          });

          gridstore.loadData(filtered);
          grid.setLoading(false);
        }
      );
    }

    this.initField();
    this.setLoading(false);
  },

  getValue: function (scope) {
    var ids = this.down("grid")
      .getStore()
      .getData()
      .items.map((rec) => rec.data._id);

    return JSON.stringify(ids);
  },

  setReadOnly: function (readOnly) {
    var buttons = Ext.ComponentQuery.query("#collectiongridButton");
    // var fi = Ext.ComponentQuery.query("fields");

    if (readOnly) {
      buttons.forEach((b) => {
        console.log(b);
        b.setHidden(true);
      });
    }
  },
});

Ext.define("Amps.form.RuleGrid", {
  extend: "Ext.form.FieldContainer",
  xtype: "rulelist",
  // title: "Rules",
  mixins: {
    field: "Ext.form.field.Field",
  },
  flex: 1,

  constructor: function (args) {
    this.callParent([args]);
    this.name = args["name"];
    var scope = this;
    var gridstore = Ext.create("Ext.data.Store", {
      proxy: {
        type: "memory",
        reader: "array",
      },
    });
    var grid = Ext.create({
      xtype: "grid",
      sortableColumns: false,
      title: "Rules",
      itemId: "rules",
      store: gridstore,
      reloadRules: function () {
        var gridstore = this.getStore();
        Promise.all([amfutil.getCollectionData("rules")]).then((values) => {
          var rules = values[0];
          var ids = gridstore.data.items.map((rec) => rec.data._id);

          console.log(ids);
          console.log(rules);

          console.log(gridstore);
          var filtered = [];

          ids.forEach((id) => {
            var rule = rules.find((rule) => rule._id == id);
            if (rule) {
              filtered.push(rule);
            }
          });

          gridstore.loadData(filtered);
          grid.setLoading(false);
        });
      },
      listeners: {
        dblclick: {
          element: "body", //bind to the underlying body property on the panel
          fn: function (e) {
            var record = e.record.data;
            var config = ampsgrids.grids["rules"]();
            var fields = config.fields;
            if (config.update && config.update.fields) {
              fields.concat(config.update.fields);
            }

            var myForm = Ext.create("Amps.form.update");
            myForm.loadForm(config, record, false, "rules");

            var form = this.up("form");

            var win = new Ext.window.Window({
              width: 600,
              height: 600,
              title: "Edit Rule",
              modal: true,
              layout: "fit",
              items: [myForm],
              listeners: {
                hide: function () {
                  console.log(grid);
                  grid.reloadRules();
                },
              },
            });

            win.show();
          },
        },
      },
      tbar: args["readOnly"]
        ? []
        : [
            {
              xtype: "container",
              width: 400,
              layout: {
                type: "vbox",
                align: "stretch",
              },
              items: [
                amfutil.dynamicCreate(
                  amfutil.combo(
                    "Rule",
                    "rule",
                    amfutil.createCollectionStore(
                      "rules",
                      {},
                      { autoLoad: true }
                    ),
                    "_id",
                    "desc",
                    {
                      itemId: "rule",
                      isFormField: false,
                      allowBlank: true,
                    }
                  ),
                  "rules"
                ),
              ],
            },

            // "->",
            {
              xtype: "button",
              text: "Add to Router",
              handler: function (scope) {
                var rule = amfutil.getElementByID("rule").getSelectedRecord();
                console.log(rule);
                var error = amfutil.getElementByID("error");

                if (rule) {
                  var gridstore = scope.up("grid").getStore();

                  var curr = gridstore.getData().items;

                  var present = curr.findIndex(
                    (rec) => rec.data._id == rule.data._id
                  );

                  if (present >= 0) {
                    error.setHtml("Rule is already in router.");
                  } else {
                    error.setHtml("");

                    curr.push(rule);
                    gridstore.loadData(curr);
                  }
                } else {
                  error.setHtml("Select a rule");
                }
              },
            },
            {
              xtype: "container",
              items: [
                {
                  xtype: "component",
                  style: {
                    color: "red",
                  },
                  itemId: "error",
                  html: "",
                },
              ],
            },
          ],

      enableLocking: true,
      columns: [
        {
          header: "Name",
          dataIndex: "name",
          flex: true,
        },
        {
          header: "Description",
          dataIndex: "desc",
          flex: true,
        },
        {
          header: "Output Topic",
          dataIndex: "output",
          flex: true,
        },
      ].concat(
        args["readOnly"]
          ? []
          : [
              {
                xtype: "actioncolumn",
                text: "Actions",
                dataIndex: "actions",
                width: 175,
                items: [
                  {
                    iconCls: "x-fa fa-trash",
                    handler: function (scope, rowIndex) {
                      console.log(scope);
                      var gridstore = scope.ownerGrid.getStore();
                      gridstore.removeAt(rowIndex);
                    },
                  },
                ],
              },
            ]
      ),
      viewConfig: args["readOnly"]
        ? {}
        : {
            plugins: {
              gridviewdragdrop: {
                dragText: "Drag and drop to reorganize",
              },
            },
          },
    });

    this.setReadOnly(args["readOnly"]);

    this.insert(grid);

    if (args["value"]) {
      grid.setLoading(true);
      Promise.all([amfutil.getCollectionData("rules")]).then((values) => {
        var rules = values[0];
        var ids = args["value"];
        var filtered = [];

        ids.forEach((id) => {
          var rule = rules.find((rule) => rule._id == id);
          if (rule) {
            filtered.push(rule);
          }
        });

        gridstore.loadData(filtered);
        grid.setLoading(false);
      });
    }

    this.initField();
  },

  getValue: function (scope) {
    var ids = this.down("grid")
      .getStore()
      .getData()
      .items.map((rec) => rec.data._id);

    return JSON.stringify(ids);
  },

  setReadOnly: function (readOnly) {
    var buttons = Ext.ComponentQuery.query("#rulegridButton");
    // var fi = Ext.ComponentQuery.query("fields");

    if (readOnly) {
      buttons.forEach((b) => {
        console.log(b);
        b.setHidden(true);
      });
    }
  },
});

Ext.define("Amps.window.Workflow", {
  extend: "Ext.window.Window",
  xtype: "wfwindow",
  modal: true,
  width: window.innerWidth - 150,
  height: window.innerHeight - 150,
  flex: 1,
  layout: "fit",
  type: "",
  constructor: function (args) {
    this.callParent([args]);
    var rec;

    if (args["service"]) {
      rec = args["service"];
      this.type = "service";
    }

    if (args["job"]) {
      rec = args["job"];
      this.type = "job";
    }

    if (args["ufa"]) {
      rec = args["ufa"];
      this.type = "ufa";
    }

    if (args["topic"]) {
      rec = args["topic"];
      this.type = "topic";
    }

    var type = this.type.charAt(0).toUpperCase() + this.type.slice(1);

    if (this.type == "ufa") {
      this.setTitle(`Visualizing ${type} Upload from: ${rec.username}`);
    } else if (this.type == "topic") {
      this.setTitle(`Visualizing ${type}: ${rec}`);
    } else {
      this.setTitle(`Visualizing ${type}: ${rec.name}`);
    }
    this.insert(0, [
      {
        xtype: "form",
        itemId: "wfForm",
        padding: 10,
        layout: {
          type: "vbox",
          align: "stretch",
        },
        defaults: {
          margin: 5,
        },
        items: [
          {
            xtype: "panel",
            // layout: { type: "vbox", align: "stretch" },
            layout: {
              type: "hbox",
            },
            defaults: {
              margin: 5,
            },
            items: [
              {
                xtype: "container",
                flex: 2,
                layout: {
                  type: "vbox",
                  align: "stretch",
                },
                listeners: {
                  beforerender: function (scope) {
                    var type = scope.up("window").type;
                    if (type == "service") {
                      if (rec.type == "pyservice") {
                        if (rec["send_output"]) {
                          scope.insert({
                            xtype: "displayfield",
                            value: rec["output"],
                            submitValue: true,
                            name: "topicparms",
                            fieldLabel: "Output Topic",
                          });
                        }
                      } else {
                        var cb = ampsgrids.grids
                          .services()
                          .types[rec.type].combo(rec);
                        console.log(cb);
                        scope.insert(cb);
                      }
                    } else if (type == "ufa") {
                      scope.insert({
                        xtype: "displayfield",
                        value: `amps.svcs.ufa.${rec.username}`,
                        submitValue: true,
                        name: "topic",
                        fieldLabel: "UFA Topic",
                      });
                    } else if (type == "job") {
                      scope.insert({
                        xtype: "displayfield",
                        value: rec.topic,
                        submitValue: true,
                        name: "topic",
                        fieldLabel: "Job Topic",
                      });
                    } else {
                      scope.insert({
                        xtype: "displayfield",
                        value: rec,
                        submitValue: true,
                        name: "topic",
                        fieldLabel: "Topic",
                        labelWidth: 50,
                      });
                    }

                    var win = Ext.create("Ext.window.Window", {
                      xtype: "window",
                      itemId: "metadata",
                      title: "Metadata for " + rec.name,
                      scrollable: true,
                      closeAction: "method-hide",
                      // constrain: true,
                      width: 600,
                      height: 500,
                      padding: 10,
                      items: [
                        {
                          xtype: "arrayfield",
                          name: "meta",
                          title: "Additional Metadata",
                          arrayfield: "Metadata",
                          arrayfields: [
                            amfutil.combo(
                              "Field",
                              "field",
                              "metadata",
                              "field",
                              "desc",
                              {
                                forceSelection: false,
                                labelWidth: 50,
                              }
                            ),
                            {
                              xtype: "textfield",
                              allowBlank: false,
                              name: "value",
                              fieldLabel: "Value",
                              labelWidth: 50,
                            },
                          ],
                        },
                      ],
                    });
                    scope.up("form").insert(win);
                  },
                  afterrender: function (scope) {
                    var type = scope.up("window").type;
                    if (type == "topic") {
                      var form = scope.up("form");

                      form.down("#steps").loadWorkflow(form);
                    }
                  },
                },
                // cls: "button_class",
              },

              {
                formBind: true,
                xtype: "button",

                flex: 1,
                scale: "small",
                text: "Load Workflow",
                handler: async function (btn) {
                  var form = btn.up("form");

                  form.down("#steps").loadWorkflow(form);
                  // console.log(data);
                },
              },
              {
                xtype: "button",
                text: "Edit Metadata",

                flex: 1,
                handler: function (btn) {
                  var win = btn.up("form").down("#metadata").show();
                  console.log(win);
                  win.showAt(
                    window.innerWidth / 2 - win.getWidth(),
                    window.innerHeight / 2 - win.getHeight()
                  );
                },
              },
            ],
          },
          {
            xtype: "container",
            flex: 1,
            itemId: "steps",

            margin: 5,
            choices: args["choices"] ? args["choices"] : {},
            layout: {
              type: "vbox",
              align: "stretch",
            },
            loadWorkflow: async function (form) {
              var wf = form.up("workflow");
              console.log(wf);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: form,
              });
              mask.show();
              var fields = form.getForm().getFields();
              var topic;
              if (form.up("window").type == "service") {
                var service = rec;
                var final = form.getForm().findField("topicparms").getValue();

                if (service.type == "pyservice") {
                  topic = final;
                } else {
                  console.log(fields.items);
                  var services = ampsgrids.grids.services();

                  if (services.types[service.type].format) {
                    final = services.types[service.type].format(final);
                  }
                  console.log(final);
                  topic = "amps.svcs." + service.name + "." + final;
                }
              } else {
                topic = form.getValues().topic;
              }

              var meta = JSON.parse(
                form.getForm().findField("meta").getValue()
              ).reduce((obj, field) => {
                console.log(obj);
                obj[field.field] = field.value;
                return obj;
              }, {});

              console.log(meta);

              var resp = await amfutil.ajaxRequest({
                url: "api/workflow",
                jsonData: { topic: topic, meta: meta },
                method: "POST",
              });

              form.down("#steps").removeAll();

              var steps = Ext.create("Ext.container.Container", {
                itemId: "steps",
                scrollable: "y",
                flex: 1,

                layout: {
                  type: "vbox",
                  align: "stretch",
                },
              });

              var workflow = Ext.decode(resp.responseText);
              var x = 1;
              console.log(workflow);
              function loadStep(step) {
                console.log(step);
                if (step.steps) {
                  var curr = steps.items.items.length;
                  var cont = Ext.create({
                    xtype: "container",
                    layout: {
                      type: "hbox",
                    },
                    scrollable: "x",
                    flex: 1,
                    items: [],
                  });

                  // step.steps.push({
                  //   steps: [],
                  //   topic: step.topic,
                  //   action: { output: step.topic },
                  // });

                  console.log(step);

                  for (var i = 0; i <= step.steps.length; i++) {
                    var workflowstep;
                    var configure;
                    console.log(form.down("#steps").choices);
                    console.log(step.steps.length > 0);
                    console.log(step.steps);
                    console.log(step.steps[i]);
                    var loop = false;

                    if (step.steps.length > 0 && step.steps[0].loop) {
                      loop = true;
                      workflowstep = {
                        xtype: "workflowstep",
                        step: Ext.apply(step, {
                          step: step.steps[0],
                        }),
                        steps: steps,
                        form: form,
                      };
                    } else {
                      if (i == step.steps.length) {
                        workflowstep = {
                          xtype: "workflowstep",
                          new: step.action.output,
                          steps: steps,
                          form: form,
                        };
                        configure = true;
                      } else {
                        var currStep = step.steps[i];
                        console.log(currStep);
                        workflowstep = {
                          xtype: "workflowstep",
                          step: Ext.apply(step, {
                            step: currStep,
                          }),
                          steps: steps,
                          form: form,
                        };
                      }
                    }

                    var ws = {
                      xtype: "container",
                      layout: {
                        type: "vbox",
                        align: "stretch",
                      },
                      style: {
                        "border-style": "solid",
                        borderColor: loop ? "#eed202" : "var(--main-color)",
                      },
                      currStep: configure ? null : currStep,
                      listeners: {
                        afterrender: function (scope) {
                          console.log(scope.currStep);
                          if (scope.currStep && scope.currStep.sub) {
                            var choices = form.down("#steps").choices;
                            console.log(choices[curr]);
                            console.log(scope.currStep.sub.name);
                            console.log(curr);

                            if (choices[curr]) {
                              if (choices[curr] == scope.currStep.sub.name) {
                                console.log(scope);
                                scope.select();
                              }
                            }
                          }
                        },
                      },
                      select: function () {
                        cont.items.items.forEach((item) => item.deselect());
                        var stepcont = form.down("#steps");
                        // Object.entries(stepcont.choices).forEach((entry) => {
                        //   if (entry[0] > curr) {
                        //     delete stepcont.choices[entry[0]];
                        //   }
                        // });

                        stepcont.choices[curr] = this.currStep.sub.name;

                        for (var i = steps.items.items.length; i > curr; i--) {
                          steps.remove(i);
                        }
                        console.log(this.currStep);
                        loadStep(this.currStep);
                        this.down("#status").select();
                      },
                      deselect: function () {
                        this.down("#status").deselect();
                      },
                      // padding: 5,
                      margin: 5,
                      items: [workflowstep].concat(
                        loop && i == 0
                          ? []
                          : [
                              {
                                xtype: "container",
                                layout: {
                                  type: "hbox",
                                  align: "stretch",
                                },
                                padding: 10,
                                ws: ws,
                                style: {
                                  background: "white",
                                },
                                items: [
                                  {
                                    flex: 1,
                                    xtype: "button",
                                    disabled: configure,
                                    text: "Map",
                                    handler: function () {
                                      console.log;
                                      this.up("container")
                                        .up("container")
                                        .select();
                                    },
                                  },
                                  {
                                    flex: 1,
                                    xtype: "container",
                                    layout: "center",
                                    itemId: "status",
                                    select: function () {
                                      this.setStyle({
                                        color: "green",
                                      });
                                      var ic = this.down("#checkedicon");
                                      ic.removeCls("fa-circle");
                                      ic.addCls("fa-check-circle");
                                      console.log("Selecting");
                                    },
                                    deselect: function () {
                                      this.setStyle({
                                        color: "grey",
                                      });
                                      console.log("Deselcting");
                                      var ic = this.down("#checkedicon");
                                      ic.removeCls("fa-check-circle");
                                      ic.addCls("fa-circle");
                                    },
                                    style: {
                                      color: "white",
                                    },
                                    items: [
                                      {
                                        xtype: "component",
                                        autoEl: "div",
                                        style: {
                                          "font-size": "1.5rem",
                                        },
                                        itemId: "checkedicon",
                                        cls: "x-fa fa-circle",
                                      },
                                    ],
                                  },
                                ],
                              },
                            ]
                      ),
                    };

                    cont.insert(ws);
                    if (loop) {
                      break;
                    }
                  }

                  steps.insert({
                    xtype: "container",
                    layout: {
                      type: "hbox",
                      align: "stretch",
                    },
                    items: [
                      {
                        xtype: "container",
                        style: {
                          "font-size": "2rem",
                          "font-weight": "600",
                        },
                        layout: "center",
                        width: 50,
                        items: [
                          {
                            xtype: "component",
                            html: "#" + (curr + 1),
                          },
                        ],
                      },
                      cont,
                    ],
                  });
                } else {
                  console.log("done");
                  steps.insert(
                    steps.insert({
                      xtype: "container",
                      layout: {
                        type: "hbox",
                        align: "stretch",
                      },
                      height: 250,

                      items: [
                        {
                          xtype: "container",
                          // height: 500,
                          style: {
                            "font-size": "2rem",
                            "font-weight": "600",
                          },
                          flex: 1,
                          layout: "center",
                          items: [
                            {
                              xtype: "component",
                              html: "End of Flow",
                            },
                          ],
                        },
                      ],
                    })
                  );
                }
                mask.hide();
                form.down("#steps").insert(steps);
              }

              loadStep(workflow);
              // mask.hide();
              // form.down("#steps").insert(steps);
            },
            // style: {
            //   // background: "var(--main-color)",
            //   "border-left": "5px solid var(--main-color)",
            // },

            items: [],
          },
        ],
      },
    ]);
  },
});

Ext.define("Amps.consumers.tab", {
  extend: "Ext.container.Container",
  layout: "fit",
  itemId: "consumers",
  xtype: "consumers",
  constructor(args) {
    console.log("consumers");
    this.callParent([args]);
    var streams = [
      "SERVICES",
      "ACTIONS",
      "DATA",
      "EVENTS",
      "OBJECTS",
      "MAILBOX",
    ];
    var tabPanel = new Ext.tab.Panel({
      // listeners: {
      //   beforetabchange(tabPanel, newCard, oldCard, eOpts) {
      //     newCard.getStore().reload();
      //   },
      // },
      items: streams.map((stream) => {
        console.log(stream);
        return {
          title: stream,
          xtype: "grid",
          columns: [
            {
              text: "Name",
              dataIndex: "name",
              flex: 1,
            },
            {
              text: "Pending",
              dataIndex: "num_pending",
              flex: 1,
            },
            {
              text: "Redelivered",
              dataIndex: "num_redelivered",
              flex: 1,
            },
            {
              text: "Topic",
              dataIndex: "filter_subject",
              flex: 1,
            },
          ],
          listeners: {
            beforerender: function (scope) {
              broadcast(stream);
              function broadcast(name) {
                amfutil.broadcastEvent("stream", { name: name }, (payload) => {
                  scope.setStore(payload);
                });
              }

              function timeout() {
                setTimeout(function () {
                  broadcast(stream);
                  if (
                    Ext.util.History.getToken().split("/")[0] == "consumers"
                  ) {
                    timeout();
                  } else {
                    return;
                  }
                }, 2000);
              }
              timeout();
            },
          },
        };
      }),
    });
    this.insert(0, tabPanel);
  },
  // listeners: {
  //   beforetabchange(tabPanel, newCard, oldCard, eOpts) {
  //     newCard.getStore().reload();
  //   },
  // },
});

Ext.define("Amps.container.Workflow.Step", {
  xtype: "workflowstep",
  extend: "Ext.container.Container",
  layout: {
    type: "hbox",
    align: "stretch",
  },
  style: { background: "white" },
  height: 200,

  constructor: function (args) {
    this.callParent([args]);
    var step = args["step"];
    var c = this.down("#step");
    var b = this.down("#button");
    var form = args["form"];
    var steps = args["steps"];
    if (args["new"]) {
      c.insert({
        xtype: "component",
        style: {
          background: "var(--main-color)",
          padding: 10,
          color: "white",
          "font-weight": 400,
        },
        autoEl: "div",
        html: args["new"],
      });
      c.insert({
        xtype: "container",
        layout: "center",
        flex: 1,
        items: [
          {
            xtype: "button",
            margin: 5,
            text: "Configure",
            handler: function () {
              var win = new Ext.window.Window({
                title: "Configure Subscriber For: " + args["new"],
                modal: true,
                width: 700,
                height: 600,
                padding: 10,
                // resizable: false,
                layout: "fit",
                listeners: {
                  close: function () {
                    form.down("#steps").loadWorkflow(form);
                  },
                },
                items: [
                  {
                    xtype: "wizard",
                    topic: args["new"],
                    close: function () {
                      win.close();
                      form.down("#steps").loadWorkflow(form);
                    },
                  },
                ],
              });
              win.show();
            },
          },
        ],
      });
    } else if (step.step) {
      var currStep = step.step;
      var tp = currStep.topic.substring(0, 37);
      if (currStep.topic.length > 37) {
        tp += "...";
      }
      if (currStep.loop) {
        console.log("Loop");
        c.setStyle({
          "border-color": "red",
        });
        c.insert({
          xtype: "component",
          style: {
            background: "#eed202",
            padding: 10,
            color: "black",
            "font-weight": 400,
          },
          autoEl: "div",
          html: tp,
          listeners: {
            afterrender: function (me) {
              // Register the new tip with an element's ID
              Ext.tip.QuickTipManager.register({
                target: me.getId(), // Target button's ID
                text: currStep.topic, // Tip content
              });
            },
            destroy: function (me) {
              Ext.tip.QuickTipManager.unregister(me.getId());
            },
          },
        });
        c.insert(1, [
          {
            xtype: "container",
            style: {
              padding: 5,
            },
            flex: 1,
            layout: {
              type: "vbox",
              align: "stretch",
            },
            items: [
              {
                xtype: "container",
                layout: "center",
                items: [
                  {
                    xtype: "component",
                    style: {
                      color: "#eed202",
                    },
                    cls: "x-fa fa-warning",
                  },
                ],
              },
              {
                xtype: "container",
                layout: "center",
                maxWidth: "100%",
                style: {
                  "font-weight": "700",
                },
                items: [
                  {
                    xtype: "component",
                    maxWidth: "100%",
                    html: "Workflow Loop Detected",
                  },
                ],
              },
              {
                xtype: "container",
                maxWidth: "100%",
                padding: 10,
                style: {
                  "font-weight": "500",
                },
                items: [
                  {
                    xtype: "component",
                    maxWidth: "100%",

                    html: "If desired, ignoring this warning. Otherwise, please update the previous action, or assign a different action to the subscriber.",
                  },
                ],
              },
            ],
          },
        ]);
      } else {
        console.log(currStep);

        c.insert({
          xtype: "container",
          items: [
            {
              xtype: "component",
              style: {
                background: "var(--main-color)",
                padding: 10,
                color: "white",
                "font-weight": 400,
              },
              autoEl: "div",
              html: tp,
              listeners: {
                afterrender: function (me) {
                  // Register the new tip with an element's ID
                  Ext.tip.QuickTipManager.register({
                    target: me.getId(), // Target button's ID
                    text: currStep.topic, // Tip content
                  });
                },
                destroy: function (me) {
                  Ext.tip.QuickTipManager.unregister(me.getId());
                },
              },
            },
          ],
        });
        c.insert(1, [
          {
            xtype: "container",
            style: {
              padding: 5,
            },
            flex: 1,
            layout: {
              type: "vbox",
              // The total column count must be specified here
              align: "stretch",
            },
            defaults: {
              // applied to each contained panel
              flex: 1,
            },

            items: [
              {
                xtype: "container",
                padding: 5,

                layout: {
                  type: "hbox",
                  // The total column count must be specified here
                  align: "stretch",
                },
                items: [
                  {
                    xtype: "container",
                    layout: "center",
                    flex: 1,

                    items: [
                      {
                        xtype: "container",
                        html: "Action:",
                        style: {
                          fontSize: 13,
                        },

                        // rowspan: 2,
                      },
                    ],
                  },

                  {
                    xtype: "button",
                    text: currStep.action.name,
                    flex: 1,
                    handler: async function () {
                      var action = await amfutil.getById(
                        "actions",
                        currStep.action._id
                      );
                      var config = ampsgrids.grids["actions"]();
                      var fields = config.fields;
                      if (config.update && config.update.fields) {
                        fields.concat(config.update.fields);
                      }

                      var myForm = Ext.create("Amps.form.update");
                      myForm.loadForm(config, action, false, "actions");

                      var form = this.up("form");

                      var win = new Ext.window.Window({
                        width: 600,
                        height: 600,
                        title: "Edit Action",
                        modal: true,
                        layout: "fit",
                        items: [myForm],
                        listeners: {
                          close: function () {
                            console.log(form.down("#steps"));
                            form.down("#steps").loadWorkflow(form);
                          },
                        },
                      });

                      win.show();
                      console.log(config.types);
                    },
                  },
                ],
              },
              {
                xtype: "container",
                padding: 5,
                layout: {
                  type: "hbox",
                  // The total column count must be specified here
                  align: "stretch",
                },
                items: [
                  {
                    xtype: "container",
                    layout: "center",
                    flex: 1,
                    items: [
                      {
                        xtype: "component",

                        html: "Subscriber:",

                        style: {
                          fontSize: 13,
                        },
                      },
                    ],
                  },

                  {
                    xtype: "button",
                    flex: 1,
                    text: currStep.sub.name,
                    handler: async function () {
                      var action = await amfutil.getById(
                        "services",
                        currStep.sub._id
                      );
                      var config = ampsgrids.grids["services"]();
                      var fields = config.fields;
                      if (config.update && config.update.fields) {
                        fields.concat(config.update.fields);
                      }

                      console.log(config);

                      var myForm = Ext.create("Amps.form.update");
                      myForm.loadForm(config, action, false, "services");

                      var form = this.up("form");

                      var win = new Ext.window.Window({
                        width: 600,
                        height: 600,
                        title: "Edit Service",
                        modal: true,
                        layout: "fit",
                        items: [myForm],
                        listeners: {
                          close: function () {
                            form.down("#steps").loadWorkflow(form);
                          },
                        },
                      });

                      win.show();
                      console.log(config.types);
                    },
                  },
                ],
              },
            ],
          },
        ]);
      }

      if (currStep.steps) {
      }
    } else {
    }
  },

  items: [
    {
      xtype: "container",
      itemId: "step",
      border: true,
      maxWidth: 300,
      width: 300,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      // style: {
      //   "border-style": "solid",
      //   borderColor: "var(--main-color)",
      // },
    },
    {
      xtype: "container",
      itemId: "button",
      // layout: "center",
      layout: "fit",
    },
  ],
});

Ext.define("Amps.container.Workflow", {
  extend: "Ext.tab.Panel",
  xtype: "workflow",
  scrollable: true,
  row: {
    xtype: "container",
    layout: { type: "hbox", align: "stretch" },
  },
  constructor: function (args) {
    this.callParent([args]);
  },
  items: [
    {
      xtype: "grid",
      title: "Services",
      scrollable: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
        },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
          type: "text",
        },
        {
          text: "Description",
          dataIndex: "desc",
          flex: 1,
          type: "text",
        },
        {
          text: "Action",
          xtype: "widgetcolumn",
          style: {
            padding: "none",
          },
          flex: 1,
          widget: {
            xtype: "button",
            iconCls: "x-fa fa-play-circle",
            text: "Visualize",
            load: function (rec) {
              if (rec.type == "pyservice" && !rec["send_output"]) {
                this.setDisabled(true);
              } else {
                this.setHandler(function () {
                  var win = Ext.create({
                    xtype: "wfwindow",
                    service: rec,
                  });
                  win.show();
                });
              }
            },
          },
          onWidgetAttach: function (col, widget, rec) {
            // console.log(widget);
            // console.log(rec.data.name);
            widget.load(rec.data);
          },
        },
      ],
      listeners: {
        beforerender: function () {
          this.setStore(
            amfutil.createCollectionStore("services", {
              type: { $ne: "subscriber" },
            })
          );
        },
      },
    },
    {
      xtype: "grid",
      title: "Jobs",
      scrollable: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
        },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
          type: "text",
        },
        {
          text: "Action",
          xtype: "widgetcolumn",
          style: {
            padding: "none",
          },
          flex: 1,
          widget: {
            xtype: "button",
            iconCls: "x-fa fa-play-circle",
            text: "Visualize",
            load: function (rec) {
              this.setHandler(function () {
                var win = Ext.create({
                  xtype: "wfwindow",
                  job: rec,
                });
                win.show();
              });
            },
          },
          onWidgetAttach: function (col, widget, rec) {
            // console.log(widget);
            // console.log(rec.data.name);
            widget.load(rec.data);
          },
        },
      ],
      listeners: {
        beforerender: function () {
          this.setStore(amfutil.createCollectionStore("jobs"));
        },
      },
    },
    {
      xtype: "grid",
      title: "UFA",
      scrollable: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      columns: [
        {
          text: "Username",
          dataIndex: "username",
          flex: 1,
          type: "text",
        },
        {
          text: "First Name",
          dataIndex: "firstname",
          flex: 1,
          type: "text",
        },
        {
          text: "Last Name",
          dataIndex: "lastname",
          flex: 1,
          type: "text",
        },
        {
          text: "Group",
          dataIndex: "group",
          flex: 1,
          type: "text",
          renderer: function (val) {
            var store = amfutil.createCollectionStore("groups");
            var group = store.findExact("_id", val);
            return group.name;
          },
        },
        {
          text: "Action",
          xtype: "widgetcolumn",
          style: {
            padding: "none",
          },
          flex: 1,
          widget: {
            xtype: "button",
            iconCls: "x-fa fa-play-circle",
            text: "Visualize",
            load: function (rec) {
              this.setHandler(function () {
                var win = Ext.create({
                  xtype: "wfwindow",
                  ufa: rec,
                });
                win.show();
              });
            },
          },
          onWidgetAttach: function (col, widget, rec) {
            // console.log(widget);
            // console.log(rec.data.name);
            widget.load(rec.data);
          },
        },
      ],
      listeners: {
        beforerender: function () {
          this.setStore(amfutil.createCollectionStore("users"));
        },
      },
    },
    {
      xtype: "form",
      title: "Visualizer",
      padding: 10,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      items: [
        {
          xtype: "container",
          height: 150,
          layout: "center",

          style: {
            "font-size": "2rem",
          },
          items: [
            {
              xtype: "component",
              autoEl: "div",
              html: "Topic Visualizer",
            },
          ],
        },
      ],
      listeners: {
        render: function (scope) {
          scope.insert({
            xtype: "container",
            layout: {
              type: "vbox",
              align: "stretch",
            },

            items: [
              amfutil.combo(
                "Topics",
                "topic",
                amfutil.createCollectionStore("topics"),
                "topic",
                "topic"
              ),
              {
                xtype: "button",
                formBind: true,
                text: "Visualize",
                scale: "large",
                handler: function (btn) {
                  var form = btn.up("form");
                  var values = form.getValues();
                  var win = Ext.create({
                    xtype: "wfwindow",
                    topic: values.topic,
                  });
                  win.show();
                },
              },
            ],
          });
        },
      },
    },
  ],
});
Ext.define("Amps.container.Imports", {
  extend: "Ext.panel.Panel",
  xtype: "imports",
  itemId: "imports",
  layout: "card",
  imports: null,
  curr: -1,
  constructor: function (args) {
    this.callParent([args]);
    console.log(args);
    if (args["imports"]) {
      amfutil.getElementByID("load").hide();
      amfutil.getElementByID("fields").setHidden(false);
      amfutil.getElementByID("import-left").setHidden(false);
      amfutil.getElementByID("import-right").setHidden(false);

      this.imports = [];
      if (args["scripts"]) {
        this.imports = this.imports.concat([
          {
            collection: "scripts",
            idtype: "generated",
            type: "collection",
            rows: args["scripts"],
          },
        ]);
      }
      this.imports = this.imports.concat(args["imports"]);
    }
  },
  loadNext: function () {
    if (this.imports) {
      this.curr++;
      if (this.curr == this.imports.length) {
        this.curr = 0;
      }
      var imp = JSON.parse(JSON.stringify(this.imports[this.curr]));

      amfutil.getElementByID("resultgrid").loadImport(imp.rows, imp);
    } else {
      this.setActiveItem(0);
    }
  },
  loadPrevious: function () {
    if (this.imports) {
      this.curr--;
      if (this.curr == -1) {
        this.curr = this.imports.length - 1;
      }
      var imp = JSON.parse(JSON.stringify(this.imports[this.curr]));
      amfutil.getElementByID("resultgrid").loadImport(imp.rows, imp);
    } else {
      this.setActiveItem(0);
    }
  },
  listeners: {
    afterrender: async function () {
      this.loadNext();
    },
    beforedestroy: function () {
      console.log("DEST");
      amfutil.getElementByID("resultgrid").conts.forEach((cont) => {
        cont.win.destroy();
      });
    },
  },
  tbar: [
    {
      iconCls: "x-fa fa-arrow-left",
      // disabled: true,
      // itemId: "left",
      hidden: true,
      itemId: "import-left",

      handler: function () {
        var imports = amfutil.getElementByID("imports");
        imports.loadPrevious();
      },
    },
    {
      xtype: "container",
      hidden: true,
      style: {
        background: "var(--secondary-color)",
        color: "white",
      },
      itemId: "fields",
      setProgress: function (curr, total, message) {
        this.down().setHtml(`Import ${curr} of ${total}`);
        Ext.tip.QuickTipManager.unregister(this.getId());

        Ext.tip.QuickTipManager.register({
          target: this.getId(), // Target button's ID
          text: message, // Tip content
        });
      },

      padding: 7,
      items: [
        {
          style: {
            "font-weight": 500,
          },
          xtype: "component",
          html: "Import 0 of 0",
        },
      ],
    },
    {
      iconCls: "x-fa fa-arrow-right",
      // disabled: true,
      hidden: true,

      itemId: "import-right",

      handler: function () {
        var imports = amfutil.getElementByID("imports");
        imports.loadNext();
      },
    },

    {
      xtype: "button",
      itemId: "load",
      text: "Load Data",
      iconCls: "x-fa fa-upload",
      handler: function () {
        var grid = amfutil.getElementByID("resultgrid");
        grid.win.show();
      },
    },
    {
      xtype: "button",
      text: "Import Valid Entries",
      itemId: "import",
      iconCls: "x-fa fa-save",
      disabled: true,
      handler: async function (btn) {
        btn.setDisabled(true);
        amfutil.getElementByID("load").setDisabled(true);
        var grid = amfutil.getElementByID("resultgrid");
        amfutil.getElementByID("left").setDisabled(true);
        amfutil.getElementByID("right").setDisabled(true);
        // grid.setLoading(true);
        grid.storeCurrentValues();
        grid.start = 1;
        grid.importing = true;

        grid.loadRecords();
      },
    },
    {
      xtype: "container",
      style: {
        background: "var(--secondary-color)",
        color: "white",
      },
      padding: 7,
      items: [
        {
          itemId: "number",
          xtype: "component",
          style: {
            "font-weight": 500,
          },
          reset: function () {
            this.setHtml("Imported: 0");
          },
          increment: function () {
            var html = this.getEl().dom.innerHTML;
            var num = html.replace("Imported: ", "");
            var num = parseInt(num);
            num++;
            this.setHtml("Imported: " + num.toString());
          },
          html: "Imported: 0",
        },
      ],
    },

    "->",
    {
      iconCls: "x-fa fa-arrow-left",
      disabled: true,
      itemId: "left",
      handler: function () {
        var grid = amfutil.getElementByID("resultgrid");
        grid.paginate(-25);
      },
    },

    {
      xtype: "container",
      style: {
        background: "var(--secondary-color)",
        color: "white",
      },
      padding: 7,
      items: [
        {
          itemId: "showing",
          style: {
            "font-weight": 500,
          },
          xtype: "component",
          html: "0 - 0 of 0",
        },
      ],
    },
    {
      iconCls: "x-fa fa-arrow-right",
      disabled: true,
      itemId: "right",

      handler: function () {
        var grid = amfutil.getElementByID("resultgrid");
        grid.paginate(25);
      },
    },
    {
      xtype: "progressbar",
      itemId: "progress",
      width: 65,
    },

    // {
    //   xtype: "component",
    //   html: "Grid data reflects imported data - changes made in the edit form will not reflect in the grid.",
    // },
  ],
  items: [
    {
      xtype: "grid",
      itemId: "resultgrid",
      sortableColumns: false,
      invalids: 0,
      start: 1,

      listeners: {
        reconfigure: async function () {
          console.log("reconfigure");
          var progress = amfutil.getElementByID("progress");
          var num = 0;
          var length = this.widgets.length;
          console.log(length);
          console.log(this.widgets);

          if (this.widgets) {
            this.up("imports").setActiveItem(1);
          }

          var start = this.start;
          var widgets = this.widgets;
          for (var widget of widgets) {
            await new Promise((resolve) => setTimeout(resolve, 25));
            await widget.promise();
            num++;
            console.log(num);
            progress.updateProgress(num / length);
          }
          console.log("import");
          if (this.importing) {
            this.importRecords();
          } else {
            this.invalids = 0;
            this.up("imports").setActiveItem(0);
          }
          if (this.importing) {
          } else {
            console.log(this.widgets.length);
            if (length > 0) {
              console.log(this.widgets);
              amfutil
                .getElementByID("left")
                .setDisabled(this.data.length <= 25);
              amfutil
                .getElementByID("right")
                .setDisabled(this.data.length <= 25);
              amfutil.getElementByID("import").setDisabled(false);
              amfutil.getElementByID("load").setDisabled(false);
            }
          }
        },
      },

      cleanupWindows: function () {
        this.conts.forEach((cont) => {
          cont.win.destroy();
        });
      },

      loadImport: async function (data, values) {
        amfutil.getElementByID("import").setDisabled(true);

        console.log(data, values);
        var imports = amfutil.getElementByID("imports");
        console.log(imports.activeItem);

        console.log(imports);
        imports.setActiveItem(1);
        console.log(imports);

        var grid = this;

        console.log(values);

        var collection = values.collection;
        var type = values.type;
        this.cleanupWindows();
        console.log(grid.conts);

        grid.data = data;
        grid.widgets = [];
        grid.conts = [];
        grid.idtype = values.idtype;
        var config;
        var entity;
        var message;

        if (type == "collection") {
          grid.route = collection;
          config = ampsgrids.grids[collection]();
          entity = null;
          message = `Showing ${amfutil.capitalize(values["collection"])}`;
        } else {
          config = ampsgrids.grids[collection]().subgrids[values.field];
          entity = await amfutil.getById(collection, values.entity);
          if (entity) {
            grid.route = [collection, values.entity, values.field].join("/");
            message = `Showing ${amfutil.capitalize(
              values["field"]
            )} for ${amfutil.capitalize(
              values["collection"].replace(/s+$/, "")
            )} ${amfutil.capitalize(
              entity[ampsgrids.grids[collection]().displayField]
            )}`;
            console.log(message);
          }
        }

        amfutil
          .getElementByID("fields")
          .setProgress(imports.curr + 1, imports.imports.length, message);

        amfutil.getElementByID("number").reset();

        function load() {
          var columns = config.columns.concat({
            xtype: "widgetcolumn",
            text: "Valid",
            width: 100,
            selectable: false,
            focusable: false,
            widget: {
              xtype: "container",
              width: 300,
              // width: 150,

              // layout: "center",

              load: function (rec) {
                var record = rec.data;
                var promise = function validity() {
                  return new Promise(async (resolve, reject) => {
                    var myForm = Ext.create("Amps.form.config", {
                      entity: entity ? entity : null,
                      show_id: values.idtype == "provided",
                      idcheck: false,
                      collection: collection,
                    });

                    await myForm.loadForm(config, record, false, false, false);

                    var win = Ext.create(
                      "Ext.window.Window",
                      Ext.apply(
                        {
                          title: "Edit Data",
                          // modal: true,
                          loading: true,
                          width: 600,
                          height: 600,
                          closeAction: "method-hide",
                          layout: {
                            type: "vbox",
                            align: "stretch",
                          },
                          renderTo: Ext.getBody(),
                          duplicateCheck: async function () {
                            var refs =
                              this.down("form").query("field[duplicate]");
                            var promises = refs.map((ref) => ref.check());
                            await Promise.all(promises);
                          },
                          setValid: function (valid) {
                            this.down("#valid").setValid(valid);
                          },
                          items: [
                            {
                              xtype: "container",
                              padding: 10,
                              itemId: "valid",
                              style: {
                                color: "white",
                              },
                              layout: "center",
                              setValid: function (valid) {
                                var text = this.down("#text");
                                var icon = this.down("#icon");
                                if (valid) {
                                  text.setHtml("Valid");
                                  icon.removeCls("fa-times");
                                  icon.addCls("fa-check");
                                  this.setStyle({
                                    background: "#039487",
                                  });
                                } else {
                                  text.setHtml("Invalid");
                                  icon.removeCls("fa-check");
                                  icon.addCls("fa-times");
                                  this.setStyle({
                                    background: "#8b0000",
                                  });
                                }
                              },

                              items: [
                                {
                                  xtype: "container",
                                  width: 100,
                                  layout: "hbox",
                                  items: [
                                    {
                                      xtype: "container",
                                      layout: "center",
                                      flex: 1,

                                      items: [
                                        {
                                          itemId: "icon",
                                          cls: "x-fa",
                                          xtype: "component",
                                        },
                                      ],
                                    },
                                    {
                                      xtype: "container",
                                      layout: "center",
                                      flex: 3,

                                      items: [
                                        {
                                          itemId: "text",
                                          xtype: "component",
                                          html: "Status",
                                          style: {
                                            "font-weight": 500,
                                          },
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                            Ext.apply(myForm, { flex: 1 }),
                          ],
                        },
                        config.window
                      )
                    );
                    var cont = Ext.create({
                      xtype: "container",
                      // layout: "center",
                      layout: {
                        type: "hbox",
                        align: "stretch",
                      },
                      record: rec,
                      win: win,
                      imported: false,
                      setValid: function (valid) {
                        this.down("#valid").setValid(valid);
                      },
                      items: [
                        {
                          xtype: "container",
                          itemId: "valid",
                          width: 50,
                          style: {
                            color: "white",
                          },
                          layout: "center",
                          setValid: function (valid) {
                            var icon = this.down("#icon");
                            if (valid) {
                              icon.removeCls("fa-times");
                              icon.addCls("fa-check");
                              this.setStyle({
                                background: "#039487",
                              });
                            } else {
                              icon.removeCls("fa-check");
                              icon.addCls("fa-times");
                              this.setStyle({
                                background: "#8b0000",
                              });
                            }
                          },

                          items: [
                            {
                              xtype: "container",
                              layout: "hbox",
                              items: [
                                {
                                  xtype: "container",
                                  layout: "center",
                                  flex: 1,

                                  items: [
                                    {
                                      itemId: "icon",
                                      cls: "x-fa",
                                      xtype: "component",
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          xtype: "button",
                          itemId: "edit",
                          scale: "small",
                          iconCls: "x-fa fa-pencil",
                          style: {
                            "font-size": ".75rem",
                          },
                          handler: function (scope) {
                            var win = scope.up("container").win;
                            win.duplicateCheck();
                            console.log(win);
                            win.show();
                          },
                        },
                      ],
                    });
                    myForm.setListeners({
                      validitychange: function (scope, valid) {
                        cont.setValid(valid);
                        win.setValid(valid);
                      },
                    });

                    // var mask = new Ext.LoadMask({
                    //   msg: "Loading Entry...",
                    //   target: win,
                    // });
                    win.show();

                    // mask.show();
                    // win.setStyle({
                    //   display: "none",
                    // });

                    await win.duplicateCheck();
                    win.hide();

                    // mask.hide();

                    // win.setStyle({
                    //   display: "absolute",
                    // });
                    this.removeAll();
                    this.insert(cont);
                    grid.conts.push(cont);
                    var valid = myForm.isValid();
                    cont.setValid(valid);
                    win.setValid(valid);

                    resolve();
                  });
                };
                this.promise = promise;
              },
            },
            onWidgetAttach: function (col, widget, rec) {
              console.log(grid);
              grid.widgets.push(widget);
              console.log(widget);
              widget.load(rec);
            },
          });

          if (config.import && config.import.skip) {
            columns = columns.filter(
              (column) => config.import.skip.indexOf(column.dataIndex) < 0
            );
          }

          console.log(columns);

          grid.reconfigure(null, columns);

          setTimeout(function () {
            grid.loadRecords();
          }, 250);

          // grid.setLoading(false);
        }
        if (type == "field" && !entity) {
          amfutil
            .getElementByID("display")
            .setHtml(
              `No Entity with ID ${values.entity} in Collection ${values.collection}`
            );
        } else {
          load();
        }
      },

      paginate: function (val) {
        if (!this.importing) {
          this.storeCurrentValues();
        }

        const roundOffTo = (num, factor = 1) => {
          const quotient = num / factor;
          const res = Math.round(quotient) * factor;
          return res;
        };

        var start = this.start + val;
        if (start > this.data.length) {
          this.start = 1;
        } else if (start < 0) {
          this.start = roundOffTo(this.data.length, 25) - 25;
        } else {
          this.start = start;
        }

        // grid.setLoading(true);
        this.loadRecords();
      },
      storeCurrentValues() {
        var items = this.conts;

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var form = item.win.down("form");
          var values = form.getValues();
          values = form.process(form, form.getValues());
          this.data[this.start - 1 + i] = values;
        }
      },
      loadRecords: function () {
        amfutil.getElementByID("left").setDisabled(true);
        amfutil.getElementByID("right").setDisabled(true);
        var old = this.data;
        this.cleanupWindows();

        console.log(this.conts);
        this.conts = [];
        this.widgets = [];
        var curr;

        var idx = this.start - 1;
        curr = this.data.slice(idx, idx + 25);

        var store = Ext.create("Ext.data.Store", {
          autoLoad: true,
          data: curr,
          proxy: {
            type: "memory",
            reader: {
              type: "json",
            },
          },
        });
        this.setStore(store);
        console.log(store);
        console.log(this.data);
        var imports = this.up("imports");
        if (this.data.length > 0) {
          imports.setActiveItem(1);
        } else {
          // imports.loadNext();
        }

        var message = `${curr.length ? this.start : 0} - ${
          this.start + curr.length - 1
        } of ${this.data.length}`;

        amfutil.getElementByID("showing").setHtml(message);
        amfutil.getElementByID("display").setHtml("Loading " + message);
      },
      importRecords: async function () {
        this.setLoading(true);

        this.up("imports").setActiveItem(1);

        this.importing = true;

        var grid = this;
        var items = this.conts;

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          amfutil
            .getElementByID("display")
            .setHtml(`Checking ${grid.start + i} of ${grid.data.length}`);
          await item.win.duplicateCheck();
          var valid = item.win.down("form").isValid();
          console.log(item.win.down("form").getInvalidFields());
          if (valid) {
            var form = item.win.down("form");
            var values = form.process(form, form.getValues());
            console.log(values);

            values = amfutil.convertNumbers(form.getForm(), values);
            console.log(values);

            var user = amfutil.get_user();

            values.createdby = user.firstname + " " + user.lastname;
            values.created = new Date().toISOString();

            values.modifiedby = user.firstname + " " + user.lastname;
            values.modified = new Date().toISOString();
            var route;
            if (grid.idtype == "generated") {
              route = grid.route;
            } else {
              var id = values._id;
              delete values._id;

              route = grid.route + "/create/" + id;
            }

            await amfutil.ajaxRequest({
              headers: {
                Authorization: localStorage.getItem("access_token"),
              },
              url: "api/" + route,
              method: "POST",
              timeout: 60000,
              params: {},
              jsonData: values,
              success: function (response) {
                grid.data[grid.start + i - 1] = null;
                amfutil.getElementByID("number").increment();
                item.win.destroy();
                delete item;

                // grid.getStore().reload();
              },
              failure: function (response) {
                mask.hide();
                btn.setDisabled(false);
                amfutil.onFailure(
                  `Failed to Create ${form.config.object}`,
                  response
                );
              },
            });
          }
        }

        var coll = grid.route.split("/")[0];
        amfutil.stores
          .filter((store) => store.config.collection == coll)
          .forEach((store) => store.store.reload());
        this.setLoading(false);
        this.up("imports").setActiveItem(0);

        // this.importing = false;

        if (this.start + 25 > this.data.length) {
          this.importing = false;
          this.data = this.data.filter((n) => n);
          this.start = 1;
          this.loadRecords();
          amfutil.broadcastEvent("update", {
            page: grid.route,
          });
        } else {
          this.paginate(25);
        }
      },
      conts: [],
      win: new Ext.window.Window({
        title: "Load Data",
        width: 600,
        height: 500,
        padding: 10,
        closeAction: "method-hide",
        layout: "fit",
        items: [
          {
            xtype: "form",
            itemId: "importform",
            flex: 1,
            layout: {
              type: "vbox",
              align: "stretch",
            },
            items: [
              {
                xtype: "container",
                flex: 2,
                layout: {
                  type: "vbox",
                  align: "stretch",
                },
                margin: { right: 10 },
                items: [
                  {
                    xtype: "radiogroup",
                    name: "type",
                    fieldLabel: "Import Type",
                    items: [
                      {
                        boxLabel: "Main Field",
                        inputValue: "collection",
                        name: "type",
                      },
                      {
                        boxLabel: "Sub Field",
                        inputValue: "field",
                        name: "type",
                      },
                    ],
                    listeners: {
                      change: function (scope, val) {
                        var entity = amfutil.getElementByID("combocontainer");
                        if (val.type == "collection") {
                          entity.setActiveItem(0);
                        } else {
                          entity.setActiveItem(1);
                        }

                        entity.setDisabled(false);
                      },
                    },
                    displayField: "label",
                    valueField: "field",
                    allowBlank: false,
                    width: 600,
                    labelWidth: 200,
                    forceSelection: true,
                  },
                  {
                    itemId: "combocontainer",
                    xtype: "fieldcontainer",
                    disabled: true,
                    layout: "card",
                    items: [
                      {
                        xtype: "combobox",

                        name: "collection",
                        fieldLabel: "Collection",

                        displayField: "title",
                        valueField: "field",
                        allowBlank: false,
                        labelWidth: 200,
                        forceSelection: true,
                        listeners: {
                          beforerender: function (scope) {
                            scope.setStore(
                              Object.entries(ampsgrids.grids)
                                .map((grid) =>
                                  Object.assign({ field: grid[0] }, grid[1]())
                                )
                                .filter(
                                  (grid) =>
                                    grid.fields != null && grid.title != "Keys"
                                )
                            );
                          },
                          beforeactivate: function (scope) {
                            scope.setDisabled(false);
                          },
                          beforedeactivate: function (scope) {
                            scope.setDisabled(true);
                          },
                        },
                      },
                      {
                        xtype: "fieldcontainer",
                        layout: {
                          type: "vbox",
                          align: "stretch",
                        },
                        defaults: {
                          labelWidth: 200,
                        },

                        listeners: {
                          afterrender: function (scope) {
                            scope.setDisabled(true);
                          },
                          beforeactivate: function (scope) {
                            scope.setDisabled(false);
                            scope.down("#collection").setDisabled(false);
                          },
                          beforedeactivate: function (scope) {
                            console.log(scope);
                            scope.setDisabled(true);
                          },
                        },

                        items: [
                          {
                            xtype: "combobox",
                            name: "collection",
                            flex: 1,
                            fieldLabel: "Collection",
                            disabled: true,
                            itemId: "collection",
                            displayField: "title",
                            valueField: "field",
                            allowBlank: false,
                            forceSelection: true,
                            listeners: {
                              beforerender: function (scope) {
                                var fields = Object.entries(ampsgrids.grids)
                                  .map((grid) =>
                                    Object.assign({ field: grid[0] }, grid[1]())
                                  )
                                  .filter((grid) => {
                                    console.log(grid);
                                    if (grid.subgrids) {
                                      return Object.values(grid.subgrids).find(
                                        (subgrid) => subgrid.crud == true
                                      );
                                    } else {
                                      return false;
                                    }
                                  });
                                scope.setStore(fields);
                              },
                              change: function (scope, val) {
                                var data = scope.getSelectedRecord().data;
                                var sgs = [];
                                Object.entries(data.subgrids).forEach((sg) => {
                                  if (sg[1].import) {
                                    var conf = Object.assign(
                                      { field: sg[0] },
                                      sg[1]
                                    );
                                    sgs.push(conf);
                                  }
                                });
                                var item = amfutil.getElementByID("item");
                                console.log(sgs);
                                item.setStore(sgs);
                                item.setDisabled(false);

                                var entitycont =
                                  amfutil.getElementByID("entitycont");
                                entitycont.setDisabled(false);

                                entitycont.removeAll();

                                entitycont.insert(
                                  0,
                                  amfutil.combo(
                                    "Entity",
                                    "entity",
                                    amfutil.createCollectionStore(val),
                                    "_id",
                                    data.displayField,
                                    {
                                      itemId: "entity",
                                      labelWidth: 200,
                                    }
                                  )
                                );
                              },
                            },
                          },
                          {
                            xtype: "combobox",
                            name: "field",
                            flex: 1,
                            disabled: true,
                            fieldLabel: "Field",

                            itemId: "item",
                            displayField: "title",
                            valueField: "field",
                            allowBlank: false,
                            forceSelection: true,
                          },
                          {
                            xtype: "fieldcontainer",
                            itemId: "entitycont",
                            layout: {
                              type: "vbox",
                              align: "stretch",
                            },
                          },
                        ],
                      },
                    ],
                  },
                  {
                    xtype: "radiogroup",
                    name: "idtype",
                    fieldLabel: "ID Type",
                    labelWidth: 200,
                    allowBlank: false,
                    items: [
                      {
                        boxLabel: "Generated",
                        inputValue: "generated",
                      },
                      {
                        boxLabel: "Provided",
                        inputValue: "provided",
                      },
                    ],
                  },
                  {
                    xtype: "container",
                    layout: {
                      type: "hbox",
                      align: "stretch",
                    },
                    items: [
                      {
                        xtype: "filefield",
                        flex: 1,
                        name: "file",
                        itemId: "file_upload_import",
                        fieldLabel: "Import Excel File",
                        allowBlank: false,
                        buttonText: "Select File...",
                        labelWidth: 200,
                        accept: ".xlsx",
                        blankText: "Supports only .xlsx file format",
                        listeners: {
                          change: function (fld, value) {
                            var newValue = value.replace(/C:\\fakepath\\/g, "");
                            fld.setRawValue(newValue);
                          },
                        },
                      },
                      {
                        xtype: "button",
                        iconCls: "x-fa fa-question-circle",
                        text: "Template",
                        tooltip: "Click here to get sample excel format",
                        margin: { left: 5 },
                        itemId: "sample_format",
                        handler: function (scope) {
                          var values = scope.up("form").getValues();
                          var type = values.type;
                          var idtype = values.idtype;
                          if (idtype) {
                            if (type) {
                              if (type == "collection") {
                                if (values.collection) {
                                  amfutil.download(
                                    "/api/data/import/sample/" +
                                      values.collection
                                  );
                                } else {
                                  Ext.toast("Select a collection");
                                }
                              } else {
                                if (values.collection) {
                                  if (values.field) {
                                    amfutil.download(
                                      "/api/data/import/sample/" +
                                        values.collection +
                                        "/" +
                                        values.field
                                    );
                                  } else {
                                    Ext.toast("Select a field");
                                  }
                                } else {
                                  Ext.toast("Select a collection");
                                }
                              }
                            } else {
                              Ext.toast("Select a type");
                            }
                          } else {
                            Ext.toast("Select an ID type");
                          }
                        },
                      },
                    ],
                  },
                ],
              },
            ],
            buttons: [
              {
                xtype: "button",
                text: "Load Data",
                formBind: true,
                itemId: "importdata",
                handler: async function (scope) {
                  var imports = amfutil.getElementByID("imports");
                  console.log(imports);
                  var grid = amfutil.getElementByID("resultgrid");
                  imports.setActiveItem(1);
                  scope.up("window").close();
                  var form = this.up("form").getForm();
                  var values = form.getValues();
                  console.log(values);
                  var filefield = form.findField("file");

                  var collection = values.collection;
                  var file = filefield.extractFileInput().files[0];
                  console.log(collection);
                  console.log(file);
                  var type = values.type;
                  var req = await amfuploads.handleUpload(
                    encodeURI("api/data/import/" + collection),
                    file,
                    false,
                    false
                  );

                  var resp = req.response;
                  var status = req.status;

                  if (status == 500) {
                    Ext.toast("Error Parsing Excel File");
                    imports.setActiveItem(0);
                  } else {
                    var data = JSON.parse(resp);
                    grid.data = data;
                    grid.widgets = [];
                    grid.conts = [];
                    grid.idtype = values.idtype;
                    var config;
                    var entity;

                    if (type == "collection") {
                      grid.route = collection;
                      config = ampsgrids.grids[collection]();
                      entity = null;
                    } else {
                      config =
                        ampsgrids.grids[collection]().subgrids[values.field];
                      var combo = amfutil.getElementByID("entity");
                      entity = combo.getSelection().data;

                      grid.route = [
                        collection,
                        values.entity,
                        values.field,
                      ].join("/");
                    }

                    amfutil.getElementByID("number").reset();

                    amfutil.getElementByID("import").setDisabled(true);

                    function load() {
                      var columns = config.columns.concat({
                        xtype: "widgetcolumn",
                        text: "Valid",
                        width: 100,
                        selectable: false,
                        focusable: false,
                        widget: {
                          xtype: "container",
                          width: 300,
                          // width: 150,

                          // layout: "center",

                          load: function (rec) {
                            var record = rec.data;
                            var promise = function validity() {
                              return new Promise(async (resolve, reject) => {
                                var myForm = Ext.create("Amps.form.config", {
                                  entity: entity ? entity : null,
                                  show_id: values.idtype == "provided",
                                  idcheck: false,
                                  collection: collection,
                                });

                                await myForm.loadForm(
                                  config,
                                  record,
                                  false,
                                  false,
                                  false
                                );
                                var win = Ext.create(
                                  "Ext.window.Window",
                                  Ext.apply(
                                    {
                                      title: "Edit Data",
                                      // modal: true,
                                      width: 600,
                                      height: 600,
                                      closeAction: "method-hide",
                                      duplicateCheck: async function () {
                                        var refs =
                                          this.down("form").query(
                                            "field[duplicate]"
                                          );
                                        var promises = refs.map((ref) =>
                                          ref.check()
                                        );
                                        await Promise.all(promises);
                                      },
                                      setValid: function (valid) {
                                        this.down("#valid").setValid(valid);
                                      },
                                      items: [
                                        {
                                          xtype: "container",
                                          padding: 10,
                                          itemId: "valid",
                                          style: {
                                            color: "white",
                                          },
                                          layout: "center",
                                          setValid: function (valid) {
                                            var text = this.down("#text");
                                            var icon = this.down("#icon");
                                            if (valid) {
                                              text.setHtml("Valid");
                                              icon.removeCls("fa-times");
                                              icon.addCls("fa-check");
                                              this.setStyle({
                                                background: "#039487",
                                              });
                                            } else {
                                              text.setHtml("Invalid");
                                              icon.removeCls("fa-check");
                                              icon.addCls("fa-times");
                                              this.setStyle({
                                                background: "#8b0000",
                                              });
                                            }
                                          },

                                          items: [
                                            {
                                              xtype: "container",
                                              width: 100,
                                              layout: "hbox",
                                              items: [
                                                {
                                                  xtype: "container",
                                                  layout: "center",
                                                  flex: 1,

                                                  items: [
                                                    {
                                                      itemId: "icon",
                                                      cls: "x-fa",
                                                      xtype: "component",
                                                    },
                                                  ],
                                                },
                                                {
                                                  xtype: "container",
                                                  layout: "center",
                                                  flex: 3,

                                                  items: [
                                                    {
                                                      itemId: "text",
                                                      xtype: "component",
                                                      html: "Status",
                                                      style: {
                                                        "font-weight": 500,
                                                      },
                                                    },
                                                  ],
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        myForm,
                                      ],
                                    },
                                    config.window
                                  )
                                );
                                var cont = Ext.create({
                                  xtype: "container",
                                  // layout: "center",
                                  layout: {
                                    type: "hbox",
                                    align: "stretch",
                                  },
                                  record: rec,
                                  win: win,
                                  imported: false,
                                  setValid: function (valid) {
                                    this.down("#valid").setValid(valid);
                                  },
                                  items: [
                                    {
                                      xtype: "container",
                                      itemId: "valid",
                                      width: 50,
                                      style: {
                                        color: "white",
                                      },
                                      layout: "center",
                                      setValid: function (valid) {
                                        var icon = this.down("#icon");
                                        if (valid) {
                                          icon.removeCls("fa-times");
                                          icon.addCls("fa-check");
                                          this.setStyle({
                                            background: "#039487",
                                          });
                                        } else {
                                          icon.removeCls("fa-check");
                                          icon.addCls("fa-times");
                                          this.setStyle({
                                            background: "#8b0000",
                                          });
                                        }
                                      },

                                      items: [
                                        {
                                          xtype: "container",
                                          layout: "hbox",
                                          items: [
                                            {
                                              xtype: "container",
                                              layout: "center",
                                              flex: 1,

                                              items: [
                                                {
                                                  itemId: "icon",
                                                  cls: "x-fa",
                                                  xtype: "component",
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                      ],
                                    },
                                    {
                                      xtype: "button",
                                      itemId: "edit",
                                      scale: "small",
                                      iconCls: "x-fa fa-pencil",
                                      style: {
                                        "font-size": ".75rem",
                                      },
                                      handler: function (scope) {
                                        var win = scope.up("container").win;
                                        win.duplicateCheck();
                                        win.show();
                                      },
                                    },
                                  ],
                                });
                                myForm.setListeners({
                                  validitychange: function (scope, valid) {
                                    cont.setValid(valid);
                                    win.setValid(valid);
                                  },
                                });

                                win.show();
                                await win.duplicateCheck();
                                win.hide();

                                this.removeAll();
                                this.insert(cont);
                                grid.conts.push(cont);
                                var valid = myForm.isValid();
                                cont.setValid(valid);
                                win.setValid(valid);

                                resolve();
                              });
                            };
                            this.promise = promise;
                          },
                        },
                        onWidgetAttach: function (col, widget, rec) {
                          grid.widgets.push(widget);

                          widget.load(rec);
                        },
                      });

                      if (config.import && config.import.skip) {
                        columns = columns.filter(
                          (column) =>
                            config.import.skip.indexOf(column.dataIndex) < 0
                        );
                      }

                      console.log(columns);

                      grid.reconfigure(null, columns);

                      grid.loadRecords();
                      // grid.setLoading(false);
                    }
                    load();
                  }
                },
              },
              {
                xtype: "button",
                text: "Clear",
                itemId: "cancel_report_message_activity_btn",
                handler: "onImportClear",
              },
            ],
          },
        ],
      }),
      scrollable: true,
    },
    {
      xtype: "container",
      layout: "center",

      style: {
        "font-size": "1.25rem",
      },

      items: [
        {
          xtype: "container",
          layout: "anchor",
          // defaults: {
          //   margin: 100,
          // },
          items: [
            {
              xtype: "component",
              anchor: "100%",
              style: {
                "line-height": "125%",
                "margin-bottom": "2rem",
              },
              html: "Loading",
              itemId: "display",
            },
            {
              xtype: "container",
              style: {
                display: "flex",
                "align-items": "center",
                "flex-direction": "column",
              },
              anchor: "100%",
              items: [
                {
                  xtype: "component",
                  style: {
                    width: "min-content",
                    "font-size": "4rem",
                  },
                  html: `<div class="x-fa fa-circle-o-notch fa-spin"</div>`,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

Ext.define("Amps.panel.Wizard", {
  xtype: "wizard",
  extend: "Ext.panel.Panel",
  // title: "AMPS Wizard",
  layout: "card",
  bodyPadding: 10,
  scrollable: true,
  itemId: "wizard",
  defaultListenerScope: true,
  constructor(args) {
    this.callParent([args]);

    if (args["close"]) {
      var cb = this.down("#closebutton");
      cb.setText("Close");
      cb.setHandler(args["close"]);
    }
    if (args["title"]) {
      this.setTitle(args["title"]);
    }
    if (args["topic"]) {
      this.on("afterrender", function () {
        console.log(this.down("#card-1"));
        var topic = this.down("#card-1");
        var fc = {
          xtype: "fieldcontainer",
          items: [
            {
              xtype: "checkbox",
              inputValue: true,
              uncheckedValue: false,
              fieldLabel: "Wildcard",
              isFormField: false,
              value: false,
              listeners: {
                change: function (scope, val) {
                  var topic = this.up("form").getForm().findField("topic");
                  var tp;
                  if (val) {
                    var pieces = args["topic"].split(".");
                    pieces.pop();
                    pieces.push("*");
                    tp = pieces.join(".");
                  } else {
                    tp = args["topic"];
                  }
                  topic.setValue(tp);
                },
              },
            },

            {
              xtype: "displayfield",
              submitValue: true,
              name: "type",
              fieldLabel: "Topic Type",
              value: args["topic"].split(".")[1],
            },

            {
              xtype: "displayfield",
              name: "topic",
              fieldLabel: "Topic",
              value: args["topic"],
              submitValue: true,
            },
          ],
        };
        topic.remove(topic.down("#createtopic"));
        topic.insert(fc);

        console.log(topic);
      });
    }
  },
  //   tbar: [
  //     {
  //       xtype: "container",
  //       items: [
  //         {
  //           html: `<ul class="stepNav threeWide"><li id="user_step1" class="selected"><a href="#">User Details</a></li><li id="user_step2" class=""><a href="#">Provider Details</a></li><li id="user_step3" class=""><a href="#">Review</a></li></ul>`,
  //         },
  //       ],
  //     },
  //   ],

  items: [
    {
      xtype: "form",
      scrollable: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      itemId: "card-0",
      getInvalidFields: function () {
        var invalidFields = [];
        Ext.suspendLayouts();
        this.form.getFields().filterBy(function (field) {
          if (field.validate()) return;
          invalidFields.push(field);
        });
        Ext.resumeLayouts(true);
        var e = this.down("#existing");

        return invalidFields;
      },
      items: [
        {
          xtype: "component",
          html: "<h1>AMPS Wizard</h1>",
        },
        {
          html: `<hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 1 of 3: Define an action below.</h4>`,
        },
        {
          xtype: "radiogroup",
          isFormField: false,
          columns: 2,
          items: [
            {
              boxLabel: "New",
              inputValue: true,
              name: "action",
            },
            {
              boxLabel: "Existing",
              name: "action",
              inputValue: false,
            },
          ],
          listeners: {
            beforerender: function (scope) {
              scope.setListeners(
                amfutil.renderListeners(function (scope, val) {
                  console.log(val);
                  var n = scope.up("form").down("#new");
                  var e = scope.up("form").down("#existing");
                  if (typeof val.action === "boolean") {
                    n.setHidden(!val.action);
                    n.setDisabled(!val.action);

                    e.setHidden(val.action);
                    e.setDisabled(val.action);
                  } else {
                    n.setHidden(true);
                    n.setDisabled(true);

                    e.setHidden(true);
                    e.setDisabled(true);
                  }
                })
              );
            },
          },
        },
        {
          xtype: "component",
          autoEl: "hr",
        },
        {
          xtype: "fieldcontainer",
          itemId: "new",
          maxWidth: 700,
          layout: {
            type: "vbox",
            align: "stretch",
          },
          listeners: {
            beforerender: function (scope) {
              scope.insert(0, ampsgrids.grids["actions"]().fields);
            },
          },
        },
        {
          xtype: "fieldcontainer",
          itemId: "existing",
          maxWidth: 700,
          layout: {
            type: "vbox",
            align: "stretch",
          },
          listeners: {
            beforerender: function (scope) {
              scope.insert(
                0,
                amfutil.combo(
                  "Action",
                  "existing",
                  amfutil.createCollectionStore("actions"),
                  "_id",
                  "name",
                  {
                    allowBlank: false,
                  }
                )
              );
            },
          },
        },
      ],
      bbar: [
        "->",
        {
          itemId: "card-next",
          text: "Next &raquo;",
          handler: "showNext",
          formBind: true,
        },
      ],
    },
    {
      xtype: "form",
      layout: {
        type: "vbox",
        align: "stretch",
      },
      itemId: "card-1",
      scrollable: true,

      items: [
        {
          xtype: "component",
          html: "<h1>AMPS Wizard</h1>",
        },
        {
          html: `<hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 2 of 3: Define a corresponding topic.</h4>`,
        },
        {
          xtype: "container",
          itemId: "createtopic",
          layout: {
            type: "vbox",
            align: "stretch",
          },
          items: [
            {
              xtype: "radiogroup",
              isFormField: false,
              columns: 2,
              name: "new",
              items: [
                {
                  boxLabel: "New",
                  inputValue: true,
                  name: "new",
                  isFormField: false,

                  // checked: true,
                },
                {
                  boxLabel: "Existing",
                  name: "new",
                  inputValue: false,
                  isFormField: false,
                },
              ],
              listeners: {
                beforerender: function (scope) {
                  scope.setListeners(
                    amfutil.renderListeners(function (scope, val) {
                      console.log(val);
                      var n = scope.up("form").down("#new");
                      var e = scope.up("form").down("#existing");
                      if (typeof val.new === "boolean") {
                        n.setHidden(!val.new);
                        n.setDisabled(!val.new);

                        e.setHidden(val.new);
                        e.setDisabled(val.new);
                      } else {
                        n.setHidden(true);
                        n.setDisabled(true);

                        e.setHidden(true);
                        e.setDisabled(true);
                      }
                    })
                  );
                },
              },
            },
            {
              xtype: "component",
              autoEl: "hr",
            },
            {
              xtype: "fieldcontainer",
              layout: {
                type: "vbox",
                align: "stretch",
              },
              allowBlank: true,
              itemId: "new",
              listeners: {
                beforerender: function (scope) {
                  scope.insert(0, ampsgrids.grids["topics"]().fields);
                },
              },
            },
            {
              xtype: "fieldcontainer",
              layout: {
                type: "vbox",
                align: "stretch",
              },
              itemId: "existing",

              listeners: {
                beforerender: function (scope) {
                  scope.insert(
                    0,
                    amfutil.combo(
                      "Topic",
                      "existing",
                      amfutil.createCollectionStore("topics"),
                      "topic",
                      "topic"
                    )
                  );
                },
              },
            },
          ],
        },
      ],
      bbar: [
        "->",
        {
          itemId: "card-prev",
          text: "&laquo; Previous",
          handler: "showPrevious",
        },
        {
          itemId: "card-next",
          text: "Next &raquo;",
          handler: "showNext",
          formBind: true,
        },
      ],
    },
    {
      xtype: "form",
      layout: {
        type: "vbox",
        align: "stretch",
      },
      itemId: "card-2",
      scrollable: true,

      items: [
        {
          xtype: "component",
          html: "<h1>AMPS Wizard</h1>",
        },
        {
          html: `<hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 3 of 3: Define a subscriber that subscribes to your topic and performs your action.</h4>`,
        },
        {
          xtype: "fieldcontainer",
          layout: {
            type: "vbox",
            align: "stretch",
          },
          listeners: {
            beforerender: function (scope) {
              var services = ampsgrids.grids["services"]();
              var fields = services.fields.concat(
                services.types["subscriber"].fields
              );

              fields = fields.filter((field) => field.itemId != "types");

              fields = amfutil.searchFields(fields, (field) => {
                console.log(field);
                if (field.dynamic) {
                  field = amfutil.dynamicRemove(field);
                }
                if (field.name == "handler" || field.name == "topic") {
                  field.readOnly = true;
                  field.forceSelection = false;
                }
                return field;
              });

              // console.log(action);
              // console.log(topic);
              scope.insert(0, fields);
            },
          },
        },
      ],
      bbar: [
        "->",
        {
          itemId: "card-prev",
          text: "&laquo; Previous",
          handler: "showPrevious",
          // disabled: true,
        },
        {
          itemId: "card-next",
          formBind: true,
          text: "Finish",
          handler: async function (scope) {
            console.log("Finish");
            var wizard = scope.up("#wizard");
            var mask = new Ext.LoadMask({
              msg: "Please wait...",
              target: wizard,
            });
            mask.show();
            try {
              var actionform = scope.up("#wizard").down("#card-0");
              var topicform = scope.up("#wizard").down("#card-1");
              var user = amfutil.get_user();

              var subscriberform = scope.up("form");

              function audit(d) {
                d.createdby = user.firstname + " " + user.lastname;
                d.created = new Date().toISOString();

                d.modifiedby = user.firstname + " " + user.lastname;
                d.modified = new Date().toISOString();
                return d;
              }

              var action = actionform.getForm().getValues();
              var actionid;
              if (!action.existing) {
                action = ampsgrids.grids["actions"]().add.process(
                  actionform,
                  action
                );

                action = audit(action);

                actionid = await amfutil.addToCollection("actions", action);
                console.log(actionid);
              } else {
                var actiondata = actionform
                  .getForm()
                  .findField("existing")
                  .getSelectedRecord().data;
                actionid = actiondata._id;
                action.name = actiondata.name;
              }

              var topic = topicform.getForm().getValues();
              console.log(topic);
              topic = amfutil.convertNumbers(topicform.getForm(), topic);
              console.log(topic);
              var topicid;
              console.log(topic);
              if (!topic.new) {
                var topics = await amfutil.getCollectionData("topics", {
                  topic: topic.topic,
                });
                console.log(topics);
                if (topics.length) {
                  topicid = topics[0]._id;
                } else {
                  topic = audit(topic);

                  topicid = await amfutil.addToCollection("topics", topic);
                }
              } else {
                var topicdata = topicform
                  .getForm()
                  .findField("new")
                  .getSelectedRecord().data;
                topicid = topicdata._id;
                topic.topic = topicdata.topic;
              }

              var subscriber = subscriberform.getForm().getValues();
              subscriber = amfutil.convertNumbers(
                subscriberform.getForm(),
                subscriber
              );

              subscriber.type = "subscriber";
              subscriber.active = true;

              var wizard = scope.up("#wizard");

              console.log(topicid);
              subscriber.handler = actionid;

              subscriber = audit(subscriber);

              var subscriberid = await amfutil.addToCollection(
                "services",
                subscriber
              );
              wizard.showNext();
              var confirmation = scope.up("#wizard").down("#card-3");
              confirmation.loadConfirmation(
                { id: actionid, name: action.name },
                { id: topicid, name: topic.topic },
                { id: subscriberid, name: subscriber.name }
              );
              console.log(subscriberid);
              mask.hide();
            } catch (e) {
              mask.hide();
            }
          },
        },
      ],
      listeners: {
        beforeactivate(scope) {
          var action = scope.down("combobox[name=handler]");
          console.log(action);
          var topic = scope.down("combobox[name=topic]");
          console.log(topic);
          var actionform = scope.up("panel").down("#card-0");
          console.log(actionform);
          var topicform = scope.up("panel").down("#card-1");
          console.log(topicform);
          var actionval = actionform.getValues();
          if (actionval.existing) {
            action.setValue(actionval.existing);
          } else {
            action.setValue(actionform.down("textfield[name=name]").getValue());
          }

          var topicval = topicform.getValues();
          console.log(topicval);

          if (topicval.existing) {
            topic.setValue(topicval.existing);
          } else {
            topic.setValue(
              topicform.down("displayfield[name=topic]").getValue()
            );
          }
        },
      },
    },
    {
      xtype: "form",

      itemId: "card-3",
      loadConfirmation: function (action, topic, subscriber) {
        var html = `
            <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;">
            <h2>Complete! You defined:</h4>
            <h3>Action: <a href="#actions/${action.id}">${action.name}</a><h5>
            <h3>Topic: <a href="#topics/${topic.id}">${topic.name}</a><h5>
            <h3>Subscriber: <a href="#services/${subscriber.id}">${subscriber.name}</a> that listens on ${topic.name} and performs ${action.name}<h5>
            `;
        this.down("#confirm").setHtml(html);
      },
      items: [
        {
          xtype: "component",
          html: "<h1>AMPS Wizard</h1>",
        },
        {
          itemId: "confirm",
          html: "",
        },
      ],
      bbar: [
        "->",
        {
          // formBind: true,
          itemId: "closebutton",
          text: "Restart",
          handler: async function (scope) {
            window.location.reload();
          },
        },
      ],
    },
  ],

  showNext: function () {
    console.log("Next");
    this.doCardNavigation(1);
  },

  showPrevious: function (btn) {
    this.doCardNavigation(-1);
  },

  doCardNavigation: function (incr) {
    var me = this;
    var l = me.getLayout();
    var i = l.activeItem.itemId.split("card-")[1];
    var next = parseInt(i, 10) + incr;
    l.setActiveItem(next);

    // me.down("#card-prev").setDisabled(next === 0);
    // me.down("#card-next").setDisabled(next === 2);
  },
});

Ext.define("Amps.util.Grids", {
  singleton: true,
  grids: {
    environments: () => ({
      title: "Environments",
      window: { height: 600, width: 600 },
      object: "Environment",
      overwrite: true,
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      options: ["archive", "clearenv", "exportenv", "delete"],

      columns: [
        {
          text: "Status",
          xtype: "socketcolumn",
          config: function (data, widget) {
            return {
              event: "environment",
              payload: { name: data.name },
              cond: function () {
                var page =
                  Ext.util.History.getToken().split("/")[0] == "environments";
                var visible = widget
                  .up("grid")
                  .getStore()
                  .findRecord("_id", data["_id"]);

                if (!visible) {
                  widget.destroy();
                }

                return page && visible;
              },
              callback: function (widget, payload) {
                var handler = function () {
                  var action = payload ? "stop" : "start";

                  amfutil.ajaxRequest({
                    url: "/api/env/" + data.name,
                    jsonData: {
                      action: action,
                    },
                    method: "POST",
                    timeout: 60000,
                    success: function (res) {
                      Ext.toast(
                        (payload ? "Stopping" : "Starting") + " " + data.name
                      );

                      clicked = true;
                    },
                    failure: function (res) {
                      console.log("failed");
                      clicked = true;
                    },
                  });
                };
                widget.removeAll();
                widget.insert({
                  xtype: "container",

                  cls: "widgetbutton",
                  layout: { type: "hbox", align: "stretch" },
                  defaults: {
                    padding: 5,
                  },
                  listeners: {
                    render: function (scope) {
                      scope.getEl().on("click", handler);
                    },
                  },
                  items: [
                    {
                      xtype: "component",
                      cls: `x-fa fa-${payload ? "stop" : "play"}-circle`,
                    },
                    {
                      xtype: "component",
                      html: payload ? "Stop" : "Start",
                    },
                    {
                      xtype: "container",
                      layout: "center",
                      items: [
                        {
                          xtype: "component",
                          html: `<div class="led ${
                            payload ? "green" : "red"
                          }"></div>`,
                        },
                      ],
                    },
                  ],
                });
              },
            };
          },
        },
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
        },
        {
          text: "Description",
          dataIndex: "desc",
          flex: 1,
          type: "text",
        },
      ],
      fields: [
        amfutil.duplicateVal(
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Name",
            tooltip: "Unique Environment Name",
          },
          function (cmp, value, oldValue, eOpts) {
            return {
              environments: amfutil.duplicateIdCheck({ name: value }, cmp),
            };
          },
          "Environment Already Exists",
          amfutil.nameLowerCaseValidator
        ),
        {
          xtype: "textfield",
          name: "desc",
          fieldLabel: "Description",
          tooltip: "Action Description",

          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "host",
          fieldLabel: "User Portal Host",
          tooltip: "User Portal Host",
          allowBlank: false,
        },
        amfutil.check("Active", "active", { value: true }),
        amfutil.check("Archive", "archive", { value: true }),
      ],
    }),
    packages: () => ({
      title: "Packages",
      overwrite: true,
      dblclick: function () {},
      actionIcons: ["addnewbtn", "refreshbtn"],
      options: ["readme", "loadDemo", "delete"],
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
        },
        { text: "Description", dataIndex: "desc", flex: 1, type: "text" },
      ],
    }),

    system_logs: () => ({
      title: "System Logs",
      actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
      sort: {
        etime: "DESC",
      },

      dblclick: function (record) {
        console.log(record);
        var win = new Ext.window.Window({
          title: `Level: ${record["level"]} | Time: ${record["etime"]}`,
          width: 700,
          height: 500,
          layout: "fit",
          items: [
            {
              xtype: "container",
              padding: 20,
              style: {
                background: "var(--main-color)",
              },
              scrollable: true,

              items: [
                {
                  xtype: "component",

                  style: {
                    background: "var(--main-color)",
                    "white-space": "pre-wrap",
                    "font-weight": "500",
                    color: "white",
                    // "font-size": "1.5rem",
                  },
                  html: record["message"],
                },
              ],
            },
          ],
        });
        win.show();
      },
      columns: [
        {
          text: "Event Time",
          dataIndex: "etime",
          type: "date",
          renderer: function (val) {
            var date = new Date(val);
            var milli = val.split(".")[1].substring(0, 3);
            var str = date.toLocaleString();
            return (
              str.substring(0, str.length - 3) + ":" + milli + str.slice(-3)
            );
          },
          width: 200,
        },
        {
          text: "Node",
          dataIndex: "node",
          width: 200,
          type: "aggregate",
          collection: "system_logs",
        },
        {
          text: "Level",
          dataIndex: "level",
          type: "tag",
          options: [
            { label: "Info", field: "info" },
            { label: "Warn", field: "warn" },
            { label: "Error", field: "error" },
            { label: "Notice", field: "notice" },
            { label: "Debug", field: "debug" },
          ],
          width: 100,
        },
        {
          text: "Message",
          dataIndex: "message",
          flex: 10,
          type: "text",
        },
      ],
    }),
    ui_audit: () => ({
      title: "Audit Log",
      actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
      sort: {
        etime: "DESC",
      },

      dblclick: function (record) {
        items = Object.entries(record.params).map((p) => ({
          xtype: "displayfield",
          fieldLabel: p[0],
          value: JSON.stringify(p[1]),
        }));
        var win = new Ext.window.Window({
          title: "Params",
          modal: true,
          width: 450,
          height: 600,
          resizable: false,
          layout: "fit",
          padding: 30,
          scrollable: true,
          items: [
            {
              xtype: "form",
              items: items,
            },
          ],
        });

        win.show();
      },
      columns: [
        { text: "User", dataIndex: "user", flex: 1, type: "text" },
        {
          text: "Action",
          dataIndex: "action",
          flex: 1,
          type: "text",
        },
        {
          text: "Entity",
          dataIndex: "entity",
          flex: 1,
          type: "text",
        },
        {
          text: "Event Time",
          dataIndex: "etime",
          flex: 1,
          type: "date",
          renderer: amfutil.dateRenderer,
        },
      ],
    }),
    providers: () => {
      var config = {
        object: "Provider",
        overwrite: true,

        window: { height: 600, width: 600 },
        options: ["delete"],
        title: "Providers",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
          "export",
        ],
        columns: [
          {
            text: "Name",
            dataIndex: "name",
            flex: 1,
            type: "combo",
            searchOpts: {
              store: amfutil.createCollectionStore("providers"),
              displayField: "name",
              valueField: "name",
            },
          },
          {
            text: "Type",
            dataIndex: "type",
            flex: 1,
            type: "combo",
            searchOpts: {
              store: amfutil.createCollectionStore("providers"),
              displayField: "type",
              valueField: "type",
            },
          },
        ],
        types: Object.assign(
          {
            ldap: {
              field: "ldap",
              label: "LDAP",
              fields: [
                amfutil.text("Server", "server"),
                {
                  xtype: "numberfield",
                  name: "port",
                  fieldLabel: "Port",
                  allowBlank: false,
                },
                amfutil.check("SSL", "ssl"),
                amfutil.text("Username", "username"),
                amfutil.text("Password", "password", { inputType: "password" }),
              ],
            },
            aws: {
              field: "aws",
              label: "AWS",
              fields: [
                {
                  xtype: "textfield",
                  name: "key",
                  fieldLabel: "Access Id",
                  tooltip: "Your S3 Access Key ID Credential",
                  allowBlank: false,
                },
                {
                  xtype: "textfield",
                  name: "secret",
                  fieldLabel: "Access Key",
                  inputType: "password",
                  tooltip: "Your S3 Secret Access Key Credential",
                  allowBlank: false,
                },
              ],
            },
            s3: {
              field: "s3",
              label: "S3",
              fields: [
                amfutil.localCombo(
                  "S3 Service",
                  "provider",
                  ["AWS", "Minio"],
                  null,
                  null,
                  {
                    tooltip: "The S3 service that you are using",
                    listeners: amfutil.renderListeners(function render(
                      scope,
                      val
                    ) {
                      var comps = ["Minio", "AWS"];

                      comps.forEach((name) => {
                        var component = scope.up("form").down("#" + name);
                        component.setHidden(val != name);
                        component.setDisabled(val != name);
                      });
                    }),
                  }
                ),

                {
                  xtype: "fieldset",
                  hidden: true,
                  disabled: true,
                  title: "Minio",

                  itemId: "Minio",
                  items: [
                    amfutil.localCombo(
                      "Scheme",
                      "scheme",
                      [
                        {
                          value: "http://",
                          label: "HTTP",
                        },
                        {
                          value: "https://",
                          label: "HTTPS",
                        },
                      ],
                      "value",
                      "label",
                      {
                        tooltip: "The Scheme your Minio instance uses",
                      }
                    ),

                    {
                      xtype: "textfield",
                      tooltip: "The URL Host for your Minio instance",
                      itemId: "host",
                      name: "host",
                      fieldLabel: "Host",
                      vtype: "ipandhostname",
                    },
                    {
                      xtype: "textfield",
                      tooltip: "The Port your Minio instance is running on.",
                      itemId: "port",
                      name: "port",
                      fieldLabel: "Port",
                      maskRe: /[0-9]/,
                    },
                  ],
                },
                {
                  xtype: "fieldset",

                  title: "AWS",
                  itemId: "AWS",
                  hidden: true,
                  disabled: true,
                  items: [
                    amfutil.localCombo(
                      "Region",
                      "region",
                      [
                        "us-east-2",
                        "us-east-1",
                        "us-west-1",
                        "us-west-2",
                        "af-south-1",
                        "ap-east-1",
                        "ap-south-1",
                        "ap-northeast-3",
                        "ap-northeast-2",
                        "ap-southeast-1",
                        "ap-southeast-2",
                        "ap-northeast-1",
                        "ca-central-1",
                        "cn-north-1",
                        "cn-northwest-1",
                        "eu-central-1",
                        "eu-west-1",
                        "eu-west-2",
                        "eu-west-3",
                        "eu-north-1",
                        "eu-south-1",
                        "me-south-1",
                        "sa-east-1",
                        "us-gov-west-1",
                        "us-gov-east-1",
                      ],
                      null,
                      null,
                      {
                        tooltip:
                          "The AWS Region your S3 Buckets are hosted on.",
                      }
                    ),
                  ],
                },

                {
                  xtype: "textfield",
                  name: "key",
                  fieldLabel: "Access Id",
                  tooltip: "Your S3 Access Key ID Credential",
                  allowBlank: false,
                },
                {
                  xtype: "textfield",
                  name: "secret",
                  fieldLabel: "Access Key",
                  inputType: "password",
                  tooltip: "Your S3 Secret Access Key Credential",
                  allowBlank: false,
                },
                // {
                //   xtype: "checkbox",
                //   name: "proxy",
                //   fieldLabel: "Use Proxy",
                //   uncheckedValue: false,
                //   tooltip: "Whether to use a proxy for the S3 connection",
                //   inputValue: true,
                //   listeners: {
                //     afterrender: function (scope) {
                //       var val = scope.getValue();
                //       var components = ["#proxy"];
                //       components.forEach((name) => {
                //         var component = scope.up("form").down(name);
                //         component.setHidden(!val);
                //         component.setDisabled(!val);
                //       });
                //     },
                //     change: function (scope, val) {
                //       var components = ["#proxy"];
                //       components.forEach((name) => {
                //         var component = scope.up("form").down(name);
                //         component.setHidden(!val);
                //         component.setDisabled(!val);
                //       });
                //     },
                //   },
                // },
                // {
                //   xtype: "fieldcontainer",
                //   itemId: "proxy",
                //   items: [
                //     {
                //       xtype: "textfield",
                //       itemId: "proxyurl",
                //       name: "proxy_url",
                //       tooltip: "The URL for the proxy connection",
                //       fieldLabel: "Proxy Url",
                //     },
                //     {
                //       xtype: "textfield",
                //       itemId: "proxyusername",
                //       tooltip: "The proxy username",

                //       name: "proxy_username",
                //       fieldLabel: "Proxy Username",
                //     },
                //     {
                //       xtype: "textfield",
                //       itemId: "proxypassword",
                //       tooltip: "The proxy password",

                //       name: "proxy_password",
                //       fieldLabel: "Proxy Password",
                //     },
                //   ],
                // },
              ],
            },
            sharepoint: {
              field: "sharepoint",
              label: "SharePoint",
              fields: [
                {
                  xtype: "textfield",
                  name: "tenant",
                  fieldLabel: "Tenant",
                  tooltip:
                    "The Tenant ID for your Microsoft Azure Active Directory Application",
                },
                {
                  xtype: "textfield",
                  name: "client_id",
                  fieldLabel: "Client ID",
                  tooltip:
                    "The Application (Client) ID for your Microsoft Azure Active Directory Application",
                },
                {
                  xtype: "textfield",
                  name: "client_secret",
                  fieldLabel: "Client Secret",
                  tooltip:
                    "The Client Secret or Application Password for your Microsoft Azure Active Directory Application",
                },
              ],
            },
            archive: {
              field: "archive",
              label: "Archive",
              fields: [
                amfutil.localCombo(
                  "Archive Type",
                  "atype",
                  [{ field: "s3", label: "S3" }],
                  "field",
                  "label",
                  {
                    listeners: amfutil.renderListeners(function (scope, val) {
                      var providers = ["s3"];

                      providers.forEach((provider) => {
                        var c = amfutil.getElementByID(provider);
                        c.setHidden(provider != val);
                        c.setDisabled(provider != val);
                      });
                    }),
                  }
                ),
                amfutil.renderContainer("s3", [
                  amfutil.localCombo(
                    "S3 Service",
                    "provider",
                    ["AWS", "Minio"],
                    null,
                    null,
                    {
                      tooltip: "The S3 service that you are using",
                      listeners: amfutil.renderListeners(function render(
                        scope,
                        val
                      ) {
                        var comps = ["Minio", "AWS"];

                        comps.forEach((name) => {
                          var component = scope.up("form").down("#" + name);
                          console.log(component);
                          component.setDisabled(false);

                          component.setHidden(false);
                        });

                        comps.forEach((name) => {
                          var component = scope.up("form").down("#" + name);
                          console.log(component);
                          component.setDisabled(val != name);

                          component.setHidden(val != name);
                        });
                      }),
                    }
                  ),
                  {
                    xtype: "fieldset",
                    title: "Minio",

                    itemId: "Minio",
                    items: [
                      amfutil.localCombo(
                        "Scheme",
                        "scheme",
                        [
                          {
                            value: "http://",
                            label: "HTTP",
                          },
                          {
                            value: "https://",
                            label: "HTTPS",
                          },
                        ],
                        "value",
                        "label",
                        {
                          tooltip: "The Scheme your Minio instance uses",
                        }
                      ),

                      {
                        xtype: "textfield",
                        tooltip: "The URL Host for your Minio instance",
                        itemId: "host",
                        name: "host",
                        fieldLabel: "Host",
                        vtype: "ipandhostname",
                      },
                      {
                        xtype: "textfield",
                        tooltip: "The Port your Minio instance is running on.",
                        itemId: "port",
                        name: "port",
                        fieldLabel: "Port",
                        maskRe: /[0-9]/,
                      },
                    ],
                  },
                  {
                    xtype: "fieldset",
                    title: "AWS",
                    itemId: "AWS",
                    items: [
                      amfutil.localCombo(
                        "Region",
                        "region",
                        [
                          "us-east-2",
                          "us-east-1",
                          "us-west-1",
                          "us-west-2",
                          "af-south-1",
                          "ap-east-1",
                          "ap-south-1",
                          "ap-northeast-3",
                          "ap-northeast-2",
                          "ap-southeast-1",
                          "ap-southeast-2",
                          "ap-northeast-1",
                          "ca-central-1",
                          "cn-north-1",
                          "cn-northwest-1",
                          "eu-central-1",
                          "eu-west-1",
                          "eu-west-2",
                          "eu-west-3",
                          "eu-north-1",
                          "eu-south-1",
                          "me-south-1",
                          "sa-east-1",
                          "us-gov-west-1",
                          "us-gov-east-1",
                        ],
                        null,
                        null
                      ),
                    ],
                  },
                  {
                    xtype: "textfield",
                    name: "key",
                    fieldLabel: "Access Id",
                    tooltip: "Your S3 Access Key ID Credential",
                    allowBlank: false,
                  },
                  {
                    xtype: "textfield",
                    name: "secret",
                    fieldLabel: "Access Key",
                    inputType: "password",
                    tooltip: "Your S3 Secret Access Key Credential",
                    allowBlank: false,
                  },
                  {
                    xtype: "textfield",
                    name: "bucket",
                    fieldLabel: "Bucket",
                    allowBlank: false,
                    tooltip: "The bucket to use for archiving.",
                  },
                ]),
              ],
            },
            smtp: {
              field: "smtp",
              label: "SMTP",
              fields: [
                amfutil.localCombo(
                  "SMTP Type",
                  "etype",
                  [{ field: "SMTP", label: "SMTP" }],
                  "field",
                  "label",
                  {
                    listeners: amfutil.renderListeners(function (scope, val) {
                      var providers = ["SMTP"];

                      providers.forEach((provider) => {
                        var c = amfutil.getElementByID(provider);
                        c.setHidden(provider != val);
                        c.setDisabled(provider != val);
                      });
                    }),
                  }
                ),
                amfutil.renderContainer(
                  "SMTP",
                  [
                    amfutil.text("Relay", "relay"),
                    amfutil.text("Username", "username"),
                    amfutil.text("Password", "password", {
                      inputType: "password",
                    }),
                    {
                      xtype: "radiogroup",
                      fieldLabel: "Use Auth",
                      allowBlank: false,
                      name: "auth",
                      columns: 3,
                      width: 400,
                      items: [
                        {
                          boxLabel: "Never",
                          inputValue: "never",
                          name: "auth",
                        },
                        {
                          boxLabel: "If Available",
                          name: "auth",
                          inputValue: "if_available",
                          checked: true,
                        },
                        {
                          boxLabel: "Always",
                          name: "auth",
                          inputValue: "always",
                        },
                      ],
                    },
                    {
                      xtype: "radiogroup",
                      fieldLabel: "Use TLS",
                      allowBlank: false,
                      name: "tls",
                      columns: 3,
                      width: 400,
                      items: [
                        {
                          boxLabel: "Never",
                          inputValue: "never",
                          name: "tls",
                        },
                        {
                          boxLabel: "If Available",
                          name: "tls",
                          inputValue: "if_available",
                          checked: true,
                        },
                        {
                          boxLabel: "Always",
                          name: "tls",
                          inputValue: "always",
                        },
                      ],
                    },
                    amfutil.check("Use SSL (not TLS)", "ssl"),
                    {
                      xtype: "numberfield",
                      name: "port",
                      fieldLabel: "Port (Leave blank to use defaults)",
                    },
                  ],
                  {
                    defaults: {
                      labelWidth: 200,
                    },
                  }
                ),
              ],
            },
            // auth: {
            //   field: "auth",
            //   label: "Auth",
            //   fields: [
            //     amfutil.check("Local", "local"),
            //     amfutil.localCombo(
            //       "Auth Provider",
            //       "atype",
            //       [
            //         { field: "aws", label: "AWS" },
            //         { field: "sfg", label: "IBM Sterling" },
            //       ],
            //       "field",
            //       "label",
            //       {
            //         listeners: amfutil.renderListeners(function (scope, val) {
            //           var providers = scope
            //             .getStore()
            //             .getRange()
            //             .map((rec) => rec.data.field);

            //           providers.forEach((provider) => {
            //             var c = amfutil.getElementByID(provider);
            //             c.setHidden(provider != val);
            //             c.setDisabled(provider != val);
            //           });
            //         }),
            //       }
            //     ),
            //     amfutil.renderContainer(
            //       "aws",
            //       [
            //         amfutil.text("Access Key ID", "access_key_id"),
            //         amfutil.text("Secret Access Key", "secret_key", {
            //           inputType: "password",
            //         }),
            //         amfutil.localCombo(
            //           "Region",
            //           "region",
            //           [
            //             "us-east-2",
            //             "us-east-1",
            //             "us-west-1",
            //             "us-west-2",
            //             "af-south-1",
            //             "ap-east-1",
            //             "ap-south-1",
            //             "ap-northeast-3",
            //             "ap-northeast-2",
            //             "ap-southeast-1",
            //             "ap-southeast-2",
            //             "ap-northeast-1",
            //             "ca-central-1",
            //             "cn-north-1",
            //             "cn-northwest-1",
            //             "eu-central-1",
            //             "eu-west-1",
            //             "eu-west-2",
            //             "eu-west-3",
            //             "eu-north-1",
            //             "eu-south-1",
            //             "me-south-1",
            //             "sa-east-1",
            //             "us-gov-west-1",
            //             "us-gov-east-1",
            //           ],
            //           null,
            //           null,
            //           {
            //             tooltip: "The AWS Region your S3 Buckets are hosted on.",
            //           }
            //         ),
            //         amfutil.check("Add To Group", "use_group", {
            //           listeners: amfutil.renderListeners(function (scope, val) {
            //             var g = amfutil.getElementByID("group");
            //             g.setHidden(!val);
            //             g.setDisabled(!val);
            //           }),
            //         }),
            //         amfutil.text("Group Name", "group", {
            //           itemId: "group",
            //         }),
            //         {
            //           xtype: "scriptfield",
            //           name: "policy",
            //           language: "json",
            //           height: 400,
            //           width: 400,
            //           flex: 1,
            //         },
            //       ],
            //       {
            //         defaults: {
            //           labelWidth: 200,
            //         },
            //       }
            //     ),

            //     amfutil.renderContainer(
            //       "sfg",
            //       [
            //         amfutil.text("API Usename", "api_username"),
            //         amfutil.text("API Password", "api_password", {
            //           inputType: "password",
            //         }),
            //         amfutil.text("API URL", "api_uri"),
            //       ],
            //       {
            //         defaults: {
            //           labelWidth: 200,
            //         },
            //       }
            //     ),
            //   ],
            // },
            generic: {
              field: "generic",
              label: "Generic",
              fields: [
                {
                  // Fieldset in Column 1 - collapsible via toggle button
                  xtype: "parmfield",
                  title: "Values",
                  name: "values",
                },
              ],
              load: function (form, record) {
                //   console.log(record.parms);
                //   var parms = Object.entries(record.parms).map((entry) => {
                //     return { field: entry[0], value: entry[1] };
                //   });
                //   parms.forEach(function (p) {
                //     var dcon = form.down("#parms");
                //     var length = dcon.items.length;
                //     if (typeof p.value === "boolean") {
                //       var d = Ext.create("Amps.form.Parm.Bool");
                //       d.down("#field").setValue(p.field);
                //       d.down("#value").setValue(p.value);
                //       dcon.insert(length - 1, d);
                //     } else {
                //       var d = Ext.create("Amps.form.Parm.String");
                //       d.down("#field").setValue(p.field);
                //       d.down("#value").setValue(p.value);
                //       dcon.insert(length - 1, d);
                //     }
                //   });
              },
              process: function (form, values) {
                console.log(values);
                values.values = amfutil.formatArrayField(values.values);
                delete values.field;
                delete values.value;
                return values;
              },
            },
          },
          amfutil.plugins["providers"]()
        ),
        fields: [
          amfutil.duplicateVal(
            {
              xtype: "textfield",
              name: "name",
              fieldLabel: "Name",
              allowBlank: false,
              tooltip: "A name for this provider",
            },
            function (cmp, value) {
              var form = cmp.up("form");
              return {
                providers: amfutil.duplicateIdCheck({ name: value }, cmp),
              };
            },
            "Provider Already Exists",
            amfutil.nameValidator
          ),
          {
            xtype: "textfield",
            name: "desc",
            fieldLabel: "Description",
            tooltip: "A description of this provider",
            allowBlank: false,
          },
        ],
        add: {
          process: function (form, values) {
            return amfutil.processTypes("providers", form, values);
          },
        },
        update: {
          load: function (form, record) {
            form.down("#type").setValue(record.type);
          },
          process: (form, values) => {
            return amfutil.processTypes("providers", form, values);
          },
        },
      };

      config.fields = config.fields.concat(
        amfutil.typeFields(config, "providers")
      );

      return config;
    },
    fields: () => ({
      object: "Field",
      overwrite: true,

      window: { height: 600, width: 400 },
      title: "Metadata Fields",
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      columns: [
        { text: "Field", dataIndex: "field", flex: 1, type: "text" },
        { text: "Description", dataIndex: "desc", flex: 1, type: "text" },
      ],
      fields: [
        amfutil.text("Field", "field"),
        amfutil.text("Description", "desc"),
      ],
    }),
    rules: () => ({
      object: "Rule",
      overwrite: true,

      window: { height: 600, width: 800 },
      options: ["delete"],
      title: "Routing Rules",
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("rules"),
            displayField: "name",
            valueField: "name",
          },
        },
        { text: "Description", dataIndex: "desc", flex: 1, type: "text" },

        {
          text: "Output Topic",
          dataIndex: "output",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("rules"),
            displayField: "output",
            valueField: "output",
          },
        },
      ],
      fields: [
        amfutil.duplicateVal(
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Name",
            allowBlank: false,
            tooltip: "A name for this rule",
          },
          function (cmp, value) {
            return {
              services: amfutil.duplicateIdCheck({ name: value }, cmp),
            };
          },
          "Rule Already Exists",
          amfutil.nameValidator
        ),
        {
          xtype: "textfield",
          name: "desc",
          fieldLabel: "Description",
          tooltip: "A description of this rule",
          allowBlank: false,
        },
        amfutil.dynamicCreate(
          amfutil.combo(
            "Output Topic",
            "output",
            amfutil.createCollectionStore("topics"),
            "topic",
            "topic",
            {
              tooltip:
                "The topic to route the message if it matches all match patterns.",
            }
          ),
          "topics"
        ),
        {
          xtype: "matchpatterns",
          name: "patterns",
        },
      ],
      add: {
        process: function (form, values) {
          console.log(values);
          values.patterns = amfutil.formatMatchPatterns(values.patterns);
          return values;
        },
      },

      update: {
        process: function (form, values) {
          console.log(values);
          values.patterns = amfutil.formatMatchPatterns(values.patterns);
          return values;
        },
      },
      transform: function (record) {
        return record;
      },
    }),
    endpoints: () => ({
      object: "Endpoint",
      overwrite: true,
      window: { height: 600, width: 800 },
      options: ["delete"],
      title: "API Endpoints",
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("rules"),
            displayField: "name",
            valueField: "name",
          },
        },
        { text: "Description", dataIndex: "desc", flex: 1, type: "text" },
        { text: "Method", dataIndex: "method", flex: 1, type: "text" },
        { text: "Path", dataIndex: "path", flex: 1, type: "text" },
        amfutil.buttonColumn("Action", "action", "actions"),
      ],
      fields: [
        amfutil.duplicateVal(
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Name",
            allowBlank: false,
            tooltip: "A name for this rule",
          },
          function (cmp, value) {
            return {
              services: amfutil.duplicateIdCheck({ name: value }, cmp),
            };
          },
          "Rule Already Exists",
          amfutil.nameValidator
        ),
        {
          xtype: "textfield",
          name: "desc",
          fieldLabel: "Description",
          tooltip: "A description of this rule",
          allowBlank: false,
        },
        amfutil.localCombo(
          "Method",
          "method",
          [
            { label: "GET", field: "get" },
            { label: "POST", field: "post" },
            { label: "PUT", field: "put" },
            { label: "DELETE", field: "delete" },
            { label: "MATCH", field: "match" },
          ],
          "field",
          "label",
          {
            tooltip: "The HTTP Method for the endpoint.",
            allowBlank: false,
            forceSelection: true,
          }
        ),
        amfutil.text("Path", "path", {
          value: "/",
          regex: /^\/(?!.*\/$)/,
          regexText: `Route must begin with leading slash ("/") and not ending with trailing slash.`,
        }),
        {
          xtype: "numberfield",
          value: 15000,
          name: "timeout",
          allowBlank: false,
          fieldLabel: "Async Timeout",
        },
        amfutil.dynamicCreate(
          amfutil.combo(
            "Script Action",
            "action",
            amfutil.createCollectionStore("actions", {
              type: "runscript",
            }),
            "_id",
            "name",
            {
              tooltip: "The file name of the Python file/module to run.",
            }
          ),
          "actions"
        ),
      ],
    }),
    jobs: () => {
      var config = {
        overwrite: true,

        title: "Jobs",
        object: "Job",
        window: {
          width: 600,
        },
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
          "export",
        ],
        options: ["active", "delete"],
        columns: [
          {
            text: "Job Name",
            dataIndex: "name",
            flex: 1,
            value: "true",
            type: "combo",
            searchOpts: {
              store: amfutil.createCollectionStore("jobs"),
              displayField: "name",
              valueField: "name",
            },
          },
          {
            text: "Type",
            dataIndex: "type",
            width: 125,
          },
          {
            text: "Topic",
            dataIndex: "topic",
            flex: 1,
          },
        ],
        types: {
          timer: {
            field: "timer",
            label: "Timer",
            fields: [
              {
                xtype: "fieldcontainer",

                tooltip: "The frequency at which to execute this job.",
                layout: {
                  type: "hbox",
                },
                fieldLabel: "Every",
                items: [
                  {
                    flex: 1,
                    xtype: "combobox",
                    itemId: "value",

                    name: "value",
                    forceSelection: true,
                    allowBlank: false,
                  },
                  {
                    xtype: "combobox",
                    flex: 1,
                    allowBlank: false,

                    store: ["Hours", "Minutes", "Seconds"],
                    allowBlank: false,
                    name: "unit",
                    itemId: "unit",

                    listeners: {
                      afterrender: function (scope) {
                        var val = scope.getValue();
                        var timer = scope.up("form").down("#value");
                        console.log(timer);
                        var num;
                        var store = [];

                        if (val == "Hours") {
                          num = 24;
                        } else {
                          num = 60;
                        }
                        for (var i = 1; i <= num - 1; i++) {
                          if (num % i == 0) {
                            store.push(i.toString());
                          }
                        }

                        timer.setStore(store);
                        console.log(store);
                      },
                      change: function (scope, val) {
                        var timer = scope.up("form").down("#value");
                        var num;
                        var store = [];

                        if (val == "Hours") {
                          num = 24;
                        } else {
                          num = 60;
                        }
                        for (var i = 1; i <= num - 1; i++) {
                          if (num % i == 0) {
                            store.push(i.toString());
                          }
                        }

                        timer.setStore(store);
                        console.log(store);
                      },
                    },
                  },
                ],
              },
            ],
          },
          daily: {
            field: "daily",
            label: "Daily",
            fields: [
              {
                xtype: "timefield",
                fieldLabel: "Time",
                tooltip: "The time to execute the job",
                format: "H:i",
                allowBlank: false,
                name: "time",
                listeners: {
                  change: function (scope, val) {
                    console.log(val);
                  },
                },
              },
              {
                xtype: "checkbox",
                fieldLabel: "Every Day",
                tooltip: "Whether to execute this job everyday",
                name: "daily",
                itemId: "daily",
                inputValue: true,
                allowBlank: false,

                uncheckedValue: false,

                value: true,
                listeners: {
                  afterrender: function (scope) {
                    var val = scope.getValue();
                    scope.up("form").down("#weekdays").setDisabled(val);
                  },
                  change: function (scope, val) {
                    scope.up("form").down("#weekdays").setDisabled(val);
                  },
                },
              },
              {
                xtype: "tagfield",

                itemId: "weekdays",
                tooltip: "The specific days to execute this job",
                name: "weekdays",
                allowBlank: false,

                fieldLabel: "Select Days",
                names: "days",
                store: [
                  {
                    label: "Sunday",
                    field: 0,
                  },
                  {
                    label: "Monday",
                    field: 1,
                  },
                  {
                    label: "Tuesday",
                    field: 2,
                  },
                  {
                    label: "Wednesday",
                    field: 3,
                  },
                  {
                    label: "Thursday",
                    field: 4,
                  },
                  {
                    label: "Friday",
                    field: 5,
                  },
                  {
                    label: "Saturday",
                    field: 6,
                  },
                ],
                displayField: "label",
                valueField: "field",
                queryMode: "local",
                filterPickList: true,
                listeners: {
                  change: function (scope, val) {
                    console.log(val);
                  },
                },
              },
            ],
          },
          days: {
            field: "days",
            label: "Days",
            fields: [
              {
                xtype: "timefield",
                fieldLabel: "Time",
                tooltip: "The time to execute the job",
                format: "H:i",
                allowBlank: false,
                name: "time",
                listeners: {
                  change: function (scope, val) {
                    console.log(val);
                  },
                },
              },
              {
                name: "days",
                allowBlank: false,
                tooltip: "The days of the month on which to execute this job",
                xtype: "tagfield",
                store: Array.from({ length: 31 }, (x, i) => (i + 1).toString()),
                fieldLabel: "Days of the Month",
              },
            ],
          },
        },
        fields: [
          amfutil.duplicateVal(
            {
              xtype: "textfield",
              name: "name",
              fieldLabel: "Job Name",
              tooltip: "A name for the scheduled job",
              allowBlank: false,
            },
            function (cmp, value) {
              return {
                scheduler: amfutil.duplicateIdCheck({ name: value }, cmp),
              };
            },
            "Job Name Already Exists",
            amfutil.nameValidator
          ),
          {
            xtype: "checkbox",
            name: "active",
            fieldLabel: "Active",
            inputValue: true,
            uncheckedValue: false,
            checked: true,
            tooltip: "Whether this job is currently active.",
          },

          amfutil.dynamicCreate(
            amfutil.combo(
              "Topic",
              "topic",
              amfutil.createCollectionStore("topics"),
              "topic",
              "topic",
              {
                tooltip:
                  "The topic to send a message to when this job is triggered.",
              }
            ),
            "topics"
          ),
          {
            xtype: "arrayfield",
            name: "meta",
            title: "Additional Metadata",
            arrayfield: "Metadata",
            tooltip: "Any additional metadata to send along with the message",
            arrayfields: [
              amfutil.combo("Field", "field", "metadata", "field", "desc", {
                labelWidth: 50,
              }),
              {
                xtype: "textfield",

                name: "value",
                fieldLabel: "Value",
                labelWidth: 50,
              },
            ],
          },
        ],
        update: {
          process: function (form, values) {
            console.log(values);
            metadata = JSON.parse(values.meta).reduce((acc, meta) => {
              acc[meta.field] = meta.value;
              return acc;
            }, {});
            console.log(metadata);
            values.meta = metadata;
            return values;
          },
        },
        transform: function (record) {
          record.meta = Object.entries(record.meta).map((meta) => {
            var obj = { field: meta[0], value: meta[1] };
            return obj;
          });
          return record;
        },
        add: {
          process: function (form, values) {
            console.log(values);
            values.meta = JSON.parse(values.meta).reduce((acc, meta) => {
              acc[meta.field] = meta.value;
              return acc;
            }, {});
            console.log(values);
            return values;
          },
        },
      };
      config.fields = config.fields.concat(amfutil.typeFields(config, "jobs"));
      return config;
    },
    // system_managers: () => {
    //   return {
    //     title: "System Managers",
    //     object: "System Manager",
    //     window: {
    //       width: 600,
    //     },
    //     actionIcons: [
    //       "addnewbtn",
    //       "searchpanelbtn",
    //       "clearfilter",
    //       "refreshbtn",
    //       "export",
    //     ],
    //     options: ["downloadsysman", "delete"],
    //     fields: [
    //       amfutil.text("Name", "name"),
    //       amfutil.text("Description", "desc"),
    //       amfutil.text("Host/IP", "host"),
    //       amfutil.combo(
    //         "Action Map",
    //         "action_map",
    //         amfutil.createCollectionStore("action_maps"),
    //         "_id",
    //         "name"
    //       ),
    //     ],
    //     columns: [
    //       {
    //         text: "Status",
    //         width: 140,
    //         resizable: false,
    //         xtype: "socketcolumn",
    //         config: function (data, widget) {
    //           return {
    //             event: "manager",
    //             payload: { host: data.host },
    //             cond: function () {
    //               var page =
    //                 Ext.util.History.getToken().split("/")[0] ==
    //                 "system_managers";
    //               var visible = widget
    //                 .up("grid")
    //                 .getStore()
    //                 .findRecord("_id", data["_id"]);

    //               if (!visible) {
    //                 widget.destroy();
    //               }

    //               return page && visible;
    //             },
    //             callback: function (widget, payload) {
    //               var handler = async function () {
    //                 var win = new Ext.window.Window({
    //                   width: window.innerWidth * 0.8,
    //                   height: window.innerHeight * 0.8,
    //                   title: "System Manager: " + data.name,
    //                   modal: true,
    //                   layout: {
    //                     type: "hbox",
    //                   },
    //                 });
    //                 win.show();
    //                 win.setLoading(true);
    //                 var map = await amfutil.getById(
    //                   "action_maps",
    //                   data["action_map"]
    //                 );
    //                 win.insert(0, [
    //                   {
    //                     xtype: "grid",
    //                     title: "Actions",
    //                     store: map["mapping"],
    //                     columns: [
    //                       {
    //                         text: "Name",
    //                         dataIndex: "name",
    //                         flex: 1,
    //                       },
    //                       {
    //                         text: "Type",
    //                         dataIndex: "type",
    //                         flex: 1,
    //                       },
    //                       {
    //                         text: "Script",
    //                         dataIndex: "script",
    //                         flex: 1,
    //                       },
    //                       {
    //                         text: "Script Type",
    //                         dataIndex: "stype",
    //                         flex: 1,
    //                       },
    //                     ],
    //                     flex: 1,
    //                   },
    //                   {
    //                     xtype: "panel",
    //                     title: "Metrics",
    //                     flex: 1,
    //                   },
    //                 ]);
    //                 win.setLoading(false);
    //               };
    //               widget.removeAll();
    //               widget.insert({
    //                 xtype: "container",

    //                 cls: "widgetbutton",
    //                 layout: { type: "hbox", align: "stretch" },
    //                 defaults: {
    //                   padding: 7.5,
    //                 },
    //                 listeners: {
    //                   render: function (scope) {
    //                     scope.getEl().on("click", handler);
    //                   },
    //                 },
    //                 items: [
    //                   {
    //                     xtype: "container",
    //                     layout: "center",
    //                     items: [
    //                       {
    //                         xtype: "component",
    //                         html: `<div class="led ${
    //                           payload ? "green" : "red"
    //                         }"></div>`,
    //                       },
    //                     ],
    //                   },

    //                   {
    //                     xtype: "component",
    //                     html: "Console",
    //                   },
    //                   {
    //                     xtype: "component",
    //                     cls: `x-fa fa-dashboard`,
    //                   },
    //                 ],
    //               });
    //             },
    //           };
    //         },
    //       },
    //       {
    //         text: "Name",
    //         dataIndex: "name",
    //         flex: 1,
    //         value: "true",
    //         type: "combo",
    //         searchOpts: {
    //           store: amfutil.createCollectionStore("system_managers"),
    //           displayField: "name",
    //           valueField: "name",
    //         },
    //       },
    //       {
    //         text: "Description",
    //         dataIndex: "desc",
    //         flex: 1,
    //       },
    //       {
    //         text: "Host/IP",
    //         dataIndex: "host",
    //         flex: 1,
    //       },
    //     ],
    //     subgrids: {
    //       heartbeat: {
    //         title: "Metrics",
    //         actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
    //         grid: true,
    //         crud: false,
    //         import: false,

    //         store: async function (filters = {}) {
    //           var pieces = Ext.util.History.getToken().split("/");
    //           var item = pieces.slice(0, 2).join("/");
    //           var record = await amfutil.getCurrentItem(item);
    //           console.log(record);
    //           return amfutil.createCollectionStore(
    //             "manager_heartbeat",
    //             Object.assign(filters, {
    //               _id: record.id,
    //             }),

    //             {
    //               sorters: [
    //                 {
    //                   property: "etime",
    //                   direction: "DESC",
    //                 },
    //               ],
    //             }
    //           );
    //         },
    //         columns: [
    //           {
    //             text: "Event Time",
    //             dataIndex: "etime",
    //             flex: 2,
    //             type: "date",
    //             renderer: amfutil.dateRenderer,
    //           },
    //           {
    //             text: "Memory Usage",
    //             flex: 1,
    //             renderer: function (val, meta, record) {
    //               var data = record.data;
    //               var mem = data.metrics.system_mem;
    //               var pct = (
    //                 ((mem.total_memory - mem.free_memory) / mem.total_memory) *
    //                 100
    //               ).toFixed(2);
    //               return pct + "%";
    //             },
    //           },

    //           {
    //             text: "CPU Avg 1 Min",
    //             flex: 1,
    //             renderer: function (val, meta, record) {
    //               var data = record.data;
    //               var metrics = data.metrics;
    //               var count = Object.keys(metrics["cpu_per_core"]).length;
    //               console.log(count);
    //               var pct = (metrics["cpu_avg1"] / 256 / count).toFixed(2);
    //               return pct;
    //             },
    //           },
    //           {
    //             text: "CPU Avg 5 Min",
    //             flex: 1,
    //             renderer: function (val, meta, record) {
    //               var data = record.data;
    //               var metrics = data.metrics;
    //               var count = Object.keys(metrics["cpu_per_core"]).length;
    //               console.log(count);
    //               var pct = (metrics["cpu_avg5"] / 256 / count).toFixed(2);
    //               return pct;
    //             },
    //           },
    //           {
    //             text: "CPU Avg 15 Min",
    //             flex: 1,
    //             renderer: function (val, meta, record) {
    //               var data = record.data;
    //               var metrics = data.metrics;
    //               var count = Object.keys(metrics["cpu_per_core"]).length;
    //               console.log(count);
    //               var pct = (metrics["cpu_avg15"] / 256 / count).toFixed(2);
    //               return pct;
    //             },
    //           },
    //         ],
    //       },
    //     },
    //   };
    // },
    // action_maps: () => {
    //   return {
    //     title: "Action Maps",
    //     object: "Action Map",
    //     window: {
    //       width: 600,
    //     },
    //     actionIcons: [
    //       "addnewbtn",
    //       "searchpanelbtn",
    //       "clearfilter",
    //       "refreshbtn",
    //       "export",
    //     ],
    //     options: [
    //       // "download_manager",
    //       "delete",
    //     ],
    //     fields: [
    //       amfutil.text("Name", "name"),
    //       amfutil.text("Description", "desc"),
    //       {
    //         xtype: "arrayfield",
    //         title: "Mapping",
    //         name: "mapping",
    //         fieldTitle: "Mapping",
    //         arrayfields: [
    //           amfutil.text("Name", "name"),
    //           amfutil.localCombo(
    //             "Type",
    //             "type",
    //             [
    //               { val: "heartbeat", disp: "Heartbeat" },
    //               { val: "action", disp: "Action" },
    //             ],
    //             "val",
    //             "disp"
    //           ),
    //           amfutil.text("Script", "script"),
    //           amfutil.localCombo(
    //             "Script Type",
    //             "stype",
    //             [
    //               { val: "elixir", disp: "Elixir" },
    //               { val: "shell", disp: "Shell" },
    //             ],
    //             "val",
    //             "disp"
    //           ),
    //         ],
    //       },
    //     ],
    //     columns: [
    //       {
    //         text: "Name",
    //         dataIndex: "name",
    //         flex: 1,
    //         value: "true",
    //         type: "combo",
    //         searchOpts: {
    //           store: amfutil.createCollectionStore("system_managers"),
    //           displayField: "name",
    //           valueField: "name",
    //         },
    //       },
    //       {
    //         text: "Description",
    //         dataIndex: "desc",
    //         flex: 1,
    //       },
    //     ],
    //     add: {
    //       process: function (form, values) {
    //         values.mapping = JSON.parse(values.mapping);
    //         return values;
    //       },
    //     },
    //     update: {
    //       process: function (form, values) {
    //         values.mapping = JSON.parse(values.mapping);
    //         return values;
    //       },
    //     },
    //   };
    // },
    // messages: () => ({
    //   title: "Messages",
    //   // filter: { parent: { $exists: false } },
    //   actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
    //   sort: {
    //     etime: "DESC",
    //   },
    //   columns: [
    //     { text: "Message ID", dataIndex: "msgid", flex: 1, type: "text" },
    //     {
    //       text: "Action",
    //       dataIndex: "action",
    //       flex: 1,
    //       value: "true",
    //       type: "text",
    //     },
    //     {
    //       text: "Parent",
    //       dataIndex: "parent",
    //       flex: 1,
    //       value: "true",
    //       type: "text",
    //     },
    //     {
    //       text: "File Name",
    //       dataIndex: "fname",
    //       flex: 1,
    //       value: "true",
    //       type: "text",
    //     },
    //     {
    //       text: "File Size",
    //       dataIndex: "fsize",
    //       flex: 1,
    //       type: "fileSize",
    //     },
    //     {
    //       text: "Event Time",
    //       dataIndex: "etime",
    //       flex: 1,
    //       type: "date",
    //       renderer: function (val) {
    //         var date = new Date(val);
    //         return date.toString();
    //       },
    //     },
    //     {
    //       text: "Status",
    //       dataIndex: "status",
    //       flex: 1,
    //       type: "combo",
    //       options: [
    //         {
    //           field: "received",
    //           label: "Received",
    //         },
    //         {
    //           field: "routed",
    //           label: "Routed",
    //         },
    //       ],
    //     },
    //   ],
    //   options: [],
    // }),
    message_events: () => ({
      title: "Message Events",
      // filter: { parent: { $exists: false } },
      actionIcons: [
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "reprocess",
        "reroute",
        "skip",
      ],
      sort: {
        etime: "DESC",
      },
      columns: [
        {
          text: "Message ID",
          hidden: true,
          dataIndex: "msgid",
          flex: 1,
          type: "text",
        },
        {
          text: "Action",
          dataIndex: "action",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "User",
          dataIndex: "user",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          hidden: true,
          text: "Parent",
          dataIndex: "parent",
          xtype: "widgetcolumn",
          flex: 1,
          value: "true",
          widget: {
            xtype: "button",
          },
          onWidgetAttach: function (col, widget, rec) {
            var scope = this;
            if (rec.data.parent == "" || !rec.data.parent) {
              widget.setDisabled(true);
              widget.setText("New Message");
            } else {
              widget.setDisabled(false);

              widget.setHandler(async function () {
                var rows = await amfutil.getCollectionData("message_events", {
                  msgid: rec.data.parent,
                  status: "received",
                });
                msg = rows[0];
                scope
                  .up("app-main")
                  .getController()
                  .redirectTo(`message_events/${msg["_id"]}`);
                return false;
              });
            }
          },
          type: "text",
        },
        {
          text: "Message Name",
          dataIndex: "fname",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "Message Size",
          dataIndex: "fsize",
          flex: 1,
          type: "fileSize",
          renderer: amfutil.renderFileSize,
        },
        {
          text: "Event Time",
          dataIndex: "etime",
          flex: 1,
          type: "date",
          renderer: amfutil.dateRenderer,
        },
        {
          text: "Topic",
          dataIndex: "topic",
          flex: 1,
          type: "text",
        },
        {
          text: "Status",
          dataIndex: "status",
          flex: 1,
          type: "combo",
          options: [
            {
              field: "started",
              label: "Started",
            },
            {
              field: "completed",
              label: "Completed",
            },
            {
              field: "received",
              label: "Received",
            },
            {
              field: "failed",
              label: "Failed",
            },
          ],
        },
      ],
      options: ["reprocess", "reroute", "skip"],
    }),
    sessions: () => ({
      title: "Sessions",
      dblclick: async function (record) {
        var resp = await amfutil.ajaxRequest({
          url: `api/message_events/session/${record.msgid}`,
          params: { sid: record.sid },
          method: "GET",
        });

        var msg = Ext.decode(resp.responseText);
        amfutil.redirect(`message_events/${msg._id}`);
      },
      // filter: { parent: { $exists: false } },
      actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
      sort: {
        start: "DESC",
      },
      columns: [
        {
          text: "Message ID",
          hidden: true,
          dataIndex: "msgid",
          flex: 1,
          type: "text",
        },
        {
          text: "Session ID",
          dataIndex: "sid",
          flex: 1,
        },
        {
          text: "Service",
          dataIndex: "service",
          flex: 1,
        },
        {
          text: "Start Time",
          dataIndex: "start",
          type: "date",
          flex: 1,
          renderer: amfutil.dateRenderer,
        },
        {
          text: "End Time",
          dataIndex: "end",
          type: "date",

          flex: 1,
          renderer: function (val) {
            if (val) {
              return amfutil.dateRenderer(val);
            } else {
              return "Ongoing or Failed";
            }
          },
        },
        {
          text: "Status Time",
          dataIndex: "stime",
          type: "date",

          flex: 1,
          renderer: function (val) {
            if (val) {
              return amfutil.dateRenderer(val);
            } else {
              return "Ongoing or Failed";
            }
          },
        },
        {
          text: "Status",
          dataIndex: "status",
          flex: 1,
        },
      ],
      options: ["terminate"],
    }),
    groups: () => ({
      title: "Groups",
      object: "Group",
      overwrite: true,
      window: {
        width: 600,
        height: 600,
      },
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("groups"),
            displayField: "name",
            valueField: "name",
          },
        },
        {
          text: "Phone Number",
          dataIndex: "phone",
          flex: 1,
          type: "text",
        },
        { text: "Email", dataIndex: "email", flex: 1, type: "text" },
      ],
      fields: [
        amfutil.duplicateVal(
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Name",
            tooltip: "The Name of the Group",
            allowBlank: false,
          },
          function (cmp, value) {
            return {
              groups: amfutil.duplicateIdCheck({ name: value }, cmp),
            };
          },
          "Customer Name Already Exists",
          amfutil.nameValidator
        ),
        {
          xtype: "textfield",
          name: "phone",
          fieldLabel: "Phone Number",
          tooltip:
            "The Phone Number of the primary point of contact of the Group",
          vtype: "phone",
        },
        {
          xtype: "textfield",
          name: "email",
          fieldLabel: "Email",
          tooltip: "The Email of the primary point of contact of the Group",
          vtype: "email",
        },
        // {
        //   xtype: "collectionlist",
        //   name: "providers",
        //   collection: "providers",
        //   filter: { type: "auth" },
        // },
        // amfutil.checkbox("Active", "active", true, {
        //   tooltip: "Whether this customer is active.",
        // }),
      ],

      // subgrids: {
      //   users: {
      //     title: "Users",
      //     object: "User",
      //     grid: true,
      //     // audit: true,
      //     // crud: true,
      //     // import: true,
      //     actionIcons: ["refreshbtn"],
      //     store: async function () {
      //       var path = Ext.util.History.getToken()
      //         .split("/")
      //         .slice(0, 2)
      //         .join("/");
      //       console.log(path);
      //       var record = await amfutil.getCurrentItem(path);
      //       return amfutil.createCollectionStore("users", {
      //         group: record["_id"],
      //       });
      //     },
      //     fields: [
      //       amfutil.text("Name", "name"),
      //       amfutil.text("Description", "desc"),
      //     ],
      //     columns: [
      //       {
      //         text: "Username",
      //         flex: 1,
      //         dataIndex: "username",
      //       },
      //       {
      //         text: "First Name",
      //         flex: 1,
      //         dataIndex: "firstname",
      //       },
      //       {
      //         text: "Last Name",
      //         flex: 1,
      //         dataIndex: "lastname",
      //       },
      //       amfutil.onboardingColumn(),
      //     ],
      //   },
      // },

      // add: {
      //   process: function (form, values) {
      //     values.providers = JSON.parse(values.providers);
      //     return values;
      //   },
      // },
      // update: {
      //   process: function (form, values) {
      //     values.providers = JSON.parse(values.providers);
      //     return values;
      //   },
      // },

      options: ["delete"],
    }),
    users: () => ({
      title: "Users",
      object: "User",
      displayField: "username",
      overwrite: false,
      sort: {
        username: "ASC",
      },
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      columns: [
        {
          text: "Group",
          dataIndex: "group",
          xtype: "widgetcolumn",
          flex: 1,
          value: "true",
          widget: {
            xtype: "button",
          },
          onWidgetAttach: async function (col, widget, rec) {
            var scope = this;
            var store = amfutil.createCollectionStore("groups");
            var group;
            if (store.isLoaded) {
              console.log(store);
              group = store.findRecord("_id", rec.data.group);
              if (group != -1) {
                console.log(group);
                widget.setText(group.data.name);
              }
            } else {
              store.on("load", async function () {
                group = store.findRecord("_id", rec.data.group);
                if (group != -1) {
                  console.log(group);
                  widget.setText(group.data.name);
                } else {
                  group = await amfutil.getById("groups", rec.data.group);
                  console.log(group);
                  widget.setText(group.name);
                }
              });
            }

            widget.setHandler(async function () {
              scope
                .up("app-main")
                .getController()
                .redirectTo(`groups/${rec.data.group}`);
              return false;
            });
          },

          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("groups"),
            displayField: "name",
            valueField: "_id",
          },
        },
        {
          text: "User Name",
          dataIndex: "username",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("users"),
            displayField: "username",
            valueField: "username",
          },
        },

        { text: "First Name", dataIndex: "firstname", flex: 1, type: "text" },
        { text: "Last Name", dataIndex: "lastname", flex: 1, type: "text" },
        { text: "Email", dataIndex: "email", flex: 1, type: "text" },
        {
          text: "Phone Number",
          dataIndex: "phone",
          flex: 1,
          type: "text",
        },
        // amfutil.onboardingColumn(),
      ],
      options: ["approve", "delete", "reset"],
      fields: [
        amfutil.dynamicCreate(
          amfutil.combo(
            "Group",
            "group",
            amfutil.createCollectionStore("groups", {}, { autoLoad: true }),
            "_id",
            "name",
            {
              tooltip: "The Group this user belongs to.",
            }
          ),
          "groups"
        ),
        amfutil.duplicateVal(
          amfutil.text("Username", "username", {
            tooltip: "The username of this user.",
          }),
          function (cmp, value, oldValue, eOpts) {
            return {
              users: amfutil.duplicateIdCheck({ username: value }, cmp),
            };
          },
          "Username Already Exists",
          amfutil.nameValidator
        ),

        amfutil.duplicateVal(
          amfutil.text("Email", "email", {
            tooltip: "The Email of the user.",
            inputType: "email",
            vtype: "email",
            allowBlank: false,
          }),
          function (cmp, value, oldValue, eOpts) {
            return {
              users: amfutil.duplicateIdCheck({ email: value }, cmp),
            };
          },
          "Email Already Exists"
        ),
        amfutil.text("First Name", "firstname", {
          tooltip: "The First Name of the user.",
          allowBlank: true,
        }),
        amfutil.text("Last Name", "lastname", {
          tooltip: "The Last Name of the user.",
          allowBlank: true,
        }),
        amfutil.text("Phone", "phone", {
          tooltip: "The phone number of the user.",
          inputType: "phone",
          vtype: "phone",
          allowBlank: true,
        }),

        amfutil.check("Approved", "approved", {
          tooltip: "Whether the user is approved",
          value: true,
        }),
      ],
      add: {
        process: function (form, values) {
          // values.profiles = [];
          values.rules = [];
          values.tokens = [];
          values.mailboxes = [];
          values.ufa = {
            stime: new Date().toISOString(),
            debug: true,
            logfile: "",
            hinterval: 30,
            cinterval: 30,
            max: 100,
          };
          return values;
        },
      },
      update: {
        readOnly: ["username"],
      },
      subgrids: {
        // profiles: {
        //   grid: true,
        //   title: "Action Profiles",
        //   object: "Action Profile",
        //   actionIcons: [
        //     "addnewbtn",
        //     "searchpanelbtn",
        //     "clearfilter",
        //     "refreshbtn",
        //   ],
        //   fields: [
        //     {
        //       xtype: "textfield",
        //       name: "name",
        //       fieldLabel: "Name",
        //       allowBlank: false,
        //       listeners: {
        //         afterrender: function (cmp) {
        //           cmp.inputEl.set({
        //             autocomplete: "nope",
        //           });
        //         },
        //       },
        //       width: 400,
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "desc",
        //       fieldLabel: "Description",
        //       allowBlank: false,
        //       listeners: {
        //         afterrender: function (cmp) {
        //           cmp.inputEl.set({
        //             autocomplete: "nope",
        //           });
        //         },
        //       },
        //       width: 400,
        //     },
        //     amfutil.dynamicCreate(
        //       amfutil.combo(
        //         "Action",
        //         "action",
        //         amfutil.createCollectionStore(
        //           "actions",
        //           {},
        //           { autoLoad: true }
        //         ),
        //         "_id",
        //         "name"
        //       ),
        //       "actions"
        //     ),
        //   ],

        //   columns: [
        //     {
        //       text: "Name",
        //       dataIndex: "field",
        //       type: "text",
        //       flex: 1,
        //     },
        //     {
        //       text: "Description",
        //       dataIndex: "description",
        //       type: "text",
        //       flex: 3,
        //     },
        //     {
        //       text: "Action",
        //       dataIndex: "description",
        //       type: "text",
        //       flex: 1,
        //     },
        //   ],
        //   options: ["delete"],
        // },

        // oprofiles: {
        //   grid: true,
        //   title: "Onboarding Profiles",
        //   object: "Onboarding Profile",
        //   window: {
        //     width: 650,
        //     height: 650,
        //     defaults: {
        //       labelWidth: 250,
        //     },
        //   },
        //   actionIcons: [
        //     "addnewbtn",
        //     "searchpanelbtn",
        //     "clearfilter",
        //     "refreshbtn",
        //   ],
        //   types: {
        //     // cd: {
        //     //   type: "cd",
        //     //   name: "Connect:Direct",
        //     //   fields: [
        //     //     amfutil.combo(
        //     //       "Connect:Direct Provider",
        //     //       "provider",
        //     //       amfutil.createCollectionStore("providers", { type: "cd" }),
        //     //       "_id",
        //     //       "name"
        //     //     ),
        //     //     amfutil.localCombo("Operating System", "os", [
        //     //       "Windows",
        //     //       "OS/390",
        //     //       "OS/400",
        //     //       "UNIX",
        //     //     ]),
        //     //     amfutil.check("Use Secure Point of Entry", "use_spoe"),
        //     //     amfutil.text("Node Name", "nodename"),
        //     //     amfutil.text("Host Name/IP", "host"),
        //     //     amfutil.text("Port", "port"),
        //     //     {
        //     //       xtype: "arrayfield",
        //     //       name: "alternatehosts",
        //     //       title: "Alternate Hosts",
        //     //       arrayfield: "Host",
        //     //       arrayfields: [
        //     //         {
        //     //           xtype: "textfield",
        //     //           name: "host",
        //     //           fieldLabel: "Host",
        //     //           vtype: "ipandhostname",
        //     //         },
        //     //         {
        //     //           xtype: "numberfield",
        //     //           name: "port",
        //     //           fieldLabel: "Port",
        //     //           minValue: 1,
        //     //         },
        //     //       ],
        //     //     },
        //     //     amfutil.check("Use Secure Plus", "use_secure_plus", {
        //     //       listeners: amfutil.renderListeners(function (scope, val) {
        //     //         console.log(val);
        //     //         var sp = amfutil.getElementByID("secure_plus");
        //     //         sp.setHidden(!val);
        //     //         sp.setDisabled(!val);
        //     //       }),
        //     //     }),
        //     //     amfutil.renderContainer("secure_plus", [
        //     //       amfutil.combo("Cert", "cert", null, "_id", "name", {
        //     //         listeners: {
        //     //           beforerender: function (scope) {
        //     //             var entity = scope.up("form").entity;
        //     //             console.log(entity);
        //     //             scope.setStore(
        //     //               amfutil.createCollectionStore("keys", {
        //     //                 user: entity.username,
        //     //               })
        //     //             );
        //     //           },
        //     //         },
        //     //       }),
        //     //       amfutil.text("Common Name", "commonname"),
        //     //       amfutil.localCombo(
        //     //         "TLS Version",
        //     //         "tls_version",
        //     //         ["TLSv1", "TLSv1.1", "TLSv1.2"],
        //     //         null,
        //     //         null,
        //     //         {
        //     //           listeners: amfutil.renderListeners(function (scope, val) {
        //     //             if (val) {
        //     //               var cp = amfutil.getElementByID("ciphers");
        //     //               var ciphers = {
        //     //                 TLSv1: ["CIPHER1"],
        //     //                 "TLSv1.1": ["CIPHER1.1"],
        //     //                 "TLSv1.2": ["CIPHER1.2"],
        //     //               };
        //     //               cp.setStore(ciphers[val]);
        //     //             }
        //     //           }),
        //     //         }
        //     //       ),
        //     //       amfutil.localCombo("Ciphers", "ciphers", [], null, null, {
        //     //         itemId: "ciphers",
        //     //       }),
        //     //     ]),
        //     //   ],
        //     // },
        //   },
        //   fields: [
        //     amfutil.duplicateVal(
        //       {
        //         xtype: "textfield",
        //         name: "name",
        //         fieldLabel: "Profile Name",
        //       },
        //       function (cmp, value) {
        //         var form = cmp.up("form");
        //         return {
        //           users: { "oprofiles.name": value, _id: form.entity._id },
        //         };
        //       },
        //       "Onboarding Profile Already Exists",
        //       amfutil.nameValidator
        //     ),
        //     amfutil.check("Active", "active", {
        //       value: true,
        //     }),
        //     amfutil.check("Local", "local"),
        //     {
        //       name: "type",
        //       fieldLabel: "Profile Type",
        //       xtype: "combobox",
        //       store: [
        //         {
        //           field: "cd",
        //           label: "Connect:Direct",
        //         },
        //       ],
        //       displayField: "label",
        //       valueField: "field",
        //       allowBlank: false,
        //       listeners: {
        //         change: async function (combo, val, eOpts) {
        //           var formfields = this.up().down("#typeparms");
        //           formfields.removeAll();

        //           formfields.insert(
        //             0,
        //             amfutil.scanFields(
        //               ampsgrids.grids["users"]().subgrids["oprofiles"].types[
        //                 val
        //               ].fields
        //             )
        //           );
        //         },
        //       },
        //     },

        //     {
        //       xtype: "container",
        //       itemId: "typeparms",
        //       layout: {
        //         type: "vbox",
        //         align: "stretch",
        //       },
        //       defaults: {
        //         labelWidth: 175,
        //       },
        //     },

        //     /*{
        //         xtype: "textfield",
        //         name: "foldername",
        //         itemId: "fname",
        //         hidden: true,
        //         fieldLabel: "Folder Name",
        //         //value:record.fname
        //       },*/
        //   ],

        //   columns: [
        //     {
        //       text: "Name",
        //       dataIndex: "field",
        //       type: "text",
        //       flex: 1,
        //     },
        //     {
        //       text: "Description",
        //       dataIndex: "description",
        //       type: "text",
        //       flex: 3,
        //     },
        //     {
        //       text: "Type",
        //       dataIndex: "type",
        //       type: "text",
        //       flex: 1,
        //     },
        //   ],
        //   options: ["delete"],
        // },

        mailboxes: {
          title: "Mailboxes",
          object: "Mailbox",
          grid: true,
          audit: true,
          crud: true,
          import: true,
          options: ["delete"],
          actionIcons: [
            "addnewbtn",
            "searchpanelbtn",
            "clearfilter",
            "refreshbtn",
            "export",
          ],
          fields: [
            amfutil.text("Name", "name"),
            amfutil.text("Description", "desc"),
          ],
          columns: [
            {
              text: "Name",
              dataIndex: "name",
              type: "text",
              flex: 1,
            },
            {
              text: "Description",
              dataIndex: "desc",
              type: "text",
              flex: 1,
            },
          ],
        },

        ufa: {
          title: "UFA Config",
          object: "Config",
          grid: false,
          audit: false,
          update: {
            process: function (form, values) {
              values.stime = new Date().toISOString();
              return values;
            },
          },
          fields: [
            {
              xtype: "displayfield",
              name: "stime",
              fieldLabel: "Config Updated",
            },
            amfutil.check("Debug", "debug"),
            amfutil.text("Log File", "logfile", {
              allowBlank: true,
              value: "",
            }),
            {
              xtype: "numberfield",
              name: "hinterval",
              value: "30",
              fieldLabel: "Heartbeat Interval",
              minValue: 0,
            },
            {
              xtype: "numberfield",
              name: "cinterval",
              value: "30",
              fieldLabel: "Config Interval",
              minValue: 0,
            },
            {
              xtype: "numberfield",
              name: "max",
              value: "100",
              fieldLabel: "Max Jobs",
              minValue: 0,
            },
          ],
        },
        rules: {
          grid: true,
          crud: true,
          import: true,

          title: "UFA Agent Rules",
          window: { width: 600, height: 600 },
          object: "Agent Rule",
          actionIcons: [
            "addnewbtn",
            "searchpanelbtn",
            "clearfilter",
            "refreshbtn",
            "export",
          ],
          types: {
            upload: {
              type: "upload",
              name: "Upload",
              fields: [
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
                // {
                //   xtype: "textfield",
                //   name: "fretry",
                //   fieldLabel: "Failure Retry Wait",
                //   maskRe: /[0-9]/,
                //   vtypeText: "Please enter a valid Failure Retry Wait",
                //   itemId: "fretry",
                //   value: "5",
                // },
                {
                  xtype: "checkboxfield",
                  name: "regex",
                  itemId: "regex",
                  fieldLabel: "Regex Flag",
                  uncheckedValue: false,
                  inputValue: true,
                  allowBlank: false,
                  forceSelection: true,
                },
                {
                  xtype: "textfield",
                  itemId: "fmatch",
                  name: "fmatch",
                  fieldLabel: "File Match Pattern",
                  value: "./uploads/*",
                },
                {
                  // Fieldset in Column 1 - collapsible via toggle button
                  xtype: "parmfield",
                  title: "File Metadata",
                  types: ["string"],
                  name: "fmeta",
                },
                {
                  xtype: "numberfield",
                  name: "subs_count",
                  minValue: 1,
                  maxValue: 20,
                  value: 5,
                  fieldLabel: "Subscriber Count",
                  tooltip:
                    "Number of concurrent processes fetching messages when rule is triggered",
                  allowBlank: false,
                },
                {
                  xtype: "radiogroup",
                  fieldLabel: "Acknowledgment Mode",
                  itemId: "ackmode",
                  allowBlank: false,
                  name: "ackmode",
                  columns: 3,
                  width: 400,
                  items: [
                    {
                      boxLabel: "None",
                      inputValue: "none",
                      name: "ackmode",
                      // checked: true,
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
              ],
            },
            download: {
              type: "download",
              name: "Download",
              fields: [
                {
                  xtype: "textfield",
                  name: "fpoll",
                  itemId: "fpoll",
                  maskRe: /[0-9]/,
                  fieldLabel: "File Polling Interval(Sec)",
                  allowBlank: false,
                  value: "300",
                },
                {
                  xtype: "numberfield",
                  name: "subs_count",
                  minValue: 1,
                  maxValue: 20,
                  value: 5,
                  fieldLabel: "Subscriber Count",
                  tooltip:
                    "Number of concurrent processes fetching messages when rule is triggered",
                  allowBlank: false,
                },
                // {
                //   xtype: "textfield",
                //   name: "bretry",
                //   itemId: "bretry",
                //   maskRe: /[0-9]/,
                //   fieldLabel: "Get Failure Retry Wait",
                //   value: "5",
                // },
                amfutil.consumerConfig(function (topichandler) {
                  return [
                    amfutil.combo("Mailbox", "mailbox", null, "name", "name", {
                      listeners: {
                        beforerender: function (scope) {
                          var form = scope.up("form");
                          var item = form.entity;
                          this.setStore(
                            amfutil.createFieldStore(
                              "users",
                              item["_id"],
                              "mailboxes"
                            )
                          );
                        },
                        change: function (scope, val) {
                          var form = scope.up("form");
                          var item = form.entity;
                          if (val) {
                            var topic = scope
                              .up("fieldcontainer")
                              .down("#topic");
                            topic.setValue(
                              `amps.mailbox.${item["username"]}.${val}`
                            );
                          }
                        },
                      },
                    }),
                    amfutil.text("Mailbox Topic", "topic", {
                      readOnly: true,
                      itemId: "topic",
                      listeners: {
                        change: topichandler,
                      },
                    }),
                  ];
                }, "The user mailbox topic from which to consume files"),
                {
                  xtype: "textfield",
                  name: "folder",
                  itemId: "folder",
                  fieldLabel: "Download Path",
                  value: "./downloads",
                  allowBlank: false,
                  tooltip: "The path to store the file",
                },
                {
                  xtype: "numberfield",
                  // maxValue: 200,
                  minValue: 1,
                  value: 20,
                  allowBlank: false,
                  name: "max",
                  fieldLabel: "Max Files",
                  tooltip: "The max number of files to fetch.",
                },
                // {
                //   xtype: "radiogroup",
                //   fieldLabel: "Acknowledgment Mode",
                //   itemId: "ackmode",
                //   allowBlank: false,
                //   name: "ackmode",
                //   columns: 3,
                //   width: 400,
                //   items: [
                //     {
                //       boxLabel: "None",
                //       inputValue: "none",
                //       name: "ackmode",
                //       // checked: true,
                //     },
                //     {
                //       boxLabel: "Archive",
                //       name: "ackmode",
                //       inputValue: "archive",
                //     },
                //     {
                //       boxLabel: "Delete",
                //       name: "ackmode",
                //       inputValue: "delete",
                //     },
                //   ],
                //   /*listeners: {
                //         change: function (obj) {
                //           if (obj.value == "move:tofolder") {
                //             fname = amfutil.getElementByID("get_fname");
                //             fname.setHidden(false);
                //             fname.setValue("");
                //           } else {
                //             fname = amfutil.getElementByID("get_fname");
                //             fname.setHidden(true);
                //           }
                //         },
                //       },*/
                // },
              ],
            },
          },
          fields: [
            amfutil.duplicateVal(
              {
                xtype: "textfield",
                name: "name",
                fieldLabel: "Rule Name",
              },
              function (cmp, value) {
                var form = cmp.up("form");
                return { users: { "rules.name": value, _id: form.entity._id } };
              },
              "Agent Rule Already Exists",
              amfutil.nameValidator
            ),
            {
              name: "type",
              fieldLabel: "Rule Type",
              xtype: "combobox",
              store: [
                {
                  field: "upload",
                  label: "Upload",
                },
                {
                  field: "download",
                  label: "Download",
                },
              ],
              displayField: "label",
              valueField: "field",
              allowBlank: false,
              listeners: {
                change: async function (combo, val, eOpts) {
                  var formfields = this.up().down("#typeparms");
                  formfields.removeAll();

                  formfields.insert(
                    0,
                    amfutil.scanFields(
                      ampsgrids.grids["users"]().subgrids["rules"].types[val]
                        .fields
                    )
                  );
                  console.log(val);
                },
              },
            },
            amfutil.check("Active", "active", {
              value: true,
            }),
            {
              xtype: "container",
              itemId: "typeparms",
              layout: {
                type: "vbox",
                align: "stretch",
              },
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
          add: {
            process: function (form, values) {
              console.log(values);
              values.subs_count = values.subs_count.toString();
              if (values.fmeta) {
                values.fmeta = JSON.stringify(
                  amfutil.formatArrayField(values.fmeta)
                );
              }
              console.log(values);
              return values;
            },
          },
          update: {
            process: function (form, values) {
              values.subs_count = values.subs_count.toString();

              console.log(values);
              if (values.fmeta) {
                values.fmeta = JSON.stringify(
                  amfutil.formatArrayField(values.fmeta)
                );
              }
              return values;
            },
            readOnly: ["name"],
          },
          transform: function (record) {
            console.log(record);
            if (record.fmeta) {
              try {
                record.fmeta = JSON.parse(record.fmeta);
              } catch (e) {}
            }
            return record;
          },

          columns: [
            {
              text: "Name",
              dataIndex: "name",
              type: "text",
              flex: 1,
            },
            {
              text: "Rule Type",
              dataIndex: "type",
              type: "combo",
              options: [
                { field: "upload", label: "Upload" },
                { field: "download", label: "Download" },
              ],
              flex: 1,
            },
            {
              text: "Poll",
              dataIndex: "fpoll",
              type: "text",
              flex: 1,
            },
            {
              text: "Acknowledgement",
              dataIndex: "ackmode",
              type: "text",
              flex: 1,
            },
          ],
          options: ["active", "delete"],
        },
        logs: {
          title: "UFA Logs",
          actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
          grid: true,
          crud: false,
          import: false,

          store: async function (filters = {}) {
            var record = await amfutil.getCurrentItem(
              Ext.util.History.getToken().replace(/(\/logs$)/, "")
            );
            console.log(record);
            return amfutil.createCollectionStore(
              "ufa_logs",
              Object.assign(filters, {
                user: record.username,
              }),

              {
                sorters: [
                  {
                    property: "etime",
                    direction: "DESC",
                  },
                ],
              }
            );
          },
          columns: [
            {
              text: "Event Time",
              dataIndex: "etime",
              flex: 1,
              type: "date",
              renderer: amfutil.dateRenderer,
            },
            {
              text: "Operation",
              dataIndex: "operation",
              flex: 1,
              value: "true",
              type: "text",
            },
            {
              text: "Rule",
              dataIndex: "rule",
              flex: 1,
              value: "true",
              type: "text",
            },
            {
              text: "Message ID",
              dataIndex: "msgid",
              flex: 1,
              value: "true",
              type: "text",
            },
            {
              text: "File Name",
              dataIndex: "fname",
              flex: 1,
              type: "text",
            },
            {
              text: "Status",
              dataIndex: "status",
              flex: 1,
              type: "combo",
              options: [
                {
                  field: "started",
                  label: "Started",
                },
                {
                  field: "completed",
                  label: "Completed",
                },
                {
                  field: "received",
                  label: "Received",
                },
              ],
            },
          ],
        },
        tokens: {
          title: "Auth Tokens",
          actionIcons: ["addnewbtn", "refreshbtn"],
          options: ["getsecret", "delete"],
          object: "Token",
          grid: true,
          crud: true,
          import: false,
          columns: [
            {
              text: "ID",
              dataIndex: "id",
              flex: 1,
              value: "true",
              type: "text",
            },
            {
              text: "Nickname",
              dataIndex: "name",
              flex: 1,
              type: "text",
            },
          ],
          fields: [
            amfutil.duplicateVal(
              {
                xtype: "textfield",
                name: "name",
                fieldLabel: "Name",
                tooltip: "Unique Token Name",
              },
              function (cmp, value, oldValue, eOpts) {
                return {
                  tokens: amfutil.duplicateIdCheck({ name: value }, cmp),
                };
              },
              "Token Already Exists",
              amfutil.nameValidator
            ),
          ],
        },
      },
    }),
    actions: () => {
      var config = {
        title: "Actions",
        overwrite: true,

        window: { height: 600, width: 800 },
        types: Object.assign(
          {
            aws: {
              field: "aws",
              label: "AWS Util",
              fields: [
                amfutil.localCombo(
                  "Action",
                  "action",
                  [
                    {
                      field: "parse_bucket_event",
                      label: "Parse S3 Event",
                    },
                  ],
                  "field",
                  "label"
                ),
                amfutil.outputTopic(),
              ],
            },
            batch: {
              field: "batch",
              label: "Batch",
              fields: [
                amfutil.combo(
                  "Input Type",
                  "inputtype",
                  [
                    { f: "topic", l: "Data Topic" },
                    { f: "mailbox", l: "Mailbox" },
                  ],
                  "f",
                  "l",
                  {
                    listeners: amfutil.renderListeners(function render(
                      scope,
                      val
                    ) {
                      var conts = ["topic", "mailbox"];
                      conts.forEach((con) => {
                        var c = amfutil.getElementByID(con);
                        c.setDisabled(con != val);
                        c.setHidden(con != val);
                      });
                    }),
                    tooltip:
                      "From what source to fetch the files to batch. Can be either a data topic or a mailbox.",
                  }
                ),
                {
                  xtype: "fieldset",
                  title: "Topic",

                  itemId: "topic",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  disabled: true,
                  hidden: true,
                  items: [
                    amfutil.dynamicCreate(
                      amfutil.combo(
                        "Input Topic",
                        "input",
                        amfutil.createCollectionStore("topics", {
                          type: "data",
                        }),
                        "topic",
                        "topic",
                        {
                          tooltip: "The data topic from which to batch files.",
                        }
                      ),
                      "topics"
                    ),
                    amfutil.combo(
                      "Deliver Policy",
                      "policy",
                      [
                        { field: "all", label: "All" },
                        { field: "new", label: "New" },
                        { field: "last", label: "Last" },
                        { field: "by_start_time", label: "Start Time" },
                      ],
                      "field",
                      "label",
                      {
                        listeners: amfutil.renderListeners(function (
                          scope,
                          val
                        ) {
                          var conts = ["by_start_time"];

                          conts.forEach((cont) => {
                            console.log(cont);
                            var c = scope.up("fieldset").down("#" + cont);
                            console.log(c);
                            c.setHidden(val != cont);
                            c.setDisabled(val != cont);
                          });
                        }),
                      },
                      amfutil.infoBlock(
                        'When batching via a topic, messages are consumed according to this policy. "All" specifies that all files be consumed starting from the earliest. "New" specifies that all messages after the creation or update of this action be consumed. "Last" specifies that all messages be consumed starting with the most recent. "Start Time" specifies that all messages be consumed starting from the specified start time.'
                      )
                    ),
                    {
                      xtype: "fieldcontainer",
                      itemId: "by_start_time",

                      items: [
                        {
                          xtype: "datetime",
                          name: "start_time",
                          fieldLabel: "Start Time",
                          allowBlank: false,
                          tooltip:
                            'The start time for the "Start Time" deliver policy',
                        },
                      ],
                    },
                  ],
                },
                {
                  xtype: "fieldset",
                  title: "Mailbox",
                  itemId: "mailbox",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  disabled: true,
                  hidden: true,
                  items: [
                    amfutil.dynamicCreate(
                      amfutil.combo(
                        "Mailbox",
                        "mailbox",
                        amfutil.createCollectionStore("users"),
                        "username",
                        "username",
                        {
                          tooltip: "The mailbox from which to batch files.",
                        }
                      ),
                      "topics"
                    ),
                    {
                      xtype: "numberfield",
                      name: "from_time",
                      fieldLabel: "Send From (Seconds)",
                      tooltip:
                        "The period from which to batch messages specified in seconds prior to action execution. (i.e. to batch all mailbox messages from the previous day, one should do atleast 86400 seconds (24 hours)",
                    },
                  ],
                },

                amfutil.outputTopic(),
                amfutil.formatFileName(),
                {
                  xtype: "textfield",
                  name: "delimiter",
                  fieldLabel: "Delimiter",
                  allowBlank: false,
                  tooltip: "The delimiter to use when batching messages.",
                },
              ],
            },
            http: {
              field: "http",
              label: "Webservice Call",
              fields: [
                amfutil.infoBlock(
                  "For the url, you can either specify the url directly, or provided a tokenized string that will be used to generate the url and query params. (i.e. https://api.site.com/{refno}?user={user})"
                ),
                {
                  xtype: "textfield",
                  name: "url",
                  fieldLabel: "URL",
                  allowBlank: false,
                  tooltip: "The URL for the request.",
                },
                amfutil.localCombo(
                  "Method",
                  "method",
                  [
                    {
                      field: "get",
                      label: "GET",
                    },
                    {
                      field: "post",
                      label: "POST",
                    },
                    {
                      field: "put",
                      label: "PUT",
                    },
                    {
                      field: "delete",
                      label: "DELETE",
                    },
                  ],
                  "field",
                  "label",
                  {
                    listeners: amfutil.renderListeners(function (scope, val) {
                      var out = scope.up("form").down("#output");
                      var outparms = scope.up("form").down("#output_parms");

                      var hide = val == "delete" || val == undefined;
                      out.setHidden(hide);
                      out.setDisabled(hide);
                      if (hide) {
                        outparms.setHidden(hide);
                        outparms.setDisabled(hide);
                        amfutil.getElementByID("send_output").setValue(false);
                        outparms.items.each(function (f) {
                          if (Ext.isFunction(f.reset)) {
                            f.reset();
                          }
                        });
                      }
                    }),
                    tooltip: "The HTTP Method for the request.",
                  }
                ),
                amfutil.renderContainer("output", [
                  amfutil.check("Send Output", "send_output", {
                    itemId: "send_output",
                    listeners: amfutil.renderListeners(function (scope, val) {
                      var out = scope.up("form").down("#output_parms");
                      out.setHidden(!val);
                      out.setDisabled(!val);
                    }),
                  }),
                ]),
                amfutil.renderContainer("output_parms", [
                  amfutil.outputTopic(),
                  amfutil.check("Store Headers as Metadata", "store_headers"),
                  amfutil.formatFileName(),
                ]),
                {
                  // Fieldset in Column 1 - collapsible via toggle button
                  xtype: "arrayfield",
                  title: "Headers",
                  name: "headers",
                  fieldTitle: "header",
                  tooltip: `The HTTP Headers to set for the request`,

                  arrayfields: [
                    {
                      xtype: "textfield",
                      name: "field",
                      fieldLabel: "Header",
                    },
                    {
                      xtype: "textfield",
                      name: "value",
                      fieldLabel: "Field",
                    },
                  ],
                },

                // {
                //   xtype: "checkbox",
                //   uncheckedValue: false,
                //   inputValue: true,
                //   name: "oauth",
                //   fieldLabel: "OAuth",
                //   listeners: amfutil.renderListeners(function (scope, val) {
                //     var field = scope.up("form").down("#oauth");
                //     console.log(field);
                //     field.setHidden(!val);
                //     field.setDisabled(!val);
                //   }),
                //   tooltip: "Whether to fetch OAuth Credentials",
                // },
                // {
                //   xtype: "fieldcontainer",
                //   itemId: "oauth",
                //   layout: {
                //     type: "vbox",
                //     align: "stretch",
                //   },
                //   items: [
                //     {
                //       xtype: "textfield",
                //       name: "oauthurl",
                //       itemId: "oathurl",
                //       fieldLabel: "OAuth URL",

                //       tooltip: "URL to request OAuth Credentials",
                //     },
                //     {
                //       xtype: "textfield",
                //       name: "oauthuser",
                //       itemId: "oauthuser",

                //       fieldLabel: "OAuth User",

                //       tooltip: "OAuth Username",
                //     },
                //     {
                //       xtype: "textfield",
                //       name: "oauthpassword",
                //       itemId: "oauthpassword",
                //       tooltip: "OAuth Password",

                //       fieldLabel: "OAuth Password",
                //     },
                //   ],
                // },
              ],
              process: function (form, values) {
                values.headers = JSON.parse(values.headers);

                return values;
              },
            },
            // kafkaput: {
            //   field: "kafkaput",
            //   label: "Kafka PUT",
            //   fields: [
            //     amfutil.dynamicCreate(
            //       amfutil.combo(
            //         "Kafka Provider",
            //         "provider",
            //         amfutil.createCollectionStore("providers", {
            //           type: "kafka",
            //         }),
            //         "_id",
            //         "name",
            //         {
            //           tooltip:
            //             "The configured provider with broker and authenticiation configuration.",
            //         }
            //       ),
            //       "providers"
            //     ),
            //     {
            //       xtype: "textfield",
            //       fieldLabel: "Topic",
            //       name: "topic",
            //       allowBlank: false,
            //       tooltip:
            //         "The Kafka topic to which the message should be delivered",
            //     },

            //     // {
            //     //   xtype: "numberfield",
            //     //   fieldLabel: "Partition",
            //     //   name: "partition",
            //     // },
            //   ],
            // },
            ldap: {
              field: "ldap",
              label: "LDAP",
              fields: [
                amfutil.dynamicCreate(
                  amfutil.combo(
                    "Provider",
                    "provider",
                    amfutil.createCollectionStore("providers", {
                      type: "ldap",
                    }),
                    "_id",
                    "name"
                  ),
                  "providers"
                ),
                {
                  xtype: "numberfield",
                  name: "timeout",
                  fieldLabel: "Timeout",
                  value: 1500,
                  allowBlank: false,
                },

                amfutil.text("Base DN", "base"),
                amfutil.localCombo(
                  "Scope",
                  "scope",
                  [
                    { field: "wholeSubtree", label: "Whole Subtree" },
                    { field: "singleLevel", label: "Single Level" },
                    { field: "baseObject", label: "Base Object" },
                  ],
                  "field",
                  "label"
                ),
                amfutil.infoBlock(
                  "A size limit of 0 reflects no limit (unlimited) size."
                ),
                {
                  xtype: "numberfield",
                  name: "sizeLimit",
                  fieldLabel: "Size Limit",
                  allowBlank: false,
                  value: 0,
                },
                {
                  xtype: "filterfield",
                  name: "filter",
                  title: "Filters",
                },
                {
                  xtype: "arrayfield",
                  name: "attributes",
                  fieldLabel: "Attributes",
                  title: "Attributes",
                  fieldTitle: "Attribute",
                  arrayfields: [amfutil.text("Attribute", "attribute")],
                },
                amfutil.outputTopic(),
              ],
              process: function (form, values) {
                values.filter = JSON.parse(values.filter);
                values.attributes = JSON.parse(values.attributes).map(
                  (att) => att.attribute
                );
                return values;
              },
            },
            mailbox: {
              field: "mailbox",
              label: "Mailbox",
              fields: [
                amfutil.dynamicCreate(
                  amfutil.combo(
                    "Recipient",
                    "recipient",
                    amfutil.createCollectionStore(
                      "users",
                      {},
                      { autoLoad: true }
                    ),
                    "username",
                    "username",
                    {
                      tooltip: "The user to deliver the message to",
                      listeners: amfutil.renderListeners(async function (
                        scope,
                        val
                      ) {
                        if (val) {
                          var user = scope.getSelectedRecord().data;
                          var mb = amfutil.getElementByID("mailbox");
                          mb.setStore({
                            type: "chained",
                            source: amfutil.createFieldStore(
                              "users",
                              user["_id"],
                              "mailboxes"
                            ),
                          });
                          mb.setDisabled(false);
                        }
                      }),
                    }
                  ),
                  "users"
                ),
                amfutil.dynamicRefresh(
                  amfutil.combo("Mailbox", "mailbox", null, "name", "name", {
                    tooltip: "The mailbox to deliver the message to",
                    itemId: "mailbox",
                    forceSelection: false,
                    disabled: true,
                  })
                ),

                amfutil.check("Overwrite Duplicates", "overwrite"),

                amfutil.formatFileName(),
              ],
            },
            pgpdecrypt: {
              field: "pgpdecrypt",
              label: "PGP Decrypt",
              fields: [
                amfutil.loadKey("Decrypt Key", "key", {
                  tooltip: "The private decryption key.",
                }),
                {
                  xtype: "textfield",
                  inputType: "password",
                  allowBlank: false,
                  name: "passphrase",
                  fieldLabel: "Decryption Key Passphrase",
                  tooltip: "Passphrase for Decryption Key",
                },
                {
                  xtype: "checkbox",
                  fieldLabel: "Verify Signature",
                  name: "verify",
                  uncheckedValue: false,
                  inputValue: true,
                  allowBlank: false,
                  tooltip: "Whether or not to verify the file signature.",
                },
                amfutil.loadKey("Partner Signing Key", "signing_key", {
                  tooltip: "The key to use when verifying the signature.",
                }),
                amfutil.formatFileName(),
                amfutil.outputTopic(),
              ],
            },
            pgpencrypt: {
              field: "pgpencrypt",
              label: "PGP Encrypt",
              fields: [
                amfutil.loadKey("Encryption Key", "key", {
                  tooltip: "The recipient public encryption key.",
                }),
                {
                  xtype: "checkbox",
                  fieldLabel: "Compress",
                  name: "compress",
                  uncheckedValue: false,
                  inputValue: true,
                  allowBlank: false,
                  tooltip:
                    "A flag indicating whether or not to compress the file.",
                },
                {
                  xtype: "checkbox",
                  fieldLabel: "Armor",
                  name: "armor",
                  uncheckedValue: false,
                  inputValue: true,
                  allowBlank: false,
                  tooltip:
                    "A flag indicating whether or not to ASCII Armor the file.",
                },
                amfutil.loadKey("Signing Key", "signing_key", {
                  tooltip: "The signing key.",
                }),
                {
                  xtype: "textfield",
                  name: "passphrase",
                  inputType: "password",
                  allowBlank: false,
                  fieldLabel: "Signing Key Passphrase",
                  tooltip: "The passphrase for the signing key.",
                },
                amfutil.formatFileName(),

                amfutil.outputTopic(),
              ],
            },
            router: {
              field: "router",
              label: "Router",
              fields: [
                amfutil.infoBlock(
                  "The Router Action consists of a series of rules. Each rule consists of an output topic and any number of match patterns. A match pattern consists of a metadata field and either a regex or glob pattern to match. A message that matches on all the match patterns will subsequently be routed to the specified topic."
                ),
                {
                  xtype: "checkbox",
                  uncheckedValue: false,
                  inputValue: true,
                  fieldLabel: "Parse EDI",
                  name: "parse_edi",
                  allowBlank: false,
                  tooltip:
                    "Parse additional metadata from EDI documents passing through this router.",
                },
                {
                  xtype: "rulelist",
                  name: "rules",
                },
              ],
              process: function (form, values) {
                values.rules = JSON.parse(values.rules);
                return values;
              },
            },
            // generic: {
            //   field: "generic",
            //   label: "Generic",
            //   fields: [
            //     {
            //       // Fieldset in Column 1 - collapsible via toggle button
            //       xtype: "parmfield",
            //       title: "Parameters",
            //       name: "parms",
            //     },
            //   ],
            //   load: function (form, record) {
            //     //   console.log(record.parms);
            //     //   var parms = Object.entries(record.parms).map((entry) => {
            //     //     return { field: entry[0], value: entry[1] };
            //     //   });
            //     //   parms.forEach(function (p) {
            //     //     var dcon = form.down("#parms");
            //     //     var length = dcon.items.length;
            //     //     if (typeof p.value === "boolean") {
            //     //       var d = Ext.create("Amps.form.Parm.Bool");
            //     //       d.down("#field").setValue(p.field);
            //     //       d.down("#value").setValue(p.value);
            //     //       dcon.insert(length - 1, d);
            //     //     } else {
            //     //       var d = Ext.create("Amps.form.Parm.String");
            //     //       d.down("#field").setValue(p.field);
            //     //       d.down("#value").setValue(p.value);
            //     //       dcon.insert(length - 1, d);
            //     //     }
            //     //   });
            //   },
            //   process: function (form, values) {
            //     console.log(values);
            //     values.parms = amfutil.formatArrayField(values.parms);
            //     delete values.field;
            //     delete values.value;
            //     return values;
            //   },
            // },
            runscript: {
              field: "runscript",
              label: "Run Lambda",
              fields: [
                amfutil.combo(
                  "Lambda Type",
                  "script_type",
                  [
                    { field: "python", label: "Python" },
                    // { field: "elixir", label: "Elixir" },
                  ],
                  "field",
                  "label",
                  {
                    tooltip: "The language your script is written in.",
                    queryMode: "local",
                  }
                ),
                amfutil.combo(
                  "Lambda Name",
                  "module",
                  amfutil.scriptStore(),
                  "name",
                  "name",
                  {
                    tooltip:
                      "The file name of the Python file/module to run. Exclude the file extension .py",
                  }
                ),
                amfutil.check("Send Output", "send_output", {
                  listeners: amfutil.renderListeners(function (scope, val) {
                    var out = scope.up("form").down("#output_parms");
                    out.setHidden(!val);
                    out.setDisabled(!val);
                  }),
                }),
                amfutil.renderContainer("output_parms", [
                  amfutil.outputTopic(),
                  amfutil.formatFileName(),
                ]),
                amfutil.check("Use Provider", "use_provider", {
                  listeners: amfutil.renderListeners(function (scope, val) {
                    var out = scope.up("form").down("#provider_parms");
                    out.setHidden(!val);
                    out.setDisabled(!val);
                  }),
                }),
                amfutil.renderContainer("provider_parms", [
                  amfutil.combo(
                    "Provider",
                    "provider",
                    amfutil.createCollectionStore("providers"),
                    "_id",
                    "name"
                  ),
                ]),
                {
                  // Fieldset in Column 1 - collapsible via toggle button
                  xtype: "parmfield",
                  title: "Extra Parameters",
                  name: "parms",
                  tooltip:
                    "Additional Parameters to pass to your python module",
                },
              ],
              process: function (form, values) {
                console.log(values);
                values.parms = amfutil.formatArrayField(values.parms);
                delete values.field;
                delete values.value;
                console.log(values);
                return values;
              },
            },
            sharepoint: {
              field: "sharepoint",
              label: "Sharepoint",
              fields: [
                amfutil.dynamicCreate(
                  amfutil.combo(
                    "Sharepoint Provider",
                    "provider",
                    amfutil.createCollectionStore("providers", {
                      type: "sharepoint",
                    }),
                    "_id",
                    "name",
                    {
                      tooltip: "The configured Sharepoint Provider to use.",
                    }
                  ),
                  "providers"
                ),
                amfutil.localCombo(
                  "Operation",
                  "operation",
                  [
                    {
                      field: "download",
                      label: "Download",
                    },
                    {
                      field: "upload",
                      label: "Upload",
                    },
                  ],
                  "field",
                  "label",
                  {
                    listeners: amfutil.renderListeners(function (scope, val) {
                      var conts = ["download", "upload"];
                      conts.forEach((cont) => {
                        var component = scope.up("form").down("#" + cont);
                        component.setHidden(cont != val);
                        component.setDisabled(cont != val);
                      });
                    }),
                    tooltip:
                      "Whether to perform a download or upload operation on sharepoint.",
                  }
                ),
                {
                  xtype: "textfield",
                  name: "host",
                  fieldLabel: "Host",
                  tooltip: "The root host for the sharepoint site",
                  allowBlank: false,
                  vtype: "ipandhostname",
                },
                {
                  xtype: "textfield",
                  name: "sitepath",
                  fieldLabel: "Site Path",
                  allowBlank: false,
                  tooltip:
                    "Relative path to the desired site. For example, Test.768@sharepoint.com/sites/test.",
                },
                {
                  xtype: "fieldset",
                  itemId: "download",
                  hidden: true,
                  disabled: true,
                  title: "Download",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  maxWidth: 600,
                  items: [
                    {
                      xtype: "textfield",
                      name: "path",
                      tooltip: "Path to the folder to scan.",
                      allowBlank: false,
                      fieldLabel: "Folder Path",
                      labelWidth: 200,
                    },
                    {
                      xtype: "checkbox",
                      name: "regex",
                      fieldLabel: "Regex",
                      allowBlank: false,
                      labelWidth: 200,

                      tooltip: "Whether to use regex when matching.",
                    },
                    {
                      xtype: "textfield",
                      itemId: "matchpattern",
                      tooltip: "The file path pattern.",
                      labelWidth: 200,

                      allowBlank: false,

                      name: "pattern",
                      fieldLabel: "File Match Pattern",
                    },
                    amfutil.check("Scan Subdirectories", "scan", {
                      labelWidth: 200,
                    }),
                    {
                      xtype: "radiogroup",
                      fieldLabel: "Acknowledgment Mode",
                      itemId: "ackmode",
                      allowBlank: false,
                      name: "ackmode",
                      columns: 3,
                      labelWidth: 200,

                      width: 400,
                      items: [
                        {
                          boxLabel: "None",
                          inputValue: "none",
                          name: "ackmode",
                          // checked: true,
                        },
                        // {
                        //   boxLabel: "Archive",
                        //   name: "ackmode",
                        //   inputValue: "archive",
                        // },
                        {
                          boxLabel: "Delete",
                          name: "ackmode",
                          inputValue: "delete",
                        },
                      ],
                      tooltip:
                        "How to acknowledge a successful get of a file. Can either delete or do nothing.",
                    },
                    amfutil.outputTopic(),
                  ],
                },
                {
                  xtype: "fieldset",
                  itemId: "upload",
                  maxWidth: 600,

                  title: "PUT",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  hidden: true,
                  disabled: true,
                  items: [
                    {
                      xtype: "textfield",
                      name: "path",
                      fieldLabel: "Upload Path",
                      allowBlank: false,
                      tooltip: "The path to which to upload the message",
                    },
                  ],
                },
              ],
            },

            sftpput: {
              field: "sftpput",
              label: "SFTP PUT",
              fields: [
                {
                  xtype: "textfield",
                  name: "host",
                  fieldLabel: "Host",
                  allowBlank: false,
                  tooltip: "The SFTP Host",
                  vtype: "ipandhostname",
                },
                {
                  xtype: "numberfield",
                  name: "port",
                  fieldLabel: "Port",
                  tooltip: "The SFTP Port",
                  minValue: 1,
                  maxValue: 65535,
                },
                {
                  xtype: "textfield",
                  name: "folder",
                  fieldLabel: "Folder",
                  tooltip: "The Folder path to put the file",
                },
                amfutil.formatFileName(),
                {
                  xtype: "textfield",
                  name: "user",
                  allowBlank: false,
                  fieldLabel: "SFTP Username",
                  tooltip: "SFTP Username",
                },
                {
                  xtype: "textfield",
                  name: "password",
                  inputType: "password",
                  allowBlank: false,
                  fieldLabel: "SFTP Password",
                  tooltip: "SFTP Password",
                },
                // {
                //   xtype: "combobox",
                //   name: "account",
                //   fieldLabel: "Account",
                //   displayField: "username",
                //   valueField: "username",
                //   store: amfutil.createCollectionStore(
                //     "accounts",
                //     {},
                //     { autoLoad: true }
                //   ),
                // },
              ],
            },
            // sftpget: {
            //   field: "sftpget",
            //   label: "SFTP GET",
            //   fields: [
            //     {
            //       xtype: "textfield",
            //       name: "host",
            //       fieldLabel: "Host",
            //     },
            //     {
            //       xtype: "textfield",
            //       name: "port",
            //       fieldLabel: "Port",
            //     },
            //     {
            //       xtype: "textfield",
            //       name: "folder",
            //       fieldLabel: "Folder",
            //     },
            //     {
            //       xtype: "combobox",
            //       name: "account",
            //       fieldLabel: "Account",
            //       displayField: "username",
            //       valueField: "username",
            //       store: amfutil.getCollectionData("accounts"),
            //     },
            //     {
            //       xtype: "radiogroup",
            //       fieldLabel: "Acknowledgement Mode",
            //       itemId: "ackmode",
            //       allowBlank: false,
            //       columns: 3,
            //       width: 400,
            //       items: [
            //         {
            //           boxLabel: "Archive",
            //           name: "ackmode",
            //           inputValue: "archive",
            //         },
            //         {
            //           boxLabel: "Delete",
            //           name: "ackmode",
            //           inputValue: "delete",
            //           // checked: true,
            //         },
            //       ],
            //       listeners: {
            //         change: function (scope) {
            //           var form = scope.up("form");
            //           var archfolder = form.down("#archive-folder");
            //           var mode = scope.getValue().ackmode;
            //           if (mode == "archive") {
            //             archfolder.setHidden(false);
            //             archfolder.setDisabled(false);
            //           } else {
            //             archfolder.setHidden(true);
            //             archfolder.setDisabled(true);
            //           }
            //         },
            //       },
            //     },
            //     {
            //       xtype: "textfield",
            //       hidden: true,
            //       disabled: true,
            //       itemId: "archive-folder",
            //       fieldLabel: "Archive Folder",
            //       name: "archive_folder",
            //     },
            //     {
            //       xtype: "textfield",
            //       name: "file_match_pattern",
            //       fieldLabel: "File Match Pattern",
            //     },
            //   ],
            // },
            // smtp: {
            //   field: "smtp",
            //   label: "SMTP",
            //   fields: [
            //     {
            //       xtype: "textfield",
            //       name: "url",
            //       fieldLabel: "URL",
            //     },
            //     {
            //       xtype: "textfield",
            //       name: "account",
            //       fieldLabel: "Account",
            //     },
            //     {
            //       xtype: "textfield",
            //       name: "password",
            //       fieldLabel: "Password",
            //     },
            //   ],
            // },

            strrepl: {
              field: "strrepl",
              label: "String Replace",
              fields: [
                {
                  xtype: "textfield",
                  name: "from",
                  fieldLabel: "From",
                  allowBlank: false,
                  tooltip: "Text to search for and replace in document",
                },
                {
                  xtype: "textfield",
                  flex: 1,
                  name: "to",
                  fieldLabel: "To",
                  allowBlank: false,
                  tooltip: "Text to insert in document",
                },

                amfutil.outputTopic(),
              ],
            },
            // system_manager: {
            //   field: "system_manager",
            //   label: "System Manager Action",
            //   fields: [
            //     {
            //       xtype: "arrayfield",

            //       name: "actions",
            //       title: "Actions",
            //       arrayfields: [
            //         amfutil.combo(
            //           "Manager",
            //           "manager",
            //           amfutil.createCollectionStore("system_managers"),
            //           "_id",
            //           "name",
            //           {
            //             listeners: amfutil.renderListeners(async function (
            //               scope,
            //               val
            //             ) {
            //               if (val) {
            //                 var mgr = scope.getSelectedRecord();
            //                 if (mgr) {
            //                   var data = mgr.data;
            //                   console.log(mgr);
            //                   var map = await amfutil.getById(
            //                     "action_maps",
            //                     data["action_map"]
            //                   );
            //                   scope
            //                     .up("fieldcontainer")
            //                     .down("combo[name=action]")
            //                     .setStore(map["mapping"]);
            //                 }
            //               }
            //             }),
            //           }
            //         ),
            //         amfutil.localCombo("Action", "action", null, "name", "name"),
            //         {
            //           xtype: "arrayfield",
            //           row: true,
            //           name: "patterns",
            //           arrayfields: [
            //             amfutil.combo(
            //               "Field",
            //               "field",
            //               "metadata",
            //               "field",
            //               "desc",
            //               {
            //                 forceSelection: false,
            //               }
            //             ),
            //             amfutil.check("Regex", "regex"),
            //             amfutil.text("Pattern", "pattern"),
            //           ],
            //           title: "Match Patterns",
            //         },
            //       ],
            //     },
            //     amfutil.check("Send Output", "send_output", {
            //       itemId: "send_output",
            //       listeners: amfutil.renderListeners(function (scope, val) {
            //         var out = scope.up("form").down("#output_parms");
            //         out.setHidden(!val);
            //         out.setDisabled(!val);
            //       }),
            //     }),
            //     amfutil.renderContainer("output_parms", [amfutil.outputTopic()]),
            //   ],
            //   process: function (form, values) {
            //     values.actions = JSON.parse(values.actions);
            //     return values;
            //   },
            // },
            s3: {
              field: "s3",
              label: "S3",
              fields: [
                amfutil.dynamicCreate(
                  amfutil.combo(
                    "S3 Provider",
                    "provider",
                    amfutil.createCollectionStore("providers", {
                      type: "s3",
                    }),
                    "_id",
                    "name",
                    {
                      tooltip: "The configured S3 provider to use.",
                    }
                  ),
                  "providers"
                ),
                amfutil.localCombo(
                  "Operation",
                  "operation",
                  [
                    {
                      field: "put",
                      label: "PUT",
                    },
                    {
                      field: "get",
                      label: "GET",
                    },
                    {
                      field: "delete",
                      label: "DELETE",
                    },
                  ],
                  "field",
                  "label",
                  {
                    listeners: amfutil.renderListeners(function (scope, val) {
                      var conts = ["get", "put", "delete"];
                      conts.forEach((cont) => {
                        var component = scope.up("form").down("#" + cont);
                        component.setHidden(cont != val);
                        component.setDisabled(cont != val);
                      });
                    }),
                    tooltip: "The S3 operation to perform.",
                  }
                ),
                {
                  xtype: "fieldset",
                  itemId: "get",
                  hidden: true,
                  disabled: true,
                  title: "GET",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  defaults: {
                    labelWidth: 200,
                  },
                  maxWidth: 700,
                  items: [
                    amfutil.combo(
                      "GET Type",
                      "count",
                      [
                        { field: "many", label: "Many" },
                        { field: "one", label: "One" },
                      ],
                      "field",
                      "label",
                      {
                        listeners: amfutil.renderListeners(function (
                          scope,
                          val
                        ) {
                          var conts = ["many", "one"];
                          conts.forEach((cont) => {
                            var cmp = amfutil.getElementByID(cont);
                            cmp.setHidden(false);
                            cmp.setDisabled(false);
                          });
                          conts.forEach((cont) => {
                            var cmp = amfutil.getElementByID(cont);
                            cmp.setHidden(val != cont);
                            cmp.setDisabled(val != cont);
                          });
                        }),
                      }
                    ),

                    amfutil.renderContainer("one", [
                      {
                        xtype: "textfield",
                        name: "bucket",
                        fieldLabel: "Bucket",
                        allowBlank: false,
                        value: "{bucket}",
                        tooltip: "The S3 Bucket from which to get.",
                      },
                      {
                        xtype: "textfield",
                        name: "path",
                        fieldLabel: "Path",
                        allowBlank: false,
                        value: "{objkey}",
                        tooltip: "The S3 Path to fetch.",
                      },
                    ]),

                    amfutil.renderContainer("many", [
                      {
                        xtype: "textfield",
                        name: "bucket",
                        fieldLabel: "Bucket",
                        allowBlank: false,
                        tooltip: "The S3 Bucket from which to get.",
                      },
                      {
                        xtype: "textfield",
                        name: "prefix",
                        fieldLabel: "Prefix",
                        allowBlank: false,
                        tooltip: "The Bucket Prefix from which to get.",
                      },

                      {
                        xtype: "textfield",
                        itemId: "matchpattern",
                        name: "pattern",
                        fieldLabel: "File Match Pattern",
                        allowBlank: false,
                        tooltip:
                          "A match pattern to match against when getting files.",
                      },
                      {
                        xtype: "checkbox",
                        name: "regex",
                        fieldLabel: "Regex",
                        tooltip: "Whether to evaluate pattern using regex",
                      },
                    ]),
                    {
                      xtype: "radiogroup",
                      fieldLabel: "Acknowledgment",
                      itemId: "ackmode",
                      allowBlank: false,
                      labelWidth: 200,
                      name: "ackmode",
                      columns: 3,
                      width: 500,
                      items: [
                        {
                          boxLabel: "None",
                          inputValue: "none",
                          name: "ackmode",
                          // checked: true,
                        },
                        // {
                        //   boxLabel: "Archive",
                        //   name: "ackmode",
                        //   inputValue: "archive",
                        // },
                        {
                          boxLabel: "Delete",
                          name: "ackmode",
                          inputValue: "delete",
                        },
                      ],
                      tooltip:
                        "How to acknowledge a successful get of a file. Can either delete or do nothing.",
                    },
                    amfutil.formatFileName(),
                    amfutil.outputTopic(),
                  ],
                },
                {
                  xtype: "fieldset",
                  itemId: "put",
                  maxWidth: 600,

                  title: "PUT",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  hidden: true,
                  disabled: true,
                  items: [
                    {
                      xtype: "textfield",
                      name: "bucket",
                      fieldLabel: "Bucket",
                      allowBlank: false,
                      tooltip: "The bucket to which to put the message.",
                    },
                    {
                      xtype: "textfield",
                      name: "prefix",
                      fieldLabel: "Prefix",
                      allowBlank: false,
                      tooltip:
                        "The prefix on the bucket to which to put the message.",
                    },
                  ],
                },
                {
                  xtype: "fieldset",
                  itemId: "delete",
                  maxWidth: 600,

                  title: "DELETE",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  items: [
                    {
                      xtype: "textfield",
                      name: "bucket",
                      fieldLabel: "Bucket",
                      allowBlank: false,
                      tooltip: "The bucket to delete from.",
                    },
                    {
                      xtype: "textfield",
                      name: "prefix",
                      fieldLabel: "Prefix",
                      allowBlank: false,

                      tooltip: "The bucket prefix to delete from.",
                    },
                    {
                      xtype: "textfield",
                      fieldLabel: "Path Match Pattern",
                      name: "pattern",
                      allowBlank: false,

                      tooltip:
                        "The file path pattern to match when deciding whether to delete.",
                    },
                  ],
                  hidden: true,
                  disabled: true,
                },
              ],
            },

            unzip: {
              field: "unzip",
              label: "Unzip",
              fields: [
                {
                  xtype: "numberfield",
                  fieldLabel: "Max Files",
                  name: "maxfiles",
                  allowBlank: false,
                  tooltip: "The max number of files to unzip from a zip file.",
                  // Arrange radio buttons into two columns, distributed vertically
                },
                amfutil.outputTopic(),
              ],
            },
            zip: {
              field: "zip",
              label: "Zip",
              fields: [
                amfutil.formatFileName({
                  value: ".zip",
                  validator: function (val) {
                    return val.endsWith(".zip") || "Filename must end in .zip";
                  },
                }),
                amfutil.outputTopic(),
              ],
            },

            // change_delimiter: {
            //   field: "change_delimiter",
            //   label: "Change Delimeter",
            //   fields: [
            //     {
            //       fieldLabel: "Destination OS",
            //       xtype: "combobox",
            //       name: "os",
            //       valueField: "field",
            //       displayField: "label",
            //       store: [
            //         {
            //           field: "LF",
            //           label: "Linux",
            //         },
            //         {
            //           field: "CRLF",
            //           label: "Windows",
            //         },
            //       ],
            //       allowBlank: false,
            //     },
            //   ],
            // },
          },
          amfutil.plugins["actions"]()
        ),
        object: "Action",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
          "export",
        ],
        columns: [
          {
            text: "Name",
            dataIndex: "name",
            flex: 1,
            type: "text",
          },
          {
            text: "Type",
            dataIndex: "type",
            flex: 1,
            type: "text",
          },
        ],
        fields: [
          amfutil.duplicateVal(
            {
              xtype: "textfield",
              name: "name",
              fieldLabel: "Name",
              tooltip: "Unique Action Name",
            },
            function (cmp, value, oldValue, eOpts) {
              return {
                actions: amfutil.duplicateIdCheck({ name: value }, cmp),
              };
            },
            "Action Already Exists",
            amfutil.nameValidator
          ),
          {
            xtype: "textfield",
            name: "desc",
            fieldLabel: "Description",
            tooltip: "Action Description",

            allowBlank: false,
          },
          // amfutil.checkbox("Active", "active", true, {
          //   tooltip: "Whether this action is active.",
          // }),
        ],
        add: {
          process: function (form, values) {
            var actions = ampsgrids.grids.actions();
            if (actions.types[values.type].process) {
              values = actions.types[values.type].process(form, values);
            }

            values = amfutil.convertNumbers(form.getForm(), values);

            values.active = true;
            return values;
          },
        },
        update: {
          load: function (form, record) {
            form.down("#type").setValue(record.type);
          },
          process: (form, values) => {
            console.log(values);
            var actions = ampsgrids.grids.actions();
            if (actions.types[values.type].process) {
              values = actions.types[values.type].process(form, values);
            }
            values = amfutil.convertNumbers(form.getForm(), values);

            return values;
          },
          readOnly: ["name"],
        },
        options: ["delete"],
      };
      config.fields = config.fields.concat(
        amfutil.typeFields(config, "actions")
      );
      return config;
    },
    topics: () => ({
      title: "Topics",
      object: "Topic",
      overwrite: true,

      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      options: ["upload", "event", "delete"],
      columns: [
        {
          text: "Topic",
          dataIndex: "topic",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("topics"),
            displayField: "topic",
            valueField: "topic",
          },
        },
        // {
        //   text: "Type",
        //   dataIndex: "type",
        //   flex: 1,
        //   type: "text",
        // },

        {
          text: "Description",
          dataIndex: "desc",
          flex: 1,
          type: "text",
        },
      ],
      fields: [
        {
          xtype: "radiogroup",
          xtype: "radiogroup",
          fieldLabel: "Topic Type",
          name: "type",
          allowBlank: false,
          blankText: "Select One",
          columns: 3,
          vertical: true,
          tooltip: "The type/function of this topic.",
          items: [
            {
              boxLabel: "Action",
              margin: 5,
              flex: 1,
              name: "type",
              inputValue: "actions",
            },
            {
              flex: 1,
              margin: 5,

              boxLabel: "Service",
              name: "type",
              inputValue: "svcs",
            },
            {
              flex: 1,
              margin: 5,

              boxLabel: "Data",
              name: "type",
              inputValue: "data",
            },
            {
              flex: 1,
              margin: 5,

              boxLabel: "Object",
              name: "type",
              inputValue: "objects",
            },
            {
              flex: 1,
              margin: 5,

              boxLabel: "Mailbox",
              name: "type",
              inputValue: "mailbox",
            },
          ],
          listeners: {
            change: function (scope, val) {
              console.log(val);
              var combo;
              var parm;
              if (val.type == "actions") {
                combo = amfutil.localCombo(
                  "Actions",
                  null,
                  null,
                  "field",
                  "label",
                  {
                    isFormField: false,
                    listeners: {
                      beforerender: function (cmp) {
                        cmp.setStore(
                          Object.values(ampsgrids.grids["actions"]().types)
                        );
                      },
                      change: function (scope, val) {
                        scope
                          .up("form")
                          .getForm()
                          .findField("topic")
                          .updateTopic(val, 2);
                      },
                    },
                  }
                );

                parm = {
                  xtype: "textfield",
                  fieldLabel: "Custom",
                  allowBlank: false,
                  isFormField: false,
                  listeners: {
                    change: function (scope, val) {
                      scope
                        .up("form")
                        .getForm()
                        .findField("topic")
                        .updateTopic(val, 3);
                    },
                  },
                };
              } else if (val.type == "svcs") {
                combo = amfutil.localCombo(
                  "Services",
                  null,
                  null,
                  "type",
                  "name",
                  {
                    listeners: {
                      beforerender: function (cmp) {
                        cmp.setStore(
                          amfutil.createCollectionStore("services", {
                            communication: true,
                          })
                        );
                      },
                      change: function (cmp, val) {
                        var service = cmp.getSelectedRecord().data;

                        this.up("fieldcontainer").remove(
                          amfutil.getElementByID("serviceparms")
                        );
                        this.up("fieldcontainer").insert({
                          xtype: "fieldcontainer",
                          itemId: "serviceparms",

                          items: [
                            {
                              xtype: "checkbox",
                              isFormField: false,
                              inputValue: true,
                              fieldLabel: "Wildcard",
                              uncheckedValue: false,
                              listeners: {
                                change: function (scope, val) {
                                  var c = scope
                                    .up("fieldcontainer")
                                    .down("combobox");
                                  if (val) {
                                    c.setValue("");
                                    c.setDisabled(true);
                                    scope
                                      .up("form")
                                      .getForm()
                                      .findField("topic")
                                      .updateTopic("*", 3);
                                  } else {
                                    c.setDisabled(false);
                                    scope
                                      .up("form")
                                      .getForm()
                                      .findField("topic")
                                      .updateTopic("", 3);
                                  }
                                },
                              },
                            },
                            Ext.apply(
                              ampsgrids.grids
                                .services()
                                .types[val].combo(service),
                              {
                                fieldStyle: null,
                                labelStyle: null,
                                listeners: {
                                  change: function (scope, v) {
                                    scope
                                      .up("form")
                                      .getForm()
                                      .findField("topic")
                                      .updateTopic(v, 3);
                                  },
                                },
                              }
                            ),
                          ],
                        });
                        var name = service.name;
                        var services = ampsgrids.grids.services();

                        if (services.types[val].format) {
                          name = services.types[val].format(service.name);
                        }
                        scope
                          .up("form")
                          .getForm()
                          .findField("topic")
                          .updateTopic(name, 2);
                      },
                    },
                    isFormField: false,
                  }
                );
              } else if (val.type == "mailbox") {
                combo = amfutil.combo(
                  "Users",
                  null,
                  null,
                  "username",
                  "username",
                  {
                    isFormField: false,
                    listeners: {
                      beforerender: function (cmp) {
                        cmp.setStore(amfutil.createCollectionStore("users"));
                      },
                      change: function (scope, val) {
                        var user = scope.getSelectedRecord().data;

                        this.up("fieldcontainer").remove(
                          amfutil.getElementByID("mailboxparms")
                        );
                        this.up("fieldcontainer").insert({
                          xtype: "fieldcontainer",
                          items: [
                            {
                              xtype: "checkbox",
                              itemId: "mailboxparms",
                              isFormField: false,
                              inputValue: true,
                              fieldLabel: "Wildcard",
                              uncheckedValue: false,
                              listeners: {
                                change: function (scope, val) {
                                  var c = scope
                                    .up("fieldcontainer")
                                    .down("combobox");
                                  if (val) {
                                    c.setValue("");
                                    c.setDisabled(true);
                                    scope
                                      .up("form")
                                      .getForm()
                                      .findField("topic")
                                      .updateTopic("*", 3);
                                  } else {
                                    c.setDisabled(false);
                                    scope
                                      .up("form")
                                      .getForm()
                                      .findField("topic")
                                      .updateTopic("", 3);
                                  }
                                },
                              },
                            },
                            amfutil.combo(
                              "Mailbox",
                              null,
                              amfutil.createFieldStore(
                                "users",
                                user["_id"],
                                "mailboxes"
                              ),
                              "name",
                              "name",
                              {
                                listeners: {
                                  change: function (scope, v) {
                                    scope
                                      .up("form")
                                      .getForm()
                                      .findField("topic")
                                      .updateTopic(v, 3);
                                  },
                                },
                              }
                            ),
                          ],
                        });

                        scope
                          .up("form")
                          .getForm()
                          .findField("topic")
                          .updateTopic(val, 2);
                      },
                    },
                  }
                );
              } else if (val.type == "objects") {
                combo = amfutil.localCombo(
                  "Objects",
                  null,
                  null,
                  "field",
                  "label",
                  {
                    isFormField: false,
                    listeners: {
                      beforerender: function (cmp) {
                        cmp.setStore(Object.keys(ampsgrids.grids));
                      },
                      change: function (scope, val) {
                        scope
                          .up("form")
                          .getForm()
                          .findField("topic")
                          .updateTopic(val, 2);
                      },
                    },
                  }
                );

                parm = {
                  xtype: "fieldcontainer",
                  items: [
                    {
                      xtype: "checkbox",
                      itemId: "serviceparms",
                      isFormField: false,
                      inputValue: true,
                      fieldLabel: "Wildcard",
                      uncheckedValue: false,
                      listeners: {
                        change: function (scope, val) {
                          var c = scope.up("fieldcontainer").down("#op");
                          if (val) {
                            c.setValue("");
                            c.setDisabled(true);
                            scope
                              .up("form")
                              .getForm()
                              .findField("topic")
                              .updateTopic("*", 3);
                          } else {
                            c.setDisabled(false);
                            scope
                              .up("form")
                              .getForm()
                              .findField("topic")
                              .updateTopic("", 3);
                          }
                        },
                      },
                    },

                    {
                      xtype: "textfield",
                      isFormField: false,
                      fieldLabel: "Custom",
                      itemId: "op",
                      allowBlank: false,
                      listeners: {
                        change: function (scope, val) {
                          scope
                            .up("form")
                            .getForm()
                            .findField("topic")
                            .updateTopic(val, 3);
                        },
                      },
                    },
                  ],
                };
              } else {
                parm = {
                  xtype: "textfield",
                  isFormField: false,
                  fieldLabel: "Custom",
                  allowBlank: false,
                  listeners: {
                    change: function (scope, val) {
                      scope
                        .up("form")
                        .getForm()
                        .findField("topic")
                        .updateTopic(val, 2);
                    },
                  },
                };
              }

              var tp = this.up("form").down("#topicparms");
              tp.removeAll();
              tp.insert(combo);
              tp.insert(parm);
              console.log(parm);
              var topic = scope.up("form").getForm().findField("topic");
              topic.resetTopic();
              if (val.type == "data") {
                topic.pieces.pop();
              }
              topic.updateTopic(val.type, 1);
            },
          },
        },
        {
          xtype: "fieldcontainer",
          itemId: "topicparms",
        },

        {
          xtype: "displayfield",
          tooltip: "The topic being created",
          readOnly: true,
          name: "topic",
          fieldLabel: "Topic",
          pieces: [],
          submitValue: true,
          allowBlank: false,
          resetTopic: function () {
            this.pieces[1] = " ";
            this.pieces[2] = " ";
            this.pieces[3] = " ";
          },
          updateTopic: function (val, idx) {
            this.pieces[idx] = val;

            this.setValue(this.pieces.join("."));
          },
          listeners: {
            beforerender: function (scope) {
              var val = scope.getValue();
              if (val) {
                scope.pieces = val.split(".");
              } else {
                scope.pieces = ["amps", " ", " ", " "];
                scope.setValue(scope.pieces.join("."));
              }
            },
            change: async function (cmp, value, oldValue, eOpts) {
              var duplicate = await amfutil.checkDuplicate({
                topics: { topic: value },
              });

              if (duplicate) {
                cmp.setActiveError("Topic Already Exists");
                cmp.setValidation("Topic Already Exists");
                // cmp.isValid(false);
              } else {
                cmp.setActiveError();
                cmp.setValidation();
              }
            },
          },
          // listeners: {
          //   afterrender: function (cmp) {
          //     cmp.inputEl.set({
          //       autocomplete: "nope",
          //     });
          //   },
          //   change: amfutil.uniqueBucket,
          //   blur: function (item) {
          //     //  amfutil.removeSpaces(item.itemId);
          //   },
          // },
          width: 400,
        },
        {
          xtype: "textfield",
          name: "desc",
          fieldLabel: "Topic Description",
          tooltip: "A description of the topic.",

          // maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          allowBlank: false,
          // listeners: {
          //   afterrender: function (cmp) {
          //     cmp.inputEl.set({
          //       autocomplete: "nope",
          //     });
          //   },
          //   change: amfutil.uniqueBucket,
          //   blur: function (item) {
          //     //  amfutil.removeSpaces(item.itemId);
          //   },
          // },
          width: 400,
        },
      ],
    }),
    queues: () => ({
      title: "Queues",
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      options: ["delete"],
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
        },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
          type: "text",
        },
        {
          text: "Description",
          dataIndex: "description",
          flex: 1,
          type: "text",
        },
      ],
    }),
    services: () => {
      var config = {
        title: "Services",
        overwrite: true,

        window: { width: 900, height: 600 },
        object: "Service",
        add: {
          process: function (form, values) {
            console.log(form);
            var services = ampsgrids.grids["services"]();
            if (services.types[values.type].process) {
              values = services.types[values.type].process(form, values);
            }

            return values;
          },
        },

        import: {
          skip: ["loop"],
        },

        update: {
          process: function (form, values) {
            console.log(form);
            var services = ampsgrids.grids["services"]();
            if (services.types[values.type].process) {
              values = services.types[values.type].process(form, values);
            }

            return values;
          },
          readOnly: ["name"],
        },
        fields: [
          amfutil.duplicateVal(
            {
              xtype: "textfield",
              name: "name",
              fieldLabel: "Name",
              allowBlank: false,
              submitValue: true,
              tooltip: "A name for this service",
            },
            function (cmp, value) {
              return {
                services: amfutil.duplicateIdCheck({ name: value }, cmp),
              };
            },
            "Service Already Exists",
            amfutil.nameValidator
          ),
          {
            xtype: "textfield",
            allowBlank: false,
            tooltip: "A description for this service",
            name: "desc",
            fieldLabel: "Description",
          },
          amfutil.check("Active", "active", {
            value: true,
          }),
        ],
        types: Object.assign(
          {
            sqs: {
              field: "sqs",
              label: "SQS Consumer",
              iconCls: "x-fa fa-line",
              combo: function (service) {
                return {
                  xtype: "combo",
                  name: "topicparms",
                  fieldLabel: "Queue Name",
                  itemId: "topicparms",
                  store: [
                    {
                      field: service["queue_name"],
                      label: service["queue_name"],
                    },
                  ],
                  valueField: "field",
                  displayField: "label",
                };
              },
              fields: [
                amfutil.text("Queue Name", "queue_name"),
                amfutil.text("Owner ID", "owner_id"),
                amfutil.combo(
                  "AWS Provider",
                  "provider",
                  amfutil.createCollectionStore("providers", { type: "aws" }),
                  "_id",
                  "name"
                ),

                {
                  xtype: "numberfield",
                  name: "wait_time_seconds",
                  fieldLabel: "Wait Time Seconds",
                  allowBlank: false,
                  value: 3,
                },

                {
                  xtype: "checkbox",
                  inputValue: true,
                  checked: true,
                  hidden: true,
                  name: "communication",
                },
              ],
            },
            gateway: {
              field: "gateway",
              label: "Gateway",
              iconCls: "x-fa fa-cog",
              combo: function (service) {
                return amfutil.localCombo(
                  "Topics",
                  "topicparms",
                  service.router.map(
                    (route) => route["method"] + route["path"]
                  ),
                  null,
                  null,
                  {
                    itemId: "topicparms",
                  }
                );
              },
              fields: [
                {
                  xtype: "numberfield",
                  name: "port",
                  fieldLabel: "Port",
                  tooltip: "The port to run the HTTP Api on",
                  allowBlank: false,
                  minValue: 1,
                  listeners: {
                    change: async function (cmp, value, oldValue, eOpts) {
                      await amfutil.portHandler(cmp, value);
                    },
                  },
                },
                {
                  xtype: "numberfield",
                  name: "idle_timeout",
                  allowBlank: false,
                  tooltip:
                    "The time in milliseconds the server will wait to receive data before closing the connection",
                  fieldLabel: "Idle Timeout (ms)",
                  minValue: 0,
                  value: 10000,
                },
                {
                  xtype: "numberfield",
                  name: "request_timeout",
                  allowBlank: false,
                  tooltip:
                    "The time in milliseconds the server will wait for additional requests before closing the connection",
                  fieldLabel: "Request Timeout (ms)",
                  minValue: 0,
                  value: 10000,
                },
                {
                  xtype: "numberfield",
                  name: "max_keepalive",
                  allowBlank: false,
                  tooltip: "Maximum number of requests allowed per connection",
                  fieldLabel: "Max Keep Alive",
                  minValue: 0,
                  value: 100,
                },
                {
                  xtype: "checkbox",
                  allowBlank: false,
                  inputValue: true,
                  uncheckedValue: false,
                  row: true,
                  name: "tls",
                  fieldLabel: "TLS",
                  tooltip: "Use TLS for this HTTP API",
                  listeners: amfutil.renderListeners(function (scope, val) {
                    var fields = ["tls"];
                    var form = scope.up("form");
                    console.log(val);
                    fields.forEach((field) => {
                      var f = form.down("#" + field);
                      console.log(f);
                      f.setHidden(!val);
                      f.setDisabled(!val);
                    });
                  }),
                },
                amfutil.renderContainer("tls", [
                  amfutil.loadKey("Server Cert", "cert", {
                    tooltip: "The TLS Certificate in PEM Format",
                  }),
                  amfutil.loadKey("Server Key", "key", {
                    tooltip: "The TLS Key in PEM Format",
                  }),
                ]),
                {
                  xtype: "collectionlist",
                  name: "router",
                  collection: "endpoints",
                  columns: [
                    {
                      text: "Method",
                      dataIndex: "method",
                      flex: 1,
                    },
                    {
                      text: "Path",
                      dataIndex: "path",
                      flex: 1,
                    },
                    amfutil.buttonColumn("Action", "action", "actions"),
                  ],
                },
              ],
              process: function (form, values) {
                console.log(values);
                values.router = JSON.parse(values.router);
                console.log(values);
                return values;
              },
            },

            nats: {
              field: "nats",
              label: "NATS",
              iconCls: "kafka-icon",
              combo: function (service) {
                var reg = /[.>* -]/;
                return {
                  xtype: "combo",
                  name: "topicparms",
                  fieldLabel: "NATS Topic",
                  itemId: "topicparms",
                  store: [
                    {
                      field: service["topic"].replace(reg, "_"),
                      label: service["topic"],
                    },
                  ],
                  valueField: "field",
                  displayField: "label",
                };
              },
              format: function (topic) {
                var reg = /[.>* -]/;
                return topic.replace(reg, "_");
              },
              fields: [
                amfutil.text("Topic", "topic"),
                amfutil.formatFileName({
                  value: "{YYYY}_{MM}_{DD}_{HH}_{mm}_{SS}",
                }),
                {
                  xtype: "checkbox",
                  inputValue: true,
                  checked: true,
                  hidden: true,
                  name: "communication",
                },
              ],
            },
            httpd: {
              field: "httpd",
              label: "Mailbox Api",
              iconCls: "x-fa fa-feed",
              combo: function (combo, service) {
                return amfutil.combo(
                  "Users",
                  "topicparms",
                  amfutil.createCollectionStore(
                    "users",
                    {},
                    { autoLoad: true }
                  ),
                  "username",
                  "username",
                  {
                    itemId: "topicparms",
                  }
                );
              },
              fields: [
                {
                  xtype: "numberfield",
                  name: "port",
                  fieldLabel: "Port",
                  tooltip: "The port to run the HTTP Api on",
                  allowBlank: false,
                  minValue: 1,
                  listeners: {
                    change: async function (cmp, value, oldValue, eOpts) {
                      await amfutil.portHandler(cmp, value);
                    },
                  },
                },
                {
                  xtype: "numberfield",
                  name: "idle_timeout",
                  allowBlank: false,
                  tooltip:
                    "The time in milliseconds the server will wait to receive data before closing the connection",
                  fieldLabel: "Idle Timeout (ms)",
                  minValue: 0,
                  value: 10000,
                },
                {
                  xtype: "numberfield",
                  name: "request_timeout",
                  allowBlank: false,
                  tooltip:
                    "The time in milliseconds the server will wait for additional requests before closing the connection",
                  fieldLabel: "Request Timeout (ms)",
                  minValue: 0,
                  value: 10000,
                },
                {
                  xtype: "numberfield",
                  name: "max_keepalive",
                  allowBlank: false,
                  tooltip: "Maximum number of requests allowed per connection",
                  fieldLabel: "Max Keep Alive",
                  minValue: 0,
                  value: 100,
                },
                amfutil.check("Overwrite Duplicate Files", "overwrite"),

                {
                  xtype: "checkbox",
                  allowBlank: false,
                  inputValue: true,
                  uncheckedValue: false,
                  row: true,
                  name: "tls",
                  fieldLabel: "TLS",
                  tooltip: "Use TLS for this HTTP API",
                  listeners: amfutil.renderListeners(function (scope, val) {
                    var fields = ["tls"];
                    var form = scope.up("form");
                    console.log(val);
                    fields.forEach((field) => {
                      var f = form.down("#" + field);
                      console.log(f);
                      f.setHidden(!val);
                      f.setDisabled(!val);
                    });
                  }),
                },
                amfutil.renderContainer("tls", [
                  amfutil.loadKey("Server Cert", "cert", {
                    tooltip: "The TLS Certificate in PEM Format",
                  }),
                  amfutil.loadKey("Server Key", "key", {
                    tooltip: "The TLS Key in PEM Format",
                  }),
                ]),

                {
                  xtype: "checkbox",
                  inputValue: true,
                  checked: true,
                  hidden: true,
                  name: "communication",
                },
              ],
              // load: function (form, record) {
              //   if (record.tls) {
              //     var fields = ["cert", "cert_file", "key", "key_file"];

              //     form.down("#tls").setValue(true);
              //     // form.down("#cert").setValue(record.server_cert);
              //     // form.down("#key").setValue(record.key);
              //     // fields.forEach(field => {
              //     //   var f = form.down("#" + field);
              //     // })
              //   }
              // },
            },
            sftpd: {
              field: "sftpd",
              label: "SFTP Server",
              iconCls: "x-fa fa-files-o",
              combo: function (combo, service) {
                return amfutil.combo(
                  "Users",
                  "topicparms",
                  amfutil.createCollectionStore(
                    "users",
                    {},
                    { autoLoad: true }
                  ),
                  "username",
                  "username",
                  {
                    itemId: "topicparms",
                  }
                );
              },
              fields: [
                amfutil.duplicateValidation(
                  {
                    xtype: "numberfield",
                    name: "port",
                    fieldLabel: "Port",
                    tooltip: "The port to run the SFTP Server on",
                    minValue: 0,
                    maxValue: 65535,
                    allowBlank: false,
                  },
                  async function (cmp, value) {
                    await amfutil.customValidation(
                      cmp,
                      value,
                      async function () {
                        var resp = await amfutil.portHandler(cmp, value);
                        return resp;
                      },
                      "Script Already Exists"
                    );
                    console.log("checking");

                    return true;
                  }
                ),

                amfutil.loadKey("Server Key", "server_key", {
                  tooltip: "The EC Private Key to use for the SFTP Server.",
                }),

                amfutil.check("Overwrite Duplicate Files", "overwrite"),

                {
                  xtype: "checkbox",
                  inputValue: true,
                  checked: true,
                  hidden: true,
                  name: "communication",
                },
              ],
            },
            subscriber: {
              field: "subscriber",
              label: "Subscriber",
              iconCls: "x-fa fa-arrow-down",
              fields: [
                {
                  xtype: "numberfield",
                  name: "subs_count",
                  fieldLabel: "Subscriber Count",
                  tooltip:
                    "The Number of concurrent processes of this subscriber to run on each AMPS node.",
                  allowBlank: false,
                  minValue: 1,
                  maxValue: 50,
                  value: 1,
                },
                {
                  xtype: "numberfield",
                  name: "ack_wait",
                  fieldLabel: "Acknowledge Wait (seconds)",
                  tooltip:
                    "How long the consumer should wait before redelivering a message to this subscriber. (Should be set to longer than the time you expect each message processing action to take.)",
                  allowBlank: false,
                  minValue: 30,
                  value: 30,
                },
                amfutil.localCombo(
                  "Retry Mode",
                  "rmode",
                  [
                    { field: "never", label: "Never" },
                    { field: "limit", label: "Limit" },
                    { field: "always", label: "Always" },
                  ],
                  "field",
                  "label",
                  {
                    listeners: amfutil.renderListeners(function (scope, val) {
                      var conts = ["limit", "always"];

                      conts.forEach((cont) => {
                        var cmp = amfutil.getElementByID(cont);
                        cmp.setDisabled(false);
                        cmp.setHidden(false);
                      });

                      conts.forEach((cont) => {
                        var cmp = amfutil.getElementByID(cont);
                        cmp.setDisabled(cont != val);
                        cmp.setHidden(cont != val);
                      });
                    }),
                  }
                ),

                amfutil.renderContainer("limit", [
                  {
                    xtype: "numberfield",
                    fieldLabel: "Retry Limit",
                    name: "rlimit",
                    allowBlank: false,
                    value: 10,
                  },
                  {
                    xtype: "numberfield",
                    fieldLabel: "Retry Backoff (seconds)",
                    name: "backoff",
                    allowBlank: false,
                    value: 300,
                  },
                ]),

                amfutil.renderContainer("always", [
                  {
                    xtype: "numberfield",
                    fieldLabel: "Retry Backoff (seconds)",
                    name: "backoff",
                    allowBlank: false,
                    value: 300,
                  },
                ]),

                amfutil.dynamicCreate(
                  amfutil.combo(
                    "Action",
                    "handler",
                    amfutil.createCollectionStore(
                      "actions",
                      {},
                      { autoLoad: true }
                    ),
                    "_id",
                    "name",
                    {
                      forceSelection: false,
                      tooltip:
                        "The Action to execute when a message is received by this subscriber.",
                    }
                  ),

                  "actions"
                ),
                amfutil.consumerConfig(
                  function (topichandler) {
                    return [
                      amfutil.dynamicCreate(
                        amfutil.combo(
                          "Topic",
                          "topic",
                          amfutil.createCollectionStore("topics"),
                          "topic",
                          "topic",
                          {
                            tooltip: "The topic to subscriber to",
                            listeners: {
                              change: topichandler,
                            },
                          }
                        ),
                        "topics"
                      ),
                    ];
                  },
                  `The Topic this subscriber will consumes messages from.`,
                  `This block allows you to configure how the subscriber will consume events from the specified topic. Changing any of these values after creation will result in the creation of a new consumer. (i.e. If the consumer is configured with a Deliver Policy of "All" and 50 messages are consumed, updating the consumer config and leaving the delivery policy of "All" will result in the reprocessing of those messages.) "All" results in a consumption of all events on the topic. "New" results in a consumption of all events created after this configuration was updated. "Last" results in a consumption o fall events starting with the most recent events. "Start Time" allows you to specify a specific starting point for consumption`
                ),
                // amfutil.dynamicCreate(
                //   amfutil.combo(
                //     "Topic",
                //     "topic",
                //     amfutil.createCollectionStore(
                //       "topics",
                //       {},
                //       { autoLoad: true }
                //     ),
                //     "topic",
                //     "topic",
                //     {
                //       tooltip:
                //         "The Topic this subscriber will consumes messages from.",

                //       flex: 1,
                //     }
                //   ),
                //   "topics"
                // ),
              ],
              process: function (form, values) {
                values.active = true;

                return values;
              },
            },
            pyservice: {
              field: "pyservice",
              label: "Custom Python Service",
              fields: [
                amfutil.combo(
                  "Service",
                  "service",
                  amfutil.pyserviceStore(),
                  "name",
                  "name"
                ),
                {
                  xtype: "parmfield",
                  title: "Config",
                  name: "config",
                  tooltip: "Additional Config to be passed to your service.",
                },
                amfutil.check("Receive Messages", "receive", {
                  listeners: amfutil.renderListeners(function (scope, val) {
                    console.log(val);
                    var out = scope.up("form").down("#receive_parms");
                    out.setHidden(!val);
                    out.setDisabled(!val);
                  }),
                }),
                amfutil.renderContainer("receive_parms", [
                  amfutil.consumerConfig(
                    function (topichandler) {
                      return [
                        amfutil.dynamicCreate(
                          amfutil.combo(
                            "Topic",
                            "topic",
                            amfutil.createCollectionStore("topics"),
                            "topic",
                            "topic",
                            {
                              tooltip: "The topic to subscriber to",
                              listeners: {
                                change: topichandler,
                              },
                            }
                          ),
                          "topics"
                        ),
                      ];
                    },
                    `The Topic this subscriber will consumes messages from.`,
                    `This block allows you to configure how the subscriber will consume events from the specified topic. Changing any of these values after creation will result in the creation of a new consumer. (i.e. If the consumer is configured with a Deliver Policy of "All" and 50 messages are consumed, updating the consumer config and leaving the delivery policy of "All" will result in the reprocessing of those messages.) "All" results in a consumption of all events on the topic. "New" results in a consumption of all events created after this configuration was updated. "Last" results in a consumption o fall events starting with the most recent events. "Start Time" allows you to specify a specific starting point for consumption`
                  ),
                ]),

                amfutil.check("Send Output", "send_output", {
                  itemId: "send_output",
                  listeners: amfutil.renderListeners(function (scope, val) {
                    var out = scope.up("form").down("#output_parms");
                    out.setHidden(!val);
                    out.setDisabled(!val);
                  }),
                }),
                amfutil.renderContainer("output_parms", [
                  amfutil.outputTopic(),
                ]),
              ],
              process: function (form, values) {
                values.active = true;
                values.config = amfutil.formatArrayField(values.config);

                return values;
              },
            },
            defaults: {
              type: "defaults",
              name: "Defaults",
              iconCls: "x-fa fa-pencil",
              singleton: true,
              fields: [
                {
                  // Fieldset in Column 1 - collapsible via toggle button
                  xtype: "fieldset",
                  title: "Default Values",
                  row: true,

                  itemId: "defaults",
                  collapsible: true,
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
                          Ext.create("Amps.form.Defaults", {
                            title: "Default Value",
                          })
                        );
                      },
                    },
                  ],
                },
              ],

              load: function (form, record) {
                console.log(form);
                console.log(record);
                delete record._id;
                delete record.name;
                delete record.desc;
                delete record.type;

                var defaults = Object.entries(record).map((entry) => {
                  return { field: entry[0], value: entry[1] };
                });

                defaults.forEach(function (def) {
                  var dcon = form.down("#defaults");
                  var length = dcon.items.length;
                  var d = Ext.create("Amps.form.Defaults");
                  d.down("#field").setValue(def.field);
                  d.down("#value").setValue(def.value);
                  dcon.insert(length - 1, d);
                });
              },

              process: function (form) {
                var values = form.getValues();
                var defaults = values.defaults
                  ? Array.isArray(values.defaults)
                    ? values.defaults.map((defaultobj) => {
                        return JSON.parse(defaultobj);
                      })
                    : [JSON.parse(values.defaults)]
                  : [];
                var processed = {};

                defaults.forEach((def) => {
                  processed[def.field] = def.value;
                });

                delete values.field;
                delete values.value;
                delete values.defaults;

                Object.assign(values, processed);
                console.log(values);

                return values;
              },
            },
          },
          amfutil.plugins["services"]()
        ),
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
          "export",
        ],
        options: ["active", "delete"],
        columns: [
          {
            text: "Name",
            dataIndex: "name",
            flex: 1,
            type: "text",
          },
          {
            text: "Type",
            dataIndex: "type",
            flex: 1,
            type: "text",
          },
          {
            text: "Description",
            dataIndex: "desc",
            flex: 1,
            type: "text",
          },
          {
            text: "Topic",
            dataIndex: "topic",
            flex: 1,
            type: "text",
          },
          // {
          //   text: "Loop Detection",
          //   dataIndex: "loop",
          //   xtype: "widgetcolumn",
          //   widget: {
          //     xtype: "container",
          //     layout: "fit",
          //     items: [
          //       {
          //         xtype: "button",

          //         iconCls: "x-fa fa-spinner fa-pulse",
          //       },
          //     ],
          //   },
          //   onWidgetAttach: function (col, widget, rec) {
          //     if (rec.data.type == "subscriber" && rec.data.active) {
          //       var name = rec.data.name;

          //       var promise = amfutil.ajaxRequest({
          //         url: `api/loop/${name}`,
          //       });

          //       Promise.all([promise]).then((values) => {
          //         widget.removeAll();

          //         var loops = Ext.decode(values[0].responseText);
          //         var button = {
          //           xtype: "button",
          //         };

          //         if (loops.length > 0) {
          //           button.iconCls = "x-fa fa-warning";
          //         } else {
          //           button.iconCls = "x-fa fa-check";
          //         }

          //         button.handler = function () {
          //           var win = new Ext.window.Window({
          //             title: `Loop Detection for service: ${name}`,
          //             width: 800,
          //             height: 500,
          //             layout: "fit",
          //             scrollable: true,

          //             items: [
          //               {
          //                 xtype: "container",
          //                 padding: 15,
          //                 items: [
          //                   {
          //                     xtype: "container",
          //                     layout: {
          //                       type: "vbox",
          //                       align: "stretch",
          //                     },
          //                     items: loops.map((loop, i, loops) => {
          //                       return {
          //                         xtype: "container",
          //                         layout: {
          //                           type: "vbox",
          //                           align: "stretch",
          //                         },
          //                         style: {
          //                           border: "5px solid var(--main-color)",
          //                           margin: 2,
          //                           color: "var(--main-color)",
          //                         },

          //                         items: [
          //                           {
          //                             xtype: "container",
          //                             layout: {
          //                               type: "vbox",
          //                               align: "end",
          //                             },
          //                             items: [
          //                               {
          //                                 xtype: "container",
          //                                 layout: {
          //                                   type: "hbox",
          //                                   align: "stretch",
          //                                 },
          //                                 defaults: {
          //                                   margin: 5,
          //                                 },
          //                                 items: [
          //                                   {
          //                                     xtype: "container",
          //                                     style: {
          //                                       "font-weight": 500,
          //                                       "font-size": "1.25rem",
          //                                       "line-height": "125%",
          //                                     },
          //                                     layout: "center",
          //                                     items: [
          //                                       {
          //                                         xtype: "component",
          //                                         html: `#${i + 1}`,
          //                                       },
          //                                     ],
          //                                   },
          //                                   {
          //                                     xtype: "button",
          //                                     text: "Visualize",
          //                                     scale: "medium",
          //                                     handler: function () {
          //                                       var choices = {};
          //                                       loop.forEach(
          //                                         (step, i, loop) => {
          //                                           if (loop.length - 1 == i) {
          //                                           } else {
          //                                             choices[i] =
          //                                               step.sub.name;
          //                                           }
          //                                         }
          //                                       );
          //                                       var win = Ext.create({
          //                                         xtype: "wfwindow",
          //                                         topic: loop[0].sub.topic,
          //                                         choices: choices,
          //                                       });
          //                                       win.show();
          //                                     },
          //                                     // style: {
          //                                     //   background: "white",
          //                                     //   color: "var(--secondary-color)",
          //                                     // },
          //                                   },
          //                                 ],
          //                               },
          //                             ],

          //                             // padding: 5,
          //                           },
          //                         ].concat([
          //                           {
          //                             xtype: "container",

          //                             padding: 5,
          //                             items: loop.map((step, i, loop) => {
          //                               var items = [
          //                                 {
          //                                   xtype: "container",
          //                                   layout: {
          //                                     type: "hbox",
          //                                     align: "stretch",
          //                                   },
          //                                   padding: 5,
          //                                   style: {
          //                                     "background-color":
          //                                       "var(--main-color)",
          //                                     color: "white",

          //                                     "font-size": ".75rem",
          //                                     "line-height": "125%",
          //                                     "font-weight": 500,
          //                                   },
          //                                   items: [
          //                                     {
          //                                       xtype: "container",
          //                                       flex: 1,
          //                                       layout: "hbox",

          //                                       items: [
          //                                         {
          //                                           xtype: "component",
          //                                           margin: step["sub"]
          //                                             ? 0
          //                                             : {
          //                                                 right: 5,
          //                                               },
          //                                           html: `${
          //                                             step["sub"]
          //                                               ? ""
          //                                               : `<span class="x-fa fa-warning"></span>`
          //                                           }`,
          //                                         },
          //                                         {
          //                                           xtype: "component",

          //                                           html: `${
          //                                             step["sub"]
          //                                               ? "Subscriber: " +
          //                                                 step["sub"]["name"]
          //                                               : `Looped`
          //                                           }`,
          //                                         },
          //                                       ],
          //                                     },

          //                                     {
          //                                       xtype: "component",
          //                                       flex: 1,
          //                                       html: `Topic: ${step["topic"]}`,
          //                                     },
          //                                   ].concat([
          //                                     {
          //                                       xtype: "container",
          //                                       flex: 1,
          //                                       layout: {
          //                                         type: "vbox",
          //                                       },
          //                                       items: [
          //                                         {
          //                                           xtype: "component",
          //                                           html: step["action"]
          //                                             ? `Action: ${step.action.name}`
          //                                             : "",
          //                                         },
          //                                       ].concat(
          //                                         step["rule"]
          //                                           ? [
          //                                               {
          //                                                 xtype: "component",
          //                                                 html: `Rule: ${step.rule.name}`,
          //                                               },
          //                                             ]
          //                                           : []
          //                                       ),
          //                                     },
          //                                   ]),
          //                                 },
          //                               ];
          //                               if (loop.length - 1 === i) {
          //                               } else {
          //                                 items.push({
          //                                   xtype: "container",
          //                                   layout: "center",
          //                                   padding: 5,
          //                                   items: [
          //                                     {
          //                                       xtype: "component",
          //                                       cls: "x-fa fa-arrow-down",
          //                                     },
          //                                   ],
          //                                 });
          //                               }

          //                               return {
          //                                 xtype: "container",

          //                                 layout: {
          //                                   type: "vbox",
          //                                   align: "stretch",
          //                                 },
          //                                 items: items,
          //                               };
          //                             }),
          //                           },
          //                         ]),
          //                       };
          //                     }),
          //                   },
          //                 ],
          //               },
          //             ],
          //           });
          //           win.show();
          //         };
          //         widget.insert(button);
          //       });
          //     } else {
          //       widget.removeAll();
          //     }
          //   },
          // },
        ],
      };

      config.fields = config.fields.concat(
        amfutil.typeFields(config, "services")
      );

      return config;
    },
    admin: () => ({
      title: "Admin Users",
      overwrite: false,

      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      columns: [
        { text: "First Name", dataIndex: "firstname", flex: 1, type: "text" },
        { text: "Last Name", dataIndex: "lastname", flex: 1, type: "text" },
        {
          text: "Role",
          dataIndex: "role",
          flex: 1,
          type: "combo",
          options: [
            { field: "Admin", label: "Admin" },
            { field: "Guest", label: "Guest" },
          ],
        },
        { text: "Username", dataIndex: "username", flex: 1, type: "text" },
        { text: "Phone", dataIndex: "phone", flex: 1, type: "text" },
        { text: "Email", dataIndex: "email", flex: 1, type: "text" },
        { text: "Provider", dataIndex: "provider", flex: 1, type: "text" },
        {
          text: "Approved",
          dataIndex: "approved",
          flex: 1,
          type: "checkbox",
        },
      ],
      //   options: ["approve","resetAdmin","changePassAdmin"],
      options: ["approveAdmin", "resetAdmin"],
    }),
    keys: () => ({
      title: "Keys",
      window: {
        width: 600,
      },
      overwrite: true,

      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      options: ["delete"],
      object: "Key",
      fields: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Key Name",
          tooltip: "The name of the key",
          allowBlank: false,
          width: 400,
          listeners: {
            // change: async function (cmp, value, oldValue, eOpts) {
            //   await duplicateHandler(cmp, {})
            // },
          },
        },
        amfutil.combo(
          "User",
          "user",
          amfutil.createCollectionStore("users"),
          "username",
          "username",
          {
            allowBlank: true,
          }
        ),

        amfutil.localCombo(
          "Key Usage",
          "usage",
          ["RSA", "SSH", "Encryption", "Signing", "Cert", "Credential"],
          "field",
          "label",
          {
            tooltip: "The use of the key",
          }
        ),
        {
          xtype: "radiogroup",
          fieldLabel: "Type",
          name: "type",
          allowBlank: false,
          tooltip: "Whether the key is public or private",
          columns: 2,
          vertical: true,
          items: [
            { boxLabel: "Public", name: "type", inputValue: "public" },
            {
              boxLabel: "Private",
              name: "type",
              inputValue: "private",
            },
            {
              boxLabel: "Other",
              name: "type",
              inputValue: "other",
            },
          ],
        },
        {
          xtype: "keyfield",
          tooltip: "The key data",
          name: "data",
          fieldLabel: "Key",
        },
      ],
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("keys"),
            displayField: "name",
            valueField: "name",
          },
        },
        {
          text: "Username",
          dataIndex: "user",
          flex: 1,
          type: "text",
        },
        {
          text: "Usage",
          dataIndex: "usage",
          flex: 1,
          type: "combo",
          options: [
            "RSA",
            "SSH",
            "Encryption",
            "Signing",
            "Cert",
            "Credential",
          ],
        },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: [
              { field: "private", label: "Private" },
              { field: "public", label: "Public" },
              { field: "other", label: "Other" },
            ],
            displayField: "label",
            valueField: "field",
          },
        },
      ],
    }),

    scripts: () => ({
      window: {
        width: 0.9 * window.innerWidth,
        height: 0.9 * window.innerHeight,
      },
      object: "Script",

      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
        },
      ],
      fields: [
        amfutil.duplicateValidation(
          {
            xtype: "textfield",
            fieldLabel: "Script Name",
            name: "name",
          },
          async function (cmp, value) {
            await amfutil.customValidation(
              cmp,
              value,
              async function () {
                var resp = await amfutil.ajaxRequest({
                  url: "api/scripts/duplicate/",
                  jsonData: {
                    name: value,
                  },
                });
                return Ext.decode(resp.responseText);
              },
              "Script Already Exists",
              function (val) {
                if (!/^[a-zA-Z0-9_]+$/i.test(val)) {
                  return "Script Name contains invalid characters";
                }
              }
            );
            console.log("checking");

            return true;
          }
        ),
        {
          xtype: "scriptfield",
          name: "data",
          flex: 1,
        },
      ],
    }),

    templates: () => ({
      title: "Templates",
      overwrite: true,

      window: { height: 600, width: 600 },
      object: "Template",
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      options: ["delete"],

      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
        },
        {
          text: "Description",
          dataIndex: "desc",
          flex: 1,
          type: "text",
        },
      ],
      fields: [
        amfutil.duplicateVal(
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Name",
            tooltip: "Unique Template Name",
          },
          function (cmp, value, oldValue, eOpts) {
            return {
              templates: amfutil.duplicateIdCheck({ name: value }, cmp),
            };
          },
          "Template Already Exists",
          amfutil.nameValidator
        ),
        {
          xtype: "textarea",
          name: "desc",
          fieldLabel: "Description",
          tooltip: "Action Description",

          allowBlank: false,
        },
        {
          xtype: "scriptfield",
          name: "data",
          height: 400,
        },
      ],
    }),
  },
  pages: {
    scripts: () => ({
      view: {
        xtype: "tabpanel",
        title: "Scripts",
        listeners: {
          beforedestroy: function () {
            console.log("destroying");
          },
        },
        items: [
          {
            title: "Scripts",
            layout: {
              type: "hbox",
              align: "stretch",
            },
            items: [
              {
                xtype: "grid",
                rbar: [
                  {
                    iconCls: "x-fa fa-plus",
                    handler: function () {
                      var win = new Ext.window.Window({
                        title: "Create New Script",
                        width: 600,
                        height: 250,
                        layout: "fit",
                        padding: 20,
                        modal: true,
                        items: [
                          {
                            xtype: "form",
                            items: [
                              amfutil.duplicateValidation(
                                {
                                  xtype: "textfield",
                                  fieldLabel: "Script Name",
                                  name: "name",
                                },
                                async function (cmp, value) {
                                  await amfutil.customValidation(
                                    cmp,
                                    value,
                                    async function () {
                                      var resp = await amfutil.ajaxRequest({
                                        url: "api/scripts/duplicate/",
                                        jsonData: {
                                          name: value,
                                        },
                                      });
                                      return Ext.decode(resp.responseText);
                                    },
                                    "Script Already Exists",
                                    function (val) {
                                      if (!/^[a-zA-Z0-9_]+$/i.test(val)) {
                                        return "Script Name contains invalid characters";
                                      }
                                    }
                                  );
                                  console.log("checking");

                                  return true;
                                }
                              ),
                              {
                                xtype: "radiogroup",
                                name: "type",
                                fieldLabel: "Script Type",
                                items: [
                                  {
                                    boxLabel: "Action",
                                    inputValue: "action",
                                    name: "type",
                                  },
                                  {
                                    boxLabel: "Endpoint",
                                    inputValue: "endpoint",
                                    name: "type",
                                  },
                                ],
                                listeners: {
                                  change: function (scope, val) {
                                    var entity =
                                      amfutil.getElementByID("combocontainer");
                                    if (val.type == "collection") {
                                      entity.setActiveItem(0);
                                    } else {
                                      entity.setActiveItem(1);
                                    }

                                    entity.setDisabled(false);
                                  },
                                },
                                displayField: "label",
                                valueField: "field",
                                allowBlank: false,
                                width: 600,
                                labelWidth: 200,
                                forceSelection: true,
                              },
                              amfutil.combo(
                                "Template",
                                "template",
                                amfutil.createCollectionStore("templates"),
                                "name",
                                "name",
                                {
                                  allowBlank: true,
                                }
                              ),
                            ],
                            buttons: [
                              {
                                text: "Create",
                                formBind: true,
                                handler: function (btn) {
                                  var form = btn.up("form");
                                  var values = form.getValues();
                                  amfutil.ajaxRequest({
                                    url: "api/scripts",
                                    method: "post",
                                    jsonData: values,
                                    success: function () {
                                      Ext.toast("Script Created");
                                      win.close();

                                      amfutil
                                        .getElementByID("script")
                                        .loadScript(values.name);
                                      var store = amfutil
                                        .getElementByID("scriptgrid")
                                        .getStore();

                                      store.reload();
                                    },
                                  });
                                },
                              },
                              {
                                text: "Cancel",
                                handler: function () {
                                  win.hide();
                                },
                              },
                            ],
                          },
                        ],
                      });
                      win.show();
                    },
                  },
                  {
                    iconCls: "x-fa fa-refresh",
                    handler: function () {
                      var store = amfutil
                        .getElementByID("scriptgrid")
                        .getStore();
                      store.reload();
                      // store.on(
                      //   "load",
                      //   function () {
                      //     amfutil.getElementByID("script").flushScripts(store);
                      //   },
                      //   this,
                      //   { single: true }
                      // );
                    },
                  },
                ],
                flex: 2,
                itemId: "scriptgrid",
                store: amfutil.scriptStore(),
                listeners: {
                  load: function () {
                    // amfutil.getElementByID("script").flushScripts(this.getStore());
                  },
                  dblclick: {
                    element: "body", //bind to the underlying body property on the panel
                    fn: function (grid, rowIndex, e, obj) {
                      var record = grid.record.data;
                      amfutil.getElementByID("script").loadScript(record.name);
                    },
                  },
                },
                columns: [
                  {
                    text: "Name",
                    dataIndex: "name",
                    flex: 1,
                  },
                  {
                    text: "Size",
                    dataIndex: "size",
                    flex: 1,
                  },
                  {
                    xtype: "actioncolumn",
                    items: [
                      {
                        iconCls: "x-fa fa-trash",
                        handler: function (grid, rowIndex) {
                          var rec = grid.getStore().getAt(rowIndex);
                          Ext.MessageBox.show({
                            title: "Remove Package",
                            message: `Are you sure you want to delete script ${rec.data.name}?`,
                            buttons: Ext.MessageBox.YESNO,
                            defaultFocus: "#no",
                            prompt: false,
                            fn: function (btn) {
                              if (btn == "yes") {
                                amfutil.ajaxRequest({
                                  url: `api/scripts/${rec.data.name}`,
                                  headers: {
                                    Authorization:
                                      localStorage.getItem("access_token"),
                                  },
                                  method: "DELETE",
                                  timeout: 60000,
                                  params: {},
                                  success: async (resp) => {
                                    Ext.toast({
                                      title: "Deleted Script",
                                      html: "<center>Deleted Script</center>",
                                      autoCloseDelay: 5000,
                                    });
                                    grid.getStore().reload();
                                  },
                                  failure: function (resp) {
                                    Ext.toast({
                                      title: "Failed to Delete Script",
                                      html: "<center>Failed to Delete Script</center>",
                                      autoCloseDelay: 5000,
                                    });
                                    grid.getStore().reload();
                                  },
                                });
                              }
                            },
                          });
                        },
                      },
                    ],
                  },
                ],
              },
              {
                xtype: "splitter",
              },
              {
                xtype: "script",
                itemId: "script",
                type: "scripts",
                flex: 3,
                layout: "fit",
              },
            ],
          },
          {
            title: "Util",
            layout: {
              type: "hbox",
              align: "stretch",
            },
            items: [
              {
                xtype: "grid",
                rbar: [
                  {
                    iconCls: "x-fa fa-plus",
                    handler: function () {
                      var win = new Ext.window.Window({
                        title: "Create New Script",
                        width: 600,
                        height: 250,
                        layout: "fit",
                        padding: 20,
                        modal: true,
                        items: [
                          {
                            xtype: "form",
                            items: [
                              amfutil.duplicateValidation(
                                {
                                  xtype: "textfield",
                                  fieldLabel: "Script Name",
                                  name: "name",
                                },
                                async function (cmp, value) {
                                  await amfutil.customValidation(
                                    cmp,
                                    value,
                                    async function () {
                                      var resp = await amfutil.ajaxRequest({
                                        url: "api/utilscripts/duplicate/",
                                        jsonData: {
                                          name: value,
                                        },
                                      });
                                      return Ext.decode(resp.responseText);
                                    },
                                    "Script Already Exists",
                                    function (val) {
                                      if (!/^[a-zA-Z0-9_]+$/i.test(val)) {
                                        return "Script Name contains invalid characters";
                                      }
                                    }
                                  );
                                  console.log("checking");

                                  return true;
                                }
                              ),
                              {
                                xtype: "radiogroup",
                                name: "type",
                                fieldLabel: "Script Type",
                                items: [
                                  {
                                    boxLabel: "Action",
                                    inputValue: "action",
                                    name: "type",
                                  },
                                  {
                                    boxLabel: "Endpoint",
                                    inputValue: "endpoint",
                                    name: "type",
                                  },
                                ],
                                listeners: {
                                  change: function (scope, val) {
                                    var entity =
                                      amfutil.getElementByID("combocontainer");
                                    if (val.type == "collection") {
                                      entity.setActiveItem(0);
                                    } else {
                                      entity.setActiveItem(1);
                                    }

                                    entity.setDisabled(false);
                                  },
                                },
                                displayField: "label",
                                valueField: "field",
                                allowBlank: false,
                                width: 600,
                                labelWidth: 200,
                                forceSelection: true,
                              },
                              amfutil.combo(
                                "Template",
                                "template",
                                amfutil.createCollectionStore("templates"),
                                "name",
                                "name",
                                {
                                  allowBlank: true,
                                }
                              ),
                            ],
                            buttons: [
                              {
                                text: "Create",
                                formBind: true,
                                handler: function (btn) {
                                  var form = btn.up("form");
                                  var values = form.getValues();
                                  amfutil.ajaxRequest({
                                    url: "api/utilscripts",
                                    method: "post",
                                    jsonData: values,
                                    success: function () {
                                      Ext.toast("Script Created");
                                      win.close();

                                      amfutil
                                        .getElementByID("utilscript")
                                        .loadScript(values.name);
                                      var store = amfutil
                                        .getElementByID("utilscriptgrid")
                                        .getStore();

                                      store.reload();
                                    },
                                  });
                                },
                              },
                              {
                                text: "Cancel",
                                handler: function () {
                                  win.hide();
                                },
                              },
                            ],
                          },
                        ],
                      });
                      win.show();
                    },
                  },
                  {
                    iconCls: "x-fa fa-refresh",
                    handler: function () {
                      var store = this.up("grid").getStore();
                      store.reload();
                      // store.on(
                      //   "load",
                      //   function () {
                      //     amfutil.getElementByID("script").flushScripts(store);
                      //   },
                      //   this,
                      //   { single: true }
                      // );
                    },
                  },
                ],
                flex: 2,
                itemId: "utilscriptgrid",
                store: amfutil.utilScriptStore(),
                listeners: {
                  load: function () {
                    // amfutil.getElementByID("script").flushScripts(this.getStore());
                  },
                  dblclick: {
                    element: "body", //bind to the underlying body property on the panel
                    fn: function (grid, rowIndex, e, obj) {
                      var record = grid.record.data;
                      amfutil
                        .getElementByID("utilscript")
                        .loadScript(record.name);
                    },
                  },
                },
                columns: [
                  {
                    text: "Name",
                    dataIndex: "name",
                    flex: 1,
                  },
                  {
                    text: "Size",
                    dataIndex: "size",
                    flex: 1,
                  },
                  {
                    xtype: "actioncolumn",
                    items: [
                      {
                        iconCls: "x-fa fa-trash",
                        handler: function (grid, rowIndex) {
                          var rec = grid.getStore().getAt(rowIndex);
                          Ext.MessageBox.show({
                            title: "Remove Package",
                            message: `Are you sure you want to delete script ${rec.data.name}?`,
                            buttons: Ext.MessageBox.YESNO,
                            defaultFocus: "#no",
                            prompt: false,
                            fn: function (btn) {
                              if (btn == "yes") {
                                amfutil.ajaxRequest({
                                  url: `api/utilscripts/${rec.data.name}`,
                                  headers: {
                                    Authorization:
                                      localStorage.getItem("access_token"),
                                  },
                                  method: "DELETE",
                                  timeout: 60000,
                                  params: {},
                                  success: async (resp) => {
                                    Ext.toast({
                                      title: "Deleted Script",
                                      html: "<center>Deleted Script</center>",
                                      autoCloseDelay: 5000,
                                    });
                                    grid.getStore().reload();
                                  },
                                  failure: function (resp) {
                                    Ext.toast({
                                      title: "Failed to Delete Script",
                                      html: "<center>Failed to Delete Script</center>",
                                      autoCloseDelay: 5000,
                                    });
                                    grid.getStore().reload();
                                  },
                                });
                              }
                            },
                          });
                        },
                      },
                    ],
                  },
                ],
              },
              {
                xtype: "splitter",
              },
              {
                xtype: "script",
                itemId: "utilscript",
                type: "utilscripts",
                flex: 3,
                layout: "fit",
              },
            ],
          },
          {
            xtype: "grid",
            title: "Packages",
            itemId: "deps",
            scrollable: true,
            listeners: {
              cellcontextmenu: function (
                table,
                td,
                cellIndex,
                record,
                tr,
                rowIndex,
                e
              ) {
                CLIPBOARD_CONTENTS = td.innerText;
                amfutil.copyTextdata(e);
              },
            },
            rbar: [
              {
                xtype: "button",
                iconCls: "x-fa fa-plus",
                handler: function () {
                  var win = new Ext.window.Window({
                    title: "Add Dependency",
                    width: 600,
                    height: 400,
                    modal: true,
                    layout: "fit",
                    items: [
                      {
                        xtype: "form",
                        bodyPadding: 15,
                        defaults: {
                          labelWidth: 200,
                        },
                        scrollable: true,
                        items: [
                          {
                            xtype: "textfield",
                            fieldLabel: "Dependency Name",
                            name: "name",
                          },
                          {
                            xtype: "container",
                            items: [
                              {
                                xtype: "component",
                                html: "",
                                itemId: "resp",
                                style: {
                                  "white-space": "pre-wrap",
                                },
                              },
                            ],
                          },
                        ],
                        buttons: [
                          {
                            text: "Install",
                            handler: async function () {
                              var form = this.up("form");
                              var deps = amfutil.getElementByID("deps");
                              form.setLoading(true);
                              var values = form.getValues();
                              console.log(values);

                              var resp = await amfutil.ajaxRequest({
                                url: "api/deps",
                                method: "post",
                                jsonData: values,
                              });
                              console.log(resp);
                              var resp = Ext.decode(resp.responseText);

                              amfutil.getElementByID("resp").setHtml(resp);
                              deps.getStore().reload();
                              form.setLoading(false);
                            },
                          },
                          {
                            text: "Close",
                            handler: function () {
                              win.hide();
                            },
                          },
                        ],
                      },
                    ],
                  });
                  win.show();
                },
              },
              {
                xtype: "button",
                iconCls: "x-fa fa-refresh",
                handler: function () {
                  amfutil.getElementByID("deps").getStore().reload();
                },
              },
            ],
            tbar: [
              {
                xtype: "textfield",

                fieldLabel: "Filter",
                listeners: {
                  change: function (scope, val) {
                    var filter = new Ext.util.Filter({
                      filterFn: function (item) {
                        return item.data.name.includes(val);
                      },
                    });

                    var st = amfutil.getElementByID("deps").getStore();
                    st.clearFilter();
                    st.filter(filter);
                  },
                },
              },
            ],
            store: {
              proxy: {
                type: "rest",
                url: `/api/deps`,
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                reader: {
                  type: "json",
                },
                listeners: {
                  exception: amfutil.refresh_on_failure,
                },
              },
              autoLoad: true,
            },
            columns: [
              {
                text: "Name",
                dataIndex: "name",
                flex: 1,
              },
              {
                text: "Version",
                dataIndex: "version",
                flex: 1,
              },
              {
                xtype: "actioncolumn",
                items: [
                  {
                    iconCls: "x-fa fa-arrow-circle-up",
                    handler: function (grid, rowIndex) {
                      var rec = grid.getStore().getAt(rowIndex);

                      Ext.MessageBox.show({
                        title: "Upgrade Package",
                        message: `Are you sure you want to upgrade ${rec.data.name}?`,
                        buttons: Ext.MessageBox.YESNO,
                        defaultFocus: "#no",
                        prompt: false,
                        fn: function (btn) {
                          if (btn == "yes") {
                            var win = new Ext.window.Window({
                              title: "Upgrading Package",
                              loading: true,
                              scrollable: true,
                              width: 600,
                              height: 500,
                              padding: 25,
                              modal: true,
                              items: [
                                {
                                  xtype: "component",
                                  itemId: "delresp",
                                  style: {
                                    "white-space": "pre-wrap",
                                  },
                                },
                              ],
                              buttons: [
                                {
                                  xtype: "button",
                                  text: "Close",
                                  handler: function () {
                                    win.close();
                                  },
                                },
                              ],
                              listeners: {
                                afterrender: function () {
                                  this.setLoading(true);
                                  amfutil.ajaxRequest({
                                    url: `api/deps/${rec.data.name}`,
                                    headers: {
                                      Authorization:
                                        localStorage.getItem("access_token"),
                                    },
                                    method: "PUT",
                                    timeout: 60000,
                                    params: {},
                                    success: async (resp) => {
                                      this.setLoading(false);
                                      Ext.toast({
                                        title: "Upgraded Dependency",
                                        html: "<center>Upgrade Dependency</center>",
                                        autoCloseDelay: 5000,
                                      });
                                      var resp = Ext.decode(resp.responseText);
                                      amfutil
                                        .getElementByID("delresp")
                                        .setHtml(resp);
                                      grid.getStore().reload();
                                    },
                                    failure: function (resp) {
                                      this.setLoading(false);
                                      var resp = Ext.decode(resp.responseText);
                                      amfutil
                                        .getElementByID("delresp")
                                        .setHtml(resp);
                                      Ext.toast({
                                        title:
                                          "Failed to Uninstalled Dependency",
                                        html: "<center>Failed to Uninstalled Dependency</center>",
                                        autoCloseDelay: 5000,
                                      });
                                      grid.getStore().reload();
                                    },
                                  });
                                },
                              },
                            });
                            win.show();
                          }
                        },
                      });
                    },
                  },
                  {
                    iconCls: "x-fa fa-trash",
                    handler: function (grid, rowIndex) {
                      var rec = grid.getStore().getAt(rowIndex);

                      Ext.MessageBox.show({
                        title: "Remove Package",
                        message: `Are you sure you want to remove ${rec.data.name}?`,
                        buttons: Ext.MessageBox.YESNO,
                        defaultFocus: "#no",
                        prompt: false,
                        fn: function (btn) {
                          if (btn == "yes") {
                            var win = new Ext.window.Window({
                              title: "Uninstalling Package",
                              loading: true,
                              scrollable: true,
                              width: 600,
                              height: 500,
                              padding: 25,
                              modal: true,
                              items: [
                                {
                                  xtype: "component",
                                  itemId: "delresp",
                                  style: {
                                    "white-space": "pre-wrap",
                                  },
                                },
                              ],
                              buttons: [
                                {
                                  xtype: "button",
                                  text: "Close",
                                  handler: function () {
                                    win.close();
                                  },
                                },
                              ],
                              listeners: {
                                afterrender: function () {
                                  this.setLoading(true);
                                  amfutil.ajaxRequest({
                                    url: `api/deps/${rec.data.name}`,
                                    headers: {
                                      Authorization:
                                        localStorage.getItem("access_token"),
                                    },
                                    method: "DELETE",
                                    timeout: 60000,
                                    params: {},
                                    success: async (resp) => {
                                      this.setLoading(false);
                                      Ext.toast({
                                        title: "Uninstalled Dependency",
                                        html: "<center>Uninstall Dependency</center>",
                                        autoCloseDelay: 5000,
                                      });
                                      var resp = Ext.decode(resp.responseText);
                                      amfutil
                                        .getElementByID("delresp")
                                        .setHtml(resp);
                                      grid.getStore().reload();
                                    },
                                    failure: function (resp) {
                                      this.setLoading(false);
                                      var resp = Ext.decode(resp.responseText);
                                      amfutil
                                        .getElementByID("delresp")
                                        .setHtml(resp);
                                      Ext.toast({
                                        title:
                                          "Failed to Uninstalled Dependency",
                                        html: "<center>Failed to Uninstalled Dependency</center>",
                                        autoCloseDelay: 5000,
                                      });
                                      grid.getStore().reload();
                                    },
                                  });
                                },
                              },
                            });
                            win.show();
                          }
                        },
                      });
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    }),
    monitoring: () => ({
      view: {
        xtype: "container",
        layout: "card",
        itemId: "monitoring",
        items: [
          {
            xtype: "mainlist",
            title: "Service Monitoring",
            columns: [
              {
                text: "Status",
                xtype: "socketcolumn",
                config: function (data) {
                  return {
                    event: "service",
                    payload: { name: data.name },
                    cond: function () {
                      return (
                        Ext.util.History.getToken().split("/")[0] ==
                        "monitoring"
                      );
                    },
                    callback: function (widget, payload) {
                      var handler = function () {
                        var action = payload ? "stop" : "start";

                        amfutil.ajaxRequest({
                          url: "/api/service/" + data.name,
                          jsonData: {
                            action: action,
                          },
                          method: "POST",
                          timeout: 60000,
                          success: function (res) {
                            Ext.toast(
                              (payload ? "Stopping" : "Starting") +
                                " " +
                                data.name
                            );

                            clicked = true;
                          },
                          failure: function (res) {
                            console.log("failed");
                            clicked = true;
                          },
                        });
                      };
                      widget.removeAll();
                      widget.insert({
                        xtype: "container",

                        cls: "widgetbutton",
                        layout: { type: "hbox", align: "stretch" },
                        defaults: {
                          padding: 5,
                        },
                        listeners: {
                          render: function (scope) {
                            scope.getEl().on("click", handler);
                          },
                        },
                        items: [
                          {
                            xtype: "component",
                            cls: `x-fa fa-${payload ? "stop" : "play"}-circle`,
                          },
                          {
                            xtype: "component",
                            html: payload ? "Stop" : "Start",
                          },
                          {
                            xtype: "container",
                            layout: "center",
                            items: [
                              {
                                xtype: "component",
                                html: `<div class="led ${
                                  payload ? "green" : "red"
                                }"></div>`,
                              },
                            ],
                          },
                        ],
                      });
                    },
                  };
                },
              },
              {
                text: "Pending",
                xtype: "socketcolumn",
                width: "2rem",
                config: function (data) {
                  if (data.type == "subscriber" || data.type == "history") {
                    return {
                      event: "consumer",
                      cond: function () {
                        return (
                          Ext.util.History.getToken().split("/")[0] ==
                          "monitoring"
                        );
                      },
                      payload: {
                        name: data.name,
                        topic: data.topic,
                        local: data.local,
                      },
                    };
                  }
                },
              },
              {
                text: "Name",
                dataIndex: "name",
                flex: 1,
              },
              {
                text: "Type",
                dataIndex: "type",
                flex: 1,
              },
              {
                text: "Description",
                dataIndex: "desc",
                flex: 1,
              },
              {
                text: "Port",
                dataIndex: "port",
                flex: 1,
              },
              {
                text: "Topic",
                dataIndex: "topic",
                flex: 1,
              },
            ],
            store: amfutil.createCollectionStore(
              "services",
              {},
              { autoLoad: true }
            ),
            listeners: {
              beforerender: function (scope) {
                scope.getStore().reload();
              },
              dblclick: {
                element: "body",
                fn: function (grid, rowIndex, e, obj) {
                  var record = grid.record.data;

                  var m = amfutil.getElementByID("monitoring");
                  m.setActiveItem(1);
                  var list = amfutil.getElementByID("events");
                  var logs = amfutil.getElementByID("logs");

                  logs.setStore(
                    amfutil.createCollectionStore(
                      "service_logs",
                      {
                        name: record.name,
                      },
                      {
                        sorters: [
                          {
                            property: "etime",
                            direction: "DESC",
                          },
                        ],
                      }
                    )
                  );

                  var tab = amfutil.getElementByID("tab");

                  tab.setTitle(record.name);

                  if (record.type == "subscriber") {
                    list.setStore(
                      amfutil.createCollectionStore(
                        "message_events",
                        {
                          subscriber: record.name,
                        },
                        {
                          sorters: [
                            {
                              property: "etime",
                              direction: "DESC",
                            },
                          ],
                        }
                      )
                    );
                  } else {
                    list.setStore(
                      amfutil.createCollectionStore(
                        "message_events",
                        {
                          service: record.name,
                          status: "received",
                          parent: { $exists: false },
                        },
                        {
                          sorters: [
                            {
                              property: "etime",
                              direction: "DESC",
                            },
                          ],
                        }
                      )
                    );
                  }
                },
              },
              sortchange: function () {
                console.log("change");
              },
            },
          },
          {
            xtype: "panel",
            itemId: "service",
            layout: "fit",
            tbar: [
              {
                text: "Back",
                iconCls: "x-fa fa-arrow-circle-left",
                handler: function () {
                  amfutil.getElementByID("monitoring").setActiveItem(0);
                },
              },
            ],
            items: [
              {
                xtype: "tabpanel",
                itemId: "tab",
                layout: "fit",

                items: [
                  {
                    xtype: "grid",
                    flex: 1,

                    title: "Recent Messages",
                    itemId: "events",
                    listeners: {
                      beforerender: function () {
                        var config = ampsgrids.grids.message_events();
                        this.reconfigure(null, config.columns);
                        // this.setListeners({
                        //   dblclick: config.dblclick,
                        // });
                      },
                    },
                    bbar: {
                      xtype: "pagingtoolbar",
                      displayInfo: true,
                    },
                  },
                  {
                    xtype: "grid",
                    flex: 1,

                    title: "Service Logs",
                    itemId: "logs",
                    listeners: {
                      beforerender: function () {
                        var config = ampsgrids.grids.system_logs();
                        this.setListeners({
                          dblclick: {
                            element: "body", //bind to the underlying body property on the panel
                            fn: function (grid, rowIndex, e, obj) {
                              var record = grid.record.data;
                              console.log(record);
                              var win = new Ext.window.Window({
                                title: `Service Log | Time: ${record["etime"]}`,
                                width: 700,
                                height: 500,
                                layout: "fit",
                                items: [
                                  {
                                    xtype: "container",
                                    padding: 20,
                                    style: {
                                      background: "var(--main-color)",
                                    },
                                    scrollable: true,

                                    items: [
                                      {
                                        xtype: "component",

                                        style: {
                                          background: "var(--main-color)",
                                          "white-space": "pre-wrap",
                                          "font-weight": "500",
                                          color: "white",
                                          // "font-size": "1.5rem",
                                        },
                                        html: record["reason"],
                                      },
                                    ],
                                  },
                                ],
                              });
                              win.show();
                            },
                          },
                        });
                      },
                    },
                    columns: [
                      {
                        text: "Service Name",
                        dataIndex: "name",
                        flex: 1,
                        value: "true",
                        type: "text",
                      },
                      {
                        text: "Event Time",
                        dataIndex: "etime",
                        flex: 1,
                        type: "date",
                        renderer: function (val) {
                          var date = new Date(val);
                          return date.toString();
                        },
                      },
                      {
                        text: "Status",
                        dataIndex: "status",
                        flex: 1,
                      },
                      {
                        text: "Reason",
                        dataIndex: "reason",
                        flex: 1,
                      },
                    ],
                    bbar: {
                      xtype: "pagingtoolbar",
                      displayInfo: true,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    }),
    consumers: () => {
      // amfutil.ajaxRequest({
      //   url: "api/streams",
      //   success: function (resp) {
      //     var streams = Ext.decode(resp.responseText);
      //     console.log(streams);

      //     amfutil.getElementByID("consumers").insert(tabPanel);
      //   },
      // });

      return {
        view: {
          xtype: "consumers",
        },
      };
    },
    wizard: () => ({
      view: {
        xtype: "wizard",
        title: "Amps Wizard",
      },
    }),
    defaults: () => {
      return {
        // actionIcons: [
        //   {
        //     xtype: "button",
        //     itemId: "addnewbtn",
        //     iconCls: "x-fa fa-plus-circle",
        //     tooltip: "Add New",
        //     handler: function () {
        //       var win = new Ext.window.Window({
        //         title: "Add Default",
        //         modal: true,
        //         resizable: false,
        //         layout: "fit",
        //         items: [
        //           {
        //             xtype: "form",
        //             defaults: {
        //               padding: 5,
        //               labelWidth: 140,
        //               width: 400,
        //             },
        //             items: [
        //               {
        //                 xtype: "textfield",
        //                 name: "field",
        //                 fieldLabel: "Field",
        //               },
        //               {
        //                 xtype: "textfield",
        //                 name: "value",
        //                 fieldLabel: "Value",
        //               },
        //             ],
        //             buttons: [
        //               {
        //                 text: "Save",
        //                 itemId: "addaccount",
        //                 cls: "button_class",
        //                 formBind: true,
        //                 listeners: {
        //                   click: async function (btn) {
        //                     var form = btn.up("form").getForm();
        //                     var values = form.getValues();
        //                     var g = amfutil.getElementByID("pagegrid");
        //                     var mask = new Ext.LoadMask({
        //                       msg: "Please wait...",
        //                       target: g,
        //                     });
        //                     amfutil.ajaxRequest({
        //                       headers: {
        //                         Authorization:
        //                           localStorage.getItem("access_token"),
        //                       },
        //                       url: `api/services/` + g.dataId + "/defaults",
        //                       method: "POST",
        //                       timeout: 60000,
        //                       jsonData: values,
        //                       success: function (response) {
        //                         mask.hide();
        //                         btn.setDisabled(false);
        //                         win.destroy();

        //                         var data = Ext.decode(response.responseText);
        //                         Ext.toast("Added Default");
        //                         amfutil.broadcastEvent("update", {
        //                           page: Ext.util.History.getToken(),
        //                         });
        //                         g.getStore().reload();
        //                       },
        //                       failure: function (response) {
        //                         mask.hide();
        //                         btn.setDisabled(false);
        //                         msg = response.responseText.replace(/['"]+/g, "");
        //                         amfutil.onFailure("Failed to Add", response);
        //                       },
        //                     });
        //                   },
        //                 },
        //               },
        //               {
        //                 text: "Cancel",
        //                 cls: "button_class",
        //                 listeners: {
        //                   click: function (btn) {
        //                     win.destroy();
        //                   },
        //                 },
        //               },
        //             ],
        //           },
        //         ],
        //       });
        //       win.show();
        //     },
        //   },
        //   { xtype: "tbfill" },
        //   // {
        //   //   xtype: "button",
        //   //   itemId: "searchpanelbtn",
        //   //   iconCls: "x-fa fa-search",
        //   //   handler: "onSearchPanel",
        //   //   tooltip: "Filter Records",
        //   //   style: "font-weight:bold;color:red;",
        //   // },
        //   // {
        //   //   xtype: "button",
        //   //   itemId: "clearfilter",
        //   //   html: '<img src="resources/images/clear-filters.png" />',
        //   //   handler: "onClearFilter",
        //   //   tooltip: "Clear Filter",
        //   //   style: "cursor:pointer;",
        //   // },
        //   {
        //     xtype: "button",
        //     itemId: "refreshbtn",
        //     iconCls: "x-fa fa-refresh",
        //     tooltip: "Refresh",
        //     handler: function (scope) {
        //       amfutil.getElementByID("pagegrid").getStore().reload();
        //     },
        //   },
        // ],
        view: {
          xtype: "tabpanel",
          scrollable: true,
          title: "System Configuration",
          // padding: 20,
          // bodyPadding: 20,

          // defaults: {
          //   margin: 10,
          // },
          items: [
            {
              xtype: "form",
              title: "System Settings",
              flex: 1,

              loadConfig: async function () {
                var fc = this.down("fieldcontainer");
                // fc.removeAll();
                this.setMasked(true);
                // this._id = record._id;
                var data = await amfutil.getCollectionData("config", {
                  name: "SYSTEM",
                });
                console.log(data);
                var record = data[0];
                var config = {
                  object: "System Configuration",
                  fields: [
                    {
                      xtype: "fieldcontainer",
                      layout: {
                        type: "vbox",
                        align: "stretch",
                      },
                      defaults: {
                        labelWidth: 200,
                      },
                      items: [
                        {
                          xtype: "hidden",
                          name: "name",
                          value: "SYSTEM",
                        },
                        amfutil.text("Module Path", "python_path"),
                        // amfutil.text("Permanent Storage Root", "storage_root"),
                        amfutil.text("Temp Storage Path", "storage_temp"),
                        // amfutil.text("Log Path", "storage_logs"),
                        {
                          xtype: "numberfield",
                          name: "hinterval",
                          fieldLabel: "History Interval(ms)",
                          allowBlank: false,
                        },
                        {
                          xtype: "numberfield",
                          name: "TTL (days)",
                          fieldLabel: "Time to Live(Days)",
                          allowBlank: false,
                        },
                        amfutil.check("Archive Messages", "archive", {
                          listeners: amfutil.renderListeners(function (
                            scope,
                            val
                          ) {
                            var a = amfutil.getElementByID("archive");
                            a.setHidden(!val);
                            a.setDisabled(!val);
                          }),
                        }),
                        amfutil.dynamicCreate(
                          amfutil.combo(
                            "Archive Provider",
                            "aprovider",
                            amfutil.createCollectionStore("providers", {
                              type: "archive",
                            }),
                            "_id",
                            "name"
                          ),
                          "providers",
                          {
                            itemId: "archive",
                            defaults: {
                              labelWidth: 200,
                            },
                          }
                        ),
                        amfutil.check("Use Email", "email", {
                          listeners: amfutil.renderListeners(function (
                            scope,
                            val
                          ) {
                            var a = amfutil.getElementByID("email");
                            a.setHidden(!val);
                            a.setDisabled(!val);
                          }),
                        }),
                        amfutil.dynamicCreate(
                          amfutil.combo(
                            "Email Provider",
                            "eprovider",
                            amfutil.createCollectionStore("providers", {
                              type: "smtp",
                            }),
                            "_id",
                            "name"
                          ),
                          "providers",
                          {
                            itemId: "email",
                            defaults: {
                              labelWidth: 200,
                            },
                          }
                        ),
                        {
                          xtype: "displayfield",
                          name: "modifiedby",
                          fieldLabel: "Last Modified By",
                        },
                        {
                          xtype: "displayfield",
                          name: "modified",
                          fieldLabel: "Modified On",
                        },
                      ],
                    },
                  ],
                };

                var myForm = Ext.create("Amps.form.update");
                myForm.loadForm(config, record, false, `config`);
                this.insert(myForm);

                // this.getForm().setValues(record);

                // this.setMasked(false);
              },
              // items: ,
              // buttons: [
              //   {
              //     xtype: "button",
              //     formBind: true,
              //     text: "Update",
              //     handler: function (scope) {
              //       var form = scope.up("form");
              //       form.setLoading(true);
              //       var values = scope.up("form").getForm().getValues();
              //       console.log(values);
              //       var id = scope.up("form")._id;

              //       var user = amfutil.get_user();

              //       values.modifiedby = user.firstname + " " + user.lastname;
              //       values.modified = new Date().toISOString();

              //       values = amfutil.convertNumbers(form.getForm(), values);

              //       amfutil.ajaxRequest({
              //         headers: {
              //           Authorization: localStorage.getItem("access_token"),
              //         },
              //         url: "/api/config/" + id,
              //         method: "POST",
              //         timeout: 60000,
              //         params: {},
              //         jsonData: values,
              //         success: function () {
              //           form.setLoading(false);

              //           form.loadConfig();
              //         },
              //         failure: function () {
              //           form.setLoading(false);

              //           mask.hide();
              //         },
              //       });
              //     },
              //   },
              // ],
              listeners: {
                beforerender: function (scope) {
                  scope.loadConfig();
                },
              },
            },
            {
              xtype: "panel",
              title: "Logo",
              flex: 1,
              items: [
                {
                  xtype: "panel",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  // defaults: {
                  //   margin: 5,
                  // },
                  // style: {
                  //   "border-width": "5px",
                  //   "border-style": "solid",
                  // },
                  width: 500,
                  items: [
                    {
                      xtype: "component",
                      width: 500,
                      height: 125,
                      style: {
                        background: "var(--secondary-color)",
                      },
                      itemId: "cropper",
                      brightness: 90,
                      replaceColor: { r: 255, g: 255, b: 255 },
                      replace: false,
                      cropper: null,
                      editing: false,
                      edit: function () {
                        this.editing = !this.editing;
                        var image = amfutil.getElementByID("image");
                        var editing = amfutil.getElementByID("editing");
                        var viewing = amfutil.getElementByID("viewing");
                        var display = amfutil.getElementByID("display");

                        image.setHidden(!this.editing);
                        editing.setHidden(!this.editing);
                        display.setHidden(!this.editing);

                        viewing.setHidden(this.editing);
                        if (this.editing) {
                          this.updateImage("images/logo");
                        } else {
                          this.getEl().el.child("img").dom.src = "images/logo";
                          this.cropper.destroy();
                        }
                      },

                      updateReplace: function (v) {
                        this.replace = v;
                        amfutil.getElementByID("replace").setDisabled(!v);

                        this.updateDisplay();
                      },
                      updateColor: function (v) {
                        console.log(v);
                        var v = amfutil.hexToRgb(v);
                        console.log(v);
                        this.replaceColor = v;
                        this.updateDisplay();
                      },
                      updateBrightness: function (v) {
                        this.brightness = v;
                        this.updateDisplay();
                      },
                      updateWhiten: function (v) {
                        this.whiten = v;
                        amfutil.getElementByID("brightness").setDisabled(!v);
                        this.updateDisplay();
                      },

                      updateDisplay: function () {
                        var scope = this;
                        var cv = this.cropper.getCroppedCanvas({
                          width: 500,
                          height: 125,
                        });
                        var ctx = cv.getContext("2d");

                        const imageData = ctx.getImageData(
                          0,
                          0,
                          cv.width,
                          cv.height
                        );
                        const data = imageData.data;
                        var color = scope.bgColor;
                        for (var i = 0; i < data.length; i += 4) {
                          if (data[i + 3] == 0) {
                            data[i] = color.r;
                            data[i + 1] = color.g;
                            data[i + 2] = color.b;
                            data[i + 3] = 255;
                          } else {
                            var brightness = amfutil.luminance(
                              data[i],
                              data[i + 1],
                              data[i + 2]
                            );
                            if (brightness > scope.brightness / 100) {
                              if (scope.whiten) {
                                data[i] = color.r;
                                data[i + 1] = color.g;
                                data[i + 2] = color.b;
                                data[i + 3] = 255;
                              }
                            } else {
                              if (scope.replace) {
                                data[i] = scope.replaceColor.r; // red
                                data[i + 1] = scope.replaceColor.g; // green
                                data[i + 2] = scope.replaceColor.b;
                              }
                            }
                          }
                        }
                        ctx.putImageData(imageData, 0, 0);

                        var canvas = amfutil.getElementByID("show").getEl().dom;

                        function removeAllChildNodes(parent) {
                          while (parent.firstChild) {
                            parent.removeChild(parent.firstChild);
                          }
                        }
                        removeAllChildNodes(canvas);
                        canvas.appendChild(cv);
                      },
                      updateImage: function (src) {
                        var scope = this;
                        this.up("panel").setLoading(true);
                        if (this.cropper) {
                          this.cropper.destroy();
                        }

                        var img = this.getEl().el.child("img").dom;
                        console.log(img);
                        img.src = src;
                        var color = getComputedStyle(
                          document.documentElement
                        ).getPropertyValue("--secondary-color");
                        console.log(color);
                        color = amfutil.hexToRgb(color);
                        this.bgColor = color;
                        console.log(color);
                        this.cropper = new window.cropper(img, {
                          aspectRatio: 4,
                          viewMode: 0,
                          dragMode: "move",
                          cropBoxResizable: false,
                          cropBoxMovable: false,
                          minCropBoxHeight: 125,
                          minCropBoxWidth: 500,
                          crop: function () {
                            scope.updateDisplay();
                          },
                        });

                        this.up("panel").setLoading(false);
                      },
                      autoEl: {
                        tag: "div",
                        children: [
                          {
                            tag: "img",
                            src: "images/logo",

                            style: {
                              display: "block",
                              "max-width": "100%",
                            },
                          },
                        ],
                      },
                    },
                    {
                      xtype: "filefield",
                      hidden: true,
                      name: "logo",
                      fieldLabel: "Select Image",
                      accept: [".png", ".jpeg", ".svg", ".gif", ".jpg"],
                      // labelWidth: 50,
                      isFileUpload: false,
                      msgTarget: "side",
                      margin: {
                        top: 5,
                      },
                      itemId: "image",
                      anchor: "100%",
                      buttonText: "Select Image...",
                      listeners: {
                        change: function (scope, val) {
                          var cp = amfutil.getElementByID("cropper");
                          // var ff = amfutil.getElementByID("image");
                          if (val && val != "") {
                            this.up("panel").setLoading(true);
                            var file = this.extractFileInput().files[0];
                            if (FileReader && file) {
                              var fr = new FileReader();
                              fr.onload = () => {
                                this.up("panel").setLoading(false);

                                cp.updateImage(fr.result);
                              };
                              fr.readAsDataURL(file);
                            }
                          }
                        },
                      },
                    },
                    {
                      xtype: "container",
                      layout: {
                        type: "vbox",
                        align: "stretch",
                      },
                      itemId: "display",
                      hidden: true,
                      items: [
                        {
                          xtype: "component",
                          autoEl: "h3",
                          html: "Preview",
                        },
                        {
                          xtype: "component",
                          autoEl: "span",
                          html: "Preview will appear with lower resolution than final image.",
                        },
                        {
                          xtype: "component",
                          margin: {
                            top: 5,
                          },
                          width: 500,
                          height: 125,
                          itemId: "show",
                          id: "show",

                          autoEl: {
                            tag: "div",
                          },
                        },
                        amfutil.check("Apply Transparency", "edit", {
                          labelWidth: 200,
                          listeners: {
                            change: function (scope, v) {
                              amfutil.getElementByID("cropper").updateWhiten(v);
                            },
                            beforerender: function () {
                              this.setValue(
                                amfutil.getElementByID("cropper").whiten
                              );
                            },
                          },
                        }),
                        {
                          xtype: "slider",
                          labelWidth: 200,

                          disabled: true,
                          fieldLabel: "Transparency Threshold",
                          width: 100,
                          increment: 1,
                          itemId: "brightness",
                          minValue: 0,
                          maxValue: 100,
                          listeners: {
                            beforerender: function () {
                              this.setValue(
                                amfutil.getElementByID("cropper").brightness
                              );
                            },
                            changecomplete: function (p, v) {
                              amfutil
                                .getElementByID("cropper")
                                .updateBrightness(v);
                              console.log(v);
                            },
                          },
                        },
                        amfutil.check("Apply Fill Color", "replace", {
                          labelWidth: 200,

                          listeners: {
                            change: function (scope, v) {
                              amfutil
                                .getElementByID("cropper")
                                .updateReplace(v);
                            },
                            beforerender: function () {
                              this.setValue(
                                amfutil.getElementByID("cropper").replace
                              );
                            },
                          },
                        }),
                        {
                          xtype: "colorfield",
                          labelWidth: 200,

                          fieldLabel: "Fill Color",
                          disabled: true,
                          itemId: "replace",
                          listeners: {
                            beforerender: function () {
                              var c =
                                amfutil.getElementByID("cropper").replaceColor;
                              this.setValue(c);
                              this.setListeners({
                                change: function (field, color) {
                                  console.log("change");
                                  amfutil
                                    .getElementByID("cropper")
                                    .updateColor(color);
                                },
                              });
                            },
                          },
                        },
                      ],
                    },
                  ],
                  buttons: [
                    {
                      xtype: "button",
                      itemId: "viewing",
                      text: "Edit",
                      iconCls: "x-fa fa-pencil",
                      handler: function () {
                        var cp = amfutil.getElementByID("cropper");
                        cp.edit();
                      },
                    },
                    {
                      xtype: "container",
                      layout: {
                        type: "hbox",
                      },
                      hidden: true,
                      whiten: false,
                      itemId: "editing",
                      items: [
                        {
                          xtype: "button",
                          iconCls: "x-fa fa-upload",

                          text: "Update Logo",
                          handler: function () {
                            this.up("panel").setLoading(true);
                            var scope = amfutil.getElementByID("cropper");

                            var cp = scope.cropper;

                            var cv = cp.getCroppedCanvas({
                              width: 1000,
                              height: 250,
                            });
                            var ctx = cv.getContext("2d");
                            var invert = function () {
                              const imageData = ctx.getImageData(
                                0,
                                0,
                                cv.width,
                                cv.height
                              );
                              const data = imageData.data;
                              for (var i = 0; i < data.length; i += 4) {
                                if (data[i + 3] == 0) {
                                } else {
                                  var brightness = amfutil.luminance(
                                    data[i],
                                    data[i + 1],
                                    data[i + 2]
                                  );

                                  if (brightness > scope.brightness / 100) {
                                    if (scope.whiten) {
                                      data[i + 3] = 0;
                                    }
                                  } else {
                                    if (scope.replace) {
                                      data[i] = scope.replaceColor.r; // red
                                      data[i + 1] = scope.replaceColor.g; // green
                                      data[i + 2] = scope.replaceColor.b;
                                    }
                                  }
                                }
                              }

                              ctx.putImageData(imageData, 0, 0);

                              // var canvas = amfutil
                              //   .getElementByID("show")
                              //   .getEl().dom;
                              // canvas.appendChild(cv);
                            };
                            invert();

                            var url = cv.toDataURL();
                            console.log(url);
                            var imgdata = url.replace(
                              "data:image/png;base64,",
                              ""
                            );
                            console.log(imgdata);
                            amfutil.ajaxRequest({
                              method: "post",
                              url: "api/system/logo",
                              jsonData: {
                                logo: imgdata,
                              },
                              success: () => {
                                this.up("panel").setLoading(false);

                                window.location.reload();
                              },
                              failure: function () {
                                Ext.toast("Could not update logo");
                              },
                            });
                          },
                        },
                        {
                          xtype: "button",
                          iconCls: "x-fa fa-ban",

                          text: "Cancel",
                          handler: function () {
                            var cp = amfutil.getElementByID("cropper");

                            cp.edit();
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              xtype: "panel",
              title: "Administration",
              flex: 1,
              layout: {
                type: "vbox",
              },

              margin: 15,

              items: [
                {
                  xtype: "fieldcontainer",
                  defaults: {
                    padding: 20,
                  },
                  listeners: {
                    render: async function () {
                      this.setLoading(true);
                      var resp = await amfutil.ajaxRequest({
                        url: "api/system/ssl",
                        failure: function () {
                          Ext.toast("Failed to Initiate SSL Certification");
                          this.up("tabpanel").setLoading(false);
                        },
                      });

                      this.setDisabled(!Ext.decode(resp.responseText));
                      this.setLoading(false);
                    },
                  },
                  items: [
                    {
                      xtype: "button",
                      text: "Perform SSL Certification",

                      handler: async function () {
                        this.up("tabpanel").setLoading(true);
                        var resp = await amfutil.ajaxRequest({
                          url: "api/system/ssl/certify",
                          failure: function () {
                            Ext.toast("Failed to Initiate SSL Certification");
                            this.up("tabpanel").setLoading(false);
                          },
                        });
                        // var text = Ext.decode(resp.responseText);
                        Ext.toast(
                          "Initiated Certification, Check System Logs for Details"
                        );
                        this.up("tabpanel").setLoading(false);
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
    },
    // demos: () => ({
    //   actionbar: [{
    //     iconCls: "x-fa fa-upload",

    //   }],
    //   view: {
    //     xtype: "panel",
    //     layout: "fit",
    //     title: "Demos",
    //     items: [
    //       {
    //         xtype: "container",
    //         layout: {
    //           type: "hbox",
    //           align: "stretch",
    //         },
    //         items: [
    //           {
    //             flex: 1,
    //             xtype: "grid",
    //             store: amfutil.createCollectionStore("demos"),
    //             listeners: {
    //               select: function (scope, record, index, eOpts) {
    //                 amfutil
    //                   .getElementByID("readme")
    //                   .setHtml(record.data.readme);
    //                 amfutil
    //                   .getElementByID("editor")
    //                   .setValue(record.data.readme);
    //               },
    //             },
    //             columns: [
    //               {
    //                 text: "Name",
    //                 dataIndex: "name",
    //                 flex: 1,
    //               },
    //               {
    //                 text: "Description",
    //                 dataIndex: "desc",
    //                 flex: 1,
    //               },
    //             ],
    //             bbar: [
    //               {
    //                 xtype: "pagingtoolbar",
    //               },
    //             ],
    //           },
    //           {
    //             flex: 1,
    //             xtype: "panel",
    //             layout: "fit",
    //             autoDestroy: false,
    //             items: [
    //               {
    //                 xtype: "container",
    //                 // title: "README",
    //                 scrollable: true,
    //                 // style: {
    //                 //   border: "2px solid var(--main-color)",
    //                 // },
    //                 padding: 5,
    //                 items: [
    //                   {
    //                     itemId: "readme",
    //                     scrollable: true,

    //                     xtype: "component",
    //                   },
    //                 ],
    //               },
    //             ],
    //           },
    //         ],
    //       },
    //     ],
    //   },
    // }),
    workflows: () => ({
      view: {
        xtype: "panel",
        title: "Visualizer",
        layout: "fit",
        items: [
          {
            xtype: "workflow",
          },
        ],
      },
    }),
    imports: () => ({
      view: {
        xtype: "panel",
        title: "Imports",
        layout: "fit",
        items: [
          {
            xtype: "imports",
          },
        ],
      },
    }),
  },
});
