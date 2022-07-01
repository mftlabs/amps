Ext.define("Amps.view.messages.MessageActivity", {
  extend: "Ext.panel.Panel",
  xtype: "messageactivitycontainer",
  controller: "messages",
  itemId: "messagecontainer",
  reference: "messagecontainer",
  scrollable: true,
  //width:'100%',
  layout: "fit",

  width: "auto",

  loadMessageActivity: function (record) {
    // console.log(this);
    var stats = amfutil.getElementByID("messagestatus");
    stats.loadStatus(record);
    var dets = amfutil.getElementByID("messagedetails");
    dets.loadDetails(record);
  },

  items: [
    {
      //
      //title:'Message Details',
      xtype: "tabpanel",
      width: "100%",
      items: [
        {
          xtype: "messagedetails",
          width: "100%",
          itemId: "messagedetails",
          scrollable: true,
          flex: 1,
        },
        {
          xtype: "messagestatus",
          width: "100%",
          title: "Session History",
          itemId: "messagestatus",
          flex: 1,
        },
        {
          xtype: "messagepreview",
          width: "100%",
          itemId: "messagepreview",
          title: "Message Preview",
          flex: 1,
          scrollable: true,
        },

        // {
        //   xtype: "panel",
        //   height: "65%",
        //   width: "100%",
        //   layout: "hbox",
        //   scrollable: true,
        //   split: true,
        //   itemId: "message_details_panel",

        //   items: [
        //     {
        //       xtype: "sessionlist",
        //       split: true,
        //       height: "100%",
        //       width: "30%",
        //       collapseable: true,
        //       itemId: "sessiongrid",
        //     },
        //     {
        //       xtype: "tabpanel",
        //       width: "70%",
        //       height: "100%",
        //       split: true,
        //       scrollable: true,
        //       itemId: "sessiondetailstab",
        //       flex: 3,
        //       items: [
        //         {
        //           title: "Details",
        //           xtype: "sessiondetails",
        //           //flex:1,
        //           //width:'56%',
        //           //split:true,
        //           itemId: "sessiondetailsgrid",
        //         },
        //         {
        //           title: "Files",
        //           xtype: "sessionfilespanel",
        //           //flex:1,
        //           //width:'56%',
        //           //split:true
        //           itemId: "sessionfilesgrid",
        //         },
        //         {
        //           title: "Events",
        //           xtype: "sessionlogpanel",
        //           //flex:1,
        //           //width:'36%',
        //           //split:true
        //           itemId: "sessioneventsgrid",
        //         },
        //       ],
        //     },
        //   ],
        // },
      ],
    },
  ],
});

Ext.define("Amps.view.messages.SessionDetails", {
  extend: "Ext.grid.Panel",
  xtype: "sessiondetails",
  requires: [],
  viewModel: {
    type: "main",
  },
  bind: {
    store: "{sessiondetailsstore}",
  },
  /*bind:{
        data:{
            message_details:'{messageactivity.selection}',
            session_details:'{messageactivity.selection.session_details}'
        }
    },*/
  width: "100%",
  reference: "sessionsummary",
  controller: "messages",
  title: "Session Details",

  columns: [
    {
      xtype: "gridcolumn",
      width: 175,
      dataIndex: "session_start",
      text: "Session Start",
    },
    {
      xtype: "gridcolumn",
      width: 175,
      dataIndex: "session_end",
      text: "Session End",
    },
    {
      xtype: "gridcolumn",
      width: 250,
      dataIndex: "workflow",
      text: "Workflow Name",
    },
    {
      xtype: "gridcolumn",
      width: 150,
      dataIndex: "instance_id",
      text: "Instance Id",
      hidden: true,
    },
    {
      xtype: "gridcolumn",
      width: 150,
      dataIndex: "user",
      text: "Processed By",
    },
    {
      xtype: "gridcolumn",
      width: 150,
      dataIndex: "status",
      text: "Status",
    },
  ],
  /*listeners:{
        itemclick: 'onSessionItemClick',
        rowclick:'onSessionRowClicked'
    }*/
  listeners: {
    cellcontextmenu: function (table, td, cellIndex, record, tr, rowIndex, e) {
      CLIPBOARD_CONTENTS = td.innerText;
      MftDashboard.util.Utilities.copyTextdata(e);
    },
  },
});
Ext.define("Amps.view.messages.SessionFiles", {
  extend: "Ext.grid.Panel",
  xtype: "sessionfilespanel",

  viewModel: {
    type: "main",
  },
  bind: {
    store: "{sessionmessagestore}",
  },
  reference: "sessionfiles",
  controller: "messages",
  store: {
    listeners: {
      load: function (store) {},
    },
  },
  /*tbar:[
        {
            xtype:'displayfield',
            value:'Session logs of the current session selected in left side'
        }
    ],*/
  columns: [
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "sender",
      text: "Sender",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "receiver",
      text: "Receiver",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "msg_type",
      text: "Message Type",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "control_no",
      text: "Control No",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "file_name",
      text: "File Name",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "file_size",
      text: "File Size",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "origin",
      text: "Originator",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "io",
      text: "I/O",
    },
    {
      xtype: "gridcolumn",
      width: 175,
      dataIndex: "create_time",
      text: "Time Received",
    },
    {
      xtype: "gridcolumn",
      width: 125,
      dataIndex: "status",
      text: "Status",
    },
  ],
  listeners: {
    cellcontextmenu: function (table, td, cellIndex, record, tr, rowIndex, e) {
      CLIPBOARD_CONTENTS = td.innerText;
      MftDashboard.util.Utilities.copyTextdata(e);
    },
  },
});

