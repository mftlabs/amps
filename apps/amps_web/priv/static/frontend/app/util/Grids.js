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
              xtype: "form",
              layout: {
                type: "hbox",
              },
              defaults: { margin: 5 },

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

                {
                  xtype: "button",
                  text: "Add to Router",
                  handler: function (scope) {
                    var rule = scope
                      .up("form")
                      .down("combobox")
                      .getSelectedRecord();
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
                      var cb = ampsgrids.grids
                        .services()
                        .types[rec.type].combo(rec);
                      console.log(cb);
                      scope.insert(cb);
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
                              amfutil.createCollectionStore("fields"),
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
            choices: {},
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

                console.log(fields.items);
                var services = ampsgrids.grids.services();

                if (services.types[service.type].format) {
                  final = services.types[service.type].format(final);
                }
                console.log(final);
                topic = "amps.svcs." + service.name + "." + final;
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
                  if (step.steps.length && step.steps[0].loop) {
                    console.log("loop");
                    console.log(step);
                    steps.insert({
                      xtype: "workflowstep",
                      step: Ext.apply(step, {
                        step: step.steps[0],
                      }),
                      steps: steps,
                      form: form,
                    });
                  } else {
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
                      var ws = {
                        xtype: "container",
                        layout: {
                          type: "vbox",
                          align: "stretch",
                        },
                        style: {
                          "border-style": "solid",
                          borderColor: "var(--main-color)",
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

                          for (
                            var i = steps.items.items.length;
                            i > curr;
                            i--
                          ) {
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
                        items: [
                          workflowstep,
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
                                  this.up("container").up("container").select();
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
                        ],
                      };

                      cont.insert(ws);
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
                  }
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
    var streams = ["SERVICES", "ACTIONS", "DATA", "EVENTS", "MAILBOX"];
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
                }, 500);
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
            background: "red",
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
                      color: "red",
                    },
                    cls: "x-fa fa-warning",
                  },
                ],
              },
              {
                xtype: "container",
                layout: "center",
                maxWidth: "100%",

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
                items: [
                  {
                    xtype: "component",
                    maxWidth: "100%",

                    html: "Update previous action, or assign different action to subscriber.",
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
              this.setHandler(function () {
                var win = Ext.create({
                  xtype: "wfwindow",
                  service: rec,
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
          this.setStore(
            amfutil.createCollectionStore("services", { communication: true })
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
          this.setStore(amfutil.createCollectionStore("scheduler"));
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
          text: "Customer",
          dataIndex: "customer",
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
  title: "Imports",
  itemId: "imports",
  layout: "card",
  constructor: function (args) {
    this.callParent([args]);
  },
  tbar: [
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
      width: 150,
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
          var progress = amfutil.getElementByID("progress");
          var num = 0;
          var length = this.widgets.length;

          if (this.widgets) {
            this.up("imports").setActiveItem(1);
          }

          var start = this.start;
          var widgets = this.widgets;
          for (var widget of widgets) {
            await new Promise((resolve) => setTimeout(resolve, 25));
            await widget.promise();
            num++;
            progress.updateProgress(num / length);
          }
          if (this.importing) {
            this.importRecords();
          } else {
            this.invalids = 0;
            this.up("imports").setActiveItem(0);
          }
          if (this.importing) {
          } else {
            if (this.widgets.length > 0) {
              console.log(this.widgets);
              amfutil
                .getElementByID("left")
                .setDisabled(this.data.length <= 25);
              amfutil
                .getElementByID("right")
                .setDisabled(this.data.length <= 25);
            }
          }
        },
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
        if (this.data.length > 0) {
          this.up("imports").setActiveItem(1);
        } else {
          this.up("imports").setActiveItem(0);
        }

        if (!this.importing) {
          amfutil.getElementByID("load").setDisabled(false);
          amfutil.getElementByID("import").setDisabled(false);
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
          if (valid) {
            var form = item.win.down("form");
            var values = form.process(form, form.getValues());

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

              route = grid.route + "/" + id;
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
        this.setLoading(false);
        this.up("imports").setActiveItem(0);

        // this.importing = false;

        if (this.start + 25 > this.data.length) {
          this.importing = false;
          this.data = this.data.filter((n) => n);
          this.start = 1;
          this.loadRecords();
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
                                        (subgrid) => subgrid.grid == true
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
                                  if (sg[1].grid) {
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
                                var win = Ext.create("Ext.window.Window", {
                                  title: "Edit Data",
                                  modal: true,
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
                                });
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
                                await win.duplicateCheck();
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
        "font-size": "2rem",
      },

      items: [
        {
          xtype: "container",
          layout: "anchor",
          defaults: {
            margin: 100,
          },
          items: [
            {
              xtype: "component",
              anchor: "100%",

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

              // console.log(action);
              // console.log(topic);
              scope.insert(
                0,
                fields.map((field) => {
                  console.log(field);
                  if (field.dynamic) {
                    field = amfutil.dynamicRemove(field);
                  }
                  if (field.name == "handler" || field.name == "topic") {
                    field.readOnly = true;
                    field.forceSelection = false;
                  }
                  return field;
                })
              );
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
          renderer: function (val) {
            var date = new Date(val);
            return date.toString();
          },
        },
      ],
    }),
    providers: () => ({
      object: "Provider",
      window: { height: 600, width: 600 },

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
      types: {
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
                listeners: amfutil.renderListeners(function render(scope, val) {
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
                  null,
                  {
                    tooltip: "The AWS Region your S3 Buckets are hosted on.",
                  }
                ),
              ],
            },

            {
              xtype: "textfield",
              name: "key",
              fieldLabel: "Access Id",
              tooltip: "Your S3 Access Key ID Credential",
            },
            {
              xtype: "textfield",
              name: "secret",
              fieldLabel: "Access Key",
              inputType: "password",
              tooltip: "Your S3 Secret Access Key Credential",
            },
            {
              xtype: "checkbox",
              name: "proxy",
              fieldLabel: "Use Proxy",
              uncheckedValue: false,
              tooltip: "Whether to use a proxy for the S3 connection",
              inputValue: true,
              listeners: {
                afterrender: function (scope) {
                  var val = scope.getValue();
                  var components = ["#proxy"];
                  components.forEach((name) => {
                    var component = scope.up("form").down(name);
                    component.setHidden(!val);
                    component.setDisabled(!val);
                  });
                },
                change: function (scope, val) {
                  var components = ["#proxy"];
                  components.forEach((name) => {
                    var component = scope.up("form").down(name);
                    component.setHidden(!val);
                    component.setDisabled(!val);
                  });
                },
              },
            },
            {
              xtype: "fieldcontainer",
              itemId: "proxy",
              items: [
                {
                  xtype: "textfield",
                  itemId: "proxyurl",
                  name: "proxy_url",
                  tooltip: "The URL for the proxy connection",
                  fieldLabel: "Proxy Url",
                },
                {
                  xtype: "textfield",
                  itemId: "proxyusername",
                  tooltip: "The proxy username",

                  name: "proxy_username",
                  fieldLabel: "Proxy Username",
                },
                {
                  xtype: "textfield",
                  itemId: "proxypassword",
                  tooltip: "The proxy password",

                  name: "proxy_password",
                  fieldLabel: "Proxy Password",
                },
              ],
            },
          ],
        },
        kafka: {
          field: "kafka",
          label: "Kafka",
          fields: [
            amfutil.infoBlock(
              "A list of Kafka brokers to connect to, provided in host-port pairs."
            ),
            {
              xtype: "arrayfield",
              name: "brokers",
              title: "Brokers",

              arrayfield: "Broker",
              arrayfields: [
                {
                  xtype: "textfield",
                  name: "host",
                  fieldLabel: "Host",
                  vtype: "ipandhostname",
                },
                {
                  xtype: "numberfield",
                  name: "port",
                  fieldLabel: "Port",
                  minValue: 1,
                },
              ],
            },
            {
              xtype: "radiogroup",
              fieldLabel: "Authentication",
              name: "auth",
              allowBlank: false,
              columns: 2,
              vertical: true,
              tooltip: "The Kafka authentication method",
              items: [
                { boxLabel: "None", name: "auth", inputValue: "NONE" },
                {
                  boxLabel: "SASL_PLAINTEXT",
                  name: "auth",
                  inputValue: "SASL_PLAINTEXT",
                },
                {
                  boxLabel: "SASL_SSL",
                  name: "auth",
                  inputValue: "SASL_SSL",
                },
                {
                  boxLabel: "SSL",
                  name: "auth",
                  inputValue: "SSL",
                },
              ],
              listeners: amfutil.renderListeners(function (scope, val) {
                if (typeof val === "object" && val !== null) {
                  val = val.auth || "";
                }

                var sasl = scope.up("form").down("#sasl");
                var ssl = scope.up("form").down("#ssl");

                sasl.setHidden(!val.includes("SASL"));
                sasl.setDisabled(!val.includes("SASL"));

                ssl.setHidden(!val.includes("SSL"));
                ssl.setDisabled(!val.includes("SSL"));
              }),
            },
            {
              xtype: "fieldcontainer",
              itemId: "sasl",
              layout: {
                type: "vbox",
                align: "stretch",
              },
              items: [
                amfutil.localCombo(
                  "SASL Mechanism",
                  "mechanism",
                  [
                    { field: "Plain", value: "plain" },
                    { value: "scram_sha_256", field: "SCRAM SHA 256" },
                    { value: "scram_sha_512", field: "SCRAM SHA 512" },
                  ],
                  "value",
                  "field",
                  {
                    itemId: "sasl-mech",
                    tooltip: "The SASL Mechanism for SASL Auth",
                  }
                ),
                {
                  itemId: "sasl-username",
                  allowBlank: false,

                  xtype: "textfield",
                  name: "username",
                  fieldLabel: "Username",
                  tooltip: "The Username for SASL Auth",
                },
                {
                  itemId: "sasl-password",
                  allowBlank: false,

                  xtype: "textfield",
                  name: "password",
                  fieldLabel: "Password",
                  tooltip: "The Password for SASL Auth",
                },
              ],
            },

            {
              xtype: "fieldcontainer",
              itemId: "ssl",
              layout: {
                type: "vbox",
                align: "stretch",
              },
              items: [
                amfutil.loadKey("Certificate Authority Certificate", "cacert", {
                  tooltip: "The Certificate Authority Certificate for SSL Auth",
                }),
                amfutil.loadKey("Client Certificate", "cert", {
                  tooltip: "The Client Certificate for SSL Auth",
                }),
                amfutil.loadKey("Client Key", "key", {
                  tooltip: "The Client Key for SSL Auth",
                }),
              ],
            },
          ],
          process: function (form) {
            var values = form.getValues();
            console.log(values);
            values.brokers = JSON.parse(values.brokers);
            return values;
          },
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
      },
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
              providers: amfutil.duplicateIdCheck({ name: value }),
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

        amfutil.localCombo("Provider Type", "type", null, "field", "label", {
          itemId: "type",
          tooltip: "The type of provider you are configuring",
          listeners: {
            beforerender: function (scope) {
              if (scope.xtype == "combobox") {
                scope.setStore(
                  Object.entries(ampsgrids.grids.providers().types).map(
                    (entry) => entry[1]
                  )
                );
              }
            },
            change: function (scope, value) {
              var form = scope.up("form");
              var actionparms = form.down("#typeparms");
              var fields = amfutil.scanFields(
                ampsgrids.grids.providers().types[value].fields
              );
              actionparms.removeAll();
              actionparms.insert(0, fields);
            },
          },
        }),

        {
          xtype: "fieldcontainer",
          itemId: "typeparms",
          layout: {
            type: "vbox",
            align: "stretch",
          },
          // width: 600,
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
    }),
    fields: () => ({
      object: "Field",
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
              rules: amfutil.duplicateIdCheck({ name: value }),
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
    scheduler: () => ({
      title: "Scheduler",
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
            store: amfutil.createCollectionStore("scheduler"),
            displayField: "name",
            valueField: "name",
          },
        },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
        },
      ],
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
              scheduler: amfutil.duplicateIdCheck({ name: value }),
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
        {
          xtype: "combobox",
          name: "type",
          fieldLabel: "Schedule Type",
          allowBlank: false,
          tooltip:
            "The type of schedule to execute this job on. Can be a timer to execute at specific intervals, or a schedule that runs at a certain time either based on days of the week or based on days of the month.",
          displayField: "label",
          queryMode: "local",
          valueField: "field",
          store: [
            {
              label: "Timer",
              field: "timer",
            },
            {
              label: "Daily",
              field: "daily",
            },
            {
              label: "Days of the Month",
              field: "days",
            },
          ],
          listeners: amfutil.renderListeners(function (scope, val) {
            var all = ["time", "daily", "timer", "monthdays"];
            var comps = {
              timer: ["timer"],
              daily: ["time", "daily"],
              days: ["time", "monthdays"],
            };
            var chosen = comps[val] || [];
            console.log(chosen);
            all.forEach((id) => {
              var comp = scope.up("form").down("#" + id);
              console.log(id);
              console.log(comp);
              comp.setHidden(!(chosen.indexOf(id) >= 0));
              if (val == "daily" && id == "weekdays") {
              } else {
                comp.setDisabled(!(chosen.indexOf(id) >= 0));
              }
            });
          }),
        },
        amfutil.renderContainer("time", [
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
        ]),
        amfutil.renderContainer("daily", [
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
        ]),

        amfutil.renderContainer("timer", [
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
                allowBlank: false,

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
                value: "Minutes",

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
        ]),

        amfutil.renderContainer("monthdays", [
          {
            name: "days",
            allowBlank: false,
            tooltip: "The days of the month on which to execute this job",
            xtype: "tagfield",
            store: Array.from({ length: 31 }, (x, i) => (i + 1).toString()),
            fieldLabel: "Days of the Month",
          },
        ]),

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
            {
              xtype: "textfield",
              name: "field",
              fieldLabel: "Field",
              labelWidth: 35,
            },
            {
              xtype: "textfield",

              name: "value",
              fieldLabel: "Value",
              labelWidth: 35,
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
          return values;
        },
      },
    }),
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
    service_events: () => ({
      title: "Service Events",
      // filter: { parent: { $exists: false } },
      actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
      sort: {
        etime: "DESC",
      },
      dblclick: function () {},
      columns: [
        {
          text: "User",
          dataIndex: "user",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "Service",
          dataIndex: "service",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "Operation",
          dataIndex: "operation",
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
      // options: ["reprocess", "reroute"],
    }),
    message_events: () => ({
      title: "Message Events",
      // filter: { parent: { $exists: false } },
      actionIcons: [
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "reprocess",
        "reroute",
      ],
      sort: {
        etime: "DESC",
      },
      columns: [
        { text: "Message ID", dataIndex: "msgid", flex: 1, type: "text" },
        {
          text: "Action",
          dataIndex: "action",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "Parent",
          dataIndex: "parent",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "File Name",
          dataIndex: "fname",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "File Size",
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
          renderer: function (val) {
            var date = new Date(val);
            return date.toString();
          },
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
      options: ["reprocess", "reroute"],
    }),
    customers: () => ({
      title: "Customers",
      object: "Customer",
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
            store: amfutil.createCollectionStore("customers"),
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
            fieldLabel: "Customer Name",
            tooltip: "The Name of the Customer",
            allowBlank: false,
          },
          function (cmp, value) {
            return {
              customers: amfutil.duplicateIdCheck({ name: value }),
            };
          },
          "Customer Name Already Exists",
          amfutil.nameValidator
        ),
        {
          xtype: "textfield",
          name: "phone",
          fieldLabel: "Phone Number",
          tooltip: "The Phone Number of the Customer",
          allowBlank: false,
          vtype: "phone",
        },
        {
          xtype: "textfield",
          name: "email",
          fieldLabel: "Email",
          tooltip: "The Email of the Customer",
          allowBlank: false,
          vtype: "email",
        },
        amfutil.checkbox("Active", "active", true, {
          tooltip: "Whether this customer is active.",
        }),
      ],
      options: ["active", "delete"],
    }),
    users: () => ({
      title: "Users",
      object: "User",
      displayField: "username",
      actionIcons: [
        "addnewbtn",
        "searchpanelbtn",
        "clearfilter",
        "refreshbtn",
        "export",
      ],
      columns: [
        {
          text: "Customer",
          dataIndex: "customer",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("customers"),
            displayField: "name",
            valueField: "name",
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
      ],
      options: ["approve", "delete", "reset"],
      fields: [
        amfutil.dynamicCreate(
          amfutil.combo(
            "Customer",
            "customer",
            amfutil.createCollectionStore(
              "customers",
              { active: true },
              { autoLoad: true }
            ),
            "name",
            "name",
            {
              tooltip: "The Customer this user belongs to.",
            }
          ),
          "customers"
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
        amfutil.text("First Name", "firstname", {
          tooltip: "The First Name of the user.",
        }),
        amfutil.text("Last Name", "lastname", {
          tooltip: "The Last Name of the user.",
        }),
        amfutil.text("Phone", "phone", {
          tooltip: "The phone number of the user.",
          inputType: "phone",
          vtype: "phone",
        }),
        amfutil.text("Email", "email", {
          tooltip: "The Email of the user.",
          inputType: "email",
          vtype: "email",
        }),
        amfutil.check("Approved", "approved", {
          tooltip: "Whether the user is approved",
        }),
      ],
      add: {
        process: function (form, values) {
          // values.profiles = [];
          values.rules = [];
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
          title: "Agent Rules",
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
                  xtype: "textfield",
                  name: "bretry",
                  itemId: "bretry",
                  maskRe: /[0-9]/,
                  fieldLabel: "Get Failure Retry Wait",
                  value: "5",
                },
                amfutil.consumerConfig(async function (scope) {
                  var item = scope.up("form").entity;
                  console.log(item);
                  return {
                    topic: { $regex: `amps.mailbox.${item.username}.*` },
                  };
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
              if (values.fmeta) {
                values.fmeta = JSON.stringify(
                  amfutil.formatArrayField(values.fmeta)
                );
              }
              return values;
            },
          },
          update: {
            process: function (form, values) {
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
      },
    }),
    actions: () => ({
      title: "Actions",
      window: { height: 600, width: 800 },
      types: {
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
          label: "Run Script",
          fields: [
            amfutil.combo(
              "Script Type",
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
            {
              xtype: "textfield",
              name: "module",
              fieldLabel: "Script Name",
              allowBlank: false,
              tooltip:
                "The file name of the Python file/module to run. Exclude the file extension .py",
            },
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
            {
              // Fieldset in Column 1 - collapsible via toggle button
              xtype: "parmfield",
              title: "Extra Parameters",
              name: "parms",
              tooltip: "Additional Parameters to pass to your python module",
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
        mailbox: {
          field: "mailbox",
          label: "Mailbox",
          fields: [
            amfutil.dynamicCreate(
              amfutil.combo(
                "Recipient",
                "recipient",
                amfutil.createCollectionStore("users", {}, { autoLoad: true }),
                "username",
                "username",
                {
                  tooltip: "The mailbox to deliver the message to",
                }
              ),
              "users"
            ),
            amfutil.formatFileName(),
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
                listeners: amfutil.renderListeners(function render(scope, val) {
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
                    amfutil.createCollectionStore("topics", { type: "data" }),
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
                    listeners: amfutil.renderListeners(function (scope, val) {
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
              tooltip: "A flag indicating whether or not to compress the file.",
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
                  var hide = val == "delete" || val == undefined;
                  out.setHidden(hide);
                  out.setDisabled(hide);
                }),
                tooltip: "The HTTP Method for the request.",
              }
            ),
            amfutil.renderContainer("output", [
              amfutil.check("Send Output", "send_output", {
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

            {
              xtype: "checkbox",
              uncheckedValue: false,
              inputValue: true,
              name: "oauth",
              fieldLabel: "OAuth",
              listeners: amfutil.renderListeners(function (scope, val) {
                var field = scope.up("form").down("#oauth");
                console.log(field);
                field.setHidden(!val);
                field.setDisabled(!val);
              }),
              tooltip: "Whether to fetch OAuth Credentials",
            },
            {
              xtype: "fieldcontainer",
              itemId: "oauth",
              layout: {
                type: "vbox",
                align: "stretch",
              },
              items: [
                {
                  xtype: "textfield",
                  name: "oauthurl",
                  itemId: "oathurl",
                  fieldLabel: "OAuth URL",

                  tooltip: "URL to request OAuth Credentials",
                },
                {
                  xtype: "textfield",
                  name: "oauthuser",
                  itemId: "oauthuser",

                  fieldLabel: "OAuth User",

                  tooltip: "OAuth Username",
                },
                {
                  xtype: "textfield",
                  name: "oauthpassword",
                  itemId: "oauthpassword",
                  tooltip: "OAuth Password",

                  fieldLabel: "OAuth Password",
                },
              ],
            },
          ],
          process: function (form, values) {
            values.headers = JSON.parse(values.headers);

            return values;
          },
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
        kafkaput: {
          field: "kafkaput",
          label: "Kafka PUT",
          fields: [
            amfutil.dynamicCreate(
              amfutil.combo(
                "Kafka Provider",
                "provider",
                amfutil.createCollectionStore("providers", {
                  type: "kafka",
                }),
                "_id",
                "name",
                {
                  tooltip:
                    "The configured provider with broker and authenticiation configuration.",
                }
              ),
              "providers"
            ),
            {
              xtype: "textfield",
              fieldLabel: "Topic",
              name: "topic",
              allowBlank: false,
              tooltip:
                "The Kafka topic to which the message should be delivered",
            },

            // {
            //   xtype: "numberfield",
            //   fieldLabel: "Partition",
            //   name: "partition",
            // },
          ],
        },
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
              maxWidth: 600,
              items: [
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
                {
                  xtype: "radiogroup",
                  fieldLabel: "Acknowledgment",
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
                },
                {
                  xtype: "checkbox",
                  name: "regex",
                  fieldLabel: "Regex",
                  allowBlank: false,

                  tooltip: "Whether to use regex when matching.",
                },
                {
                  xtype: "textfield",
                  itemId: "matchpattern",
                  tooltip: "The file path pattern.",

                  allowBlank: false,

                  name: "pattern",
                  fieldLabel: "File Match Pattern",
                },
                amfutil.check("Scan Subdirectories", "scan"),
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
      },
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
            return { actions: amfutil.duplicateIdCheck({ name: value }, cmp) };
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
        amfutil.localCombo("Action Type", "type", null, "field", "label", {
          listeners: {
            beforerender: function (scope) {
              var types = ampsgrids.grids.actions().types;
              if (scope.xtype == "combobox") {
                scope.setStore(Object.entries(types).map((entry) => entry[1]));
              }
              var val = scope.getValue();
              if (val) {
                scope.up("form").down("#actiontype").setHtml(types[val].label);
              }
            },
            change: function (scope, value) {
              var form = scope.up("form");
              var actionparms = form.down("#typeparms");
              actionparms.removeAll();
              var fields = amfutil.scanFields(
                ampsgrids.grids.actions().types[value].fields
              );
              console.log(fields);
              actionparms.insert(0, fields);
              var act = scope.getSelection();
              scope.up("form").down("#actiontype").setHtml(act.data.label);
            },
          },
          tooltip: "Action Type",
        }),
        {
          xtype: "container",
          layout: "center",
          padding: 10,
          style: {
            "font-weight": "600",
            "font-size": "1.5rem",
          },
          items: [
            {
              itemId: "actiontype",
              xtype: "component",
              autoEl: "div",
              html: "Select Action Type",
            },
          ],
        },
        {
          xtype: "fieldcontainer",
          itemId: "typeparms",
          // style: {
          //   background: "green",
          // },
          scrollable: true,
          layout: {
            type: "vbox",
            align: "stretch",
          },
          padding: 15,
          // width: 600,
        },
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
      options: ["active", "delete"],
    }),
    topics: () => ({
      title: "Topics",
      object: "Topic",
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
          submitValue: true,
          name: "topic",
          fieldLabel: "Topic",
          pieces: [],
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
    services: () => ({
      title: "Services",
      object: "Service",
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
              services: amfutil.duplicateIdCheck({ name: value }),
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
      ],
      update: {
        fields: [
          {
            xtype: "displayfield",
            name: "type",
            fieldLabel: "Type",
            submitValue: true,
            tooltip: "The service type",
          },
          {
            xtype: "container",
            layout: "fit",
            items: [
              {
                xtype: "fieldcontainer",
                itemId: "typeparms",
                layout: {
                  type: "vbox",
                  align: "stretch",
                },
                maxWidth: 700,
              },
            ],
          },
        ],
        process: function (form, values) {
          console.log(form);
          var services = ampsgrids.grids["services"]();
          if (services.types[values.type].process) {
            values = services.types[values.type].process(form);
          }

          return values;
        },
      },
      types: {
        kafka: {
          type: "kafka",
          name: "Kafka",
          iconCls: "kafka-icon",
          combo: function (service) {
            return amfutil.localCombo(
              "Topics",
              "topicparms",
              service.topics,
              null,
              null,
              {
                itemId: "topicparms",
              }
            );
          },
          format: function (topic) {
            var reg = /[.>* -]/;
            return topic.replace(reg, "_");
          },
          fields: [
            amfutil.dynamicCreate(
              amfutil.combo(
                "Provider",
                "provider",
                amfutil.createCollectionStore("providers", { type: "kafka" }),
                "_id",
                "name",
                {
                  tooltip: "The Kafka Provider to use for this service.",
                }
              ),
              "providers"
            ),
            {
              row: true,
              xtype: "arrayfield",
              name: "topics",
              title: "Topics",
              tooltip: "The Kafka Topics to consume.",
              fieldTitle: "Topic",
              arrayfields: [
                {
                  xtype: "textfield",
                  name: "topic",
                },
              ],
            },
            amfutil.formatFileName(),
            {
              xtype: "checkbox",
              inputValue: true,
              checked: true,
              hidden: true,
              name: "communication",
            },
          ],
          process: function (form) {
            var values = form.getValues();
            console.log(values);
            values.topics = JSON.parse(values.topics).map(
              (topic) => topic.topic
            );
            console.log(values);
            return values;
          },
        },
        httpd: {
          type: "httpd",
          name: "HTTP Server",
          iconCls: "x-fa fa-feed",
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
            },
            {
              xtype: "numberfield",
              name: "request_timeout",
              allowBlank: false,
              tooltip:
                "The time in milliseconds the server will wait for additional requests before closing the connection",
              fieldLabel: "Request Timeout (ms)",
              minValue: 0,
            },
            {
              xtype: "numberfield",
              name: "max_keepalive",
              allowBlank: false,
              tooltip: "Maximum number of requests allowed per connection",
              fieldLabel: "Max Keep Alive",
              minValue: 0,
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
          type: "sftpd",
          name: "SFTP Server",
          iconCls: "x-fa fa-files-o",
          combo: function (combo, service) {
            return amfutil.combo(
              "Users",
              "topicparms",
              amfutil.createCollectionStore("users", {}, { autoLoad: true }),
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
              tooltip: "The port to run the SFTP Server on",
              minValue: 0,
              maxValue: 65535,
              allowBlank: false,
              listeners: {
                change: async function (cmp, value, oldValue, eOpts) {
                  await amfutil.portHandler(cmp, value);
                },
              },
            },

            amfutil.loadKey("Server Key", "server_key", {
              tooltip: "The EC Private Key to use for the SFTP Server.",
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
        subscriber: {
          type: "subscriber",
          name: "Subscriber",
          iconCls: "x-fa fa-arrow-down",
          fields: [
            {
              xtype: "numberfield",
              name: "subs_count",
              fieldLabel: "Subscriber Count",
              tooltip:
                "The Number of concurrent processes of this subscriber to run.",
              allowBlank: false,
              minValue: 1,
              maxValue: 9,
              value: 1,
            },
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
                  tooltip:
                    "The Action to execute when a message is received by this subscriber.",
                }
              ),

              "actions"
            ),
            amfutil.dynamicCreate(
              amfutil.combo(
                "Topic",
                "topic",
                amfutil.createCollectionStore("topics", {}, { autoLoad: true }),
                "topic",
                "topic",
                {
                  tooltip:
                    "The Topic this subscriber will consumes messages from.",

                  flex: 1,
                }
              ),
              "topics"
            ),
          ],
          process: function (form) {
            var values = form.getValues();
            values.active = true;

            return values;
          },
        },
        //   defaults: {
        //     type: "defaults",
        //     name: "Defaults",
        //     iconCls: "x-fa fa-pencil",
        //     singleton: true,
        //     fields: [
        //       {
        //         // Fieldset in Column 1 - collapsible via toggle button
        //         xtype: "fieldset",
        //         title: "Default Values",
        //         row: true,

        //         itemId: "defaults",
        //         collapsible: true,
        //         onAdd: function (component, position) {
        //           // component.setTitle("Match Pattern" + position);
        //           console.log(component);
        //           console.log(position);
        //         },
        //         items: [
        //           {
        //             xtype: "button",
        //             text: "Add",
        //             handler: function (button, event) {
        //               var formpanel = button.up();

        //               formpanel.insert(
        //                 formpanel.items.length - 1,
        //                 Ext.create("Amps.form.Defaults", {
        //                   title: "Default Value",
        //                 })
        //               );
        //             },
        //           },
        //         ],
        //       },
        //     ],

        //     load: function (form, record) {
        //       console.log(form);
        //       console.log(record);
        //       delete record._id;
        //       delete record.name;
        //       delete record.desc;
        //       delete record.type;

        //       var defaults = Object.entries(record).map((entry) => {
        //         return { field: entry[0], value: entry[1] };
        //       });

        //       defaults.forEach(function (def) {
        //         var dcon = form.down("#defaults");
        //         var length = dcon.items.length;
        //         var d = Ext.create("Amps.form.Defaults");
        //         d.down("#field").setValue(def.field);
        //         d.down("#value").setValue(def.value);
        //         dcon.insert(length - 1, d);
        //       });
        //     },

        //     process: function (form) {
        //       var values = form.getValues();
        //       var defaults = values.defaults
        //         ? Array.isArray(values.defaults)
        //           ? values.defaults.map((defaultobj) => {
        //               return JSON.parse(defaultobj);
        //             })
        //           : [JSON.parse(values.defaults)]
        //         : [];
        //       var processed = {};

        //       defaults.forEach((def) => {
        //         processed[def.field] = def.value;
        //       });

        //       delete values.field;
        //       delete values.value;
        //       delete values.defaults;

        //       Object.assign(values, processed);
        //       console.log(values);

        //       return values;
        //     },
        //   },
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
      ],
    }),
    admin: () => ({
      title: "Admin Users",
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
      options: ["approve", "resetAdmin"],
    }),
    keys: () => ({
      title: "Keys",
      window: {
        width: 600,
      },
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
        // {
        //   xtype: "combobox",
        //   fieldLabel: "User",
        //   allowBlank: false,
        //   name: "user",
        //   displayField: "username",
        //   valueField: "username",
        //   store: amfutil.createCollectionStore("users", {}, { autoLoad: true }),
        // },

        amfutil.localCombo(
          "Key Usage",
          "usage",
          ["RSA", "SSH", "Encryption", "Signing", "Cert"],
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
          options: ["RSA", "ssh", "enc", "sign"],
        },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
          type: "combo",
          searchOpts: {
            store: amfutil.createCollectionStore("keys"),
            displayField: "type",
            valueField: "type",
          },
        },
      ],
    }),
  },
  pages: {
    monitoring: () => ({
      view: {
        xtype: "container",
        layout: "fit",
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
                      payload: { name: data.name, topic: data.topic },
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
              {
                exists: { field: "active" },
              },
              { autoLoad: true }
            ),
            listeners: {
              beforerender: function (scope) {
                scope.getStore().reload();
              },
              dblclick: {
                element: "body",
                fn: function (grid, rowIndex, e, obj) {
                  var m = amfutil.getElementByID("monitoring");
                  m.setActiveItem(1);
                  var list = amfutil.getElementByID("eventlist");
                  var record = grid.record.data;

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
                    list.setTitle(
                      "Recent Message Events for Subscriber: " + record.name
                    );
                  } else {
                    list.setStore(
                      amfutil.createCollectionStore(
                        "message_events",
                        {
                          service: record.name,
                          status: "received",
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
                    list.setTitle(
                      "Recent Received Messages for Service: " + record.name
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
            layout: {
              type: "vbox",
              align: "stretch",
            },
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
                xtype: "grid",
                flex: 1,
                itemId: "eventlist",
                columns: [
                  {
                    text: "Message ID",
                    dataIndex: "msgid",
                    flex: 1,
                    type: "text",
                  },
                  {
                    text: "Parent",
                    dataIndex: "parent",
                    flex: 1,
                    value: "true",
                    type: "text",
                  },
                  {
                    text: "File Name",
                    dataIndex: "fname",
                    flex: 1,
                    value: "true",
                    type: "text",
                  },
                  {
                    text: "File Size",
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
                    renderer: function (val) {
                      var date = new Date(val);
                      return date.toString();
                    },
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
                bbar: {
                  xtype: "pagingtoolbar",
                  displayInfo: true,
                },
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
          xtype: "form",
          title: "Default Configuration",
          bodyPadding: 25,
          loadConfig: async function (scope) {
            var fc = this.down("fieldcontainer");
            fc.removeAll();
            this.setMasked(true);

            var data = await amfutil.getCollectionData("services", {
              name: "SYSTEM",
            });
            var record = data[0];
            this._id = record._id;

            var dontrender = ["_id", "name", "modified", "modifiedby"];

            Object.entries(record).forEach((d) => {
              if (dontrender.indexOf(d[0]) >= 0) {
              } else {
                fc.insert({
                  xtype: "textfield",
                  fieldLabel: d[0],
                  name: d[0],
                  value: d[1],
                });
              }
            });

            fc.insert(-1, [
              {
                xtype: "displayfield",
                name: "modifiedby",
                fieldLabel: "Last Modified By",
                value: record.modifiedby,
              },
              {
                xtype: "displayfield",
                name: "modified",
                fieldLabel: "Modified On",
                value: record.modified,
              },
            ]);

            this.setMasked(false);
          },
          items: [
            {
              xtype: "fieldcontainer",
              layout: {
                type: "vbox",
                align: "stretch",
              },
            },
          ],
          buttons: [
            {
              xtype: "button",
              text: "Update",
              handler: function (scope) {
                var form = scope.up("form");
                var mask = new Ext.LoadMask({
                  target: form,
                  msg: "Loading",
                });
                mask.show();
                var values = scope.up("form").getForm().getValues();
                console.log(values);
                var id = scope.up("form")._id;

                var user = amfutil.get_user();

                values.modifiedby = user.firstname + " " + user.lastname;
                values.modified = new Date().toISOString();

                amfutil.ajaxRequest({
                  headers: {
                    Authorization: localStorage.getItem("access_token"),
                  },
                  url: "/api/services/" + id,
                  method: "PUT",
                  timeout: 60000,
                  params: {},
                  jsonData: values,
                  success: function () {
                    mask.hide();
                    form.loadConfig();
                  },
                  failure: function () {
                    mask.hide();
                  },
                });
              },
            },
          ],
          listeners: {
            beforerender: function (scope) {
              scope.loadConfig(scope);
            },
          },
        },
      };
    },
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
        xtype: "container",
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
