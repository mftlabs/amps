Ext.define("Amps.container.Workflow.Step", {
  xtype: "workflowstep",
  extend: "Ext.container.Container",
  layout: {
    type: "hbox",
    align: "stretch",
  },

  constructor: function (args) {
    this.callParent(args);
    var step = args["step"];
    var c = this.down("#step");
    var b = this.down("#button");
    var form = args["form"];
    console.log(step);
    var steps = args["steps"];

    if (step.step) {
      var currStep = step.step;
      c.insert({
        xtype: "component",
        style: {
          background: "#5fa2dd",
          padding: 10,
          color: "white",
          "font-weight": 400,
        },
        autoEl: "div",
        html: `#${steps.items.items.length + 1}` + " " + currStep.sub.topic,
      });
      console.log(currStep);
      c.insert(1, [
        {
          xtype: "container",
          style: {
            padding: 5,
          },
          layout: {
            type: "table",
            // The total column count must be specified here
            columns: 2,
          },
          defaults: {
            padding: 10,
          },
          items: [
            {
              xtype: "component",

              html: "Action:",
              style: {
                fontSize: 13,
              },
              // rowspan: 2,
            },
            {
              xtype: "button",
              text: currStep.action.name,
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
                      form.down("#steps").loadWorkflow(form);
                    },
                  },
                });

                win.show();
                console.log(config.types);
              },
            },
            {
              xtype: "component",

              html: "Subscriber:",

              style: {
                fontSize: 13,
              },
            },
            {
              xtype: "button",

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
      ]);
      if (currStep.steps) {
        b.insert({
          xtype: "container",
          width: 50,
          height: 50,
          layout: "center",
          items: [
            {
              xtype: "component",
              cls: "x-fa fa-arrow-right",
            },
          ],
        });
        // b.insert({
        //   xtype: "container",
        //   layout: "center",
        //   margin: 5,
        //   items: [
        //     {
        //       xtype: "button",
        //       iconCls: "x-fa fa-plus",
        //       text: "Add",
        //       handler: function () {
        //         console.log("Input Topic: " + currStep.sub.topic);
        //         console.log("Output Topic: " + currStep.topic.sub.topic);
        //         console.log(currStep);
        //         var win = new Ext.window.Window({
        //           title: "Add Step",
        //           modal: true,
        //           width: 600,
        //           height: 500,
        //           // resizable: false,
        //           layout: "fit",
        //           items: [
        //             {
        //               xtype: "panel",
        //               layout: "card",
        //               bodyStyle: "padding:15px",
        //               scrollable: true,
        //               itemId: "wizard",
        //               defaultListenerScope: true,
        //               //   tbar: [
        //               //     {
        //               //       xtype: "container",
        //               //       items: [
        //               //         {
        //               //           html: `<ul class="stepNav threeWide"><li id="user_step1" class="selected"><a href="#">User Details</a></li><li id="user_step2" class=""><a href="#">Provider Details</a></li><li id="user_step3" class=""><a href="#">Review</a></li></ul>`,
        //               //         },
        //               //       ],
        //               //     },
        //               //   ],
        //               items: [
        //                 {
        //                   xtype: "form",
        //                   scrollable: true,
        //                   layout: {
        //                     type: "vbox",
        //                     align: "stretch",
        //                   },
        //                   itemId: "card-0",
        //                   items: [
        //                     {
        //                       html: `           <h1>AMPS Wizard</h1>
        //                         <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 1 of 3: Define an action below.</h4>`,
        //                     },
        //                     {
        //                       xtype: "fieldcontainer",
        //                       layout: {
        //                         type: "vbox",
        //                         align: "stretch",
        //                       },
        //                       listeners: {
        //                         beforerender: function (scope) {
        //                           var actions = ampsgrids.grids["actions"]();
        //                           scope.insert(
        //                             0,
        //                             actions.fields.map((field) => {
        //                               field = Object.assign({}, field);
        //                               if (field.name == "type") {
        //                                 console.log(field);
        //                                 var types;
        //                                 field = Ext.apply(field, {
        //                                   listeners: {
        //                                     beforerender: function (scope) {
        //                                       var actionTypes = Object.assign(
        //                                         {},
        //                                         actions.types
        //                                       );
        //                                       console.log(actionTypes);
        //                                       types = store = Object.entries(
        //                                         actionTypes
        //                                       ).reduce(function (
        //                                         filtered,
        //                                         type
        //                                       ) {
        //                                         type = Object.assign(
        //                                           {},
        //                                           type[1]
        //                                         );
        //                                         var output = type.fields.find(
        //                                           (field) =>
        //                                             field.name == "output"
        //                                         );
        //                                         if (output) {
        //                                           filtered.push(type);
        //                                           return filtered;
        //                                         } else {
        //                                           return filtered;
        //                                         }
        //                                       },
        //                                       []);
        //                                       console.log(types);
        //                                       scope.setStore(types);
        //                                     },
        //                                     change: function (scope, value) {
        //                                       var form = scope.up("form");
        //                                       var actionparms =
        //                                         form.down("#typeparms");
        //                                       actionparms.removeAll();
        //                                       console.log(types);
        //                                       actionparms.insert(
        //                                         0,
        //                                         types.find(
        //                                           (type) => type.field == value
        //                                         ).fields
        //                                       );
        //                                       var output = form
        //                                         .getForm()
        //                                         .findField("output");
        //                                       console.log(
        //                                         currStep.step.sub.topic
        //                                       );
        //                                       output.setValue(
        //                                         currStep.step.sub.topic
        //                                       );
        //                                       output.setReadOnly(true);
        //                                     },
        //                                   },
        //                                 });
        //                               }
        //                               return field;
        //                             })
        //                           );
        //                         },
        //                       },
        //                     },
        //                   ],
        //                   bbar: [
        //                     "->",
        //                     {
        //                       itemId: "card-next",
        //                       text: "Next &raquo;",
        //                       handler: "showNext",
        //                       formBind: true,
        //                     },
        //                   ],
        //                 },
        //                 {
        //                   xtype: "form",
        //                   itemId: "card-1",
        //                   scrollable: true,
        //                   items: [
        //                     {
        //                       html: `           <h1>AMPS Wizard</h1>
        //                         <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 2 of 3: Define a corresponding topic.</h4>`,
        //                     },
        //                     {
        //                       xtype: "fieldcontainer",
        //                       listeners: {
        //                         beforerender: function (scope) {
        //                           scope.insert(
        //                             0,
        //                             ampsgrids.grids["topics"]().fields
        //                           );
        //                         },
        //                       },
        //                     },
        //                   ],
        //                   bbar: [
        //                     "->",
        //                     {
        //                       itemId: "card-prev",
        //                       text: "&laquo; Previous",
        //                       handler: "showPrevious",
        //                     },
        //                     {
        //                       itemId: "card-next",
        //                       text: "Next &raquo;",
        //                       handler: "showNext",
        //                       formBind: true,
        //                     },
        //                   ],
        //                 },
        //                 {
        //                   xtype: "form",
        //                   itemId: "card-2",
        //                   scrollable: true,
        //                   items: [
        //                     {
        //                       html: `         <h1>AMPS Wizard</h1>
        //                         <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 3 of 3: Define a subscriber that subscribes to your topic and performs your action.</h4>`,
        //                     },
        //                     {
        //                       xtype: "fieldcontainer",
        //                       listeners: {
        //                         beforerender: function (scope) {
        //                           var services = ampsgrids.grids["services"]();
        //                           var fields = services.fields.concat(
        //                             services.types["subscriber"].fields
        //                           );
        //                           // console.log(action);
        //                           // console.log(topic);
        //                           scope.insert(
        //                             0,
        //                             fields.map((field) => {
        //                               if (
        //                                 field.name == "action" ||
        //                                 field.name == "topic"
        //                               ) {
        //                                 field.readOnly = true;
        //                                 field.forceSelection = false;
        //                               }
        //                               return field;
        //                             })
        //                           );
        //                         },
        //                       },
        //                     },
        //                   ],
        //                   bbar: [
        //                     "->",
        //                     {
        //                       itemId: "card-prev",
        //                       text: "&laquo; Previous",
        //                       handler: "showPrevious",
        //                       // disabled: true,
        //                     },
        //                     {
        //                       itemId: "card-next",
        //                       formBind: true,
        //                       text: "Finish",
        //                       handler: async function (scope) {
        //                         console.log("Finish");
        //                         var actionform = scope
        //                           .up("#wizard")
        //                           .down("#card-0");
        //                         var topicform = scope
        //                           .up("#wizard")
        //                           .down("#card-1");
        //                         var subscriberform = scope.up("form");
        //                         var action = actionform.getForm().getValues();
        //                         action = ampsgrids.grids[
        //                           "actions"
        //                         ]().add.process(actionform, action);
        //                         var topic = topicform.getForm().getValues();
        //                         topic = amfutil.convertNumbers(
        //                           topicform.getForm(),
        //                           topic
        //                         );
        //                         var subscriber = subscriberform
        //                           .getForm()
        //                           .getValues();
        //                         subscriber = amfutil.convertNumbers(
        //                           subscriberform.getForm(),
        //                           subscriber
        //                         );
        //                         subscriber.type = "subscriber";
        //                         subscriber.active = true;
        //                         var wizard = scope.up("#wizard");
        //                         if (currStep.ruleid) {
        //                           console.log("Updating Router Rule");
        //                           var idx = currStep.action.rules.findIndex(
        //                             (rule) => rule.id == currStep.ruleid
        //                           );
        //                           currStep.action.rules[idx].topic =
        //                             topic.topic;
        //                           console.log(currStep.action.rules[idx]);
        //                         } else {
        //                           currStep.action.output = topic.topic;
        //                         }
        //                         amfutil.updateInCollection(
        //                           "actions",
        //                           currStep.action,
        //                           currStep.action._id
        //                         );
        //                         var actionid = await amfutil.addToCollection(
        //                           "actions",
        //                           action
        //                         );
        //                         console.log(actionid);
        //                         var topicid = await amfutil.addToCollection(
        //                           "topics",
        //                           topic
        //                         );
        //                         console.log(topicid);
        //                         subscriber.handler = actionid;
        //                         var subscriberid =
        //                           await amfutil.addToCollection(
        //                             "services",
        //                             subscriber
        //                           );
        //                         wizard.showNext();
        //                         var confirmation = scope
        //                           .up("#wizard")
        //                           .down("#card-3");
        //                         confirmation.loadConfirmation(
        //                           {
        //                             id: actionid,
        //                             name: action.name,
        //                           },
        //                           {
        //                             id: topicid,
        //                             name: topic.topic,
        //                           },
        //                           {
        //                             id: subscriberid,
        //                             name: subscriber.name,
        //                           }
        //                         );
        //                         console.log(subscriberid);
        //                       },
        //                     },
        //                   ],
        //                   listeners: {
        //                     beforeactivate(scope) {
        //                       var action = scope.down("combobox[name=handler]");
        //                       console.log(action);
        //                       var topic = scope.down("combobox[name=topic]");
        //                       console.log(topic);
        //                       var actionform = scope
        //                         .up("panel")
        //                         .down("#card-0");
        //                       console.log(actionform);
        //                       var topicform = scope.up("panel").down("#card-1");
        //                       console.log(topicform);
        //                       action.setValue(
        //                         actionform
        //                           .down("textfield[name=name]")
        //                           .getValue()
        //                       );
        //                       topic.setValue(
        //                         topicform
        //                           .down("displayfield[name=topic]")
        //                           .getValue()
        //                       );
        //                     },
        //                   },
        //                 },
        //                 {
        //                   xtype: "form",
        //                   itemId: "card-3",
        //                   loadConfirmation: function (
        //                     action,
        //                     topic,
        //                     subscriber
        //                   ) {
        //                     var html = `
        //                       <h1>AMPS Wizard</h1>
        //                       <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;">
        //                       <h2>Complete! You defined:</h4>
        //                       <h3>Action: <a href="#actions/${action.id}">${action.name}</a><h5>
        //                       <h3>Topic: <a href="#topics/${topic.id}">${topic.name}</a><h5>
        //                       <h3>Subscriber: <a href="#services/${subscriber.id}">${subscriber.name}</a> that listens on ${topic.name} and performs ${action.name}<h5>
        //                       `;
        //                     this.down("#confirm").setHtml(html);
        //                   },
        //                   items: [
        //                     {
        //                       itemId: "confirm",
        //                       html: "",
        //                     },
        //                   ],
        //                   bbar: [
        //                     "->",
        //                     {
        //                       // formBind: true,
        //                       text: "Close",
        //                       handler: async function (scope) {
        //                         form
        //                           .down("#steps")
        //                           .loadWorkflow(
        //                             amfutil.getElementByID("workflow")
        //                           );
        //                         win.close();
        //                       },
        //                     },
        //                   ],
        //                 },
        //               ],
        //               showNext: function () {
        //                 console.log("Next");
        //                 this.doCardNavigation(1);
        //               },
        //               showPrevious: function (btn) {
        //                 this.doCardNavigation(-1);
        //               },
        //               doCardNavigation: function (incr) {
        //                 var me = this;
        //                 var l = me.getLayout();
        //                 var i = l.activeItem.itemId.split("card-")[1];
        //                 var next = parseInt(i, 10) + incr;
        //                 l.setActiveItem(next);
        //                 // me.down("#card-prev").setDisabled(next === 0);
        //                 // me.down("#card-next").setDisabled(next === 2);
        //               },
        //             },
        //           ],
        //         });
        //         win.show();
        //       },
        //     },
        //   ],
        // });
      }
    } else {
      c.insert({
        xtype: "component",
        style: {
          background: "#5fa2dd",
          padding: 10,
          color: "white",
          "font-weight": 400,
        },
        autoEl: "div",
        html: `#${steps.items.items.length + 1}` + " " + step.topic,
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
                title: "Configure Subscriber For: " + step.topic,
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
                    topic: step.topic,
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
    }
  },

  items: [
    {
      xtype: "container",
      itemId: "step",
      border: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      style: {
        "border-style": "solid",
        borderColor: "#5fa2dd",
      },
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
    this.callParent(args);
  },
  items: [
    {
      xtype: "container",
      title: "Services",
      scrollable: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      listeners: {
        beforerender: async function (w) {
          var servicedata = await amfutil.getCollectionData("services", {
            communication: true,
          });

          servicedata.forEach((rec) => {
            w.insert(0, [
              {
                xtype: "form",
                padding: 10,
                layout: {
                  type: "hbox",
                  align: "stretch",
                },
                defaults: {
                  margin: 5,
                },
                // style: {
                //   borderStyle: "solid",
                // },
                items: [
                  {
                    xtype: "panel",
                    title: rec.name,
                    border: 5,
                    width: 300,
                    style: {
                      "box-shadow":
                        "rgba(0, 0, 0, 0.25) 0px 0.0625em 0.0625em, rgba(0, 0, 0, 0.25) 0px 0.125em 0.5em, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset",
                    },

                    bodyPadding: 10,
                    items: [
                      {
                        xtype: "container",
                        items: [
                          {
                            xtype: "displayfield",
                            submitValue: true,
                            value: rec.name,
                            // fieldStyle: {
                            //   "font-size": "2rem",
                            // },
                            itemId: "service",
                            allowBlank: false,

                            // labelStyle: `font-size: 2rem;`,
                            fieldLabel: "Service",
                            name: "service",

                            displayField: "name",
                            valueField: "name",
                          },
                        ],
                        listeners: {
                          beforerender: function (scope) {
                            var cb = ampsgrids.grids
                              .services()
                              .types[rec.type].combo(rec);
                            console.log(cb);
                            scope.insert(cb);
                            var win = Ext.create("Ext.window.Window", {
                              xtype: "window",
                              itemId: "metadata",
                              title: "Metadata for " + rec.name,
                              scrollable: true,
                              closeAction: "method-hide",
                              // constrain: true,
                              width: 500,
                              height: 500,
                              padding: 10,
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
                            });
                            scope.insert(win);
                          },
                        },
                        // cls: "button_class",
                      },

                      {
                        xtype: "container",
                        layout: {
                          type: "hbox",
                          align: "stretch",
                        },
                        items: [
                          {
                            xtype: "button",
                            text: "Edit Metadata",
                            margin: 1,

                            flex: 1,
                            handler: function (btn) {
                              btn.up("form").down("#metadata").show();
                            },
                          },
                          // {
                          //   formBind: true,
                          //   xtype: "button",
                          //   margin: 1,

                          //   flex: 1,
                          //   scale: "small",
                          //   text: "Map Workflow",
                          //   handler: async function (btn) {
                          //     var form = btn.up("form");

                          //     form.down("#steps").loadWorkflow(form);
                          //     // console.log(data);
                          //   },
                          // },
                        ],
                      },
                    ],
                  },
                  {
                    xtype: "container",
                    layout: "center",
                    items: [
                      {
                        formBind: true,

                        xtype: "button",
                        iconCls: "x-fa fa-arrow-right",
                        text: "Map Workflow",
                        handler: async function (btn) {
                          var form = btn.up("form");

                          form.down("#steps").loadWorkflow(form);
                          // console.log(data);
                        },
                      },
                    ],
                  },

                  {
                    xtype: "container",
                    flex: 1,
                    itemId: "steps",
                    margin: 5,
                    layout: { type: "hbox", align: "stretch" },
                    scrollable: true,
                    loadWorkflow: async function (form) {
                      var wf = form.up("workflow");
                      console.log(wf);
                      var mask = new Ext.LoadMask({
                        msg: "Please wait...",
                        target: form,
                      });
                      mask.show();
                      var fields = form.getForm().getFields();
                      var service = rec;

                      var final = form
                        .getForm()
                        .findField("topicparms")
                        .getValue();

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
                      var steps = form.down("#steps");
                      steps.removeAll();
                      function loadStep(step) {
                        console.log(step);
                        if (step.step) {
                          var currStep = step.step;
                          console.log(currStep.sub.topic);
                          steps.insert({
                            xtype: {
                              xtype: "workflowstep",
                              step: step,
                              steps: steps,
                              form: form,
                            },
                          });
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
                                xtype: {
                                  xtype: "workflowstep",
                                  step: step,
                                  steps: steps,
                                  form: form,
                                },
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
              {
                xtype: "component",
                autoEl: "hr",
                style: {
                  borderColor: "lightgray",
                },
              },
            ]);
          });
        },
      },
    },
    {
      xtype: "container",
      title: "Jobs",
      layout: {
        type: "vbox",
        align: "stretch",
      },
      scrollable: true,
      listeners: {
        beforerender: async function (w) {
          var data = await amfutil.getCollectionData("scheduler", {});

          data.forEach((rec) => {
            w.insert(0, [
              {
                xtype: "form",
                padding: 10,
                layout: {
                  type: "hbox",
                  align: "stretch",
                },
                defaults: {
                  margin: 5,
                },
                // style: {
                //   borderStyle: "solid",
                // },
                items: [
                  {
                    xtype: "panel",
                    title: rec.name,
                    border: 5,
                    width: 300,
                    style: {
                      "box-shadow":
                        "rgba(0, 0, 0, 0.25) 0px 0.0625em 0.0625em, rgba(0, 0, 0, 0.25) 0px 0.125em 0.5em, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset",
                    },

                    bodyPadding: 10,
                    items: [
                      {
                        xtype: "container",
                        items: [
                          {
                            xtype: "displayfield",
                            submitValue: true,
                            value: rec.name,
                            // fieldStyle: {
                            //   "font-size": "2rem",
                            // },
                            itemId: "service",
                            allowBlank: false,

                            // labelStyle: `font-size: 2rem;`,
                            fieldLabel: "Job",
                            name: "job",

                            displayField: "name",
                            valueField: "name",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    xtype: "container",
                    layout: "center",
                    items: [
                      {
                        formBind: true,

                        xtype: "button",
                        iconCls: "x-fa fa-arrow-right",
                        text: "Map Workflow",
                        handler: async function (btn) {
                          var form = btn.up("form");

                          form.down("#steps").loadWorkflow(form);
                          // console.log(data);
                        },
                      },
                    ],
                  },

                  {
                    xtype: "container",
                    flex: 1,
                    itemId: "steps",
                    margin: 5,
                    layout: { type: "hbox", align: "stretch" },
                    scrollable: true,
                    loadWorkflow: async function (form) {
                      var wf = form.up("workflow");
                      console.log(wf);
                      var mask = new Ext.LoadMask({
                        msg: "Please wait...",
                        target: form,
                      });
                      mask.show();

                      var resp = await amfutil.ajaxRequest({
                        url: "api/workflow",
                        jsonData: { topic: rec.topic, meta: rec.meta },
                        method: "POST",
                      });

                      var workflow = Ext.decode(resp.responseText);
                      console.log(workflow);
                      var steps = form.down("#steps");
                      steps.removeAll();
                      function loadStep(step) {
                        console.log(step);
                        if (step.step) {
                          var currStep = step.step;
                          console.log(currStep.sub.topic);
                          steps.insert({
                            xtype: {
                              xtype: "workflowstep",
                              step: step,
                              steps: steps,
                              form: form,
                            },
                          });
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
                                xtype: {
                                  xtype: "workflowstep",
                                  step: step,
                                  steps: steps,
                                  form: form,
                                },
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
                listeners: {
                  afterrender: function (scope) {
                    scope.down("#steps").loadWorkflow(scope);
                  },
                },
              },
              {
                xtype: "component",
                autoEl: "hr",
                style: {
                  borderColor: "lightgray",
                },
              },
            ]);
          });
        },
      },
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
          xtype: "component",
          html: "<h1>AMPS Wizard</h1>",
        },
        {
          html: `<hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 3 of 3: Define a subscriber that subscribes to your topic and performs your action.</h4>`,
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
          if (topicval.new) {
            topic.setValue(topicval.new);
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
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      columns: [
        { text: "Name", dataIndex: "name", flex: 1, type: "text" },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
          type: "text",
        },
      ],
      types: {
        s3: {
          field: "s3",
          label: "S3",
          fields: [
            {
              xtype: "combobox",
              fieldLabel: "S3 Provider",
              name: "provider",
              allowBlank: false,
              blankText: "Select One",
              vertical: true,
              store: ["AWS", "Minio"],

              listeners: amfutil.renderListeners(function render(scope, val) {
                var comps = ["Minio", "AWS"];

                comps.forEach((name) => {
                  var component = scope.up("form").down("#" + name);
                  component.setHidden(val != name);
                  component.setDisabled(val != name);
                });
              }),
            },
            {
              xtype: "fieldset",
              hidden: true,
              disabled: true,
              title: "Minio",

              itemId: "Minio",
              items: [
                {
                  xtype: "combobox",
                  name: "scheme",
                  fieldLabel: "Scheme",
                  valueField: "value",
                  displayField: "label",
                  store: [
                    {
                      value: "http://",
                      label: "HTTP",
                    },
                    {
                      value: "https://",
                      label: "HTTPS",
                    },
                  ],
                },
                {
                  xtype: "textfield",

                  itemId: "host",
                  name: "host",
                  fieldLabel: "Host",
                },
                {
                  xtype: "textfield",

                  itemId: "port",
                  name: "port",
                  fieldLabel: "Port",
                },
              ],
            },
            {
              xtype: "fieldset",
              hidden: true,
              disabled: true,
              title: "AWS",
              itemId: "AWS",
              items: [
                {
                  xtype: "combobox",
                  itemId: "region",
                  name: "region",
                  fieldLabel: "Region",
                  store: [
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
                },
              ],
            },

            {
              xtype: "textfield",
              name: "key",
              fieldLabel: "Access Id",
            },
            {
              xtype: "textfield",
              name: "secret",
              fieldLabel: "Access Key",
            },
            {
              xtype: "checkbox",
              name: "proxy",
              fieldLabel: "Use Proxy",
              uncheckedValue: false,
              inputValue: true,
              listeners: {
                afterrender: function (scope) {
                  var val = scope.getValue();
                  var components = [
                    "#proxyurl",
                    "#proxyusername",
                    "#proxypassword",
                  ];
                  components.forEach((name) => {
                    var component = scope.up("form").down(name);
                    component.setHidden(!val);
                    component.setDisabled(!val);
                  });
                },
                change: function (scope, val) {
                  var components = [
                    "#proxyurl",
                    "#proxyusername",
                    "#proxypassword",
                  ];
                  components.forEach((name) => {
                    var component = scope.up("form").down(name);
                    component.setHidden(!val);
                    component.setDisabled(!val);
                  });
                },
              },
            },
            {
              xtype: "textfield",
              itemId: "proxyurl",
              name: "proxy_url",
              hidden: true,
              disabled: true,
              fieldLabel: "Proxy Url",
            },
            {
              xtype: "textfield",
              itemId: "proxyusername",
              hidden: true,
              disabled: true,
              name: "proxy_username",
              fieldLabel: "Proxy Username",
            },
            {
              xtype: "textfield",
              itemId: "proxypassword",

              hidden: true,
              disabled: true,
              name: "proxy_password",
              fieldLabel: "Proxy Password",
            },
          ],
        },
        kafka: {
          field: "kafka",
          label: "Kafka",
          fields: [
            {
              row: true,
              xtype: "arrayfield",
              name: "brokers",
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
                {
                  itemId: "sasl-mech",
                  xtype: "combobox",
                  name: "mechanism",
                  fieldLabel: "SASL Mechanism",
                  tooltip: "The SASL Mechanism for SASL Auth",
                  allowBlank: false,
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
                {
                  itemId: "ssl-cacert",
                  allowBlank: false,

                  xtype: "loadkey",
                  name: "cacert",
                  fieldLabel: "Certificate Authority Certificate",
                  tooltip: "The Certificate Authority Certificate for SSL Auth",
                },
                {
                  itemId: "ssl-cert",
                  allowBlank: false,

                  xtype: "loadkey",
                  name: "cert",
                  fieldLabel: "Client Certificate",
                  tooltip: "The Client Certificate for SSL Auth",
                },
                {
                  itemId: "ssl-key",
                  allowBlank: false,

                  xtype: "loadkey",
                  name: "key",
                  fieldLabel: "Client Key",
                  tooltip: "The Client Key for SSL Auth",
                },
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
            },
            {
              xtype: "textfield",
              name: "client_secret",
              fieldLabel: "Client Secret",
            },
            {
              xtype: "textfield",
              name: "client_id",
              fieldLabel: "Client ID",
            },
          ],
        },
      },
      fields: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Name",
          allowBlank: false,
          listeners: {
            change: async function (cmp, value, oldValue, eOpts) {
              await amfutil.duplicateHandler(
                cmp,
                {
                  providers: { name: value },
                },
                "Action Already Exists"
              );
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
          fieldLabel: "Provider Type",
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
                  Object.entries(ampsgrids.grids.providers().types).map(
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
                ampsgrids.grids.providers().types[value].fields
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
    scheduler: () => ({
      title: "Scheduler",
      object: "Job",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      options: ["active", "delete"],
      columns: [
        {
          text: "Job Name",
          dataIndex: "name",
          flex: 1,
          value: "true",
          type: "text",
        },
        {
          text: "Type",
          dataIndex: "type",
          flex: 1,
        },
      ],
      fields: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Job Name",
          allowBlank: false,
          listeners: {
            change: async function (scope, val) {
              await amfutil.duplicateHandler(
                scope,
                { scheduler: { name: val } },
                "Job Name Already Exists"
              );
            },
          },
        },
        {
          xtype: "checkbox",
          name: "active",
          fieldLabel: "Active",
          inputValue: true,
          uncheckedValue: false,
          checked: true,
        },
        {
          xtype: "combobox",
          name: "type",
          fieldLabel: "Schedule Type",
          allowBlank: false,

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
          listeners: {
            afterrender: function (scope) {
              var val = scope.getValue();
              var all = ["time", "daily", "weekdays", "timer", "monthdays"];
              var comps = {
                timer: ["timer"],
                daily: ["time", "daily", "weekdays"],
                days: ["time", "monthdays"],
              };
              var chosen = comps[val] || [];
              console.log(chosen);
              all.forEach((id) => {
                var comp = scope.up("form").down("#" + id);
                console.log(id);
                console.log(comp);
                comp.setHidden(!(chosen.indexOf(id) >= 0));
                comp.setDisabled(!(chosen.indexOf(id) >= 0));
              });
            },
            change: function (scope, val) {
              var all = ["time", "daily", "weekdays", "timer", "monthdays"];
              var comps = {
                timer: ["timer"],
                daily: ["time", "daily", "weekdays"],
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
            },
          },
        },
        {
          xtype: "timefield",
          fieldLabel: "Time",
          hidden: true,
          disabled: true,
          itemId: "time",
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
          name: "daily",
          itemId: "daily",
          inputValue: true,
          allowBlank: false,

          uncheckedValue: false,
          hidden: true,
          disabled: true,
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
          hidden: true,
          disabled: true,
          itemId: "weekdays",
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
        {
          xtype: "fieldcontainer",
          hidden: true,
          disabled: true,
          itemId: "timer",
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
              value: "Hours",

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

        {
          disabled: true,
          hidden: true,
          itemId: "monthdays",
          name: "days",
          allowBlank: false,

          xtype: "tagfield",
          store: Array.from({ length: 31 }, (x, i) => (i + 1).toString()),
          fieldLabel: "Days of the Month",
        },
        amfutil.combo(
          "Topic",
          "topic",
          amfutil.createCollectionStore("topics"),
          "topic",
          "topic"
        ),
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
    message_events: () => ({
      title: "Message Events",
      // filter: { parent: { $exists: false } },
      actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
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
      options: ["approve", "delete", "link"],
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
      window: { height: 600, width: 700 },
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
            {
              xtype: "textfield",
              name: "module",
              fieldLabel: "Script Name",
              allowBlank: false,
              tooltip: "The name of the Python module to run",
            },
            amfutil.outputTopic(),
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
              tooltip: "The mailbox to deliver the message to",
            },
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
                    console.log(con == val);
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
                  xtype: "datetime",
                  itemId: "by_start_time",
                  name: "start_time",
                  fieldLabel: "Start Time",
                  allowBlank: false,
                  tooltip: 'The start time for the "Start Time" deliver policy',
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
                {
                  xtype: "numberfield",
                  name: "from_time",
                  fieldLabel: "Send From",
                  tooltip:
                    "The period from which to batch messages specified in seconds prior to action execution. (i.e. to batch all mailbox messages from the previous, one should do atleast 86400 seconds (24 hours)",
                },
              ],
            },

            amfutil.outputTopic(),
            amfutil.formatFileName(),
            {
              xtype: "textfield",
              name: "delimiter",
              fieldLabel: "Delimiter",
              allowblank: false,
              tooltip: "The delimiter to use when batching messages.",
            },
          ],
        },
        pgpencrypt: {
          field: "pgpencrypt",
          label: "PGP Encrypt",
          fields: [
            {
              xtype: "loadkey",
              name: "key",
              fieldLabel: "Encryption Key",
              tooltip: "The recipient public encryption key.",
            },
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
            {
              xtype: "loadkey",
              name: "signing_key",
              fieldLabel: "Signing Key",
              tooltip: "The signing key.",
            },
            {
              xtype: "textfield",
              name: "passphrase",
              inputType: "password",

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
            {
              xtype: "loadkey",
              fieldLabel: "Decrypt Key",
              name: "key",
              allowBlank: false,
              tooltip: "The private decryption key.",
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
            {
              xtype: "loadkey",
              fieldLabel: "Partner Signing Key",
              name: "signing_key",
              allowBlank: false,
              tooltip: "The key to use when verifying the signature.",
            },
            amfutil.formatFileName(),
            amfutil.outputTopic(),
          ],
        },
        http: {
          field: "http",
          label: "HTTP API",
          fields: [
            {
              xtype: "textfield",
              name: "url",
              fieldLabel: "URL",
              allowBlank: false,
              tooltip: "The URL for the request.",
            },
            {
              xtype: "combobox",
              name: "method",
              fieldLabel: "Method",
              valueField: "field",
              displayField: "label",
              store: [
                {
                  field: "post",
                  label: "POST",
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
              listeners: amfutil.renderListeners(function (scope, val) {
                var get = this.up("form").down("#get");
                get.setHidden(val != "get");
                get.setDisabled(val != "get");
              }),
              tooltip: "The HTTP Method for the request.",
            },
            {
              xtype: "textfield",
              name: "querystring",
              fieldLabel: "Query String",
              tooltip: `The URL query string beginning with "?" that will be appending the url`,
            },
            {
              // Fieldset in Column 1 - collapsible via toggle button
              xtype: "fieldset",
              title: "Headers",
              itemId: "parms",
              collapsible: true,
              tooltip: `The HTTP Headers to set for the request`,
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
                    var formpanel = button.up("fieldset");

                    formpanel.insert(
                      formpanel.items.length - 1,
                      Ext.create("Amps.form.Parm.String", {
                        title: "Header",
                        name: "headers",
                      })
                    );
                  },
                },
              ],
            },
            {
              xtype: "fieldset",
              itemId: "get",
              layout: {
                type: "vbox",
                align: "stretch",
              },
              items: [amfutil.outputTopic()],
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
          load: function (form, record) {
            amfutil.loadParms(form, record, "headers");
          },
          process: function (form, values) {
            values.headers = amfutil.formatArrayField(values.headers);
            delete values.field;
            delete values.value;

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
            },
            {
              xtype: "numberfield",
              name: "port",
              fieldLabel: "Port",
              tooltip: "The SFTP Port",
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
            {
              xtype: "combobox",
              fieldLabel: "Kafka Provider",
              name: "provider",
              allowBlank: false,
              blankText: "Select One",
              vertical: true,
              valueField: "_id",
              displayField: "name",
              store: amfutil.createCollectionStore("providers", {
                type: "kafka",
              }),
              tooltip:
                "The configured provider with broker and authenticiation configuration.",
            },
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
        s3: {
          field: "s3",
          label: "S3",
          fields: [
            {
              xtype: "combobox",
              fieldLabel: "S3 Provider",
              name: "provider",
              allowBlank: false,
              blankText: "Select One",
              vertical: true,
              valueField: "_id",
              displayField: "name",
              store: amfutil.createCollectionStore("providers", { type: "s3" }),
              tooltip: "The configured S3 provider to use.",
            },

            {
              xtype: "combobox",
              name: "operation",
              fieldLabel: "Operation",
              valueField: "field",
              displayField: "label",
              allowBlank: false,
              store: [
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
              listeners: amfutil.renderListeners(function (scope, val) {
                var conts = ["get", "put", "delete"];
                conts.forEach((cont) => {
                  var component = scope.up("form").down("#" + cont);
                  component.setHidden(cont != val);
                  component.setDisabled(cont != val);
                });
              }),
              tooltip: "The S3 operation to perform.",
            },
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
            {
              xtype: "combobox",
              fieldLabel: "Sharepoint Provider",
              name: "provider",
              allowBlank: false,
              blankText: "Select One",
              vertical: true,
              valueField: "_id",
              displayField: "name",
              store: amfutil.createCollectionStore("providers", {
                type: "sharepoint",
              }),
              tooltip: "The configured Sharepoint Provider to use.",
            },

            {
              xtype: "combobox",
              name: "operation",
              fieldLabel: "Operation",
              valueField: "field",
              displayField: "label",
              allowBlank: false,
              store: [
                {
                  field: "download",
                  label: "Download",
                },
                {
                  field: "upload",
                  label: "Upload",
                },
              ],
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
            },
            {
              xtype: "textfield",
              name: "host",
              fieldLabel: "Host",
              tooltip: "The hoot rost for the sharepoint site",
              allowBlank: false,
            },
            {
              xtype: "textfield",
              name: "sitepath",
              fieldLabel: "Site Path",
              allowBlank: false,
              tooltip:
                "Relative path to the desired site. For example, Test.768@sharepoint.com/sites/test this would be third.",
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
              var types = ampsgrids.grids.actions().types;
              if (scope.xtype == "combobox") {
                scope.setStore(Object.entries(types).map((entry) => entry[1]));
              }
              var val = scope.getValue();
              if (val) {
                scope.up("form").down("#typeparms").setTitle(types[val].label);
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
              scope.up("form").down("#typeparms").setTitle(act.data.label);
            },
          },
        },
        {
          xtype: "fieldset",
          itemId: "typeparms",
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
          console.log(form);
          console.log(values);
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
      },
      options: ["active", "delete"],
    }),
    topics: () => ({
      title: "Topics",
      object: "Topic",
      actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
      options: ["delete"],
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
          combo: function (service) {
            return {
              xtype: "combobox",
              // fieldStyle: {
              //   "font-size": "2rem",
              // },
              name: "topicparms",
              itemId: "topicparms",
              fieldLabel: "Topics",
              // labelStyle: `font-size: 2rem;`,
              allowBlank: false,
              store: service.topics,
            };
          },
          format: function (topic) {
            var reg = /[.>* -]/;
            return topic.replace(reg, "_");
          },
          fields: [
            amfutil.combo(
              "Provider",
              "provider",
              amfutil.createCollectionStore("providers", { type: "kafka" }),
              "_id",
              "name"
            ),
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
              xtype: "textfield",
              name: "format",
              fieldLabel: "File Name Format",
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
              // fieldStyle: {
              //   "font-size": "2rem",
              // },
              itemId: "topicparms",
              fieldLabel: "Users",
              // labelStyle: `font-size: 2rem;`,
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
          height: 600,
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
                var clicked = false;

                var initialized = false;

                function broadcast(name) {
                  amfutil.broadcastEvent(
                    "service",
                    { name: name },
                    (payload) => {
                      var button = amfutil.getElementByID(
                        (name + "-start-stop").replace(/\s/g, "")
                      );

                      if (prev != payload || clicked) {
                        console.log(button);

                        button.setDisabled(false);
                        button.setText(payload ? "Stop" : "Start");

                        button.setIconCls(
                          payload
                            ? "x-fa fa-stop-circle"
                            : "x-fa fa-play-circle"
                        );
                        button.setHandler(function (btn) {
                          console.log("CLICK");
                          button.setDisabled(true);

                          btn.setText(payload ? "Stopping" : "Starting");

                          var action = payload ? "stop" : "start";

                          amfutil.ajaxRequest({
                            url: "/api/service/" + name,
                            jsonData: {
                              action: action,
                            },
                            method: "POST",
                            timeout: 60000,
                            success: function (res) {
                              // var result = Ext.decode(res.responseText);
                              // button.setDisabled(false);
                              // console.log(result);
                              // if (action == "start") {
                              //   if (result.success) {
                              //     button.setText("Stop");
                              //   } else {
                              //     button.setText("Start");
                              //   }
                              // } else {
                              //   if (result.success) {
                              //     button.setText("Start");
                              //   } else {
                              //     button.setText("Stop");
                              //   }
                              // }

                              clicked = true;
                            },
                            failure: function (res) {
                              console.log("failed");
                              clicked = true;
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