Ext.define("Amps.view.messages.SessionLogs", {
  extend: "Ext.grid.Panel",
  xtype: "sessionlogpanel",

  viewModel: {
    type: "main",
  },
  bind: {
    store: "{sessionlogstore}",
  },
  /*bind:{
        data:{
            session_logs:'{sessionsummary.selection.session_log_details}'
        }
    },*/
  reference: "sessionlogs",
  controller: "messages",
  scrollable: true,
  /*store:{
        data:'{data.session_logs}',
        listeners:{
            load:function(store) {
            }
        }
    },*/
  /*tbar:[
        {
            xtype:'displayfield',
            value:'Session logs of the current session selected in left side'
        }
    ],*/
  columns: [
    {
      header: "Time",
      dataIndex: "create_time",
      disableSelection: true,
      width: 200,
    },
    {
      header: "Description",
      dataIndex: "text",
      disableSelection: true,
      width: 500,
      cellWrap: true,
    },
    {
      header: "Action",
      dataIndex: "action_name",
      disableSelection: true,
      width: 250,
      listeners: {
        click: function (
          gridview,
          rowIndex,
          colIndex,
          value,
          metadata,
          record,
          tdEl,
          cellIndex,
          trEl,
          e
        ) {
          action_id = record.get("action_name");
          Ext.Ajax.request({
            url: "/get-action-details/" + action_id,
            method: "GET",
            timeout: 60000,
            params: {},
            jsonData: {
              action_id: action_id,
            },
            success: function (response) {
              var responcedata = Ext.decode(response.responseText);
              var data = responcedata.data[0];
              var actionForm = new Ext.form.Panel({
                width: 500,
                scrollable: true,
                height: 400,
                defaults: {
                  padding: 10,
                  labelWidth: 150,
                },
                items: [
                  {
                    xtype: "displayfield",
                    fieldLabel: "Action Name",
                    value: data["action_name"],
                    allowBlank: false,
                  },
                  {
                    xtype: "displayfield",
                    fieldLabel: "Action Type",
                    value: data["action_type"],
                    allowBlank: false,
                  },
                  {
                    xtype: "displayfield",
                    fieldLabel: "Action Description",
                    value: data["description"],
                  },
                  {
                    xtype: "fieldcontainer",
                    fieldLabel: "Parameters",
                    itemId: "view_action_parameters",
                  },
                ],
              });
              parameter = data["parameter"];
              count = 0;
              action_parameters = Ext.ComponentQuery.query(
                "#view_action_parameters"
              )[0];
              //for (const[key, value] of Object.entries(parameter)) {
              for (key in parameter) {
                let value = parameter[key];
                if (
                  key === "Encryption Key" ||
                  key === "Signing Key" ||
                  key === "Encryption key" ||
                  key === "Signing key" ||
                  key === "Key Pair"
                ) {
                  var document_name = value.document_name;
                  action_parameters.add({
                    xtype: "container",
                    layout: "hbox",
                    items: [
                      {
                        xtype: "displayfield",
                        fieldLabel: key,
                        labelWidth: 150,
                        value: document_name,
                      },
                    ],
                  });
                } else {
                  action_parameters.add({
                    xtype: "container",
                    layout: "hbox",
                    items: [
                      {
                        xtype: "displayfield",
                        fieldLabel: key,
                        labelWidth: 150,
                        value: value,
                      },
                    ],
                  });
                }
              }
              var win = new Ext.window.Window({
                title: "Action Details",
                modal: true,
                items: [actionForm],
              });

              win.show();
            },
          });
        },
      },
    },
    {
      header: "Status",
      dataIndex: "status",
      disableSelection: true,
      width: 100,
      hidden: true,
    },
    {
      header: "Created by",
      dataIndex: "created_by",
      disableSelection: true,
      width: 100,
    },
  ],
  listeners: {
    cellcontextmenu: function (table, td, cellIndex, record, tr, rowIndex, e) {
      CLIPBOARD_CONTENTS = td.innerText;
      MftDashboard.util.Utilities.copyTextdata(e);
    },
  },
});

