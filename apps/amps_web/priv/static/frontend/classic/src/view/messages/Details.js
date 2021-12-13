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
  height: 500,

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
      xtype: "panel",
      layout: "border",
      width: "100%",
      items: [
        {
          xtype: "messagestatus",
          // flex: 1
          region: "north",
          height: "55%",
          width: "100%",
          itemId: "messagestatus",
          padding: 10,
        },
        {
          xtype: "messagedetails",
          // flex: 1,
          region: "center",
          height: "45%",
          width: "100%",
          itemId: "messagedetails",
          scrollable: true,
          padding: 10,
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
  loadDetails: async function (record) {
    console.log(record);
    this.removeAll();
    var filters = { msgid: record.msgid };

    var statuses = await amfutil.getCollectionData("message_status", filters);
    console.log(statuses);
    var route = Ext.util.History.getToken().split("/")[0];
    var hbox = {
      xtype: "container",
      layout: "hbox",
      width: "100%",
      style: "padding-left: .5em; padding-right: .5em; box-sizing: border-box",
    };
    var items = [];
    var entries = Object.entries(record);
    console.log(entries);
    var fields = {};
    ampsgrids.grids[route]().columns.forEach((col) => {
      fields[col.dataIndex] = { label: col.text };
    });
    fields["_id"] = { label: "ID" };
    console.log(fields);
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      console.log(entry);
      items.push({
        xtype: "displayfield",
        fieldLabel: entry[0],
        value: entry[1],
        flex: 1,
      });
      if (items.length == 3) {
        hbox.items = items;
        this.insert(hbox);
        delete hbox.items;
        items = [];
      } else if (i == entries.length - 1) {
        var extra = i % 3;
        for (var j = 0; j < extra; j++) {
          items.push({
            xtype: "displayfield",
            fieldLabel: "",
            value: "",
            flex: 1,
          });
        }
        hbox.items = items;
        this.insert(hbox);
        delete hbox.items;
        items = [];
      }
    }
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

    var scope = this;
    var store = await amfutil.createHistoryStore(record["msgid"]);
    // store.on(
    //   "load",
    //   function (storeScope, records, successful, operation, eOpts) {
    //     var statuses = store.getData().items.map((item) => item.data);
    //     // get unfiltered collection (will be null if the store has never been filtered)
    //     console.log(statuses);
    //     statuses.sort((a, b) => (a.stime > b.stime ? 1 : -1));
    //     statuses.reverse();

    //     var status = statuses[0].status;
    //     var reason = statuses[0].reason;
    //     console.log(status);
    //     scope.down("#current-status").setHtml(status);
    //     scope
    //       .down("#current-reason-title")
    //       .setHtml(`${status == "mailboxed" ? "Recipient" : "Reason"}: `);
    //     scope.down("#current-reason").setHtml(reason);
    //     var rbutton = amfutil.getElementByID("reprocessbtn");
    //     if (statuses[0].status == "reprocessing" || !record["location"]) {
    //       console.log("Reprocessing");
    //       rbutton.disable();
    //     } else {
    //       rbutton.enable();
    //     }

    //     console.log(statuses);
    //   }
    // );

    store.sort("etime", "DESC");

    this.down("grid").setStore(store);
  },

  items: [
    {
      xtype: "container",
      layout: "border",
      items: [
        {
          xtype: "container",
          layout: "vbox",
          width: "100%",
          region: "north",
          // hidden: true,
          style: {
            backgroundColor: "#5fa2dd",
            color: "white",
            padding: "10px",
            marginBottom: "1rem",
          },
          items: [
            {
              xtype: "container",
              layout: "hbox",
              items: [
                {
                  xtype: "box",
                  html: "Status: ",
                  style: {
                    textAlign: "left",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    padding: "1rem",
                    boxSizing: "border-box",
                  },
                  flex: 1,
                },
                {
                  xtype: "box",
                  html: "",
                  itemId: "current-status",
                  style: {
                    textAlign: "left",
                    fontSize: "1.5rem",
                    fontWeight: 500,
                    padding: "1rem",
                    boxSizing: "border-box",
                  },
                  value: "",
                  flex: 4,
                },
                {
                  xtype: "box",
                  html: "Reason: ",
                  itemId: "current-reason-title",
                  style: {
                    textAlign: "left",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    padding: "1rem",
                    boxSizing: "border-box",
                  },
                  flex: 1,
                },
                {
                  xtype: "box",
                  html: "",
                  itemId: "current-reason",
                  style: {
                    textAlign: "left",
                    fontSize: "1.5rem",
                    fontWeight: 500,
                    padding: "1rem",
                    boxSizing: "border-box",
                  },
                  value: "",
                  flex: 4,
                },
              ],
            },
          ],
        },
        {
          xtype: "grid",
          title: "Message History",
          itemId: "status-grid",
          region: "center",
          width: "100%",
          columns: [
            {
              dataIndex: "action",
              text: "Action",
              flex: 1,
            },
            {
              dataIndex: "msgid",
              text: "Message ID",
              flex: 1,
            },
            {
              dataIndex: "reason",
              text: "Reason",
              flex: 1,
            },
            {
              dataIndex: "status",
              text: "Status",
              flex: 1,
            },
            {
              dataIndex: "etime",
              text: "Event Time",
              flex: 1,
            },
            {
              xtype: "actioncolumn",
              text: "Actions",
              items: [
                {
                  iconCls: "x-fa fa-download",
                  handler: async function (
                    view,
                    rowIndex,
                    colIndex,
                    item,
                    e,
                    rec
                  ) {
                    var filename;
                    var msgbox = Ext.MessageBox.show({
                      title: "Please wait",
                      msg: "Downloading...",
                      progressText: "Downloading...",
                      width: 300,
                      progress: true,
                      closable: false,
                    });
                    await amfutil.renew_session();
                    await fetch(
                      "/api/message_events/download/" + rec.data.msgid,
                      {
                        headers: {
                          Authorization: localStorage.getItem("access_token"),
                        },
                      }
                    )
                      .then(async (response) => {
                        if (response.ok) {
                          var progress = 0;
                          var size;
                          for (let entry of response.headers.entries()) {
                            if (entry[0] == "content-length") {
                              size = entry[1];
                            }
                            if (entry[0] == "content-disposition") {
                              filename = entry[1].match(/filename="(.+)"/)[1];
                            }
                          }
                          console.log(size);

                          console.log(response);
                          const reader = response.body.getReader();
                          return new ReadableStream({
                            start(controller) {
                              return pump();
                              function pump() {
                                return reader.read().then(({ done, value }) => {
                                  // When no more data needs to be consumed, close the stream
                                  if (done) {
                                    controller.close();
                                    return;
                                  }
                                  // Enqueue the next data chunk into our target stream
                                  progress += value.length;
                                  msgbox.updateProgress(progress / size);
                                  controller.enqueue(value);
                                  return pump();
                                });
                              }
                            },
                          });
                        } else {
                          msgbox.close();
                          Ext.MessageBox.alert(
                            "Error",
                            "Failed to Download UFA Agent"
                          );
                          throw new Error("Something went wrong");
                        }
                      })
                      .then((stream) => new Response(stream))
                      .then((response) => response.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute("download", filename);
                        document.body.appendChild(link);
                        msgbox.close();
                        link.click();
                        link.remove();
                      })
                      .catch((err) => console.error(err));
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
