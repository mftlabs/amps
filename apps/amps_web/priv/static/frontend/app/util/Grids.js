Ext.define("Amps.container.Workflow.Step", {
  xtype: "workflowstep",
  extend: "Ext.form.Panel",
  padding: 30,
  flex: 1,
  step: null,

  listeners: {
    beforerender: function (scope) {
      // console.log(scope);
    },
  },

  defaults: {
    "font-size": "2rem",
    color: "white",
  },

  constructor: function (args) {
    this.callParent(args);
    this.setTitle(args["title"]);
    if (args["services"]) {
      this.down("container").insert({
        xtype: "combobox",
        fieldStyle: {
          "font-size": "2rem",
        },
        labelStyle: `font-size: 2rem;`,
        listeners: {
          change: function (scope, val) {},
        },
        fieldLabel: "Service",
        name: "service",
        store: amfutil.createCollectionStore("services", {
          communication: true,
        }),
        displayField: "name",
        valueField: "name",
      });
    } else {
      this.down("container").insert({
        xtype: "textfield",
        value: args["step"].action,
      });
    }
  },
  // height: 300,

  items: [
    {
      xtype: "container",
      style: {
        // "background-color": "#5fa2dd",
        fontSize: "36px",
        border: "1rem solid #5fa2dd",
        color: "white",
      },
      padding: 10,
      layout: "center",
      height: 200,
    },
  ],
});