Ext.define("Amps.view.messages.SessionEvents", {
  extend: "Ext.grid.Panel",
  xtype: "sessioneventpanel",

  viewModel: {
    type: "main",
  },
  bind: {
    store: "{saeventsstore}",
  },
  reference: "sessionevents",
  controller: "messages",
  scrollable: true,

  columns: [
    {
      header: "Time",
      dataIndex: "create_time",
      disableSelection: true,
      width: 200,
    },
    {
      header: "Description",
      dataIndex: "text",
      disableSelection: true,
      width: 500,
      cellWrap: true,
    },
    {
      header: "Action",
      dataIndex: "action_name",
      disableSelection: true,
      width: 250,
      listeners: {
        click: function (
          gridview,
          rowIndex,
          colIndex,
          value,
          metadata,
          record,
          tdEl,
          cellIndex,
          trEl,
          e
        ) {
          action_id = record.get("action_name");
          Ext.Ajax.request({
            url: "/get-action-details/" + action_id,
            method: "GET",
            timeout: 60000,
            params: {},
            jsonData: {
              action_id: action_id,
            },
            success: function (response) {
              var responsedata = Ext.decode(response.responseText);
              var data = responsedata.data[0];
              var actionForm = new Ext.form.Panel({
                width: 500,
                scrollable: true,
                height: 400,
                defaults: {
                  padding: 10,
                  labelWidth: 150,
                },
                items: [
                  {
                    xtype: "displayfield",
                    fieldLabel: "Action Name",
                    value: data["action_name"],
                    allowBlank: false,
                  },
                  {
                    xtype: "displayfield",
                    fieldLabel: "Action Type",
                    value: data["action_type"],
                    allowBlank: false,
                  },
                  {
                    xtype: "displayfield",
                    fieldLabel: "Action Description",
                    value: data["description"],
                  },
                  {
                    xtype: "fieldcontainer",
                    fieldLabel: "Parameters",
                    itemId: "view_action_parameters",
                  },
                ],
              });
              parameter = data["parameter"];
              count = 0;
              action_parameters = Ext.ComponentQuery.query(
                "#view_action_parameters"
              )[0];
              //for (const[key, value] of Object.entries(parameter)) {
              for (key in parameter) {
                let value = parameter[key];
                if (
                  key === "Encryption Key" ||
                  key === "Signing Key" ||
                  key === "Encryption key" ||
                  key === "Signing key" ||
                  key === "Key Pair"
                ) {
                  var document_name = value.document_name;
                  action_parameters.add({
                    xtype: "container",
                    layout: "hbox",
                    items: [
                      {
                        xtype: "displayfield",
                        fieldLabel: key,
                        labelWidth: 150,
                        value: document_name,
                      },
                    ],
                  });
                } else {
                  action_parameters.add({
                    xtype: "container",
                    layout: "hbox",
                    items: [
                      {
                        xtype: "displayfield",
                        fieldLabel: key,
                        labelWidth: 150,
                        value: value,
                      },
                    ],
                  });
                }
              }
              var win = new Ext.window.Window({
                title: "Action Details",
                modal: true,
                items: [actionForm],
              });

              win.show();
            },
          });
        },
      },
    },
    {
      header: "Status",
      dataIndex: "status",
      disableSelection: true,
      width: 100,
    },
  ],
  listeners: {
    cellcontextmenu: function (table, td, cellIndex, record, tr, rowIndex, e) {
      CLIPBOARD_CONTENTS = td.innerText;
      MftDashboard.util.Utilities.copyTextdata(e);
    },
  },
});

Ext.define("Amps.view.messages.SessionList", {
  extend: "Ext.grid.Panel",
  xtype: "sessionlist",
  width: "100%",
  reference: "sessionlistref",
  controller: "messages",
  title: "Sessions",
  viewModel: {
    type: "main",
  },
  bind: {
    store: "{sessionstore}",
  },
  columns: [
    {
      xtype: "gridcolumn",
      width: 175,
      dataIndex: "session_start",
      text: "Start Time",
    },
    {
      xtype: "gridcolumn",
      width: 175,
      dataIndex: "session_end",
      text: "End Time",
      hidden: true,
    },
    {
      xtype: "gridcolumn",
      width: 150,
      dataIndex: "elapsed_time",
      text: "Elapsed Time",
      hidden: true,
    },
    {
      xtype: "gridcolumn",
      width: 150,
      dataIndex: "status",
      text: "Status",
    },
  ],
  listeners: {
    itemclick: "onSessionItemClick",
    rowclick: "onSessionRowClicked",
    cellcontextmenu: function (table, td, cellIndex, record, tr, rowIndex, e) {
      CLIPBOARD_CONTENTS = td.innerText;
      MftDashboard.util.Utilities.copyTextdata(e);
    },
  },
});

Ext.define("Amps.view.messages.MessageDetails", {
  extend: "Ext.form.Panel",
  xtype: "messagedetails",
  title: "Message Details",
  //scrollable:true,
  layout: "fit",

  loadDetails: async function (record) {
    console.log(this);

    console.log(record);
    this.removeAll();

    this.insert({
      xtype: "container",
      itemId: "details",
      padding: 3,
      items: [],
      listeners: {
        afterrender: async function () {
          var c = this;
          c.removeAll();
          c.setLoading(true);
          var filters = { msgid: record.msgid };

          var statuses = await amfutil.getCollectionData(
            "message_status",
            filters
          );
          console.log(statuses);
          var route = Ext.util.History.getToken().split("/")[0];
          var items = [];
          var entries = Object.entries(record);
          console.log(entries);
          var fields = {};
          ampsgrids.grids[route]().columns.forEach((col) => {
            fields[col.dataIndex] = { label: col.text };
          });
          fields["_id"] = { label: "ID" };
          console.log(fields);
          var mapping = await amfutil.getMetadataFields();
          console.log(mapping);

          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var f = Ext.create({
              xtype: "container",
              // layout: {
              //   type: "hbox",
              //   align: "stretch",
              // },
              flex: 1,
              cls: i % 2 ? "" : "x-grid-item-alt",
              style: {
                "border-style": "solid",
                "border-color": "#e9e9e9",
                "border-width": "0px 1px 1px 0px",
              },
              listeners: {
                afterrender: function () {
                  var df = this.down("displayfield");
                  this.getEl().setListeners({
                    click: function (e) {
                      var contextMenu = Ext.create("Ext.menu.Menu", {
                        items: [
                          {
                            text: "Copy",
                            iconCls: "x-fa fa fa-copy",
                            handler: function () {
                              var input = df.getValue();
                              navigator.clipboard
                                .writeText(input)
                                .then(function () {});
                            },
                          },
                          {
                            text: "View",
                            iconCls: "x-fa fa fa-eye",
                            handler: function () {
                              var input = df.getValue();
                              var window = amfutil.showFormattedText(input);
                              window.show();
                            },
                          },
                        ],
                      });
                      e.stopEvent();
                      contextMenu.showAt(e.pageX, e.pageY);
                    },
                    contextmenu: function (e, a2, a3) {
                      console.log(a2);
                      console.log(a3);

                      var contextMenu = Ext.create("Ext.menu.Menu", {
                        items: [
                          {
                            text: "Copy",
                            iconCls: "x-fa fa fa-copy",
                            handler: function () {
                              var input = df.getValue();
                              navigator.clipboard
                                .writeText(input)
                                .then(function () {});
                            },
                          },
                        ],
                      });
                      e.stopEvent();
                      contextMenu.showAt(e.pageX, e.pageY);
                    },
                  });

                  this.getEl().hover(
                    () => {
                      this.addCls("x-grid-item-over");
                    },
                    () => {
                      this.removeCls("x-grid-item-over");
                    }
                  );
                },
              },
              flex: 1,
              items: [
                {
                  xtype: "displayfield",
                  labelWidth: 125,
                  // labelStyle: {
                  //   "font-weight": 400,
                  //   // margin: 0,
                  //   "text-align": "center",
                  // },
                  // fieldStyle: {
                  //   margin: 0,
                  //   "text-align": "center",
                  // },

                  renderer: function (val) {
                    return val.length > 90
                      ? val.substring(0, 90) + " <b>[...]<b>"
                      : val;
                  },

                  fieldLabel: mapping[entry[0]]
                    ? mapping[entry[0]].label
                    : entry[0],
                  value:
                    typeof entry[1] === "object" && entry[1] !== null
                      ? JSON.stringify(entry[1])
                      : entry[1],
                },
              ],
            });
            items.push(f);
            if (items.length == 3) {
              c.insert({
                xtype: "container",
                layout: {
                  type: "hbox",
                  align: "stretch",
                },
                defaults: {
                  padding: 5,
                },
                items: items,
              });
              items = [];
            } else if (i == entries.length - 1) {
              console.log(i);

              var extra = 3 - ((i + 1) % 3);
              console.log(extra);
              for (var j = 0; j < extra; j++) {
                items.push({
                  xtype: "container",
                  flex: 1,
                });
              }
              c.insert({
                xtype: "container",
                layout: {
                  type: "hbox",
                  align: "stretch",
                },
                defaults: {
                  padding: 5,
                },
                items: items,
              });
              items = [];
            }
          }
          c.setLoading(false);
        },
      },
    });
  },

  items: [],
});