Ext.define("Amps.container.Workflow", {
  extend: "Ext.container.Container",
  xtype: "workflow",
  layout: { type: "hbox", align: "stretch" },

  row: {
    xtype: "container",
    layout: { type: "hbox", align: "stretch" },
  },
  constructor: function (args) {
    this.callParent(args);
  },
  items: [
    {
      xtype: "container",
      padding: 10,
      flex: 1,
      layout: { type: "vbox", align: "stretch" },
      // style: {
      //   "border-left": "2px dashed #5fa2dd",
      // },
      items: [
        {
          xtype: "component",
          autoEl: "h2",
          html: "Input",
          style: {
            "text-align": "center",
            "margin-bottom": "1rem",
          },
        },
        {
          xtype: "component",
          autoEl: "hr",
          style: {
            margin: ".5rem",
            "border-color": "#404040",
          },
        },
        {
          xtype: "form",
          flex: 1,
          padding: 10,
          itemId: "workflow",

          style: {
            // border: "5px solid #5fa2dd",
          },
          layout: "border",
          items: [
            {
              region: "north",

              xtype: "container",
              items: [
                {
                  xtype: "combobox",
                  fieldStyle: {
                    "font-size": "2rem",
                  },
                  itemId: "service",
                  allowBlank: false,

                  labelStyle: `font-size: 2rem;`,
                  fieldLabel: "Service",
                  name: "service",
                  listeners: {
                    beforerender: function (scope) {
                      scope.setStore(
                        amfutil.createCollectionStore("services", {
                          communication: true,
                        })
                      );
                      // var searchParams = new URLSearchParams(
                      //   window.location.search
                      // );
                      // scope.setValue(searchParams.get("service"));
                    },
                    change: function (scope) {
                      var service = scope.getSelectedRecord().data;
                      var topicparm = amfutil.getElementByID("topicparms");
                      console.log(scope.up("form"));
                      scope.up("container").remove(topicparm);
                      scope
                        .up("container")
                        .insert(
                          ampsgrids.grids
                            .services()
                            .types[service.type].combo(topicparm, service)
                        );
                      // var searchParams = new URLSearchParams(
                      //   window.location.search
                      // );
                      // amfutil
                      //   .getElementByID("topicparms")
                      //   .setValue(searchParams.get("topicparms"));
                    },
                  },

                  displayField: "name",
                  valueField: "name",
                },
              ],
              // cls: "button_class",
            },
            {
              region: "center",
              xtype: "fieldcontainer",
              scrollable: true,
              items: [
                {
                  xtype: "arrayfield",
                  name: "meta",
                  title: "Additional Metadata",
                  arrayfield: "Metadata",
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
            },
            {
              height: 50,
              region: "south",
              formBind: true,
              xtype: "button",
              scale: "large",
              text: "Map Workflow",
              handler: async function (btn) {
                var form = btn.up("form");

                amfutil.getElementByID("steps").loadWorkflow(form);
                // console.log(data);
              },
            },
          ],
        },
      ],
    },

    {
      xtype: "container",
      padding: 10,
      flex: 1,
      layout: { type: "vbox", align: "stretch" },
      // style: {
      //   "border-left": "2px dashed #5fa2dd",
      // },
      items: [
        {
          xtype: "component",
          autoEl: "h2",
          html: "Workflow",
          style: {
            "text-align": "center",
            "margin-bottom": "1rem",
          },
        },
        {
          xtype: "component",
          autoEl: "hr",
          style: {
            margin: ".5rem",
            "border-color": "#404040",
          },
        },
        {
          xtype: "container",
          padding: 10,
          flex: 1,
          itemId: "steps",
          layout: { type: "vbox", align: "stretch" },
          scrollable: true,
          loadWorkflow: async function (form) {
            var wf = form.up("workflow");
            console.log(wf);
            var mask = new Ext.LoadMask({
              msg: "Please wait...",
              target: wf,
            });
            mask.show();
            var fields = form.getForm().getFields();
            var service = fields.items[0].getSelectedRecord().data;

            var final = form.getForm().findField("topicparms").getValue();

            console.log(fields.items);
            var services = ampsgrids.grids.services();

            if (services.types[service.type].format) {
              final = services.types[service.type].format(final);
            }
            console.log(final);
            var topic = "amps.svcs." + service.name + "." + final;

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

            var workflow = Ext.decode(resp.responseText);
            console.log(workflow);
            var steps = amfutil.getElementByID("steps");
            steps.removeAll();
            function loadStep(step) {
              console.log(step);
              if (step.step) {
                var currStep = step.step;
                console.log(currStep.sub.topic);
                steps.insert({
                  xtype: "fieldset",
                  title: currStep.sub.topic,
                  items: [
                    {
                      xtype: "container",
                      autoEl: {
                        tag: "a",
                        href: `#actions/${currStep.action._id}`,
                      },
                      items: [
                        {
                          xtype: "component",
                          autoEl: "h4",
                          html: "Action: " + currStep.action.name,
                        },
                      ],
                    },
                    {
                      xtype: "container",
                      autoEl: {
                        tag: "a",
                        href: `#services/${currStep.sub._id}`,
                      },
                      items: [
                        {
                          xtype: "component",
                          autoEl: "h4",
                          html: "Subscriber: " + currStep.sub.name,
                        },
                      ],
                    },
                  ],
                });
                if (currStep.steps) {
                  steps.insert({
                    xtype: "button",
                    iconCls: "x-fa fa-plus",
                    handler: function () {
                      console.log("Input Topic: " + currStep.sub.topic);
                      console.log("Output Topic: " + currStep.topic.sub.topic);
                      console.log(currStep);

                      var win = new Ext.window.Window({
                        title: "Add Step",
                        modal: true,
                        width: 600,
                        height: 500,
                        // resizable: false,
                        layout: "fit",
                        items: [
                          {
                            xtype: "panel",
                            layout: "card",
                            bodyStyle: "padding:15px",
                            scrollable: true,
                            itemId: "wizard",
                            defaultListenerScope: true,
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
                                items: [
                                  {
                                    html: `           <h1>AMPS Wizard</h1>
                                      <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 1 of 3: Define an action below.</h4>`,
                                  },
                                  {
                                    xtype: "fieldcontainer",
                                    layout: {
                                      type: "vbox",
                                      align: "stretch",
                                    },
                                    listeners: {
                                      beforerender: function (scope) {
                                        var actions =
                                          ampsgrids.grids["actions"]();
                                        scope.insert(
                                          0,
                                          actions.fields.map((field) => {
                                            field = Object.assign({}, field);
                                            if (field.name == "type") {
                                              console.log(field);
                                              var types;
                                              field = Ext.apply(field, {
                                                listeners: {
                                                  beforerender: function (
                                                    scope
                                                  ) {
                                                    var actionTypes =
                                                      Object.assign(
                                                        {},
                                                        actions.types
                                                      );
                                                    console.log(actionTypes);
                                                    types = store =
                                                      Object.entries(
                                                        actionTypes
                                                      ).reduce(function (
                                                        filtered,
                                                        type
                                                      ) {
                                                        type = Object.assign(
                                                          {},
                                                          type[1]
                                                        );
                                                        var output =
                                                          type.fields.find(
                                                            (field) =>
                                                              field.name ==
                                                              "output"
                                                          );
                                                        if (output) {
                                                          filtered.push(type);
                                                          return filtered;
                                                        } else {
                                                          return filtered;
                                                        }
                                                      },
                                                      []);
                                                    console.log(types);
                                                    scope.setStore(types);
                                                  },
                                                  change: function (
                                                    scope,
                                                    value
                                                  ) {
                                                    var form = scope.up("form");
                                                    var actionparms =
                                                      form.down("#typeparms");

                                                    actionparms.removeAll();
                                                    console.log(types);
                                                    actionparms.insert(
                                                      0,
                                                      types.find(
                                                        (type) =>
                                                          type.field == value
                                                      ).fields
                                                    );
                                                    var output = form
                                                      .getForm()
                                                      .findField("output");
                                                    console.log(
                                                      currStep.step.sub.topic
                                                    );
                                                    output.setValue(
                                                      currStep.step.sub.topic
                                                    );
                                                    output.setReadOnly(true);
                                                  },
                                                },
                                              });
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
                                    itemId: "card-next",
                                    text: "Next &raquo;",
                                    handler: "showNext",
                                    formBind: true,
                                  },
                                ],
                              },
                              {
                                xtype: "form",

                                itemId: "card-1",
                                scrollable: true,

                                items: [
                                  {
                                    html: `           <h1>AMPS Wizard</h1>
                                      <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 2 of 3: Define a corresponding topic.</h4>`,
                                  },
                                  {
                                    xtype: "fieldcontainer",

                                    listeners: {
                                      beforerender: function (scope) {
                                        scope.insert(
                                          0,
                                          ampsgrids.grids["topics"]().fields
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

                                itemId: "card-2",
                                scrollable: true,

                                items: [
                                  {
                                    html: `         <h1>AMPS Wizard</h1>
                                      <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 3 of 3: Define a subscriber that subscribes to your topic and performs your action.</h4>`,
                                  },
                                  {
                                    xtype: "fieldcontainer",

                                    listeners: {
                                      beforerender: function (scope) {
                                        var services =
                                          ampsgrids.grids["services"]();
                                        var fields = services.fields.concat(
                                          services.types["subscriber"].fields
                                        );

                                        // console.log(action);
                                        // console.log(topic);
                                        scope.insert(
                                          0,
                                          fields.map((field) => {
                                            if (
                                              field.name == "action" ||
                                              field.name == "topic"
                                            ) {
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
                                      var actionform = scope
                                        .up("#wizard")
                                        .down("#card-0");
                                      var topicform = scope
                                        .up("#wizard")
                                        .down("#card-1");

                                      var subscriberform = scope.up("form");

                                      var action = actionform
                                        .getForm()
                                        .getValues();
                                      action = ampsgrids.grids[
                                        "actions"
                                      ]().add.process(actionform, action);

                                      var topic = topicform
                                        .getForm()
                                        .getValues();
                                      topic = amfutil.convertNumbers(
                                        topicform.getForm(),
                                        topic
                                      );

                                      var subscriber = subscriberform
                                        .getForm()
                                        .getValues();
                                      subscriber = amfutil.convertNumbers(
                                        subscriberform.getForm(),
                                        subscriber
                                      );

                                      subscriber.type = "subscriber";
                                      subscriber.active = true;

                                      var wizard = scope.up("#wizard");
                                      if (currStep.ruleid) {
                                        console.log("Updating Router Rule");
                                        var idx =
                                          currStep.action.rules.findIndex(
                                            (rule) => rule.id == currStep.ruleid
                                          );
                                        currStep.action.rules[idx].topic =
                                          topic.topic;
                                        console.log(currStep.action.rules[idx]);
                                      } else {
                                        currStep.action.output = topic.topic;
                                      }

                                      amfutil.updateInCollection(
                                        "actions",
                                        currStep.action,
                                        currStep.action._id
                                      );

                                      var actionid =
                                        await amfutil.addToCollection(
                                          "actions",
                                          action
                                        );
                                      console.log(actionid);
                                      var topicid =
                                        await amfutil.addToCollection(
                                          "topics",
                                          topic
                                        );
                                      console.log(topicid);
                                      subscriber.handler = actionid;

                                      var subscriberid =
                                        await amfutil.addToCollection(
                                          "services",
                                          subscriber
                                        );
                                      wizard.showNext();
                                      var confirmation = scope
                                        .up("#wizard")
                                        .down("#card-3");
                                      confirmation.loadConfirmation(
                                        { id: actionid, name: action.name },
                                        { id: topicid, name: topic.topic },
                                        {
                                          id: subscriberid,
                                          name: subscriber.name,
                                        }
                                      );
                                      console.log(subscriberid);
                                    },
                                  },
                                ],
                                listeners: {
                                  beforeactivate(scope) {
                                    var action = scope.down(
                                      "combobox[name=handler]"
                                    );
                                    console.log(action);
                                    var topic = scope.down(
                                      "combobox[name=topic]"
                                    );
                                    console.log(topic);
                                    var actionform = scope
                                      .up("panel")
                                      .down("#card-0");
                                    console.log(actionform);
                                    var topicform = scope
                                      .up("panel")
                                      .down("#card-1");
                                    console.log(topicform);
                                    action.setValue(
                                      actionform
                                        .down("textfield[name=name]")
                                        .getValue()
                                    );
                                    topic.setValue(
                                      topicform
                                        .down("displayfield[name=topic]")
                                        .getValue()
                                    );
                                  },
                                },
                              },
                              {
                                xtype: "form",

                                itemId: "card-3",
                                loadConfirmation: function (
                                  action,
                                  topic,
                                  subscriber
                                ) {
                                  var html = `
                                    <h1>AMPS Wizard</h1>
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
                                    itemId: "confirm",
                                    html: "",
                                  },
                                ],
                                bbar: [
                                  "->",
                                  {
                                    // formBind: true,
                                    text: "Close",
                                    handler: async function (scope) {
                                      amfutil
                                        .getElementByID("steps")
                                        .loadWorkflow(
                                          amfutil.getElementByID("workflow")
                                        );
                                      win.close();
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
                          },
                        ],
                      });
                      win.show();
                    },
                  });
                }
                loadStep(currStep);
              } else {
                if (step.steps) {
                  if (step.steps.length == 1) {
                    step.step = step.steps[0];
                    loadStep(step);
                  } else if (step.steps.length > 1) {
                    if (step.steps) {
                    } else {
                      console.log("choose");
                    }
                  } else {
                    steps.insert({
                      xtype: "fieldset",
                      title: step.topic,
                      layout: { type: "vbox", align: "stretch" },
                      items: [
                        {
                          xtype: "button",
                          margin: 5,
                          text: "Configure",
                          handler: function () {
                            var win = new Ext.window.Window({
                              title: "Configure Subscriber For: " + step.topic,
                              modal: true,
                              width: 700,
                              height: 600,
                              padding: 10,
                              // resizable: false,
                              layout: "fit",
                              listeners: {
                                close: function () {
                                  amfutil
                                    .getElementByID("steps")
                                    .loadWorkflow(form);
                                },
                              },
                              items: [
                                {
                                  xtype: "wizard",
                                  topic: step.topic,
                                  close: function () {
                                    win.close();
                                    amfutil
                                      .getElementByID("steps")
                                      .loadWorkflow(form);
                                  },
                                },
                              ],
                            });
                            win.show();
                          },
                        },
                      ],
                    });
                    console.log("Add New?");
                  }
                } else {
                  console.log("done");
                }
              }
              mask.hide();
            }

            loadStep(workflow);
          },
          // style: {
          //   // background: "#5fa2dd",
          //   "border-left": "5px solid #5fa2dd",
          // },

          items: [],
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
    this.callParent(args);

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
              name: "topic",
              fieldLabel: "Topic",
              value: args["topic"],
              submitValue: true,
            },
            {
              xtype: "textfield",
              name: "desc",
              fieldLabel: "Topic Description",
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
      items: [
        {
          html: `           <h1>AMPS Wizard</h1>
              <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 1 of 3: Define an action below.</h4>`,
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

              // checked: true,
            },
            {
              boxLabel: "Existing",
              name: "action",
              inputValue: false,
            },
          ],
          listeners: {
            beforerender: function (scope) {
              scope.setValue({ action: true });
              scope.up("form").getForm().isValid();
            },
            change: function (scope, val) {
              var n = scope.up("form").down("#new");
              var e = scope.up("form").down("#existing");

              n.setHidden(!val.action);
              n.setDisabled(!val.action);

              e.setHidden(val.action);
              e.setDisabled(val.action);
            },
          },
        },
        {
          xtype: "fieldcontainer",
          itemId: "new",
          maxWidth: 700,
          hidden: true,
          disabled: true,
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
          hidden: true,
          disabled: true,
          maxWidth: 700,
          layout: {
            type: "vbox",
            align: "stretch",
          },
          listeners: {
            afterrender: function (scope) {
              scope.insert(
                0,
                amfutil.combo(
                  "Action",
                  "existing",
                  amfutil.createCollectionStore("actions"),
                  "_id",
                  "name",
                  { allowBlank: true }
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
          html: `           <h1>AMPS Wizard</h1>
              <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 2 of 3: Define a corresponding topic.</h4>`,
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
              items: [
                {
                  boxLabel: "New",
                  inputValue: true,
                  name: "existing",
                  checked: true,

                  // checked: true,
                },
                {
                  boxLabel: "Existing",
                  name: "existing",
                  inputValue: false,
                },
              ],
              listeners: {
                change: function (scope, val) {
                  var n = scope.up("form").down("#new");
                  var e = scope.up("form").down("#existing");

                  n.setHidden(!val.action);
                  n.setDisabled(!val.action);

                  e.setHidden(val.action);
                  e.setDisabled(val.action);
                },
              },
            },
            {
              xtype: "fieldcontainer",
              layout: {
                type: "vbox",
                align: "stretch",
              },
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
              hidden: true,
              disabled: true,
              listeners: {
                beforerender: function (scope) {
                  scope.insert(
                    0,
                    amfutil.combo(
                      "Topic",
                      "existing",
                      amfutil.createCollectionStore("topics"),
                      "desc",
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
          html: `         <h1>AMPS Wizard</h1>
              <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 3 of 3: Define a subscriber that subscribes to your topic and performs your action.</h4>`,
        },
        {
          xtype: "fieldcontainer",

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
            var actionform = scope.up("#wizard").down("#card-0");
            var topicform = scope.up("#wizard").down("#card-1");

            var subscriberform = scope.up("form");

            var action = actionform.getForm().getValues();
            var actionid;
            if (!action.existing) {
              action = ampsgrids.grids["actions"]().add.process(
                actionform,
                action
              );

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
            topic = amfutil.convertNumbers(topicform.getForm(), topic);
            var topicid;
            if (!topic.existing) {
              var topics = await amfutil.getCollectionData("topics", {
                topic: topic.existing,
              });
              if (topics.length) {
                topicid = topics[0]._id;
              } else {
                topicid = await amfutil.addToCollection("topics", topic);
              }
            } else {
              var topicdata = topicform
                .getForm()
                .findField("existing")
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
            <h1>AMPS Wizard</h1>
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
    message_events: () => ({
      title: "Message Activity",
      // filter: { parent: { $exists: false } },
      actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
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
        },
        { text: "Event Time", dataIndex: "etime", flex: 1, type: "date" },
        {
          text: "Status",
          dataIndex: "status",
          flex: 1,
          type: "combo",
          options: [
            {
              field: "received",
              label: "Received",
            },
            {
              field: "routed",
              label: "Routed",
            },
          ],
        },
      ],
      options: [],
    }),
    customers: () => ({
      title: "Customers",
      object: "Customer",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      columns: [
        { text: "Name", dataIndex: "name", flex: 1, type: "text" },
        {
          text: "Phone Number",
          dataIndex: "phone",
          flex: 1,
          type: "text",
        },
        { text: "Email", dataIndex: "email", flex: 1, type: "text" },
      ],
      fields: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Account Name",
        },
        {
          xtype: "textfield",
          name: "phone",
          fieldLabel: "Phone Number",
        },
        {
          xtype: "textfield",
          name: "email",
          fieldLabel: "Email",
        },
        amfutil.checkbox("Active", "active", true),
      ],
      options: ["active", "delete"],
    }),
    users: () => ({
      title: "Users",
      object: "User",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      columns: [
        { text: "Customer", dataIndex: "customer", flex: 1, type: "text" },
        { text: "User Name", dataIndex: "username", flex: 1, type: "text" },

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
      options: ["approve", "delete", "link", "downloadufa"],
      fields: [
        amfutil.combo(
          "Customer",
          "customer",
          amfutil.createCollectionStore(
            "customers",
            { active: true },
            { autoLoad: true }
          ),
          "name",
          "name"
        ),
        amfutil.text("Username", "username"),
        amfutil.text("First Name", "firstname"),
        amfutil.text("Last Name", "lastname"),
        amfutil.text("Phone", "phone"),
        amfutil.text("Email", "email"),
        amfutil.checkbox("Approved", "approved"),
      ],
      add: {
        process: function (form, values) {
          values.profiles = [];
          values.rules = [];
          return values;
        },
      },
      subgrids: {
        profiles: {
          title: "Communication Profiles",
          actionIcons: [
            "addnewbtn",
            "searchpanelbtn",
            "clearfilter",
            "refreshbtn",
          ],
          fields: [
            {
              xtype: "textfield",
              name: "field",
              fieldLabel: "Field",
              allowBlank: false,
              listeners: {
                afterrender: function (cmp) {
                  cmp.inputEl.set({
                    autocomplete: "nope",
                  });
                },
              },
              width: 400,
            },
            {
              xtype: "textfield",
              name: "description",
              fieldLabel: "Description",
              allowBlank: false,
              listeners: {
                afterrender: function (cmp) {
                  cmp.inputEl.set({
                    autocomplete: "nope",
                  });
                },
              },
              width: 400,
            },
          ],
          create: function (btn) {
            var tokens = Ext.util.History.getToken().split("/");
            grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
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
                  name: "field",
                  fieldLabel: "Field",
                  allowBlank: false,
                  listeners: {
                    afterrender: function (cmp) {
                      cmp.inputEl.set({
                        autocomplete: "nope",
                      });
                    },
                  },
                  width: 400,
                },
                {
                  xtype: "textfield",
                  name: "description",
                  fieldLabel: "Description",
                  allowBlank: false,
                  listeners: {
                    afterrender: function (cmp) {
                      cmp.inputEl.set({
                        autocomplete: "nope",
                      });
                    },
                  },
                  width: 400,
                },
              ],
              buttons: [
                {
                  text: "Save",
                  cls: "button_class",
                  formBind: true,
                  listeners: {
                    click: function (btn) {
                      form = btn.up("form").getForm();
                      var values = form.getValues();
                      // page_size = grid.store.pageSize;
                      btn.setDisabled(true);
                      var mask = new Ext.LoadMask({
                        msg: "Please wait...",
                        target: grid,
                      });
                      mask.show();
                      amfutil.ajaxRequest({
                        url: `api/` + Ext.util.History.getToken(),
                        method: "POST",
                        timeout: 60000,
                        params: {},
                        jsonData: values,
                        success: function (response) {
                          mask.hide();
                          btn.setDisabled(false);
                          var data = Ext.decode(response.responseText);
                          Ext.toast("Match field created");
                          amfutil.broadcastEvent("update", {
                            page: Ext.util.History.getToken(),
                          });
                          grid.getStore().reload();
                          win.close();
                        },
                        failure: function (response) {
                          mask.hide();
                          btn.setDisabled(false);
                          msg = response.responseText.replace(/['"]+/g, "");
                          amfutil.onFailure(
                            "Failed to Create Match Field",
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
              title: "Add Match Field",
              modal: true,
              width: 450,
              resizable: false,
              layout: "fit",
              items: [myForm],
            });
            win.show();
          },
          update: function (record, route, tbar, back, scope) {
            var tokens = Ext.util.History.getToken().split("/");
            grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
            var myForm = new Ext.form.Panel({
              defaults: {
                padding: 5,
                labelWidth: 140,
              },
              scrollable: true,
              tbar: tbar ? tbar : null,
              items: [
                {
                  xtype: "textfield",
                  name: "field",
                  fieldLabel: "Field",
                  allowBlank: false,
                  listeners: {
                    afterrender: function (cmp) {
                      cmp.inputEl.set({
                        autocomplete: "nope",
                      });
                    },
                  },
                  value: record.field,
                  width: 400,
                },
                {
                  xtype: "textfield",
                  name: "description",
                  fieldLabel: "Description",
                  allowBlank: false,
                  listeners: {
                    afterrender: function (cmp) {
                      cmp.inputEl.set({
                        autocomplete: "nope",
                      });
                    },
                  },
                  value: record.description,
                  width: 400,
                },
              ],
              buttons: [
                {
                  text: "Save",
                  cls: "button_class",
                  formBind: true,
                  listeners: {
                    click: function (btn) {
                      form = btn.up("form").getForm();
                      var values = form.getValues();
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
                        url: `api/` + Ext.util.History.getToken(),
                        method: "PUT",
                        timeout: 60000,
                        params: {},
                        jsonData: values,
                        success: function (response) {
                          mask.hide();
                          btn.setDisabled(false);
                          var data = Ext.decode(response.responseText);
                          Ext.toast("Updated match field");
                          amfutil.broadcastEvent("update", {
                            page: Ext.util.History.getToken(),
                          });
                          grid.getStore().reload();
                          back();
                        },
                        failure: function (response) {
                          mask.hide();
                          btn.setDisabled(false);
                          msg = response.responseText.replace(/['"]+/g, "");
                          amfutil.onFailure(
                            "Failed to Update Match Field",
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
                  itemId: "accounts_cancel",
                  listeners: {
                    click: function (btn) {
                      back();
                    },
                  },
                },
              ],
            });
            return myForm;
          },

          columns: [
            {
              text: "Field",
              dataIndex: "field",
              type: "text",
              flex: 1,
            },
            {
              text: "Description",
              dataIndex: "description",
              type: "text",
              flex: 3,
            },
          ],
          options: ["delete"],
        },
        rules: {
          title: "Agent Rules",
          object: "Agent Rule",
          actionIcons: [
            "addnewbtn",
            "searchpanelbtn",
            "clearfilter",
            "refreshbtn",
          ],
          window: { height: 500 },
          types: {
            upload: {
              type: "download",
              name: "Download",
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
                  width: 400,
                },
                {
                  xtype: "textfield",
                  name: "format",
                  fieldLabel: "Upload Format",
                  itemId: "bpath",
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
                  fieldLabel: "File Polling Interval(Sec)",
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
                  xtype: "combobox",
                  name: "bucket",
                  itemId: "bucket",
                  fieldLabel: "Bucket Name",
                  allowBlank: false,
                  forceSelection: true,
                },
                {
                  xtype: "textfield",
                  name: "prefix",
                  itemId: "prefix",
                  fieldLabel: "Bucket Path Prefix",
                  value: "",
                  validator: function (val) {
                    if (val == "") {
                      return true;
                    } else {
                      if (val[0] == "/") {
                        return "Prefix cannot begin with /";
                      } else {
                        return true;
                      }
                    }
                  },
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
              ],
            },
          },
          fields: [
            {
              xtype: "textfield",
              name: "name",
              fieldLabel: "Rule Name",
              allowBlank: false,
              listeners: {
                change: async function (cmp, value, oldValue, eOpts) {
                  var duplicate = await amfutil.checkDuplicate({
                    users: { "rules.name": value },
                  });

                  if (duplicate) {
                    cmp.setActiveError("Agent Rule Already Exists");
                    cmp.setValidation("Agent Rule Already Exists");
                    // cmp.isValid(false);
                  } else {
                    cmp.setActiveError();
                    cmp.setValidation();
                  }
                },
              },
            },
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
                    ampsgrids.grids["users"]().subgrids["rules"].types[val]
                      .fields
                  );
                  console.log(val);
                },
              },
            },
            {
              xtype: "container",
              itemId: "typeparms",
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
              var rule = {};
              if (values.type == "upload") {
                var fmeta = {};
                console.log(values.fmeta);
                rule.fmeta = amfutil.formatArrayField(values.fmeta);

                rule["name"] = values.name;
                rule["type"] = values.type;
                rule["fpoll"] = values.fpoll;
                rule["fretry"] = values.fretry;
                rule["regex"] = values.regex;
                rule["fmatch"] = values.fmatch;
                rule["bucket"] = values.bucket;
                rule["bpath"] = values.bpath;
                rule["ackmode"] = values.ackmode;
                rule.active = true;
              } else {
                rule = {
                  name: values.name,
                  type: values.type,
                  fpoll: values.fpoll,
                  bretry: values.bretry,
                  bucket: values.bucket,
                  prefix: values.prefix.length
                    ? values.prefix.slice(-1) == "/"
                      ? values.prefix
                      : values.prefix + "/"
                    : values.prefix,
                  folder: values.folder,
                  ackmode: values.ackmode,
                  active: true,
                };
              }
              return rule;
            },
          },
          update: {
            process: function (form, values) {
              console.log(values);
              var rule = {};
              if (values.type == "upload") {
                var fmeta = {};
                console.log(values.fmeta);
                rule.fmeta = amfutil.formatArrayField(values.fmeta);

                rule["name"] = values.name;
                rule["type"] = values.type;
                rule["fpoll"] = values.fpoll;
                rule["fretry"] = values.fretry;
                rule["regex"] = values.regex;
                rule["fmatch"] = values.fmatch;
                rule["bucket"] = values.bucket;
                rule["bpath"] = values.bpath;
                rule["ackmode"] = values.ackmode;
                rule.active = true;
              } else {
                rule = {
                  name: values.name,
                  type: values.type,
                  fpoll: values.fpoll,
                  bretry: values.bretry,
                  bucket: values.bucket,
                  prefix: values.prefix.length
                    ? values.prefix.slice(-1) == "/"
                      ? values.prefix
                      : values.prefix + "/"
                    : values.prefix,
                  folder: values.folder,
                  ackmode: values.ackmode,
                  active: true,
                };
              }
              return rule;
            },
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
      window: { height: 600, width: 600 },
      types: {
        generic: {
          field: "generic",
          label: "Generic",
          fields: [
            {
              // Fieldset in Column 1 - collapsible via toggle button
              xtype: "parmfield",
              title: "Parameters",
              name: "parms",
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
            values.parms = amfutil.formatArrayField(values.parms);
            delete values.field;
            delete values.value;
            return values;
          },
        },
        runscript: {
          field: "runscript",
          label: "Run Script",
          fields: [
            {
              xtype: "textfield",
              name: "module",
              fieldLabel: "Script Name",
            },
            amfutil.combo(
              "Output Topic",
              "output",
              amfutil.createCollectionStore("topics", {}, { autoLoad: true }),
              "topic",
              "topic"
            ),
            {
              // Fieldset in Column 1 - collapsible via toggle button
              xtype: "parmfield",
              title: "Extra Parameters",
              name: "parms",
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
            },
            {
              xtype: "textfield",
              name: "to",
              fieldLabel: "To",
            },
            {
              xtype: "combobox",
              name: "output",
              fieldLabel: "Output Topic",
              displayField: "topic",
              valueField: "topic",
              store: amfutil.createCollectionStore(
                "topics",
                {},
                { autoLoad: true }
              ),
            },
          ],
        },
        mailbox: {
          field: "mailbox",
          label: "Mailbox",
          fields: [
            {
              xtype: "combobox",
              name: "recipient",
              fieldLabel: "Recipient",
              displayField: "mailbox",
              valueField: "mailbox",
              store: amfutil.createCollectionStore(
                "mailbox_auth",
                {
                  active: true,
                },
                { autoLoad: true }
              ),
            },
            {
              xtype: "textfield",
              name: "format",
              fieldLabel: "Format",
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

              // Arrange radio buttons into two columns, distributed vertically
            },
            amfutil.combo(
              "Output Topic",
              "output",
              amfutil.createCollectionStore("topics"),
              "topic",
              "topic"
            ),
          ],
        },
        zip: {
          field: "zip",
          label: "Zip",
          fields: [
            {
              xtype: "textfield",
              fieldLabel: "File Name Format",
              name: "format",
              allowBlank: false,
              value: ".zip",
              validator: function (val) {
                return val.endsWith(".zip") || "Filename must end in .zip";
              },

              // Arrange radio buttons into two columns, distributed vertically
            },
            amfutil.combo(
              "Output Topic",
              "output",
              amfutil.createCollectionStore("topics"),
              "topic",
              "topic"
            ),
          ],
        },
        router: {
          field: "router",
          label: "Router",
          fields: [
            {
              xtype: "checkbox",
              uncheckedValue: false,
              inputValue: true,
              fieldLabel: "Parse EDI",
              name: "parse_edi",
              allowBlank: false,
            },
            {
              xtype: "formrules",
              name: "rules",
            },
          ],
          process: function (form, values) {
            console.log(form);
            console.log(values);
            var rulecomp = form.down("formrules");
            var names = rulecomp.ruleNames;
            var rules = [];

            names.forEach((name) => {
              var topicname = name + "-topic";
              var patternname = name + "-patterns";
              var id = name + "_id";
              console.log(values[patternname]);
              console.log(amfutil.formatMatchPatterns(values[patternname]));
              rules.push({
                topic: values[topicname],
                id: values[id],
                patterns: amfutil.formatMatchPatterns(values[patternname]),
              });
              delete values[topicname];
              delete values[patternname];
              delete values[id];
            });
            values.rules = rules;
            delete values.field;
            delete values.value;
            delete values.regex;
            delete values.pattern;
            delete values.test;
            console.log(values);
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
        // pgp_encrypt: {
        //   field: "pgp_encrypt",
        //   label: "PGP Encrypt",
        //   fields: [
        //     {
        //       xtype: "combobox",
        //       fieldLabel: "Partner Encryption Key",
        //       name: "partner_key",
        //       store: Ext.create("Amps.store.Key"),
        //       // listeners: {
        //       //   beforerender: async function (scope) {
        //       //     var store = await amfutil.createCollectionStore("keys");
        //       //     scope.setStore(store);
        //       //   },
        //       // },
        //       valueField: "name",
        //       displayField: "name",
        //       allowBlank: false,
        //     },
        //     {
        //       xtype: "checkbox",
        //       fieldLabel: "Compress",
        //       name: "compress",
        //       uncheckedValue: false,
        //       inputValue: true,
        //       allowBlank: false,
        //     },
        //     {
        //       xtype: "checkbox",
        //       fieldLabel: "Armor",
        //       name: "armor",
        //       uncheckedValue: false,
        //       inputValue: true,
        //       allowBlank: false,
        //     },
        //     {
        //       xtype: "combobox",
        //       fieldLabel: "Vault Signing Key",
        //       name: "signing_key",
        //       store: amfutil.createCollectionStore(
        //         "keys",
        //         {},
        //         { autoLoad: true }
        //       ),
        //       valueField: "name",
        //       displayField: "name",
        //     },
        //   ],
        // },
        // pgp_decrypt: {
        //   field: "pgp_decrypt",
        //   label: "PGP Decrypt",
        //   fields: [
        //     {
        //       xtype: "combobox",
        //       fieldLabel: "Decrypt Key",
        //       name: "descrypt_key",
        //       store: amfutil.createCollectionStore(
        //         "keys",
        //         {},
        //         { autoLoad: true }
        //       ),
        //       valueField: "name",
        //       displayField: "name",
        //       allowBlank: false,
        //     },
        //     {
        //       xtype: "combobox",
        //       fieldLabel: "Partner Signing Key",
        //       name: "partner_signing_key",
        //       store: amfutil.createCollectionStore(
        //         "keys",
        //         {},
        //         { autoLoad: true }
        //       ),
        //       valueField: "name",
        //       displayField: "name",
        //       allowBlank: false,
        //     },
        //     {
        //       xtype: "checkbox",
        //       fieldLabel: "Verify",
        //       name: "verify",
        //       uncheckedValue: false,
        //       inputValue: true,
        //       allowBlank: false,
        //     },
        //   ],
        // },
        // http: {
        //   field: "http",
        //   label: "HTTP API",
        //   fields: [
        //     {
        //       xtype: "textfield",
        //       name: "url",
        //       fieldLabel: "URL",
        //     },
        //     {
        //       xtype: "combobox",
        //       name: "method",
        //       fieldLabel: "Method",
        //       valueField: "field",
        //       displayField: "label",
        //       store: [
        //         {
        //           field: "post",
        //           label: "POST",
        //         },
        //         {
        //           field: "get",
        //           label: "GET",
        //         },
        //         {
        //           field: "delete",
        //           label: "DELETE",
        //         },
        //       ],
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "querystring",
        //       fieldLabel: "Query String",
        //     },
        //     {
        //       // Fieldset in Column 1 - collapsible via toggle button
        //       xtype: "fieldset",
        //       title: "Headers",
        //       itemId: "parms",
        //       collapsible: true,
        //       onAdd: function (component, position) {
        //         // component.setTitle("Match Pattern" + position);
        //         console.log(component);
        //         console.log(position);
        //       },
        //       items: [
        //         {
        //           xtype: "button",
        //           text: "Add",
        //           handler: function (button, event) {
        //             var formpanel = button.up("fieldset");

        //             formpanel.insert(
        //               formpanel.items.length - 1,
        //               Ext.create("Amps.form.Parm.String", {
        //                 title: "Header",
        //                 name: "headers",
        //               })
        //             );
        //           },
        //         },
        //       ],
        //     },
        //     {
        //       xtype: "checkbox",
        //       uncheckedValue: false,
        //       inputValue: true,
        //       name: "oauth",
        //       fieldLabel: "OAuth",
        //       listeners: {
        //         change: function (scope, val) {
        //           console.log(scope);
        //           console.log(val);
        //           var form = scope.up("form");
        //           var cont = form.down("#oauthcont");
        //           console.log(cont);
        //           var items = ["oauthurl", "oauthuser", "oauthpassword"];
        //           items.forEach((item) => {
        //             var field = form.down("#" + item);
        //             field.setHidden(!val);
        //             field.setDisabled(!val);
        //           });
        //         },
        //       },
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "oauth_url",
        //       itemId: "oathurl",
        //       fieldLabel: "OAuth URL",
        //       hidden: true,
        //       disabled: true,
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "oauth_user",
        //       itemId: "oauthuser",

        //       fieldLabel: "OAuth User",
        //       hidden: true,
        //       disabled: true,
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "oauth_password",
        //       itemId: "oauthpassword",

        //       fieldLabel: "OAuth Password",
        //       hidden: true,
        //       disabled: true,
        //     },
        //   ],
        //   load: function (form, record) {
        //     amfutil.loadParms(form, record, "headers");
        //   },
        //   process: function (form, values) {
        //     values.headers = amfutil.formatArrayField(values.headers);
        //     delete values.field;
        //     delete values.value;

        //     return values;
        //   },
        // },
        sftpput: {
          field: "sftpput",
          label: "SFTP PUT",
          fields: [
            {
              xtype: "textfield",
              name: "host",
              fieldLabel: "Host",
            },
            {
              xtype: "numberfield",
              name: "port",
              fieldLabel: "Port",
            },
            // {
            //   xtype: "textfield",
            //   name: "folder",
            //   fieldLabel: "Folder",
            // },
            {
              xtype: "textfield",
              name: "format",
              fieldLabel: "Format",
            },
            {
              xtype: "textfield",
              name: "user",
              fieldLabel: "User",
            },
            {
              xtype: "textfield",
              name: "password",
              fieldLabel: "Password",
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
            {
              xtype: "textfield",
              fieldLabel: "Host",
              name: "host",
            },
            {
              xtype: "numberfield",
              fieldLabel: "Port",
              name: "port",
            },
            {
              xtype: "textfield",
              fieldLabel: "Topic",
              name: "topic",
            },
            {
              xtype: "numberfield",
              fieldLabel: "Partition",
              name: "partition",
            },
            {
              xtype: "radiogroup",
              fieldLabel: "Authentication",
              name: "auth",
              allowBlank: false,
              columns: 2,
              vertical: true,
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
              listeners: {
                beforerender: function (scope) {
                  var val = scope.getValue();

                  if (typeof val === "object" && val !== null) {
                    val = val.auth;
                  }
                  var sasl = ["sasl-mech", "sasl-username", "sasl-password"];
                  var ssl = ["ssl-cacert", "ssl-cert", "ssl-key"];
                  for (var i = 0; i < sasl.length; i++) {
                    var n = sasl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SASL"));
                    comp.setHidden(!val.includes("SASL"));
                    comp.setDisabled(!val.includes("SASL"));
                  }

                  for (var i = 0; i < ssl.length; i++) {
                    var n = ssl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SSL"));

                    comp.setHidden(!val.includes("SSL"));
                    comp.setDisabled(!val.includes("SSL"));
                  }
                },
                change: function (scope, val) {
                  if (typeof val === "object" && val !== null) {
                    val = val.auth;
                  }
                  var sasl = ["sasl-mech", "sasl-username", "sasl-password"];
                  var ssl = ["ssl-cacert", "ssl-cert", "ssl-key"];
                  for (var i = 0; i < sasl.length; i++) {
                    var n = sasl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SASL"));
                    comp.setHidden(!val.includes("SASL"));
                    comp.setDisabled(!val.includes("SASL"));
                  }

                  for (var i = 0; i < ssl.length; i++) {
                    var n = ssl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SSL"));

                    comp.setHidden(!val.includes("SSL"));
                    comp.setDisabled(!val.includes("SSL"));
                  }
                },
              },
            },
            {
              itemId: "sasl-mech",
              xtype: "combobox",
              name: "mechanism",
              fieldLabel: "SASL Mechanism",
              store: [
                { field: "plain", value: "plain" },
                { field: "scram_sha_256", value: "SCRAM SHA 256" },
                { field: "scram_sha_512", value: "SCRAM SHA 512" },
              ],
              displayField: "field",
              valueField: "value",
            },
            {
              itemId: "sasl-username",
              xtype: "textfield",
              name: "username",
              fieldLabel: "Username",
            },
            {
              itemId: "sasl-password",
              xtype: "textfield",
              name: "password",
              fieldLabel: "Password",
            },
            {
              itemId: "ssl-cacert",
              xtype: "loadkey",
              name: "cacert",
              fieldLabel: "Certificate Authority Certificate",
            },
            {
              itemId: "ssl-cert",
              xtype: "loadkey",
              name: "cert",
              fieldLabel: "Client Certificate",
            },
            {
              itemId: "ssl-key",
              xtype: "loadkey",
              name: "key",
              fieldLabel: "Client Key",
            },
          ],
        },
        // kafka_get: {
        //   field: "kafka_get",
        //   label: "Kafka GET",
        //   fields: [
        //     {
        //       xtype: "textfield",
        //       fieldLabel: "Host",
        //       name: "host",
        //     },
        //     {
        //       xtype: "numberfield",
        //       fieldLabel: "Port",
        //       name: "port",
        //     },
        //     {
        //       xtype: "textfield",
        //       fieldLabel: "Topic",
        //       name: "topic",
        //     },
        //     {
        //       xtype: "textfield",
        //       fieldLabel: "Partition",
        //       name: "partition",
        //     },
        //     {
        //       xtype: "textfield",
        //       fieldLabel: "Group",
        //       name: "group",
        //     },
        //     {
        //       // Fieldset in Column 1 - collapsible via toggle button
        //       xtype: "fieldset",
        //       title: "Parameters",
        //       itemId: "parms",
        //       collapsible: true,
        //       onAdd: function (component, position) {
        //         // component.setTitle("Match Pattern" + position);
        //         console.log(component);
        //         console.log(position);
        //       },
        //       items: [
        //         {
        //           xtype: "button",
        //           text: "Add",
        //           menu: {
        //             items: [
        //               {
        //                 text: "Boolean",

        //                 handler: function (button, event) {
        //                   var formpanel = button.up("fieldset");

        //                   formpanel.insert(
        //                     formpanel.items.length - 1,
        //                     Ext.create("Amps.form.Parm.Bool")
        //                   );
        //                 },
        //               },
        //               {
        //                 text: "String",

        //                 handler: function (button, event) {
        //                   var formpanel = button.up("fieldset");

        //                   formpanel.insert(
        //                     formpanel.items.length - 1,
        //                     Ext.create("Amps.form.Parm.String")
        //                   );
        //                 },
        //               },
        //             ],
        //           },
        //         },
        //       ],
        //     },
        //   ],
        //   load: function (form, record) {
        //     amfutil.loadParms(form, record, "parms");
        //   },
        //   process: function (form, values) {
        //     values.parms = amfutil.formatArrayField(values.parms);
        //     delete values.field;
        //     delete values.value;
        //     return values;
        //   },
        // },
        // s3_put: {
        //   field: "s3_put",
        //   label: "S3 PUT",
        //   fields: [
        //     {
        //       xtype: "textfield",
        //       name: "bucket",
        //       fieldLabel: "Bucket",
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "region",
        //       fieldLabel: "Region",
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "access_id",
        //       fieldLabel: "Access Id",
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "access_key",
        //       fieldLabel: "Access Key",
        //     },
        //     {
        //       xtype: "combobox",
        //       name: "operation",
        //       fieldLabel: "Operation",
        //       valueField: "field",
        //       displayField: "label",
        //       store: [
        //         {
        //           field: "put",
        //           label: "PUT",
        //         },
        //         {
        //           field: "get",
        //           label: "GET",
        //         },
        //         {
        //           field: "delete",
        //           label: "DELETE",
        //         },
        //       ],
        //       listeners: {
        //         change: function (scope, val) {
        //           var pat = scope.up("form").down("#matchpattern");
        //           if (val == "get") {
        //             pat.setHidden(false);
        //             pat.setDisabled(false);
        //           } else {
        //             pat.setHidden(true);
        //             pat.setDisabled(true);
        //           }
        //         },
        //       },
        //     },
        //     {
        //       xtype: "textfield",
        //       name: "format",
        //       fieldLabel: "File Format",
        //     },
        //     {
        //       xtype: "textfield",
        //       itemId: "matchpattern",
        //       name: "file_match_pattern",
        //       hidden: true,
        //       disabled: true,
        //       fieldLabel: "File Match Pattern",
        //     },
        //     {
        //       xtype: "checkbox",
        //       name: "use_proxy",
        //       fieldLabel: "Use Proxy",
        //       uncheckedValue: false,
        //       inputValue: true,
        //       listeners: {
        //         change: function (scope, val) {
        //           var components = [
        //             "#proxyurl",
        //             "#proxyusername",
        //             "#proxypassword",
        //           ];
        //           components.forEach((name) => {
        //             var component = scope.up("form").down(name);
        //             component.setHidden(!val);
        //             component.setDisabled(!val);
        //           });
        //         },
        //       },
        //     },
        //     {
        //       xtype: "textfield",
        //       itemId: "proxyurl",
        //       name: "proxy_url",
        //       hidden: true,
        //       disabled: true,
        //       fieldLabel: "Proxy Url",
        //     },
        //     {
        //       xtype: "textfield",
        //       itemId: "proxyusername",
        //       hidden: true,
        //       disabled: true,
        //       name: "proxy_username",
        //       fieldLabel: "Proxy Username",
        //     },
        //     {
        //       xtype: "textfield",
        //       itemId: "proxypassword",

        //       hidden: true,
        //       disabled: true,
        //       name: "proxy_password",
        //       fieldLabel: "Proxy Password",
        //     },
        //   ],
        // },
      },
      object: "Action",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      columns: [
        { text: "Name", dataIndex: "name", flex: 1, type: "text" },
        { text: "Type", dataIndex: "type", flex: 1, type: "text" },
      ],
      fields: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Name",
          allowBlank: false,
          listeners: {
            change: async function (cmp, value, oldValue, eOpts) {
              var duplicate = await amfutil.checkDuplicate({
                actions: { name: value },
              });

              if (duplicate) {
                cmp.setActiveError("Action Already Exists");
                cmp.setValidation("Action Already Exists");
                // cmp.isValid(false);
              } else {
                cmp.setActiveError();
                cmp.setValidation();
              }
            },
          },
        },
        {
          xtype: "textfield",
          name: "desc",
          fieldLabel: "Description",
          allowBlank: false,
        },
        {
          xtype: "combobox",
          fieldLabel: "Action Type",
          allowBlank: false,
          displayField: "label",
          valueField: "field",
          itemId: "type",
          forceSelection: true,
          name: "type",
          listeners: {
            beforerender: function (scope) {
              if (scope.xtype == "combobox") {
                scope.setStore(
                  Object.entries(ampsgrids.grids.actions().types).map(
                    (entry) => entry[1]
                  )
                );
              }
            },
            change: function (scope, value) {
              var form = scope.up("form");
              var actionparms = form.down("#typeparms");
              actionparms.removeAll();
              actionparms.insert(
                0,
                ampsgrids.grids.actions().types[value].fields
              );
            },
          },
        },
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
          console.log(form);
          console.log(values);
          var actions = ampsgrids.grids.actions();
          if (actions.types[values.type].process) {
            values = actions.types[values.type].process(form, values);
          }

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
      },
      options: ["active", "delete"],
    }),
    topics: () => ({
      title: "Topics",
      object: "Topic",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      options: ["upload", "delete"],
      columns: [
        {
          text: "Topic",
          dataIndex: "topic",
          flex: 1,
          type: "text",
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
          isFormField: false,
          xtype: "radiogroup",
          fieldLabel: "Topic Type",
          name: "type",
          allowBlank: false,
          blankText: "Select One",
          columns: 3,
          vertical: true,
          items: [
            {
              boxLabel: "Action",
              isFormField: false,
              name: "type",
              inputValue: "actions",
            },
            {
              boxLabel: "Service",
              isFormField: false,
              name: "type",
              inputValue: "svcs",
            },
            {
              boxLabel: "Other",
              isFormField: false,
              name: "type",
              inputValue: "data",
            },
          ],
          listeners: {
            change: function (scope, val) {
              console.log(val);
              var combo;
              var parm;
              if (val.type == "actions") {
                combo = {
                  xtype: "combobox",
                  isFormField: false,
                  fieldLabel: "Actions",
                  displayField: "label",
                  valueField: "field",
                  allowBlank: false,
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
                };

                parm = {
                  xtype: "textfield",
                  fieldLabel: "Parm",
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
                };
              } else if (val.type == "svcs") {
                combo = {
                  xtype: "combobox",
                  isFormField: false,
                  fieldLabel: "Services",
                  allowBlank: false,
                  displayField: "name",
                  valueField: "type",

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
                              .types[val].combo({}, service),
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
                };
              } else {
                parm = {
                  xtype: "textfield",
                  isFormField: false,
                  fieldLabel: "Parm",
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
              scope.pieces = ["amps", " ", " ", " "];
              scope.setValue(scope.pieces.join("."));
            },
            change: async function (cmp, value, oldValue, eOpts) {
              var duplicate = await amfutil.checkDuplicate({
                topics: { subject: value },
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
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
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
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Name",
          allowBlank: false,
          submitValue: true,
          listeners: {
            change: async function (cmp, value, oldValue, eOpts) {
              await amfutil.duplicateHandler(
                cmp,
                { services: { name: value } },
                "Service Already Exists"
              );
            },
          },
        },
        {
          xtype: "textfield",
          allowBlank: false,

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
          },
          {
            xtype: "container",
            layout: "fit",
            items: [
              {
                xtype: "fieldcontainer",
                itemId: "typeparms",
                // width: 600,
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
          combo: function (combo, service) {
            return {
              xtype: "combobox",
              fieldStyle: {
                "font-size": "2rem",
              },
              name: "topicparms",
              itemId: "topicparms",
              fieldLabel: "Topics",
              labelStyle: `font-size: 2rem;`,
              allowBlank: false,
              store: service.topics,
            };
          },
          format: function (topic) {
            var reg = /[.>* -]/;
            return topic.replace(reg, "_");
          },
          fields: [
            {
              row: true,
              xtype: "arrayfield",
              name: "uris",
              title: "Brokers",
              arrayfield: "Broker",
              arrayfields: [
                {
                  xtype: "textfield",
                  name: "host",
                  fieldLabel: "Host",
                },
                {
                  xtype: "numberfield",
                  name: "port",
                  fieldLabel: "Port",
                },
              ],
            },
            {
              row: true,
              xtype: "arrayfield",
              name: "topics",
              title: "Topics",
              fieldTitle: "Topic",
              arrayfields: [
                {
                  xtype: "textfield",
                  name: "topic",
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
              listeners: {
                beforerender: function (scope) {
                  var val = scope.getValue();

                  if (typeof val === "object" && val !== null) {
                    val = val.auth;
                  }

                  if (!val) {
                    val = "NONE";
                  }

                  var sasl = ["sasl-mech", "sasl-username", "sasl-password"];
                  var ssl = ["ssl-cacert", "ssl-cert", "ssl-key"];

                  for (var i = 0; i < sasl.length; i++) {
                    var n = sasl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SASL"));
                    comp.setHidden(!val.includes("SASL"));
                    comp.setDisabled(!val.includes("SASL"));
                  }

                  for (var i = 0; i < ssl.length; i++) {
                    var n = ssl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SSL"));

                    comp.setHidden(!val.includes("SSL"));
                    comp.setDisabled(!val.includes("SSL"));
                  }
                },
                change: function (scope, val) {
                  if (typeof val === "object" && val !== null) {
                    val = val.auth;
                  }
                  var sasl = ["sasl-mech", "sasl-username", "sasl-password"];
                  var ssl = ["ssl-cacert", "ssl-cert", "ssl-key"];
                  for (var i = 0; i < sasl.length; i++) {
                    var n = sasl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SASL"));
                    comp.setHidden(!val.includes("SASL"));
                    comp.setDisabled(!val.includes("SASL"));
                  }

                  for (var i = 0; i < ssl.length; i++) {
                    var n = ssl[i];
                    var comp = amfutil.getElementByID(n);
                    console.log(comp);
                    console.log(val.includes("SSL"));

                    comp.setHidden(!val.includes("SSL"));
                    comp.setDisabled(!val.includes("SSL"));
                  }
                },
              },
            },
            {
              itemId: "sasl-mech",
              xtype: "combobox",
              name: "mechanism",
              fieldLabel: "SASL Mechanism",
              store: [
                { field: "plain", value: "plain" },
                { field: "scram_sha_256", value: "SCRAM SHA 256" },
                { field: "scram_sha_512", value: "SCRAM SHA 512" },
              ],
              displayField: "field",
              valueField: "value",
            },
            {
              itemId: "sasl-username",
              xtype: "textfield",
              name: "username",
              fieldLabel: "Username",
            },
            {
              itemId: "sasl-password",
              xtype: "textfield",
              name: "password",
              fieldLabel: "Password",
            },
            {
              itemId: "ssl-cacert",
              xtype: "loadkey",
              name: "cacert",
              fieldLabel: "Certificate Authority Certificate",
            },
            {
              itemId: "ssl-cert",
              xtype: "loadkey",
              name: "cert",
              fieldLabel: "Client Certificate",
            },
            {
              itemId: "ssl-key",
              xtype: "loadkey",
              name: "key",
              fieldLabel: "Client Key",
            },
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
            values.uris = JSON.parse(values.uris);
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
              allowBlank: false,
              minValue: 0,
              maxValue: 65535,
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

              fieldLabel: "Idle Timeout (ms)",
            },
            {
              xtype: "numberfield",
              name: "request_timeout",
              allowBlank: false,

              fieldLabel: "Request Timeout (ms)",
            },
            {
              xtype: "numberfield",
              name: "max_keepalive",
              allowBlank: false,

              fieldLabel: "Max Keep Alive (ms)",
            },
            {
              xtype: "checkbox",
              allowBlank: false,
              inputValue: true,
              uncheckedValue: false,
              row: true,
              name: "tls",
              itemId: "tls",
              fieldLabel: "TLS",
              listeners: {
                afterrender: function (scope) {
                  var val = scope.getValue();
                  var fields = ["cert", "key"];
                  var form = scope.up("form");
                  console.log(form.getForm().getFields());
                  console.log(val);
                  fields.forEach((field) => {
                    var f = form.down("#" + field);
                    console.log(f);
                    f.setHidden(!val);
                    f.setDisabled(!val);
                  });
                },
                change: function (scope, val) {
                  var fields = ["cert", "key"];
                  var form = scope.up("form");
                  console.log(val);
                  fields.forEach((field) => {
                    var f = form.down("#" + field);
                    console.log(f);
                    f.setHidden(!val);
                    f.setDisabled(!val);
                  });
                },
              },
            },
            {
              itemId: "cert",
              row: true,
              xtype: "loadkey",
              name: "cert",
              fieldLabel: "Server Cert",
              // hidden: true,
              // disabled: true,
            },
            {
              itemId: "key",
              row: true,
              xtype: "loadkey",
              name: "key",
              fieldLabel: "Server Key",
              // hidden: true,
              // disabled: true,
            },
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
            return {
              xtype: "combobox",
              fieldStyle: {
                "font-size": "2rem",
              },
              itemId: "topicparms",
              fieldLabel: "Users",
              labelStyle: `font-size: 2rem;`,
              allowBlank: false,
              displayField: "username",
              name: "topicparms",
              valueField: "username",
              store: amfutil.createCollectionStore(
                "users",
                {},
                { autoLoad: true }
              ),
            };
          },
          fields: [
            {
              xtype: "numberfield",
              name: "port",
              fieldLabel: "Port",
              minValue: 0,
              maxValue: 65535,
              allowBlank: false,
              listeners: {
                change: async function (cmp, value, oldValue, eOpts) {
                  await amfutil.portHandler(cmp, value);
                },
              },
            },
            // {
            //   xtype: "combobox",
            //   name: "module",
            //   fieldLabel: "Module",
            //   allowBlank: false,

            //   store: [],
            //   listeners: {
            //     beforerender: async function (scope) {
            //       var data = await amfutil.getCollectionData("services", {
            //         type: "modules",
            //       });
            //       scope.setStore(data[0].modules);
            //       console.log(data);
            //     },
            //   },
            // },

            {
              row: true,
              xtype: "loadkey",
              fieldLabel: "Server Key",
              name: "server_key",
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
        subscriber: {
          type: "subscriber",
          name: "Subscriber",
          iconCls: "x-fa fa-arrow-down",
          fields: [
            {
              xtype: "numberfield",
              name: "subs_count",
              fieldLabel: "Subscriber Count",
              allowBlank: false,
              minValue: 1,
              maxValue: 9,
            },
            {
              xtype: "combobox",
              fieldLabel: "Action",
              name: "handler",
              valueField: "_id",
              displayField: "name",
              store: amfutil.createCollectionStore(
                "actions",
                {},
                { autoLoad: true }
              ),
            },
            {
              xtype: "combobox",
              fieldLabel: "Topic",
              allowBlank: false,
              displayField: "topic",
              valueField: "topic",
              forceSelection: true,
              allowBlank: false,

              flex: 1,
              name: "topic",
              store: amfutil.createCollectionStore(
                "topics",
                {},
                { autoLoad: true }
              ),
            },
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
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
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
      ],
    }),
    admin: () => ({
      title: "Admin Users",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
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
      options: ["approve"],
    }),
    keys: () => ({
      title: "Keys",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      options: ["delete"],
      object: "Key",
      fields: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Key Name",
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
        {
          xtype: "combobox",
          fieldLabel: "Key Usage",
          allowBlank: false,
          displayField: "label",
          valueField: "field",
          forceSelection: true,
          flex: 1,
          name: "usage",
          store: ["RSA", "SSH", "Encryption", "Signing", "Cert"],
        },

        {
          xtype: "radiogroup",
          fieldLabel: "Type",
          name: "type",
          allowBlank: false,
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
          name: "data",
          fieldLabel: "Key",
        },
      ],
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
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
          type: "text",
        },
      ],
    }),
  },
  pages: {
    monitoring: () => ({
      view: {
        xtype: "mainlist",
        title: "Service Monitoring",
        columns: [
          {
            text: "Status",
            xtype: "widgetcolumn",
            width: "2rem",
            widget: {
              xtype: "container",
              load: function (scope, name) {
                var prev;
                var initialized = false;

                function broadcast(name) {
                  amfutil.broadcastEvent(
                    "service",
                    { name: name },
                    (payload) => {
                      var button = amfutil.getElementByID(
                        (name + "-start-stop").replace(/\s/g, "")
                      );

                      if (prev != payload) {
                        console.log(button);

                        button.setDisabled(false);

                        button.setIconCls(
                          payload
                            ? "x-fa fa-stop-circle"
                            : "x-fa fa-play-circle"
                        );
                        button.setText(payload ? "Stop" : "Start");
                        button.setHandler(function (btn) {
                          console.log("CLICK");
                          btn.setDisabled(true);
                          btn.setText(payload ? "Stopping" : "Starting");
                          amfutil.ajaxRequest({
                            url: "/api/service/" + name,
                            jsonData: {
                              action: payload ? "stop" : "start",
                            },
                            method: "POST",
                            timeout: 60000,
                            success: function (res) {
                              button.setText(payload ? "Stopped" : "Started");
                              console.log(Ext.decode(res.responseText));
                            },
                            failure: function (res) {
                              button.setText(payload ? "Stopped" : "Started");
                            },
                          });
                        });
                      }
                      prev = payload;
                      var status = scope.down("#status");
                      status.setHtml(
                        `<div>
                              <div class="led 
                              ${payload ? "green" : "red"}
                              "
                                  ></div>
                              </div>`
                      );
                    }
                  );
                }
                broadcast(name);

                console.log(scope.down("#status"));

                function timeout() {
                  setTimeout(function () {
                    broadcast(name);
                    if (
                      Ext.util.History.getToken().split("/")[0] == "monitoring"
                    ) {
                      timeout();
                    }
                  }, 1000);
                }
                timeout();
              },
              items: [
                {
                  xtype: "box",
                  itemId: "status",
                },
                // {
                //   xtype: "button",
                //   style: {
                //     backgroundColor: "transparent",
                //   },
                //   iconCls: "x-fa fa-play-circle",
                //   itemId: "start-stop",
                // },
              ],
            },
            onWidgetAttach: function (col, widget, rec) {
              console.log(widget);
              console.log(rec.data.name);
              widget.setStyle({
                backgroundColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              });
              widget.load(widget, rec.data.name);
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
              iconCls: "x-fa fa-stop-circle",
              text: "Stop",
              load: function (name) {},
            },
            onWidgetAttach: function (col, widget, rec) {
              console.log(widget);
              console.log(rec.data.name);
              widget.itemId = (rec.data.name + "-start-stop").replace(
                /\s/g,
                ""
              );
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
            active: { $exists: true },
          },
          { autoLoad: true }
        ),
        listeners: {
          beforerender: function (scope) {
            scope.getStore().reload();
          },
        },
      },
    }),
    wizard: () => ({
      view: {
        xtype: "wizard",
        title: "Amps Wizard",
      },
    }),
    defaults: () => ({
      actionIcons: [
        {
          xtype: "button",
          itemId: "addnewbtn",
          iconCls: "x-fa fa-plus-circle",
          tooltip: "Add New",
          handler: function () {
            var win = new Ext.window.Window({
              title: "Add Default",
              modal: true,
              resizable: false,
              layout: "fit",
              items: [
                {
                  xtype: "form",
                  defaults: {
                    padding: 5,
                    labelWidth: 140,
                    width: 400,
                  },
                  items: [
                    {
                      xtype: "textfield",
                      name: "field",
                      fieldLabel: "Field",
                    },
                    {
                      xtype: "textfield",
                      name: "value",
                      fieldLabel: "Value",
                    },
                  ],
                  buttons: [
                    {
                      text: "Save",
                      itemId: "addaccount",
                      cls: "button_class",
                      formBind: true,
                      listeners: {
                        click: async function (btn) {
                          var form = btn.up("form").getForm();
                          var values = form.getValues();
                          var g = amfutil.getElementByID("pagegrid");
                          var mask = new Ext.LoadMask({
                            msg: "Please wait...",
                            target: g,
                          });
                          amfutil.ajaxRequest({
                            headers: {
                              Authorization:
                                localStorage.getItem("access_token"),
                            },
                            url: `api/services/` + g.dataId + "/defaults",
                            method: "POST",
                            timeout: 60000,
                            jsonData: values,
                            success: function (response) {
                              mask.hide();
                              btn.setDisabled(false);
                              win.destroy();

                              var data = Ext.decode(response.responseText);
                              Ext.toast("Added Default");
                              amfutil.broadcastEvent("update", {
                                page: Ext.util.History.getToken(),
                              });
                              g.getStore().reload();
                            },
                            failure: function (response) {
                              mask.hide();
                              btn.setDisabled(false);
                              msg = response.responseText.replace(/['"]+/g, "");
                              amfutil.onFailure("Failed to Add", response);
                            },
                          });
                        },
                      },
                    },
                    {
                      text: "Cancel",
                      cls: "button_class",
                      listeners: {
                        click: function (btn) {
                          win.destroy();
                        },
                      },
                    },
                  ],
                },
              ],
            });
            win.show();
          },
        },
        { xtype: "tbfill" },
        // {
        //   xtype: "button",
        //   itemId: "searchpanelbtn",
        //   iconCls: "x-fa fa-search",
        //   handler: "onSearchPanel",
        //   tooltip: "Filter Records",
        //   style: "font-weight:bold;color:red;",
        // },
        // {
        //   xtype: "button",
        //   itemId: "clearfilter",
        //   html: '<img src="resources/images/clear-filters.png" />',
        //   handler: "onClearFilter",
        //   tooltip: "Clear Filter",
        //   style: "cursor:pointer;",
        // },
        {
          xtype: "button",
          itemId: "refreshbtn",
          iconCls: "x-fa fa-refresh",
          tooltip: "Refresh",
          handler: function (scope) {
            amfutil.getElementByID("pagegrid").getStore().reload();
          },
        },
      ],
      view: {
        xtype: "mainlist",
        title: "System Defaults",
        itemId: "pagegrid",

        columns: [
          {
            text: "Field",
            dataIndex: "field",
            flex: 1,
          },
          {
            text: "Value",
            dataIndex: "value",
            flex: 1,
          },
          {
            text: "Actions",
            xtype: "actioncolumn",
            items: [
              {
                iconCls: "x-fa fa-trash",
                handler: async function (
                  grid,
                  rowIndex,
                  colIndex,
                  item,
                  e,
                  record,
                  row
                ) {
                  console.log(record);
                  var mask = new Ext.LoadMask({
                    msg: "Please wait...",
                    target: grid,
                  });
                  var g = amfutil.getElementByID("pagegrid");
                  var data = record.data;
                  Ext.MessageBox.show({
                    title: "Delete",
                    cls: "delete_btn",
                    message: "Are you sure you want to delete this default",
                    buttons: Ext.MessageBox.YESNO,
                    defaultFocus: "#no",
                    prompt: false,
                    fn: async function (btn) {
                      if (btn == "yes") {
                        delete data.id;
                        await amfutil.ajaxRequest({
                          headers: {
                            Authorization: localStorage.getItem("access_token"),
                          },
                          url:
                            `api/services/` +
                            g.dataId +
                            "/defaults/" +
                            rowIndex,
                          jsonData: data,
                          method: "DELETE",
                          success: function () {
                            g.getStore().reload();
                          },
                        });
                      } else {
                      }
                    },
                  });
                },
              },
            ],
          },
        ],
        createStore: async function () {
          console.log(this);
          var scope = this;
          var data = await amfutil.getCollectionData("services", {
            name: "SYSTEM",
          });
          data = data[0];

          scope.dataId = data._id;

          scope.setStore(
            amfutil.createFieldStore("services", data._id, "defaults")
          );
        },
        listeners: {
          beforerender: async function (scope) {
            await scope.createStore();
          },
          dblclick: {
            element: "body", //bind to the underlying body property on the panel
            fn: function (grid) {
              console.log(grid);
              var record = grid.record.data;

              var win = new Ext.window.Window({
                title: "Update Default",
                modal: true,
                resizable: false,
                layout: "fit",
                items: [
                  {
                    xtype: "form",
                    defaults: {
                      padding: 5,
                      labelWidth: 140,
                      width: 400,
                    },
                    items: [
                      {
                        xtype: "textfield",
                        name: "field",
                        fieldLabel: "Field",
                        value: record.field,
                      },
                      {
                        xtype: "textfield",
                        name: "value",
                        fieldLabel: "Value",
                        value: record.value,
                      },
                    ],
                    buttons: [
                      {
                        text: "Save",
                        itemId: "addaccount",
                        cls: "button_class",
                        formBind: true,
                        listeners: {
                          click: async function (btn) {
                            var form = btn.up("form").getForm();
                            var values = form.getValues();
                            var g = amfutil.getElementByID("pagegrid");
                            var mask = new Ext.LoadMask({
                              msg: "Please wait...",
                              target: g,
                            });
                            amfutil.ajaxRequest({
                              headers: {
                                Authorization:
                                  localStorage.getItem("access_token"),
                              },
                              url:
                                `api/services/` +
                                g.dataId +
                                "/defaults/" +
                                grid.recordIndex,
                              method: "PUT",
                              timeout: 60000,
                              params: {},
                              jsonData: values,
                              success: function (response) {
                                mask.hide();
                                btn.setDisabled(false);
                                win.destroy();

                                var data = Ext.decode(response.responseText);
                                Ext.toast("Updated default");
                                amfutil.broadcastEvent("update", {
                                  page: Ext.util.History.getToken(),
                                });
                                g.getStore().reload();
                              },
                              failure: function (response) {
                                mask.hide();
                                btn.setDisabled(false);
                                msg = response.responseText.replace(
                                  /['"]+/g,
                                  ""
                                );
                                amfutil.onFailure("Failed to Update", response);
                              },
                            });
                          },
                        },
                      },
                      {
                        text: "Cancel",
                        cls: "button_class",
                        listeners: {
                          click: function (btn) {
                            win.destroy();
                          },
                        },
                      },
                    ],
                  },
                ],
              });
              win.show();
            },
          },
        },
      },
    }),
    workflows: () => ({
      view: {
        xtype: "panel",
        title: "Workflows",
        layout: "fit",
        items: [
          {
            xtype: "workflow",
          },
        ],
      },
    }),
    subscribers: () => ({
      title: "Subscribers",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      options: ["delete"],

      create: function () {
        grid = amfutil.getElementByID("main-grid");
        // scope = btn.lookupController();

        var win = Ext.create("Amps.form.add");
        win.loadForm("Subscriber", [
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Name",
            allowBlank: false,
            width: 400,
            listeners: {
              // change: async function (cmp, value, oldValue, eOpts) {
              //   await duplicateHandler(cmp, {})
              // },
            },
          },
          {
            xtype: "combobox",
            fieldLabel: "Topic",
            allowBlank: false,
            name: "topic",
            displayField: "topic",
            valueField: "topic",
            store: amfutil.createCollectionStore(
              "topics",
              {},
              { autoLoad: true }
            ),
          },
          {
            xtype: "numberfield",
            fieldLabel: "Subscriber Count",
            name: "subs_count",
            allowBlank: false,
          },

          {
            xtype: "combobox",
            fieldLabel: "Action",
            allowBlank: false,
            name: "handler",
            displayField: "name",
            valueField: "_id",
            store: amfutil.createCollectionStore(
              "actions",
              { active: true },
              { autoLoad: true }
            ),
          },
        ]);
        win.show();
      },
      update: function (record, route, scope, close) {
        grid = amfutil.getElementByID("main-grid");
        // scope = btn.lookupController();
        var myForm = Ext.create("Amps.form.update");
        myForm.loadForm("Key", [
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Topic",
            allowBlank: false,
            width: 400,
            value: record.name,
            listeners: {
              // change: async function (cmp, value, oldValue, eOpts) {
              //   await duplicateHandler(cmp, {})
              // },
            },
          },
          {
            xtype: "numberfield",
            fieldLabel: "Subscriber Count",
            name: "subs_count",
            value: record.subs_count,

            allowBlank: false,
          },
          {
            xtype: "combobox",
            fieldLabel: "Topic",
            allowBlank: false,
            name: "topic",
            displayField: "name",
            value: record.topic,

            valueField: "_id",
            store: amfutil.createCollectionStore(
              "topics",
              { active: true },
              { autoLoad: true }
            ),
          },
          {
            xtype: "combobox",
            fieldLabel: "Action",
            allowBlank: false,
            name: "handler",
            displayField: "name",
            value: record.handler,

            valueField: "_id",
            store: amfutil.createCollectionStore(
              "actions",
              { active: true },
              { autoLoad: true }
            ),
          },
        ]);
        return myForm;
      },
      columns: [
        {
          text: "Name",
          dataIndex: "name",
          flex: 1,
          type: "text",
        },
        {
          text: "Action",
          dataIndex: "handler",
          flex: 1,
          type: "text",

          renderer: function (value) {
            return `<a href="${"#actions/" + value.id}">` + value.name + "</a>";
          },
        },
      ],
      process: async function (records) {
        var processed = [];
        for (var i = 0; i < records.length; i++) {
          var data = records[i].data;
          var target = await amfutil.getById("actions", data.handler);
          data.handler = target;
          processed.push(data);
        }

        return processed;
      },
    }),
  },
});