Ext.define("Amps.view.messages.MessageStatus", {
  extend: "Ext.container.Container",
  xtype: "messagestatus",
  layout: "fit",
  //scrollable:true,
  loadStatus: async function (record) {
    var filters = { msgid: record.msgid };
    var grid = this.down("grid");
    var scope = this;
    var store = await amfutil.createHistoryStore(record["msgid"]);

    store.load();
    grid.setStore(store);

    store.sort("start", "DESC");
    store.on("load", function () {
      var rec = store.findRecord("sid", record["sid"]);
      grid.setListeners({
        afterrender: function () {
          this.setSelection(rec);
        },
      });
    });
  },

  items: [
    {
      xtype: "panel",

      layout: {
        type: "hbox",
        align: "stretch",
      },
      items: [
        // {
        //   xtype: "container",
        //   layout: "vbox",
        //   width: "100%",
        //   region: "north",
        //   // hidden: true,
        //   style: {
        //     backgroundColor: "#5fa2dd",
        //     color: "white",
        //     padding: "10px",
        //     marginBottom: "1rem",
        //   },
        //   items: [
        //     {
        //       xtype: "container",
        //       layout: "hbox",
        //       items: [
        //         {
        //           xtype: "box",
        //           html: "Status: ",
        //           style: {
        //             textAlign: "left",
        //             fontSize: "1.5rem",
        //             fontWeight: 700,
        //             padding: "1rem",
        //             boxSizing: "border-box",
        //           },
        //           flex: 1,
        //         },
        //         {
        //           xtype: "box",
        //           html: "",
        //           itemId: "current-status",
        //           style: {
        //             textAlign: "left",
        //             fontSize: "1.5rem",
        //             fontWeight: 500,
        //             padding: "1rem",
        //             boxSizing: "border-box",
        //           },
        //           value: "",
        //           flex: 4,
        //         },
        //         {
        //           xtype: "box",
        //           html: "Reason: ",
        //           itemId: "current-reason-title",
        //           style: {
        //             textAlign: "left",
        //             fontSize: "1.5rem",
        //             fontWeight: 700,
        //             padding: "1rem",
        //             boxSizing: "border-box",
        //           },
        //           flex: 1,
        //         },
        //         {
        //           xtype: "box",
        //           html: "",
        //           itemId: "current-reason",
        //           style: {
        //             textAlign: "left",
        //             fontSize: "1.5rem",
        //             fontWeight: 500,
        //             padding: "1rem",
        //             boxSizing: "border-box",
        //           },
        //           value: "",
        //           flex: 4,
        //         },
        //       ],
        //     },
        //   ],
        // },
        {
          xtype: "grid",
          itemId: "status-grid",
          flex: 1,
          listeners: {
            beforerender: function () {
              this.reconfigure(null, [
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
                  flex: 1,
                  renderer: amfutil.dateRenderer,
                },
                {
                  text: "End Time",
                  dataIndex: "end",
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
              ]);
            },
            select: function (scope, record, index, eOpts) {
              console.log("Selected");
              amfutil
                .getElementByID("session-details")
                .loadSession(record.data);
            },
          },
        },
        {
          xtype: "splitter",
        },
        {
          xtype: "tabpanel",
          flex: 2,
          itemId: "session-details",
          layout: "fit",
          loadSession(session) {
            var sid = session["sid"];
            var eventstore = session["rows"];
            var logstore = amfutil.createCollectionStore("system_logs", {
              sid: sid,
            });
            var evgrid = this.down("#session-events");
            var loggrid = this.down("#session-logs");
            evgrid.setStore(eventstore);
            evgrid.getStore().sort("etime", "DESC");
            loggrid.setStore(logstore);
            loggrid.getStore().sort("etime", "DESC");
          },
          items: [
            {
              xtype: "grid",
              title: "Events",
              itemId: "session-events",
              viewConfig: {
                getRowClass: function (record, index, rowParams) {
                  var id = Ext.util.History.getToken().split("/").pop();
                  console.log(record);
                  console.log(rowParams);
                  return record.data._id == id ? "boldrow" : "";
                },
              },
              listeners: {
                dblclick: {
                  element: "body", //bind to the underlying body property on the panel
                  fn: function (grid, rowIndex, e, obj) {
                    var record = grid.record.data;
                    var scope = this;
                    var route = Ext.util.History.getToken().split("/")[0];
                    amfutil.redirectTo(route + "/" + record._id);
                  },
                },
                beforerender: function (scope) {
                  scope.reconfigure(
                    null,
                    ampsgrids.grids.message_events().columns
                  );
                },
              },
            },
            {
              xtype: "grid",
              title: "Logs",
              itemId: "session-logs",

              listeners: {
                beforerender: function (scope) {
                  var config = ampsgrids.grids.system_logs();
                  scope.reconfigure(null, config.columns);
                  var config = ampsgrids.grids.system_logs();
                  this.setListeners({
                    dblclick: {
                      element: "body", //bind to the underlying body property on the panel
                      fn: function (grid, rowIndex, e, obj) {
                        var record = grid.record.data;
                        console.log(record);
                        config.dblclick(record);
                      },
                    },
                  });
                },
              },
            },
          ],
        },
        // {
        //   xtype: "grid",
        //   title: "Message History",
        //   itemId: "status-grid",
        //   region: "center",
        //   width: "100%",
        //
        //   plugins: [
        //     {
        //       ptype: "rowwidget",
        //       widget: {
        //         xtype: "grid",
        //         height: 300,
        //         columns: [
        //           {
        //             text: "name",
        //           },
        //         ],
        //       },
        //     },
        //   ],
        //   // plugins: ["rowexpander"],
        // },
      ],
    },
  ],
});

Ext.define("Amps.view.messages.MessagePreview", {
  extend: "Ext.panel.Panel",
  xtype: "messagepreview",
  layout: "fit",
  //scrollable:true,
  // loadStatus: async function (record) {
  //   var filters = { msgid: record.msgid };
  //   var grid = this.down("grid");
  //   var scope = this;
  //   var store = await amfutil.createHistoryStore(record["msgid"]);

  //   store.load();
  //   grid.setStore(store);

  //   store.sort("start", "DESC");
  //   store.on("load", function () {
  //     var rec = store.findRecord("sid", record["sid"]);
  //     grid.setSelection(rec);
  //   });
  // },

  items: [
    {
      xtype: "panel",
      layout: "fit",
      listeners: {
        afterrender: async function () {
          this.setLoading(true);
          var tokens = Ext.util.History.getToken().split("/");
          tokens.splice(1, 0, "preview");
          var path = tokens.join("/");
          console.log(path);
          var resp = await amfutil.ajaxRequest({
            url: "api/" + path,
          });
          var status = Ext.decode(resp.responseText);
          var previews = {
            pdf: "pdfpreview",
            image: "imagepreview",
            text: "textpreview",
            video: "videopreview",
            data: "textpreview",
          };
          if (status.supported) {
            console.log(status);
            var pdf = Ext.create({
              xtype: previews[status.type],
              objid: tokens.at(-1),
            });
            this.insert(pdf);
          } else {
            this.insert({
              xtype: "panel",
              tbar: [
                {
                  xtype: "button",
                  iconCls: "x-fa fa-download",
                  handler: function () {
                    amfutil.download(
                      `api/message_events/download/${tokens.at(-1)}`
                    );
                  },
                },
              ],
              layout: "center",
              items: [
                {
                  xtype: "component",
                  autoEl: "h3",
                  html: "Unable to load message preview",
                },
              ],
            });
          }
          this.setLoading(false);
        },
      },
    },
  ],
});

Ext.define("Amps.view.message.MessagePreview.PDF", {
  extend: "Ext.panel.Panel",
  xtype: "pdfpreview",
  objid: "",
  flex: 1,
  style: {
    width: "50%",
  },
  tbar: [
    {
      xtype: "button",
      iconCls: "x-fa fa-arrow-left",
      itemId: "prev",
      handler: function () {
        amfutil.getElementByID("pdf").onPrevPage();
      },
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-arrow-right",
      itemId: "next",
      handler: function () {
        amfutil.getElementByID("pdf").onNextPage();
      },
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-download",
      handler: function () {
        var id = this.up("pdfpreview").objid;
        amfutil.download(`api/message_events/download/${id}`);
      },
    },
    // {
    //   xtype: "button",
    //   iconCls: "x-fa fa-search-minus",
    //   itemId: "zoomout",
    //   handler: function () {
    //     amfutil.getElementByID("pdf").onZoomIn();
    //   },
    // },
    // {
    //   xtype: "button",
    //   iconCls: "x-fa fa-search-plus",
    //   itemId: "zoomin",
    //   handler: function () {
    //     amfutil.getElementByID("pdf").onZoomOut();
    //   },
    // },
    {
      style: {
        "font-weight": 500,
      },
      setTotal: function (total) {
        console.log(this);
        this.setHtml(this.getEl().dom.innerHTML.slice(0, -1) + total);
      },
      setPage: function (newpage) {
        var curr = this.getEl().dom.innerHTML;
        this.setHtml(
          curr.substring(0, 5) +
            " " +
            newpage +
            " " +
            curr.substring(curr.length - 5)
        );
      },
      itemId: "paging",
      xtype: "component",
      html: "Page 0 of 0",
    },
  ],
  layout: "fit",
  scrollable: true,

  items: [
    {
      flex: 1,
      xtype: "component",
      autoEl: "canvas",
      itemId: "pdf",
      style: {
        "box-shadow":
          "rgba(9, 30, 66, 0.25) 0px 1px 1px, rgba(9, 30, 66, 0.13) 0px 0px 1px 1px",
        "object-fit": "contain",
        height: "100%",
      },
      pdfDoc: null,
      pageNum: 1,
      pageRendering: false,
      pageNumPending: null,
      scale: 6,
      renderPage: function (num) {
        var scope = this;
        var canvas = this.getEl().dom,
          ctx = canvas.getContext("2d");
        scope.pageRendering = true;
        // Using promise to fetch the page
        this.pdfDoc.getPage(num).then(function (page) {
          var viewport = page.getViewport({ scale: scope.scale });
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Render PDF page into canvas context
          var renderContext = {
            canvasContext: ctx,
            viewport: viewport,
          };
          var renderTask = page.render(renderContext);

          // Wait for rendering to finish
          renderTask.promise.then(function () {
            scope.pageRendering = false;
            if (scope.pageNumPending !== null) {
              // New page rendering is pending
              scope.renderPage(scope.pageNumPending);
              scope.pageNumPending = null;
            }
          });
        });

        // Update page counters
        amfutil.getElementByID("paging").setPage(num);
      },
      queueRenderPage: function (num) {
        if (this.pageRendering) {
          this.pageNumPending = num;
        } else {
          this.renderPage(num);
        }
      },
      onPrevPage: function () {
        if (this.pageNum <= 1) {
          return;
        }
        this.pageNum--;
        this.queueRenderPage(this.pageNum);
      },
      onNextPage: function () {
        console.log("NEXT");
        if (this.pageNum >= this.pdfDoc.numPages) {
          return;
        }
        this.pageNum++;
        this.queueRenderPage(this.pageNum);
      },
      listeners: {
        afterrender: async function () {
          var scope = this;
          var id = scope.up("pdfpreview").objid;
          var pdfjsLib = window.pdfjsLib;

          pdfjsLib
            .getDocument({
              url: `api/message_events/download/${id}`,
              httpHeaders: {
                Authorization: localStorage.getItem("access_token"),
              },
            })
            .promise.then(function (pdfDoc_) {
              scope.pdfDoc = pdfDoc_;
              amfutil.getElementByID("paging").setTotal(scope.pdfDoc.numPages);

              // Initial/first page rendering
              scope.renderPage(1);
              scope.queueRenderPage(1);
            });
        },
      },
    },
  ],
});

Ext.define("Amps.view.message.MessagePreview.Text", {
  extend: "Ext.panel.Panel",
  xtype: "textpreview",
  objid: "",
  flex: 1,
  style: {
    width: "50%",
  },
  scrollable: true,

  tbar: [
    {
      xtype: "button",
      iconCls: "x-fa fa-download",
      handler: function () {
        var id = this.up("textpreview").objid;
        amfutil.download(`api/message_events/download/${id}`);
      },
    },
  ],
  layout: "fit",
  scrollable: true,

  items: [
    {
      xtype: "container",
      padding: 5,
      // margin: 5,
      style: {
        // background: "var(--secondary-color)",
      },
      scrollable: true,

      items: [
        {
          xtype: "component",
          padding: 20,
          style: {
            background: "white",
            "white-space": "pre-wrap",
            "font-weight": "500",
            "box-shadow":
              "rgba(9, 30, 66, 0.25) 0px 1px 1px, rgba(9, 30, 66, 0.13) 0px 0px 1px 1px",
            // color: "white",
            // "font-size": "1.5rem",
          },
          listeners: {
            afterrender: async function () {
              var id = this.up("textpreview").objid;

              var resp = await fetch(`api/message_events/download/${id}`, {
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
              });
              var text = await resp.text();
              this.setHtml(text);
              console.log(text);
            },
          },
        },
      ],
    },
  ],
});

Ext.define("Amps.view.message.MessagePreview.Image", {
  extend: "Ext.panel.Panel",
  xtype: "imagepreview",
  objid: "",
  flex: 1,
  style: {
    width: "50%",
  },
  scrollable: true,

  tbar: [
    {
      xtype: "button",
      iconCls: "x-fa fa-download",
      handler: function () {
        var id = this.up("imagepreview").objid;
        amfutil.download(`api/message_events/download/${id}`);
      },
    },
  ],
  layout: "fit",
  scrollable: true,

  items: [
    {
      xtype: "container",
      padding: 5,
      // margin: 5,
      style: {
        // background: "var(--secondary-color)",
      },
      scrollable: true,
      layout: "fit",
      items: [
        {
          xtype: "component",
          autoEl: "img",
          padding: 5,
          style: {
            "object-fit": "contain",
            height: "100%",
            "box-shadow":
              "rgba(9, 30, 66, 0.25) 0px 1px 1px, rgba(9, 30, 66, 0.13) 0px 0px 1px 1px",
          },
          listeners: {
            afterrender: async function () {
              var scope = this;
              var id = this.up("imagepreview").objid;

              var resp = await fetch(`api/message_events/download/${id}`, {
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
              })
                .then((res) => res.blob())
                .then((blob) => {
                  scope.getEl().dom.src = URL.createObjectURL(blob);
                });
            },
          },
        },
      ],
    },
  ],
});

Ext.define("Amps.view.message.MessagePreview.Video", {
  extend: "Ext.panel.Panel",
  xtype: "videopreview",
  objid: "",
  flex: 1,
  style: {
    width: "50%",
  },
  scrollable: true,

  tbar: [
    {
      xtype: "button",
      iconCls: "x-fa fa-download",
      handler: function () {
        var id = this.up("videopreview").objid;
        amfutil.download(`api/message_events/download/${id}`);
      },
    },
  ],
  layout: "fit",
  scrollable: true,

  items: [
    {
      xtype: "container",
      padding: 5,
      // margin: 5,
      style: {
        // background: "var(--secondary-color)",
      },
      scrollable: true,
      layout: "fit",
      items: [
        {
          xtype: "component",
          autoEl: { tag: "video", controls: true },
          class: "video-js vjs-theme-city",
          padding: 5,
          style: {
            "object-fit": "contain",
            height: "100%",
            "box-shadow":
              "rgba(9, 30, 66, 0.25) 0px 1px 1px, rgba(9, 30, 66, 0.13) 0px 0px 1px 1px",
          },
          listeners: {
            afterrender: async function () {
              var scope = this;
              var id = this.up("videopreview").objid;

              scope.getEl().dom.src =
                `api/message_events/stream/${id}?` +
                new URLSearchParams({
                  token: localStorage.getItem("access_token"),
                });
            },
          },
        },
      ],
    },
  ],
});
