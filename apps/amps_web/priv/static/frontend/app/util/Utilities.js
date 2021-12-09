const sizeUnits = {
  KB: 1000,
  MB: 1000000,
  GB: 1000000000,
  TB: 1000000000000,
};

function getParm(field) {
  return function (value, meta, record) {
    return record.data.parms[field];
  };
}

// const pageFilters = {
//   rules: [
//     {
//       type: "combo",
//       field: "action",
//       label: "Action",
//       options: [
//         {
//           field: "hold",
//           label: "Hold",
//         },
//         {
//           field: "mailbox",
//           label: "Mailbox",
//         },
//       ],
//     },
//     {
//       type: "checkbox",
//       field: "ediflag",
//       label: "Parse Edi",
//     },
//     {
//       type: "checkbox",
//       field: "scanflag",
//       label: "Virus Scan",
//     },
//     {
//       type: "combo",
//       field: "status",
//       label: "Status",
//       options: [
//         {
//           field: "received",
//           label: "Received",
//         },
//         {
//           field: "held",
//           label: "Held",
//         },
//         {
//           field: "warning",
//           label: "Warning",
//         },
//         {
//           field: "failed",
//           label: "Failed",
//         },
//       ],
//     },
//     {
//       type: "text",
//       field: "reason",
//       label: "Reason",
//     },
//   ],
//   accounts: [
//     {
//       type: "text",
//       field: "username",
//       label: "User Name",
//     },
//   ],
//   agentput: [
//     {
//       type: "text",
//       field: "name",
//       label: "Rule Name",
//     },
//     {
//       type: "text",
//       field: "rtype",
//       label: "Rule Type",
//     },
//     {
//       type: "text",
//       field: "bucket",
//       label: "Upload Bucket Name",
//     },
//   ],
//   agentget: [
//     {
//       type: "text",
//       field: "name",
//       label: "Rule Name",
//     },
//     {
//       type: "text",
//       field: "rtype",
//       label: "Rule Type",
//     },
//     {
//       type: "text",
//       field: "bucket",
//       label: "Bucket Name",
//     },
//   ],
//   users: [
//     {
//       type: "text",
//       field: "username",
//       label: "User Name",
//     },
//     {
//       type: "text",
//       field: "firstname",
//       label: "First Name",
//     },
//     {
//       type: "text",
//       field: "lastname",
//       label: "Last Name",
//     },
//   ],
// };

const filterTypes = {
  text: (field) => ({
    xtype: "textfield",
    fieldLabel: field.text,
    name: field.dataIndex,
    emptyText: "Filter by " + field.text,
  }),
  checkbox: (field) => ({
    xtype: "checkbox",
    name: field.dataIndex,
    fieldLabel: field.text,
    uncheckedValue: false,
    inputValue: true,
    allowBlank: false,
    forceSelection: true,
  }),
  combo: (field) => ({
    xtype: "combobox",
    fieldLabel: field.text,
    name: field.dataIndex,
    displayField: "label",
    valueField: "field",
    store: field.options,
    emptyText: "Filter by " + field.text,
  }),

  date: (field) =>
    new Ext.form.FieldSet({
      title: field.text,
      items: [
        {
          xtype: "fieldcontainer",
          layout: "hbox",
          items: [
            {
              xtype: "datefield",
              anchor: "100%",
              fieldLabel: "From",
              name: "from_date",
              itemId: "fromDate",
              emptyText: "Select Date",
              format: "d-M-Y",
              padding: { left: 0, top: 0, bottom: 6 },
              listeners: {
                render: function (datefield) {
                  var ydate_date = Ext.Date.add(new Date(), Ext.Date.DAY, -1);
                  var formattedDate = ydate_date
                    .toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: server_time_zone,
                    })
                    .replace(/ /g, "-");
                  //console.log(formattedDate);
                  //console.log(typeof(formattedDate));
                  datefield.setValue(formattedDate);
                  datefield.setMaxValue(
                    Ext.util.Format.date(new Date(), "m/d/Y")
                  );
                },
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },

                change: function (field) {
                  var date = new Date(field.getValue());
                  var year = date.getFullYear();
                  var month = date.getMonth();
                  var day = date.getDate();
                  console.log(year, month, day);
                  if (field.getValue() != "" || field.getValue() != null) {
                    var fromTime = amfutil.getElementByID("fromTime");
                    if (fromTime.value == null || fromTime.value == "") {
                      fromTime.setValue("00:00:00");
                    }
                  } else {
                    console.log("going to set allow blank true");
                    amfutil.getElementByID("fromTime").allowBlank = true;
                  }
                  var fieldset = this.up("fieldset");
                  console.log(fieldset);
                  var hidden = amfutil.getElementByID("datefiltervalue");
                  console.log(hidden.value);
                  var curr = hidden.value;
                  if (curr != "" && curr != null) {
                    curr = JSON.parse(curr);
                  } else {
                    curr = {};
                  }

                  if (curr["$gt"]) {
                    var date = new Date(curr["$gt"]);
                    date.setFullYear(year);
                    date.setMonth(month);
                    date.setDate(day);

                    curr["$gt"] = date;
                  } else {
                    curr["$gt"] = new Date(date);
                  }

                  console.log(curr);
                  hidden.setValue(JSON.stringify(curr));
                },
              },
            },
            {
              xtype: "timefield",
              name: "fromtime",
              fieldLabel: "",
              increment: 15,
              itemId: "fromTime",
              emptyText: "Select Time",
              padding: { left: 4, top: 0, bottom: 0 },
              format: "H:i:s",
              anchor: "100%",
              listeners: {
                render: function (timefield) {
                  var ydate_date = Ext.Date.add(new Date(), Ext.Date.DAY, -1);
                  var time = ydate_date.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: server_time_zone,
                  });
                  //console.log('time',time);
                  //console.log('time',typeof(time));
                },
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },
                change: function (field) {
                  var date = new Date(field.getValue());
                  var hours = date.getHours();
                  var minutes = date.getMinutes();
                  var seconds = date.getSeconds();
                  console.log(hours, minutes, seconds);
                  if (!isNaN(hours)) {
                    var hidden = amfutil.getElementByID("datefiltervalue");
                    console.log(hidden.value);
                    var curr = hidden.value;
                    if (curr != "" && curr != null) {
                      curr = JSON.parse(curr);
                    } else {
                      curr = {};
                    }

                    if (curr["$gt"]) {
                      var date = new Date(curr["$gt"]);
                      date.setHours(hours);
                      date.setMinutes(minutes);
                      date.setSeconds(seconds);

                      curr["$gt"] = date;
                    }
                    console.log(curr);
                    hidden.setValue(JSON.stringify(curr));
                  }
                },
              },
            },
          ],
        },
        {
          xtype: "fieldcontainer",
          layout: "hbox",
          items: [
            {
              xtype: "datefield",
              anchor: "100%",
              fieldLabel: "To",
              name: "to_date",
              format: "d-M-Y",
              emptyText: "Select Date",
              itemId: "maToDate",
              padding: { left: 0, top: 0, bottom: 6 },
              listeners: {
                render: function (datefield) {
                  var ydate_date = Ext.Date.add(new Date(), Ext.Date.DAY);
                  var ydate_date = Ext.Date.add(
                    ydate_date,
                    Ext.Date.MINUTE,
                    15
                  );
                  var formattedDate = ydate_date
                    .toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: server_time_zone,
                    })
                    .replace(/ /g, "-");
                  datefield.setValue(formattedDate);
                  //console.log(formattedDate);
                  //console.log(typeof(formattedDate));
                },
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },
                change: function (field) {
                  var date = new Date(field.getValue());
                  var year = date.getFullYear();
                  var month = date.getMonth();
                  var day = date.getDate();
                  console.log(year, month, day);
                  if (field.getValue() != "" || field.getValue() != null) {
                    var fromTime = amfutil.getElementByID("fromTime");
                    if (fromTime.value == null || fromTime.value == "") {
                      fromTime.setValue("00:00:00");
                    }
                  } else {
                    console.log("going to set allow blank true");
                    amfutil.getElementByID("fromTime").allowBlank = true;
                  }
                  var fieldset = this.up("fieldset");
                  console.log(fieldset);
                  var hidden = amfutil.getElementByID("datefiltervalue");
                  console.log(hidden.value);
                  var curr = hidden.value;
                  if (curr != "" && curr != null) {
                    curr = JSON.parse(curr);
                  } else {
                    curr = {};
                  }

                  if (curr["$lt"]) {
                    var date = new Date(curr["$lt"]);
                    date.setFullYear(year);
                    date.setMonth(month);
                    date.setDate(day);

                    curr["$lt"] = date;
                  } else {
                    curr["$lt"] = new Date(date);
                  }

                  console.log(curr);
                  hidden.setValue(JSON.stringify(curr));
                },
              },
            },
            {
              xtype: "timefield",
              name: "totime",
              fieldLabel: "",
              increment: 15,
              itemId: "toTime",
              emptyText: "Select Time",
              format: "H:i:s",
              padding: { left: 4, top: 0, bottom: 0 },
              anchor: "100%",
              listeners: {
                render: function (timefield) {
                  var ydate_date = Ext.Date.add(
                    new Date(),
                    Ext.Date.MINUTE,
                    15
                  );
                  var time = ydate_date.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: server_time_zone,
                  });
                  //console.log('time',time);
                  //console.log('time',typeof(time));
                },
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },
                change: function (field) {
                  var date = new Date(field.getValue());
                  var hours = date.getHours();
                  var minutes = date.getMinutes();
                  var seconds = date.getSeconds();
                  console.log(hours, minutes, seconds);
                  if (!isNaN(hours)) {
                    var hidden = amfutil.getElementByID("datefiltervalue");
                    console.log(hidden.value);
                    var curr = hidden.value;
                    if (curr != "" && curr != null) {
                      curr = JSON.parse(curr);
                    } else {
                      curr = {};
                    }

                    if (curr["$lt"]) {
                      var date = new Date(curr["$lt"]);
                      date.setHours(hours);
                      date.setMinutes(minutes);
                      date.setSeconds(seconds);

                      curr["$lt"] = date;
                    }
                    console.log(curr);
                    hidden.setValue(JSON.stringify(curr));
                  }
                },
              },
            },
          ],
        },
        {
          xtype: "hidden",
          itemId: "datefiltervalue",
          name: field.dataIndex,
        },
      ],
    }),
  fileSize: (field) =>
    new Ext.form.FieldSet({
      title: field.text,
      items: [
        {
          xtype: "fieldcontainer",
          layout: "hbox",
          items: [
            {
              xtype: "numberfield",
              anchor: "100%",
              fieldLabel: "Minimum",
              name: "minSize",
              itemId: field.dataIndex + "minSize",
              emptyText: "Minimum File Size",
              format: "d-M-Y",
              padding: { left: 0, top: 0, bottom: 6 },
              listeners: {
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },

                change: function (fieldObj) {
                  var minUnit = amfutil.getElementByID(
                    field.dataIndex + "minUnit"
                  );
                  if (
                    fieldObj.getValue() != "" ||
                    fieldObj.getValue() != null
                  ) {
                    if (minUnit.value == null || minUnit.value == "") {
                      minUnit.setValue("KB");
                    }
                  } else {
                    console.log("going to set allow blank true");
                    minUnit.allowBlank = true;
                  }
                  var fieldset = this.up("fieldset");
                  console.log(fieldset);
                  var hidden = amfutil.getElementByID(
                    field.dataIndex + "sizefiltervalue"
                  );

                  var curr = hidden.value;
                  if (curr != "" && curr != null) {
                    curr = JSON.parse(curr);
                  } else {
                    curr = {};
                  }

                  if (fieldObj.getValue() != null) {
                    curr["$gt"] =
                      fieldObj.getValue() * sizeUnits[minUnit.value];
                  } else {
                    delete curr["$gt"];
                  }

                  // console.log(curr);
                  hidden.setValue(JSON.stringify(curr));
                  console.log(hidden.value);
                },
              },
            },
            {
              xtype: "combo",
              name: "minsizeunit",
              fieldLabel: "Size Unit",
              store: ["KB", "MB", "GB", "TB"],
              itemId: field.dataIndex + "minUnit",
              emptyText: "Select Unit",
              padding: { left: 4, top: 0, bottom: 0 },
              anchor: "100%",
              listeners: {
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },
                change: function (fieldObj) {
                  var minSize = amfutil.getElementByID(
                    field.dataIndex + "minSize"
                  );

                  if (
                    fieldObj.getValue() != "" ||
                    fieldObj.getValue() != null
                  ) {
                    if (minSize.value == null || minSize.value == "") {
                      minSize.setValue(1);
                    }
                  } else {
                    console.log("going to set allow blank true");
                    minSize.allowBlank = true;
                  }

                  var hidden = amfutil.getElementByID(
                    field.dataIndex + "sizefiltervalue"
                  );

                  var curr = hidden.value;
                  if (curr != "" && curr != null) {
                    curr = JSON.parse(curr);
                  } else {
                    curr = {};
                  }

                  if (minSize.value != null) {
                    curr["$gt"] =
                      minSize.value * sizeUnits[fieldObj.getValue()];
                  } else {
                    delete curr["$gt"];
                  }
                  // console.log(curr);
                  hidden.setValue(JSON.stringify(curr));
                  console.log(hidden.value);
                },
              },
            },
          ],
        },
        {
          xtype: "fieldcontainer",
          layout: "hbox",
          items: [
            {
              xtype: "numberfield",
              anchor: "100%",
              fieldLabel: "Maximum",
              name: "maxSize",
              itemId: field.dataIndex + "maxSize",
              emptyText: "Maximum File Size",
              padding: { left: 0, top: 0, bottom: 6 },
              listeners: {
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },

                change: function (fieldObj) {
                  var maxUnit = amfutil.getElementByID(
                    field.dataIndex + "maxUnit"
                  );
                  if (
                    fieldObj.getValue() != "" ||
                    fieldObj.getValue() != null
                  ) {
                    if (maxUnit.value == null || maxUnit.value == "") {
                      maxUnit.setValue("KB");
                    }
                  } else {
                    console.log("going to set allow blank true");
                    maxUnit.allowBlank = true;
                  }
                  var fieldset = this.up("fieldset");
                  console.log(fieldset);
                  var hidden = amfutil.getElementByID(
                    field.dataIndex + "sizefiltervalue"
                  );

                  var curr = hidden.value;
                  if (curr != "" && curr != null) {
                    curr = JSON.parse(curr);
                  } else {
                    curr = {};
                  }

                  if (fieldObj.getValue() != null) {
                    curr["$lt"] =
                      fieldObj.getValue() * sizeUnits[maxUnit.value];
                  } else {
                    delete curr["$lt"];
                  }

                  // console.log(curr);
                  hidden.setValue(JSON.stringify(curr));
                  console.log(hidden.value);
                },
              },
            },
            {
              xtype: "combo",
              name: "maxsizeunit",
              fieldLabel: "Size Unit",
              increment: 15,
              itemId: field.dataIndex + "maxUnit",
              emptyText: "Select Unit",
              store: ["KB", "MB", "GB", "TB"],
              padding: { left: 4, top: 0, bottom: 0 },
              anchor: "100%",
              listeners: {
                specialkey: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    btn = amfutil.getElementByID("filter_message_activity");
                    amfactionhelper.OnEnterKey(btn);
                  }
                },
                change: function (fieldObj) {
                  var maxSize = amfutil.getElementByID(
                    field.dataIndex + "maxSize"
                  );

                  var hidden = amfutil.getElementByID(
                    field.dataIndex + "sizefiltervalue"
                  );

                  var curr = hidden.value;
                  if (curr != "" && curr != null) {
                    curr = JSON.parse(curr);
                  } else {
                    curr = {};
                  }

                  if (maxSize.value != null) {
                    curr["$lt"] =
                      maxSize.value * sizeUnits[fieldObj.getValue()];
                  } else {
                    delete curr["$lt"];
                  }

                  // console.log(curr);
                  hidden.setValue(JSON.stringify(curr));
                  console.log(hidden.value);
                },
              },
            },
          ],
        },
        {
          xtype: "hidden",
          itemId: field.dataIndex + "sizefiltervalue",
          name: field.dataIndex,
        },
      ],
    }),
};

Ext.define("Amps.util.Utilities", {
  extend: "Ext.app.ViewController",
  singleton: true,

  // grids: {
  //   messages: {
  //     title: "Message Activity",
  //     actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
  //     columns: [
  //       { text: "Message ID", dataIndex: "msgid", flex: 1, type: "text" },
  //       {
  //         text: "Account",
  //         dataIndex: "account",
  //         flex: 1,
  //         value: "true",
  //         type: "text",
  //       },
  //       {
  //         text: "Bucket",
  //         dataIndex: "bucket",
  //         flex: 1,
  //         value: "true",
  //         type: "text",
  //       },
  //       {
  //         text: "File Name",
  //         dataIndex: "fname",
  //         flex: 1,
  //         value: "true",
  //         type: "text",
  //       },
  //       {
  //         text: "File Size",
  //         dataIndex: "fsize",
  //         flex: 1,
  //         type: "fileSize",
  //       },
  //       { text: "Status Time", dataIndex: "stime", flex: 1, type: "date" },
  //       {
  //         text: "Status",
  //         dataIndex: "status",
  //         flex: 1,
  //         type: "combo",
  //         options: [
  //           {
  //             field: "received",
  //             label: "Received",
  //           },
  //           {
  //             field: "routed",
  //             label: "Routed",
  //           },
  //         ],
  //       },
  //     ],
  //     options: [],
  //   },
  //   customers: {
  //     title: "Customers",
  //     object: "Customer",
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     columns: [
  //       { text: "Name", dataIndex: "name", flex: 1, type: "text" },
  //       {
  //         text: "Phone Number",
  //         dataIndex: "phone",
  //         flex: 1,
  //         type: "text",
  //       },
  //       { text: "Email", dataIndex: "email", flex: 1, type: "text" },
  //     ],
  //     fields: [
  //       {
  //         xtype: "textfield",
  //         name: "name",
  //         fieldLabel: "Account Name",
  //       },
  //       {
  //         xtype: "textfield",
  //         name: "phone",
  //         fieldLabel: "Phone Number",
  //       },
  //       {
  //         xtype: "textfield",
  //         name: "email",
  //         fieldLabel: "Email",
  //       },
  //     ],
  //     options: ["delete", "copy", "downloadufa"],
  //   },
  //   users: {
  //     title: "Users",
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     columns: [
  //       { text: "Customer", dataIndex: "customer", flex: 1, type: "text" },
  //       { text: "User Name", dataIndex: "username", flex: 1, type: "text" },

  //       { text: "First Name", dataIndex: "firstname", flex: 1, type: "text" },
  //       { text: "Last Name", dataIndex: "lastname", flex: 1, type: "text" },
  //       { text: "Email", dataIndex: "email", flex: 1, type: "text" },
  //       {
  //         text: "Phone Number",
  //         dataIndex: "phone",
  //         flex: 1,
  //         type: "text",
  //       },
  //     ],
  //     options: ["delete", "copy", "downloadufa"],
  //     fields: [getCollectionCombo("customers", { active: true })],
  //     subgrids: {
  //       fields: {
  //         title: "Match Fields",
  //         actionIcons: [
  //           "addnewbtn",
  //           "searchpanelbtn",
  //           "clearfilter",
  //           "refreshbtn",
  //         ],
  //         create: function (btn) {
  //           var tokens = Ext.util.History.getToken().split("/");
  //           grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
  //           scope = btn.lookupController();
  //           var myForm = new Ext.form.Panel({
  //             defaults: {
  //               padding: 5,
  //               labelWidth: 140,
  //             },
  //             scrollable: true,
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "field",
  //                 fieldLabel: "Field",
  //                 allowBlank: false,
  //                 listeners: {
  //                   afterrender: function (cmp) {
  //                     cmp.inputEl.set({
  //                       autocomplete: "nope",
  //                     });
  //                   },
  //                 },
  //                 width: 400,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "description",
  //                 fieldLabel: "Description",
  //                 allowBlank: false,
  //                 listeners: {
  //                   afterrender: function (cmp) {
  //                     cmp.inputEl.set({
  //                       autocomplete: "nope",
  //                     });
  //                   },
  //                 },
  //                 width: 400,
  //               },
  //             ],
  //             buttons: [
  //               {
  //                 text: "Save",
  //                 cls: "button_class",
  //                 formBind: true,
  //                 listeners: {
  //                   click: function (btn) {
  //                     form = btn.up("form").getForm();
  //                     var values = form.getValues();
  //                     // page_size = grid.store.pageSize;
  //                     btn.setDisabled(true);
  //                     var mask = new Ext.LoadMask({
  //                       msg: "Please wait...",
  //                       target: grid,
  //                     });
  //                     mask.show();
  //                     amfutil.ajaxRequest({
  //                       url: `api/` + Ext.util.History.getToken(),
  //                       method: "POST",
  //                       timeout: 60000,
  //                       params: {},
  //                       jsonData: values,
  //                       success: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         var data = Ext.decode(response.responseText);
  //                         Ext.toast("Match field created");
  //                         amfutil.broadcastEvent("update", {
  //                           page: Ext.util.History.getToken(),
  //                         });
  //                         grid.getStore().reload();
  //                         win.close();
  //                       },
  //                       failure: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         msg = response.responseText.replace(/['"]+/g, "");
  //                         amfutil.onFailure(
  //                           "Failed to Create Match Field",
  //                           response
  //                         );
  //                       },
  //                     });
  //                   },
  //                 },
  //               },
  //               {
  //                 text: "Cancel",
  //                 cls: "button_class",
  //                 itemId: "accounts_cancel",
  //                 listeners: {
  //                   click: function (btn) {
  //                     win.close();
  //                   },
  //                 },
  //               },
  //             ],
  //           });
  //           var win = new Ext.window.Window({
  //             title: "Add Match Field",
  //             modal: true,
  //             width: 450,
  //             resizable: false,
  //             layout: "fit",
  //             items: [myForm],
  //           });
  //           win.show();
  //         },
  //         update: function (record, route, tbar, back, scope) {
  //           var tokens = Ext.util.History.getToken().split("/");
  //           grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
  //           var myForm = new Ext.form.Panel({
  //             defaults: {
  //               padding: 5,
  //               labelWidth: 140,
  //             },
  //             scrollable: true,
  //             tbar: tbar ? tbar : null,
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "field",
  //                 fieldLabel: "Field",
  //                 allowBlank: false,
  //                 listeners: {
  //                   afterrender: function (cmp) {
  //                     cmp.inputEl.set({
  //                       autocomplete: "nope",
  //                     });
  //                   },
  //                 },
  //                 value: record.field,
  //                 width: 400,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "description",
  //                 fieldLabel: "Description",
  //                 allowBlank: false,
  //                 listeners: {
  //                   afterrender: function (cmp) {
  //                     cmp.inputEl.set({
  //                       autocomplete: "nope",
  //                     });
  //                   },
  //                 },
  //                 value: record.description,
  //                 width: 400,
  //               },
  //             ],
  //             buttons: [
  //               {
  //                 text: "Save",
  //                 cls: "button_class",
  //                 formBind: true,
  //                 listeners: {
  //                   click: function (btn) {
  //                     form = btn.up("form").getForm();
  //                     var values = form.getValues();
  //                     // page_size = grid.store.pageSize;
  //                     btn.setDisabled(true);
  //                     var mask = new Ext.LoadMask({
  //                       msg: "Please wait...",
  //                       target: grid,
  //                     });
  //                     mask.show();
  //                     amfutil.ajaxRequest({
  //                       headers: {
  //                         Authorization: localStorage.getItem("access_token"),
  //                       },
  //                       url: `api/` + Ext.util.History.getToken(),
  //                       method: "PUT",
  //                       timeout: 60000,
  //                       params: {},
  //                       jsonData: values,
  //                       success: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         var data = Ext.decode(response.responseText);
  //                         Ext.toast("Updated match field");
  //                         amfutil.broadcastEvent("update", {
  //                           page: Ext.util.History.getToken(),
  //                         });
  //                         grid.getStore().reload();
  //                         back();
  //                       },
  //                       failure: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         msg = response.responseText.replace(/['"]+/g, "");
  //                         amfutil.onFailure(
  //                           "Failed to Update Match Field",
  //                           response
  //                         );
  //                       },
  //                     });
  //                   },
  //                 },
  //               },
  //               {
  //                 text: "Cancel",
  //                 cls: "button_class",
  //                 itemId: "accounts_cancel",
  //                 listeners: {
  //                   click: function (btn) {
  //                     back();
  //                   },
  //                 },
  //               },
  //             ],
  //           });
  //           return myForm;
  //         },

  //         columns: [
  //           {
  //             text: "Field",
  //             dataIndex: "field",
  //             type: "text",
  //             flex: 1,
  //           },
  //           {
  //             text: "Description",
  //             dataIndex: "description",
  //             type: "text",
  //             flex: 3,
  //           },
  //         ],
  //         options: ["delete"],
  //       },
  //       rules: {
  //         title: "Agent Rules",
  //         actionIcons: [
  //           "addnewbtn",
  //           "searchpanelbtn",
  //           "clearfilter",
  //           "refreshbtn",
  //         ],
  //         create: function (btn) {
  //           var tokens = Ext.util.History.getToken().split("/");
  //           grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
  //           scope = btn.lookupController();

  //           var agentput = {
  //             xtype: "container",
  //             defaults: {
  //               padding: 10,
  //               labelWidth: 160,
  //               width: 400,
  //             },
  //             listeners: {
  //               afterrender: async function () {
  //                 var buckets = await amfutil.getAccountBuckets(
  //                   Ext.util.History.getToken().split("/")[1]
  //                 );
  //                 var names = buckets.map((bucket) => bucket.name);

  //                 this.down("#bucket").setStore(names);
  //               },
  //             },
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "fpoll",
  //                 fieldLabel: "File Polling Interval(Sec)",
  //                 maskRe: /[0-9]/,
  //                 vtype: "alphnumVtype",
  //                 vtypeText: "Please enter a valid file polling interval",
  //                 itemId: "fpoll",
  //                 value: "300",
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "fretry",
  //                 fieldLabel: "Failure Retry Wait",
  //                 maskRe: /[0-9]/,
  //                 vtypeText: "Please enter a valid Failure Retry Wait",
  //                 itemId: "fretry",
  //                 value: "5",
  //               },
  //               {
  //                 xtype: "checkboxfield",
  //                 name: "regex",
  //                 itemId: "regex",
  //                 fieldLabel: "Regex Flag",
  //                 uncheckedValue: false,
  //                 inputValue: true,
  //                 allowBlank: false,
  //                 forceSelection: true,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 itemId: "fmatch",
  //                 name: "fmatch",
  //                 fieldLabel: "File Match Pattern",
  //                 width: 400,
  //               },
  //               {
  //                 xtype: "combobox",
  //                 name: "bucket",
  //                 fieldLabel: "Upload Bucket Name",
  //                 store: [],
  //                 forceSelection: true,
  //                 allowBlank: false,
  //                 itemId: "bucket",
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "bpath",
  //                 fieldLabel: "Upload Bucket Path",
  //                 itemId: "bpath",
  //               },
  //               /* {
  //                 xtype: "textfield",
  //                 name: "fmeta",
  //                 fieldLabel: "File Metadata",
  //                 itemId: "fmeta",
  //                 width: 400,
  //               }, */ {
  //                 // Fieldset in Column 1 - collapsible via toggle button
  //                 xtype: "fieldset",
  //                 title: "File Metadata",
  //                 collapsible: true,
  //                 margin: { left: 10 },
  //                 onAdd: function (component, position) {
  //                   // component.setTitle("Match Pattern" + position);
  //                   console.log(component);
  //                   console.log(position);
  //                 },
  //                 items: [
  //                   {
  //                     xtype: "button",
  //                     text: "Add",
  //                     handler: function (button, event) {
  //                       var formpanel = button.up();

  //                       formpanel.insert(
  //                         formpanel.items.length - 1,
  //                         Ext.create("Amps.form.FileMetaData")
  //                       );
  //                     },
  //                   },
  //                 ],
  //               },
  //               {
  //                 xtype: "radiogroup",
  //                 fieldLabel: "Acknowledgment Mode",
  //                 itemId: "ackmode",
  //                 allowBlank: false,
  //                 columns: 3,
  //                 width: 400,
  //                 items: [
  //                   {
  //                     boxLabel: "None",
  //                     inputValue: "none",
  //                     name: "ackmode",
  //                     checked: true,
  //                   },
  //                   {
  //                     boxLabel: "Archive",
  //                     name: "ackmode",
  //                     inputValue: "archive",
  //                   },
  //                   {
  //                     boxLabel: "Delete",
  //                     name: "ackmode",
  //                     inputValue: "delete",
  //                   },
  //                 ],
  //                 /*listeners: {
  //                   change: function (obj) {
  //                     if (obj.value == "move:tofolder") {
  //                       fname = amfutil.getElementByID("fname");
  //                       fname.setHidden(false);
  //                       fname.setValue("");
  //                     } else {
  //                       fname = amfutil.getElementByID("fname");
  //                       fname.setHidden(true);
  //                     }
  //                   },
  //                 },*/
  //               },
  //             ],
  //           };

  //           var agentget = {
  //             xtype: "container",
  //             defaults: {
  //               padding: 10,
  //               labelWidth: 160,
  //               width: 400,
  //             },
  //             listeners: {
  //               afterrender: async function () {
  //                 var buckets = await amfutil.getAccountBuckets(
  //                   Ext.util.History.getToken().split("/")[1]
  //                 );
  //                 var names = buckets.map((bucket) => bucket.name);

  //                 this.down("#bucket").setStore(names);
  //               },
  //             },
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "fpoll",
  //                 itemId: "fpoll",
  //                 fieldLabel: "File Polling Interval(Sec)",
  //                 allowBlank: false,
  //                 value: "300",
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "bretry",
  //                 itemId: "bretry",
  //                 fieldLabel: "Get Failure Retry Wait",
  //                 value: "5",
  //               },
  //               {
  //                 xtype: "combobox",
  //                 name: "bucket",
  //                 itemId: "bucket",
  //                 fieldLabel: "Bucket Name",
  //                 allowBlank: false,
  //                 forceSelection: true,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "prefix",
  //                 itemId: "prefix",
  //                 fieldLabel: "Bucket Path Prefix",
  //                 value: "",
  //                 validator: function (val) {
  //                   if (val == "") {
  //                     return true;
  //                   } else {
  //                     if (val[0] == "/") {
  //                       return "Prefix cannot begin with /";
  //                     } else {
  //                       return true;
  //                     }
  //                   }
  //                 },
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "folder",
  //                 itemId: "folder",
  //                 fieldLabel: "Download Folder Name",
  //                 allowBlank: false,
  //               },
  //               {
  //                 xtype: "radiogroup",
  //                 fieldLabel: "Acknowledgment Mode",
  //                 itemId: "ackmode",
  //                 allowBlank: false,
  //                 columns: 3,
  //                 width: 400,
  //                 items: [
  //                   {
  //                     boxLabel: "None",
  //                     inputValue: "none",
  //                     name: "ackmode",
  //                     checked: true,
  //                   },
  //                   {
  //                     boxLabel: "Archive",
  //                     name: "ackmode",
  //                     inputValue: "archive",
  //                   },
  //                   {
  //                     boxLabel: "Delete",
  //                     name: "ackmode",
  //                     inputValue: "delete",
  //                   },
  //                 ],
  //                 /*listeners: {
  //                   change: function (obj) {
  //                     if (obj.value == "move:tofolder") {
  //                       fname = amfutil.getElementByID("get_fname");
  //                       fname.setHidden(false);
  //                       fname.setValue("");
  //                     } else {
  //                       fname = amfutil.getElementByID("get_fname");
  //                       fname.setHidden(true);
  //                     }
  //                   },
  //                 },*/
  //               },
  //             ],
  //           };

  //           var myForm = new Ext.form.Panel({
  //             defaults: {
  //               padding: 10,
  //               labelWidth: 160,
  //               width: 400,
  //             },
  //             scrollable: true,
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "name",
  //                 fieldLabel: "Rule Name",
  //                 allowBlank: false,
  //                 listeners: {
  //                   change: async function (cmp, value, oldValue, eOpts) {
  //                     var duplicate = await amfutil.checkDuplicate({
  //                       accounts: { "rules.name": value },
  //                     });

  //                     if (duplicate) {
  //                       cmp.setActiveError("Agent Rule Already Exists");
  //                       cmp.setValidation("Agent Rule Already Exists");
  //                       // cmp.isValid(false);
  //                     } else {
  //                       cmp.setActiveError();
  //                       cmp.setValidation();
  //                     }
  //                   },
  //                 },
  //               },
  //               {
  //                 name: "rtype",
  //                 fieldLabel: "Rule Type",
  //                 flex: 1,
  //                 xtype: "combobox",
  //                 store: [
  //                   {
  //                     field: "upload",
  //                     label: "Upload",
  //                   },
  //                   {
  //                     field: "download",
  //                     label: "Download",
  //                   },
  //                 ],
  //                 displayField: "label",
  //                 valueField: "field",
  //                 allowBlank: false,
  //                 listeners: {
  //                   change: async function (combo, val, eOpts) {
  //                     var formfields = this.up().query("#formfields")[0];
  //                     if (val == "upload") {
  //                       formfields.removeAll();
  //                       formfields.insert(agentput);
  //                     } else if (val == "download") {
  //                       formfields.removeAll();
  //                       formfields.insert(agentget);
  //                     }
  //                     console.log();
  //                   },
  //                 },
  //               },
  //               {
  //                 xtype: "container",
  //                 itemId: "formfields",
  //               },

  //               /*{
  //                 xtype: "textfield",
  //                 name: "foldername",
  //                 itemId: "fname",
  //                 hidden: true,
  //                 fieldLabel: "Folder Name",
  //                 //value:record.fname
  //               },*/
  //             ],
  //             buttons: [
  //               {
  //                 text: "Save",
  //                 itemId: "addagentput",
  //                 cls: "button_class",
  //                 formBind: true,
  //                 listeners: {
  //                   click: function (btn) {
  //                     form = btn.up("form").getForm();
  //                     values = form.getValues();
  //                     console.log(values);
  //                     var rule = {};
  //                     if (values.rtype == "upload") {
  //                       var fmeta = {};
  //                       console.log(values.fmeta);
  //                       if (values.fmeta) {
  //                         if (Array.isArray(values.fmeta)) {
  //                           values.fmeta.map((meta) => {
  //                             console.log(meta);
  //                             meta = JSON.parse(meta);
  //                             fmeta[meta["field"].trim()] =
  //                               meta["value"].trim();
  //                           });
  //                         } else {
  //                           var field = JSON.parse(values.fmeta);
  //                           console.log(field);
  //                           fmeta[field["field"].trim()] =
  //                             field["value"].trim();
  //                         }
  //                       } else {
  //                         fmeta = null;
  //                       }

  //                       rule["name"] = values.name;
  //                       rule["rtype"] = values.rtype;
  //                       rule["fpoll"] = values.fpoll;
  //                       rule["fretry"] = values.fretry;
  //                       rule["regex"] = values.regex;
  //                       rule["fmatch"] = values.fmatch;
  //                       rule["bucket"] = values.bucket;
  //                       rule["bpath"] = values.bpath;
  //                       if (fmeta) {
  //                         rule["fmeta"] = JSON.stringify(fmeta);
  //                       }
  //                       rule["ackmode"] = values.ackmode;
  //                       rule.active = true;
  //                     } else {
  //                       rule = {
  //                         name: values.name,
  //                         rtype: values.rtype,
  //                         fpoll: values.fpoll,
  //                         bretry: values.bretry,
  //                         bucket: values.bucket,
  //                         prefix: values.prefix.length
  //                           ? values.prefix.slice(-1) == "/"
  //                             ? values.prefix
  //                             : values.prefix + "/"
  //                           : values.prefix,
  //                         folder: values.folder,
  //                         ackmode: values.ackmode,
  //                         active: true,
  //                       };
  //                     }
  //                     console.log(rule);
  //                     btn.setDisabled(true);
  //                     var mask = new Ext.LoadMask({
  //                       msg: "Please wait...",
  //                       target: grid,
  //                     });
  //                     amfutil.ajaxRequest({
  //                       headers: {
  //                         Authorization: localStorage.getItem("access_token"),
  //                       },
  //                       url: `api/` + Ext.util.History.getToken(),
  //                       method: "POST",
  //                       timeout: 60000,
  //                       params: {},
  //                       jsonData: rule,
  //                       success: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         var data = Ext.decode(response.responseText);
  //                         Ext.toast("Agent Rule created");
  //                         amfutil.broadcastEvent("update", {
  //                           page: Ext.util.History.getToken(),
  //                         });
  //                         grid.getStore().reload();
  //                         win.close();
  //                       },
  //                       failure: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         msg = response.responseText.replace(/['"]+/g, "");
  //                         amfutil.onFailure(
  //                           "Failed to Create Agent Rule",
  //                           response
  //                         );
  //                       },
  //                     });
  //                   },
  //                 },
  //               },
  //               {
  //                 text: "Cancel",
  //                 cls: "button_class",
  //                 itemId: "agentput_cancel",
  //                 listeners: {
  //                   click: function (btn) {
  //                     win.close();
  //                   },
  //                 },
  //               },
  //             ],
  //           });
  //           var win = new Ext.window.Window({
  //             title: "Add Agent Rule",
  //             modal: true,
  //             width: 550,
  //             height: 600,
  //             scrollable: true,
  //             resizable: false,
  //             layout: "fit",
  //             items: [myForm],
  //           });
  //           win.show();
  //         },
  //         update: function (record, route, tbar, back, scope) {
  //           console.log(record);
  //           var tokens = Ext.util.History.getToken().split("/");
  //           grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);

  //           var agentput = {
  //             xtype: "container",
  //             defaults: {
  //               padding: 10,
  //               labelWidth: 160,
  //               width: 400,
  //             },
  //             listeners: {
  //               afterrender: async function () {
  //                 var buckets = await amfutil.getAccountBuckets(
  //                   Ext.util.History.getToken().split("/")[1]
  //                 );
  //                 var names = buckets.map((bucket) => bucket.name);

  //                 this.down("#bucket").setStore(names);
  //               },
  //             },
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "fpoll",
  //                 fieldLabel: "File Polling Interval(Sec)",
  //                 maskRe: /[0-9]/,
  //                 vtype: "alphnumVtype",
  //                 vtypeText: "Please enter a valid file polling interval",
  //                 itemId: "fpoll",
  //                 value: record.fpoll,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "fretry",
  //                 fieldLabel: "Failure Retry Wait",
  //                 maskRe: /[0-9]/,
  //                 vtypeText: "Please enter a valid Failure Retry Wait",
  //                 itemId: "fretry",
  //                 value: record.fretry,
  //               },
  //               {
  //                 xtype: "checkboxfield",
  //                 name: "regex",
  //                 itemId: "regex",
  //                 fieldLabel: "Regex Flag",
  //                 uncheckedValue: false,
  //                 inputValue: true,
  //                 allowBlank: false,
  //                 forceSelection: true,
  //                 value: record.regex,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 itemId: "fmatch",
  //                 name: "fmatch",
  //                 fieldLabel: "File Match Pattern",
  //                 value: record.fmatch,
  //                 width: 400,
  //               },
  //               {
  //                 xtype: "combobox",
  //                 name: "bucket",
  //                 fieldLabel: "Upload Bucket Name",
  //                 store: [],
  //                 allowBlank: false,
  //                 itemId: "bucket",
  //                 value: record.bucket,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "bpath",
  //                 fieldLabel: "Upload Bucket Path",
  //                 itemId: "bpath",
  //                 value: record.bpath,
  //               },
  //               /* {
  //                 xtype: "textfield",
  //                 name: "fmeta",
  //                 fieldLabel: "File Metadata",
  //                 itemId: "fmeta",
  //                 width: 400,
  //               }, */ {
  //                 // Fieldset in Column 1 - collapsible via toggle button
  //                 xtype: "fieldset",
  //                 title: "File Metadata",
  //                 collapsible: true,
  //                 margin: { left: 10 },
  //                 onAdd: function (component, position) {
  //                   // component.setTitle("Match Pattern" + position);
  //                   console.log(component);
  //                   console.log(position);
  //                 },
  //                 itemId: "fieldmeta",
  //                 items: [
  //                   {
  //                     xtype: "button",
  //                     text: "Add",
  //                     handler: function (button, event) {
  //                       var formpanel = button.up();

  //                       formpanel.insert(
  //                         formpanel.items.length - 1,
  //                         Ext.create("Amps.form.FileMetaData")
  //                       );
  //                     },
  //                   },
  //                 ],
  //               },
  //               {
  //                 xtype: "radiogroup",
  //                 fieldLabel: "Acknowledgment Mode",
  //                 itemId: "ackmode",
  //                 allowBlank: false,
  //                 columns: 3,
  //                 width: 400,
  //                 items: [
  //                   {
  //                     boxLabel: "None",
  //                     inputValue: "none",
  //                     name: "ackmode",
  //                   },
  //                   {
  //                     boxLabel: "Archive",
  //                     name: "ackmode",
  //                     inputValue: "archive",
  //                   },
  //                   {
  //                     boxLabel: "Delete",
  //                     name: "ackmode",
  //                     inputValue: "delete",
  //                   },
  //                 ],
  //                 listeners: {
  //                   render: function (scope, eOpts) {
  //                     scope.setValue({ ackmode: record.ackmode });
  //                   },
  //                 },
  //                 /*listeners: {
  //                   change: function (obj) {
  //                     if (obj.value == "move:tofolder") {
  //                       fname = amfutil.getElementByID("fname");
  //                       fname.setHidden(false);
  //                       fname.setValue("");
  //                     } else {
  //                       fname = amfutil.getElementByID("fname");
  //                       fname.setHidden(true);
  //                     }
  //                   },
  //                 },*/
  //               },
  //             ],
  //           };

  //           var agentget = {
  //             xtype: "container",
  //             defaults: {
  //               padding: 10,
  //               labelWidth: 160,
  //               width: 400,
  //             },
  //             listeners: {
  //               afterrender: async function () {
  //                 var buckets = await amfutil.getAccountBuckets(
  //                   Ext.util.History.getToken().split("/")[1]
  //                 );
  //                 var names = buckets.map((bucket) => bucket.name);

  //                 this.down("#bucket").setStore(names);
  //               },
  //             },
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "fpoll",
  //                 itemId: "fpoll",
  //                 fieldLabel: "File Polling Interval(Sec)",
  //                 allowBlank: false,
  //                 value: record.fpoll,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "bretry",
  //                 itemId: "bretry",
  //                 fieldLabel: "Get Failure Retry Wait",
  //                 value: record.bretry,
  //               },
  //               {
  //                 xtype: "combobox",
  //                 name: "bucket",
  //                 itemId: "bucket",
  //                 fieldLabel: "Bucket Name",
  //                 allowBlank: false,
  //                 forceSelection: true,
  //                 value: record.bucket,
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "prefix",
  //                 itemId: "prefix",
  //                 fieldLabel: "Bucket Path Prefix",
  //                 value: record.prefix,
  //                 validator: function (val) {
  //                   if (val == "") {
  //                     return true;
  //                   } else {
  //                     if (val[0] == "/") {
  //                       return "Prefix cannot begin with /";
  //                     } else {
  //                       return true;
  //                     }
  //                   }
  //                 },
  //               },
  //               {
  //                 xtype: "textfield",
  //                 name: "folder",
  //                 itemId: "folder",
  //                 fieldLabel: "Download Folder Name",
  //                 allowBlank: false,
  //                 value: record.folder,
  //               },
  //               {
  //                 xtype: "radiogroup",
  //                 fieldLabel: "Acknowledgment Mode",
  //                 itemId: "ackmode",
  //                 allowBlank: false,
  //                 columns: 3,
  //                 width: 400,
  //                 items: [
  //                   {
  //                     boxLabel: "None",
  //                     inputValue: "none",
  //                     name: "ackmode",
  //                   },
  //                   {
  //                     boxLabel: "Archive",
  //                     name: "ackmode",
  //                     inputValue: "archive",
  //                   },
  //                   {
  //                     boxLabel: "Delete",
  //                     name: "ackmode",
  //                     inputValue: "delete",
  //                   },
  //                 ],
  //                 listeners: {
  //                   render: function (scope, eOpts) {
  //                     scope.setValue({ ackmode: record.ackmode });
  //                   },
  //                 },
  //                 /*listeners: {
  //                   change: function (obj) {
  //                     if (obj.value == "move:tofolder") {
  //                       fname = amfutil.getElementByID("get_fname");
  //                       fname.setHidden(false);
  //                       fname.setValue("");
  //                     } else {
  //                       fname = amfutil.getElementByID("get_fname");
  //                       fname.setHidden(true);
  //                     }
  //                   },
  //                 },*/
  //               },
  //             ],
  //           };

  //           var myForm = new Ext.form.Panel({
  //             defaults: {
  //               padding: 10,
  //               labelWidth: 160,
  //               width: 400,
  //             },
  //             tbar: tbar ? tbar : null,
  //             scrollable: true,
  //             items: [
  //               {
  //                 xtype: "textfield",
  //                 name: "name",
  //                 fieldLabel: "Rule Name",
  //                 allowBlank: false,
  //                 value: record.name,
  //               },
  //               {
  //                 name: "rtype",
  //                 fieldLabel: "Rule Type",
  //                 flex: 1,
  //                 xtype: "combobox",
  //                 store: [
  //                   {
  //                     field: "upload",
  //                     label: "Upload",
  //                   },
  //                   {
  //                     field: "download",
  //                     label: "Download",
  //                   },
  //                 ],
  //                 displayField: "label",
  //                 valueField: "field",
  //                 allowBlank: false,
  //                 listeners: {
  //                   change: async function (combo, val, eOpts) {
  //                     var formfields = this.up().query("#formfields")[0];
  //                     if (val == "upload") {
  //                       formfields.removeAll();
  //                       formfields.insert(agentput);
  //                     } else if (val == "download") {
  //                       formfields.removeAll();
  //                       formfields.insert(agentget);
  //                     }
  //                     console.log();
  //                   },
  //                 },
  //               },
  //               {
  //                 xtype: "container",
  //                 itemId: "formfields",
  //               },

  //               /*{
  //                 xtype: "textfield",
  //                 name: "foldername",
  //                 itemId: "fname",
  //                 hidden: true,
  //                 fieldLabel: "Folder Name",
  //                 //value:record.fname
  //               },*/
  //             ],
  //             buttons: [
  //               {
  //                 text: "Save",
  //                 itemId: "addagentput",
  //                 cls: "button_class",
  //                 formBind: true,
  //                 listeners: {
  //                   click: function (btn) {
  //                     form = btn.up("form").getForm();
  //                     values = form.getValues();
  //                     console.log(values);
  //                     var rule = {};
  //                     if (values.rtype == "upload") {
  //                       var fmeta = {};
  //                       console.log(values.fmeta);
  //                       console.log(values.fmeta);
  //                       if (values.fmeta) {
  //                         if (Array.isArray(values.fmeta)) {
  //                           values.fmeta.map((meta) => {
  //                             console.log(meta);
  //                             meta = JSON.parse(meta);
  //                             fmeta[meta["field"].trim()] =
  //                               meta["value"].trim();
  //                           });
  //                         } else {
  //                           var field = JSON.parse(values.fmeta);
  //                           fmeta[field["field"].trim()] =
  //                             field["value"].trim();
  //                         }
  //                       } else {
  //                         fmeta = null;
  //                       }

  //                       rule["name"] = values.name;
  //                       rule["rtype"] = values.rtype;
  //                       rule["fpoll"] = values.fpoll;
  //                       rule["fretry"] = values.fretry;
  //                       rule["regex"] = values.regex;
  //                       rule["fmatch"] = values.fmatch;
  //                       rule["bucket"] = values.bucket;
  //                       rule["bpath"] = values.bpath;
  //                       if (fmeta) {
  //                         rule["fmeta"] = JSON.stringify(fmeta);
  //                       }

  //                       rule["ackmode"] = values.ackmode;
  //                       rule.active = true;
  //                     } else {
  //                       rule = {
  //                         name: values.name,
  //                         rtype: values.rtype,
  //                         fpoll: values.fpoll,
  //                         bretry: values.bretry,
  //                         bucket: values.bucket,
  //                         prefix: values.prefix.length
  //                           ? values.prefix.slice(-1) == "/"
  //                             ? values.prefix
  //                             : values.prefix + "/"
  //                           : values.prefix,
  //                         folder: values.folder,
  //                         ackmode: values.ackmode,
  //                         active: true,
  //                       };
  //                     }
  //                     btn.setDisabled(true);
  //                     var mask = new Ext.LoadMask({
  //                       msg: "Please wait...",
  //                       target: grid,
  //                     });
  //                     mask.show();
  //                     amfutil.ajaxRequest({
  //                       headers: {
  //                         Authorization: localStorage.getItem("access_token"),
  //                       },
  //                       url: `api/` + Ext.util.History.getToken(),
  //                       method: "PUT",
  //                       timeout: 60000,
  //                       params: {},
  //                       jsonData: rule,
  //                       success: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         var data = Ext.decode(response.responseText);
  //                         Ext.toast("Updated Agent Rule");
  //                         amfutil.broadcastEvent("update", {
  //                           page: Ext.util.History.getToken(),
  //                         });
  //                         grid.getStore().reload();
  //                         back();
  //                       },
  //                       failure: function (response) {
  //                         mask.hide();
  //                         btn.setDisabled(false);
  //                         msg = response.responseText.replace(/['"]+/g, "");
  //                         amfutil.onFailure(
  //                           "Failed to Update Agent Rule",
  //                           response
  //                         );
  //                       },
  //                     });
  //                   },
  //                 },
  //               },
  //               {
  //                 text: "Cancel",
  //                 cls: "button_class",
  //                 itemId: "agentput_cancel",
  //                 listeners: {
  //                   click: function (btn) {
  //                     back();
  //                   },
  //                 },
  //               },
  //             ],
  //           });

  //           var form = myForm.getForm();

  //           var fields = form.getFields();
  //           console.log(fields);

  //           fields.items[1].setValue(record.rtype);
  //           console.log(form.getFields());
  //           fields = form.getFields();

  //           var container = amfutil.getElementByID("fieldmeta");

  //           var fmeta;

  //           if (record.fmeta) {
  //             fmeta = JSON.parse(record.fmeta);

  //             fmeta = Object.entries(fmeta);
  //             var dcon = container;
  //             fmeta.forEach(function (def) {
  //               var length = dcon.items.length;
  //               var d = Ext.create("Amps.form.FileMetaData");
  //               d.down("#field").setValue(def[0]);
  //               d.down("#value").setValue(def[1]);
  //               dcon.insert(length - 1, d);
  //             });
  //           }
  //           return myForm;
  //         },

  //         columns: [
  //           {
  //             text: "Name",
  //             dataIndex: "name",
  //             type: "text",
  //             flex: 1,
  //           },
  //           {
  //             text: "Rule Type",
  //             dataIndex: "rtype",
  //             type: "combo",
  //             options: [
  //               { field: "upload", label: "Upload" },
  //               { field: "download", label: "Download" },
  //             ],
  //             flex: 1,
  //           },
  //           {
  //             text: "Poll",
  //             dataIndex: "fpoll",
  //             type: "text",
  //             flex: 1,
  //           },
  //           {
  //             text: "Acknowledgement",
  //             dataIndex: "ackmode",
  //             type: "text",
  //             flex: 1,
  //           },
  //         ],
  //         options: ["active", "delete"],
  //       },
  //     },
  //   },
  //   actions: {
  //     title: "Actions",
  //     window: { height: 600, width: 600 },
  //     object: "Action",
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     columns: [
  //       { text: "Name", dataIndex: "name", flex: 1, type: "text" },
  //       { text: "Type", dataIndex: "type", flex: 1, type: "text" },
  //     ],
  //     fields: [
  //       {
  //         xtype: "textfield",
  //         name: "name",
  //         fieldLabel: "Name",
  //         allowBlank: false,
  //         listeners: {
  //           change: async function (cmp, value, oldValue, eOpts) {
  //             var duplicate = await amfutil.checkDuplicate({
  //               actions: { name: value },
  //             });

  //             if (duplicate) {
  //               cmp.setActiveError("Action Already Exists");
  //               cmp.setValidation("Action Already Exists");
  //               // cmp.isValid(false);
  //             } else {
  //               cmp.setActiveError();
  //               cmp.setValidation();
  //             }
  //           },
  //         },
  //       },
  //       {
  //         xtype: "textfield",
  //         name: "desc",
  //         fieldLabel: "Description",
  //         allowBlank: false,
  //       },
  //       {
  //         xtype: "combobox",
  //         fieldLabel: "Action Type",
  //         allowBlank: false,
  //         displayField: "label",
  //         valueField: "field",
  //         forceSelection: true,
  //         name: "type",
  //         listeners: {
  //           beforerender: function (scope) {
  //             scope.setStore(
  //               Object.entries(ampsgrids.grids.actions.types).map((entry) => entry[1])
  //             );
  //           },
  //           change: function (scope, value) {
  //             var form = scope.up("form");
  //             var actionparms = form.down("#action-parms");
  //             actionparms.removeAll();
  //             ampsgrids.grids.actions.types[value].fields.forEach((field) => {
  //               console.log(field);
  //               actionparms.insert(field);
  //             });
  //           },
  //         },
  //       },
  //       {
  //         xtype: "container",
  //         layout: "fit",
  //         items: [
  //           {
  //             xtype: "fieldcontainer",
  //             itemId: "action-parms",
  //             // width: 600,
  //           },
  //         ],
  //       },
  //     ],
  //     addProcess: function (values, form) {
  //       if (ampsgrids.grids.actions.types[values.type].process) {
  //         values = ampsgrids.grids.actions.types[values.type].process(values, form);
  //       }

  //       values = amfutil.convertNumbers(form.getForm(), values);

  //       values.active = true;
  //       return values;
  //     },
  //     options: ["active", "delete"],
  //   },
  //   topics: {
  //     title: "Topics",
  //     object: "Topic",
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     options: ["upload", "delete"],
  //     columns: [
  //       {
  //         text: "Topic",
  //         dataIndex: "topic",
  //         flex: 1,
  //         type: "text",
  //       },
  //       // {
  //       //   text: "Type",
  //       //   dataIndex: "type",
  //       //   flex: 1,
  //       //   type: "text",
  //       // },

  //       {
  //         text: "Description",
  //         dataIndex: "desc",
  //         flex: 1,
  //         type: "text",
  //       },
  //     ],
  //     fields: [
  //       {
  //         xtype: "textfield",
  //         name: "topic",
  //         fieldLabel: "Topic",
  //         allowBlank: false,
  //         listeners: {
  //           change: async function (cmp, value, oldValue, eOpts) {
  //             var duplicate = await amfutil.checkDuplicate({
  //               topics: { subject: value },
  //             });

  //             if (duplicate) {
  //               cmp.setActiveError("Topic Already Exists");
  //               cmp.setValidation("Topic Already Exists");
  //               // cmp.isValid(false);
  //             } else {
  //               cmp.setActiveError();
  //               cmp.setValidation();
  //             }
  //           },
  //         },
  //         // listeners: {
  //         //   afterrender: function (cmp) {
  //         //     cmp.inputEl.set({
  //         //       autocomplete: "nope",
  //         //     });
  //         //   },
  //         //   change: amfutil.uniqueBucket,
  //         //   blur: function (item) {
  //         //     //  amfutil.removeSpaces(item.itemId);
  //         //   },
  //         // },
  //         width: 400,
  //       },
  //       {
  //         xtype: "textfield",
  //         name: "desc",
  //         fieldLabel: "Topic Description",
  //         // maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
  //         allowBlank: false,
  //         // listeners: {
  //         //   afterrender: function (cmp) {
  //         //     cmp.inputEl.set({
  //         //       autocomplete: "nope",
  //         //     });
  //         //   },
  //         //   change: amfutil.uniqueBucket,
  //         //   blur: function (item) {
  //         //     //  amfutil.removeSpaces(item.itemId);
  //         //   },
  //         // },
  //         width: 400,
  //       },
  //     ],
  //     // subgrids: {
  //     //   rules: {
  //     //     title: "Rules",
  //     //     actionIcons: [
  //     //       "addnewbtn",
  //     //       "searchpanelbtn",
  //     //       "clearfilter",
  //     //       "refreshbtn",
  //     //     ],
  //     //     columns: [
  //     //       {
  //     //         text: "Name",
  //     //         dataIndex: "name",
  //     //         flex: 1,
  //     //         type: "text",
  //     //       },
  //     //       {
  //     //         text: "Action",
  //     //         dataIndex: "action",
  //     //         flex: 1,
  //     //         type: "combo",
  //     //         options: [
  //     //           {
  //     //             field: "hold",
  //     //             label: "Hold",
  //     //           },
  //     //           {
  //     //             field: "mailbox",
  //     //             label: "Mailbox",
  //     //           },
  //     //         ],
  //     //       },
  //     //     ],
  //     //     create: function (btn, record) {
  //     //       var tokens = Ext.util.History.getToken().split("/");
  //     //       grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
  //     //       scope = btn.lookupController();
  //     //       route = Ext.util.History.currentToken;
  //     //       var myForm = new Ext.form.Panel({
  //     //         defaults: {
  //     //           padding: 5,
  //     //           labelWidth: 140,
  //     //         },
  //     //         scrollable: true,
  //     //         items: [
  //     //           {
  //     //             xtype: "textfield",
  //     //             name: "name",
  //     //             fieldLabel: "Name",
  //     //             forceSelection: true,
  //     //             listeners: {
  //     //               afterrender: function (field) {
  //     //                 field.focus();
  //     //               },

  //     //               change: async function (cmp, value, oldValue, eOpts) {
  //     //                 var duplicate = await amfutil.checkDuplicate({
  //     //                   topics: { "rules.name": value },
  //     //                 });

  //     //                 if (duplicate) {
  //     //                   cmp.setActiveError("Action Already Exists");
  //     //                   cmp.setValidation("Action Already Exists");
  //     //                   // cmp.isValid(false);
  //     //                 } else {
  //     //                   cmp.setActiveError();
  //     //                   cmp.setValidation();
  //     //                 }
  //     //               },
  //     //               onchange: function () {},
  //     //             },
  //     //           },
  //     //           {
  //     //             xtype: "checkbox",
  //     //             name: "active",
  //     //             fieldLabel: "Active",
  //     //             value: true,
  //     //             uncheckedValue: false,
  //     //             inputValue: true,
  //     //             allowBlank: false,
  //     //             forceSelection: true,
  //     //             listeners: {
  //     //               afterrender: function (field) {
  //     //                 field.focus();
  //     //               },
  //     //               onchange: function () {},
  //     //             },
  //     //           },
  //     //           // {
  //     //           //   xtype: "checkbox",
  //     //           //   name: "ediflag",
  //     //           //   fieldLabel: "Parse EDI Data",
  //     //           //   uncheckedValue: false,
  //     //           //   inputValue: true,
  //     //           //   allowBlank: false,
  //     //           //   forceSelection: true,
  //     //           //   listeners: {
  //     //           //     afterrender: function (field) {
  //     //           //       field.focus();
  //     //           //     },
  //     //           //     onchange: function () {},
  //     //           //   },
  //     //           // },
  //     //           // {
  //     //           //   xtype: "checkbox",
  //     //           //   name: "scanflag",
  //     //           //   fieldLabel: "Perform Antivirus Scan",
  //     //           //   uncheckedValue: false,
  //     //           //   inputValue: true,
  //     //           //   allowBlank: false,
  //     //           //   forceSelection: true,
  //     //           // },
  //     //           {
  //     //             xtype: "combobox",
  //     //             name: "action",
  //     //             fieldLabel: "Action",
  //     //             queryMode: "local",
  //     //             store: [],
  //     //             listeners: {
  //     //               afterrender: async function (scope) {
  //     //                 var data = await amfutil.getCollectionData("actions", {
  //     //                   type: record.type,
  //     //                 });
  //     //                 console.log(data);
  //     //                 scope.setStore(data.map((el) => el.name));
  //     //               },
  //     //             },
  //     //             displayField: "name",
  //     //             valueField: "name",
  //     //             allowBlank: false,
  //     //             forceSelection: true,
  //     //           },

  //     //           {
  //     //             // Fieldset in Column 1 - collapsible via toggle button
  //     //             xtype: "fieldset",
  //     //             title: "Match Patterns",
  //     //             collapsible: true,
  //     //             onAdd: function (component, position) {
  //     //               // component.setTitle("Match Pattern" + position);
  //     //               console.log(component);
  //     //               console.log(position);
  //     //             },
  //     //             items: [
  //     //               {
  //     //                 xtype: "button",
  //     //                 text: "Add",
  //     //                 handler: function (button, event) {
  //     //                   var formpanel = button.up();

  //     //                   formpanel.insert(
  //     //                     formpanel.items.length - 1,
  //     //                     Ext.create("Amps.form.Matchpattern")
  //     //                   );
  //     //                 },
  //     //               },
  //     //             ],
  //     //           },
  //     //           // {
  //     //           //   // Fieldset in Column 1 - collapsible via toggle button
  //     //           //   xtype: "fieldset",
  //     //           //   title: "Default Metadata",
  //     //           //   collapsible: true,
  //     //           //   onAdd: function (component, position) {
  //     //           //     // component.setTitle("Match Pattern" + position);
  //     //           //     console.log(component);
  //     //           //     console.log(position);
  //     //           //   },
  //     //           //   items: [
  //     //           //     {
  //     //           //       xtype: "button",
  //     //           //       text: "Add",
  //     //           //       handler: function (button, event) {
  //     //           //         var formpanel = button.up();

  //     //           //         formpanel.insert(
  //     //           //           formpanel.items.length - 1,
  //     //           //           Ext.create("Amps.form.Defaults")
  //     //           //         );
  //     //           //       },
  //     //           //     },
  //     //           //   ],
  //     //           // },
  //     //         ],
  //     //         buttons: [
  //     //           {
  //     //             text: "Save",
  //     //             itemId: "add",
  //     //             cls: "button_class",
  //     //             formBind: true,
  //     //             listeners: {
  //     //               click: function (btn) {
  //     //                 var form = btn.up("form").getForm();
  //     //                 var fields = form.getFields();
  //     //                 var values = form.getValues();
  //     //                 var rule = {};
  //     //                 console.log(values);
  //     //                 rule.action = values.action;
  //     //                 rule.name = values.name;

  //     //                 rule.active = values.active;

  //     //                 var patterns = values.patterns
  //     //                   ? Array.isArray(values.patterns)
  //     //                     ? values.patterns.map((pattern) => {
  //     //                         return JSON.parse(pattern);
  //     //                       })
  //     //                     : [JSON.parse(values.patterns)]
  //     //                   : [];
  //     //                 rule.patterns = {};

  //     //                 patterns.forEach((pattern) => {
  //     //                   console.log(pattern);
  //     //                   rule.patterns[pattern.field] = {
  //     //                     value: pattern.pattern,
  //     //                     regex: pattern.regex,
  //     //                   };
  //     //                 });

  //     //                 // var defaults = values.defaults
  //     //                 //   ? Array.isArray(values.defaults)
  //     //                 //     ? values.defaults.map((defaultobj) => {
  //     //                 //         return JSON.parse(defaultobj);
  //     //                 //       })
  //     //                 //     : [JSON.parse(values.defaults)]
  //     //                 //   : [];
  //     //                 // rule.defaults = {};

  //     //                 // defaults.forEach((def) => {
  //     //                 //   rule.defaults[def.field] = def.value;
  //     //                 // });

  //     //                 console.log(rule);
  //     //                 // page_size = grid.store.pageSize;
  //     //                 // btn.setDisabled(true);
  //     //                 var route = Ext.util.History.getToken();
  //     //                 amfutil.ajaxRequest({
  //     //                   headers: {
  //     //                     Authorization: localStorage.getItem("access_token"),
  //     //                   },
  //     //                   url: "api/" + route,
  //     //                   method: "POST",
  //     //                   timeout: 60000,
  //     //                   params: {},
  //     //                   jsonData: rule,
  //     //                   success: function (response) {
  //     //                     btn.setDisabled(false);
  //     //                     // var data = Ext.decode(response.responseText);
  //     //                     // console.log(data);
  //     //                     // var rules = data.rules.map((rule) =>
  //     //                     //   Object.assign(rule, rule.parms)
  //     //                     // );

  //     //                     grid.getStore().reload();

  //     //                     Ext.toast("Rule Created");
  //     //                     amfutil.broadcastEvent("update", {
  //     //                       page: Ext.util.History.getToken(),
  //     //                     });
  //     //                     amfutil.getElementByID("bucket-rules");
  //     //                     win.close();
  //     //                   },
  //     //                   failure: function (response) {
  //     //                     btn.setDisabled(false);
  //     //                     msg = response.responseText.replace(/['"]+/g, "");
  //     //                     amfutil.onFailure("Failed to Create Rule", response);
  //     //                   },
  //     //                 });
  //     //               },
  //     //             },
  //     //           },
  //     //           {
  //     //             text: "Cancel",
  //     //             cls: "button_class",
  //     //             itemId: "rule_cancel",
  //     //             listeners: {
  //     //               click: function (btn) {
  //     //                 win.close();
  //     //               },
  //     //             },
  //     //           },
  //     //         ],
  //     //       });
  //     //       var win = new Ext.window.Window({
  //     //         title: "Add Rule",
  //     //         modal: true,
  //     //         width: 550,
  //     //         height: 500,
  //     //         resizable: false,
  //     //         layout: "fit",
  //     //         items: [myForm],
  //     //       });
  //     //       win.show();
  //     //     },
  //     //     update: function (record, route, tbar, back, scope, parent) {
  //     //       console.log(record);
  //     //       console.log(parent);
  //     //       var tokens = Ext.util.History.getToken().split("/");
  //     //       grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);

  //     //       var myForm = new Ext.form.Panel({
  //     //         tbar: tbar ? tbar : null,
  //     //         scrollable: true,
  //     //         items: [
  //     //           {
  //     //             xtype: "textfield",
  //     //             name: "name",
  //     //             fieldLabel: "Name",
  //     //             value: record.name,
  //     //             forceSelection: true,
  //     //             listeners: {
  //     //               afterrender: function (field) {
  //     //                 field.focus();
  //     //               },

  //     //               change: async function (cmp, value, oldValue, eOpts) {
  //     //                 var duplicate = await amfutil.checkDuplicate({
  //     //                   topics: { "rules.name": value },
  //     //                 });

  //     //                 if (duplicate) {
  //     //                   cmp.setActiveError("Action Already Exists");
  //     //                   cmp.setValidation("Action Already Exists");
  //     //                   // cmp.isValid(false);
  //     //                 } else {
  //     //                   cmp.setActiveError();
  //     //                   cmp.setValidation();
  //     //                 }
  //     //               },
  //     //               onchange: function () {},
  //     //             },
  //     //           },
  //     //           {
  //     //             xtype: "checkbox",
  //     //             name: "active",
  //     //             fieldLabel: "Active",
  //     //             value: record.active,
  //     //             uncheckedValue: false,
  //     //             inputValue: true,
  //     //             allowBlank: false,
  //     //             forceSelection: true,
  //     //             listeners: {
  //     //               afterrender: function (field) {
  //     //                 field.focus();
  //     //               },
  //     //               onchange: function () {},
  //     //             },
  //     //           },
  //     //           // {
  //     //           //   xtype: "checkbox",
  //     //           //   name: "ediflag",
  //     //           //   fieldLabel: "Parse EDI Data",
  //     //           //   uncheckedValue: false,
  //     //           //   inputValue: true,
  //     //           //   allowBlank: false,
  //     //           //   forceSelection: true,
  //     //           //   listeners: {
  //     //           //     afterrender: function (field) {
  //     //           //       field.focus();
  //     //           //     },
  //     //           //     onchange: function () {},
  //     //           //   },
  //     //           // },
  //     //           // {
  //     //           //   xtype: "checkbox",
  //     //           //   name: "scanflag",
  //     //           //   fieldLabel: "Perform Antivirus Scan",
  //     //           //   uncheckedValue: false,
  //     //           //   inputValue: true,
  //     //           //   allowBlank: false,
  //     //           //   forceSelection: true,
  //     //           // },
  //     //           {
  //     //             xtype: "combobox",
  //     //             name: "action",
  //     //             fieldLabel: "Action",
  //     //             queryMode: "local",
  //     //             store: [],
  //     //             listeners: {
  //     //               beforerender: async function (scope) {
  //     //                 var data = await amfutil.getCollectionData("actions", {
  //     //                   type: parent.type,
  //     //                 });
  //     //                 console.log(data);
  //     //                 scope.setStore(data.map((el) => el.name));
  //     //                 scope.setValue(record.action);
  //     //               },
  //     //             },

  //     //             displayField: "name",
  //     //             valueField: "name",
  //     //             allowBlank: false,
  //     //             forceSelection: true,
  //     //           },

  //     //           {
  //     //             // Fieldset in Column 1 - collapsible via toggle button
  //     //             xtype: "fieldset",
  //     //             title: "Match Patterns",
  //     //             collapsible: true,
  //     //             onAdd: function (component, position) {
  //     //               // component.setTitle("Match Pattern" + position);
  //     //               console.log(component);
  //     //               console.log(position);
  //     //             },
  //     //             listeners: {
  //     //               afterrender: function (scope) {
  //     //                 var patterns = Object.entries(record.patterns).map(
  //     //                   (entry) => {
  //     //                     return Object.assign({ field: entry[0] }, entry[1]);
  //     //                   }
  //     //                 );
  //     //                 console.log(patterns);

  //     //                 patterns.forEach(function (pattern) {
  //     //                   var mcontainer = scope;
  //     //                   var length = mcontainer.items.length;
  //     //                   var mp = Ext.create("Amps.form.Matchpattern");
  //     //                   console.log(mp.down("#field"));
  //     //                   mp.down("#field").setValue(pattern.field);
  //     //                   mp.down("#regex").setValue(pattern.regex);
  //     //                   mp.down("#pattern").setValue(pattern.value);
  //     //                   mcontainer.insert(length - 1, mp);
  //     //                 });
  //     //               },
  //     //             },
  //     //             items: [
  //     //               {
  //     //                 xtype: "button",
  //     //                 text: "Add",
  //     //                 handler: function (button, event) {
  //     //                   var formpanel = button.up();

  //     //                   formpanel.insert(
  //     //                     formpanel.items.length - 1,
  //     //                     Ext.create("Amps.form.Matchpattern")
  //     //                   );
  //     //                 },
  //     //               },
  //     //             ],
  //     //           },
  //     //           // {
  //     //           //   // Fieldset in Column 1 - collapsible via toggle button
  //     //           //   xtype: "fieldset",
  //     //           //   title: "Default Metadata",
  //     //           //   collapsible: true,
  //     //           //   onAdd: function (component, position) {
  //     //           //     // component.setTitle("Match Pattern" + position);
  //     //           //     console.log(component);
  //     //           //     console.log(position);
  //     //           //   },
  //     //           //   items: [
  //     //           //     {
  //     //           //       xtype: "button",
  //     //           //       text: "Add",
  //     //           //       handler: function (button, event) {
  //     //           //         var formpanel = button.up();

  //     //           //         formpanel.insert(
  //     //           //           formpanel.items.length - 1,
  //     //           //           Ext.create("Amps.form.Defaults")
  //     //           //         );
  //     //           //       },
  //     //           //     },
  //     //           //   ],
  //     //           // },
  //     //         ],
  //     //         buttons: [
  //     //           {
  //     //             text: "Save",
  //     //             itemId: "addagentput",
  //     //             cls: "button_class",
  //     //             formBind: true,
  //     //             listeners: {
  //     //               click: function (btn) {
  //     //                 var form = btn.up("form").getForm();
  //     //                 var fields = form.getFields();
  //     //                 var values = form.getValues();
  //     //                 var rule = {};
  //     //                 console.log(values);
  //     //                 rule.action = values.action;
  //     //                 rule.name = values.name;

  //     //                 rule.active = values.active;

  //     //                 var patterns = values.patterns
  //     //                   ? Array.isArray(values.patterns)
  //     //                     ? values.patterns.map((pattern) => {
  //     //                         return JSON.parse(pattern);
  //     //                       })
  //     //                     : [JSON.parse(values.patterns)]
  //     //                   : [];
  //     //                 rule.patterns = {};

  //     //                 patterns.forEach((pattern) => {
  //     //                   console.log(pattern);
  //     //                   rule.patterns[pattern.field] = {
  //     //                     value: pattern.pattern,
  //     //                     regex: pattern.regex,
  //     //                   };
  //     //                 });

  //     //                 // var defaults = values.defaults
  //     //                 //   ? Array.isArray(values.defaults)
  //     //                 //     ? values.defaults.map((defaultobj) => {
  //     //                 //         return JSON.parse(defaultobj);
  //     //                 //       })
  //     //                 //     : [JSON.parse(values.defaults)]
  //     //                 //   : [];
  //     //                 // rule.defaults = {};

  //     //                 // defaults.forEach((def) => {
  //     //                 //   rule.defaults[def.field] = def.value;
  //     //                 // });

  //     //                 console.log(rule);
  //     //                 // page_size = grid.store.pageSize;
  //     //                 // btn.setDisabled(true);
  //     //                 var route = Ext.util.History.getToken();
  //     //                 btn.setDisabled(true);
  //     //                 var mask = new Ext.LoadMask({
  //     //                   msg: "Please wait...",
  //     //                   target: grid,
  //     //                 });
  //     //                 mask.show();
  //     //                 amfutil.ajaxRequest({
  //     //                   headers: {
  //     //                     Authorization: localStorage.getItem("access_token"),
  //     //                   },
  //     //                   url: `api/` + Ext.util.History.getToken(),
  //     //                   method: "PUT",
  //     //                   timeout: 60000,
  //     //                   params: {},
  //     //                   jsonData: rule,
  //     //                   success: function (response) {
  //     //                     mask.hide();
  //     //                     btn.setDisabled(false);
  //     //                     var data = Ext.decode(response.responseText);
  //     //                     Ext.toast("Updated Agent Rule");
  //     //                     amfutil.broadcastEvent("update", {
  //     //                       page: Ext.util.History.getToken(),
  //     //                     });
  //     //                     grid.getStore().reload();
  //     //                     back();
  //     //                   },
  //     //                   failure: function (response) {
  //     //                     mask.hide();
  //     //                     btn.setDisabled(false);
  //     //                     msg = response.responseText.replace(/['"]+/g, "");
  //     //                     amfutil.onFailure(
  //     //                       "Failed to Update Agent Rule",
  //     //                       response
  //     //                     );
  //     //                   },
  //     //                 });
  //     //               },
  //     //             },
  //     //           },
  //     //           {
  //     //             text: "Cancel",
  //     //             cls: "button_class",
  //     //             itemId: "agentput_cancel",
  //     //             listeners: {
  //     //               click: function (btn) {
  //     //                 back();
  //     //               },
  //     //             },
  //     //           },
  //     //         ],
  //     //       });

  //     //       return myForm;
  //     //     },
  //     //     options: ["active", "delete"],
  //     //   },
  //     // },
  //   },
  //   queues: {
  //     title: "Queues",
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     options: ["delete"],
  //     columns: [
  //       {
  //         text: "Name",
  //         dataIndex: "name",
  //         flex: 1,
  //         type: "text",
  //       },
  //       {
  //         text: "Type",
  //         dataIndex: "type",
  //         flex: 1,
  //         type: "text",
  //       },
  //       {
  //         text: "Description",
  //         dataIndex: "description",
  //         flex: 1,
  //         type: "text",
  //       },
  //     ],
  //   },
  //   services: {
  //     title: "Services",
  //     commonFields: [
  //       {
  //         xtype: "textfield",
  //         name: "name",
  //         fieldLabel: "Name",
  //         allowBlank: false,
  //         submitValue: true,
  //         listeners: {
  //           change: async function (cmp, value, oldValue, eOpts) {
  //             await amfutil.duplicateHandler(
  //               cmp,
  //               { services: { name: value } },
  //               "Service Already Exists"
  //             );
  //           },
  //         },
  //       },
  //       {
  //         xtype: "textfield",
  //         allowBlank: false,

  //         name: "desc",
  //         fieldLabel: "Description",
  //       },
  //     ],
  //     types: [
  //       {
  //         type: "httpd",
  //         name: "HTTP Server",
  //         iconCls: "x-fa fa-feed",
  //         fields: [
  //           {
  //             xtype: "textfield",
  //             name: "app",
  //             fieldLabel: "App",
  //             allowBlank: false,
  //           },
  //           {
  //             xtype: "numberfield",
  //             name: "port",
  //             fieldLabel: "Port",
  //             allowBlank: false,
  //             minValue: 0,
  //             maxValue: 65535,
  //             listeners: {
  //               change: async function (cmp, value, oldValue, eOpts) {
  //                 await amfutil.portHandler(cmp, value);
  //               },
  //             },
  //           },
  //           {
  //             xtype: "numberfield",
  //             name: "idle_timeout",
  //             allowBlank: false,

  //             fieldLabel: "Idle Timeout (ms)",
  //           },
  //           {
  //             xtype: "numberfield",
  //             name: "request_timeout",
  //             allowBlank: false,

  //             fieldLabel: "Request Timeout (ms)",
  //           },
  //           {
  //             xtype: "numberfield",
  //             name: "max_keepalive",
  //             allowBlank: false,

  //             fieldLabel: "Max Keep Alive (ms)",
  //           },
  //           {
  //             xtype: "checkbox",
  //             allowBlank: false,
  //             inputValue: true,
  //             allowBlank: false,
  //             uncheckedValue: false,
  //             name: "tls",
  //             itemId: "tls",
  //             fieldLabel: "TLS",
  //             listeners: {
  //               afterrender: function (scope) {
  //                 var val = scope.getValue();
  //                 var fields = ["cert", "key"];
  //                 var form = scope.up("form");
  //                 console.log(form.getForm().getFields());
  //                 console.log(val);
  //                 fields.forEach((field) => {
  //                   var f = form.down("#" + field);
  //                   console.log(f);
  //                   f.setHidden(!val);
  //                   f.setDisabled(!val);
  //                 });
  //               },
  //               change: function (scope, val) {
  //                 var fields = ["cert", "key"];
  //                 var form = scope.up("form");
  //                 console.log(val);
  //                 fields.forEach((field) => {
  //                   var f = form.down("#" + field);
  //                   console.log(f);
  //                   f.setHidden(!val);
  //                   f.setDisabled(!val);
  //                 });
  //               },
  //             },
  //           },
  //           {
  //             itemId: "cert",
  //             row: true,
  //             xtype: "loadkey",
  //             name: "data",
  //             fieldLabel: "Server Cert",
  //             // hidden: true,
  //             // disabled: true,
  //           },
  //           {
  //             itemId: "key",
  //             row: true,
  //             xtype: "loadkey",
  //             name: "data",
  //             fieldLabel: "Server Key",
  //             // hidden: true,
  //             // disabled: true,
  //           },
  //           // {
  //           //   itemId: "key",

  //           //   xtype: "combobox",
  //           //   fieldLabel: "Server Key",
  //           //   displayField: "name",
  //           //   listeners: {
  //           //     beforerender: function (scope) {
  //           //       scope.setStore(Ext.create("Amps.store.Key"));
  //           //     },
  //           //   },
  //           // },
  //         ],
  //         // load: function (form, record) {
  //         //   if (record.tls) {
  //         //     var fields = ["cert", "cert_file", "key", "key_file"];

  //         //     form.down("#tls").setValue(true);
  //         //     // form.down("#cert").setValue(record.server_cert);
  //         //     // form.down("#key").setValue(record.key);
  //         //     // fields.forEach(field => {
  //         //     //   var f = form.down("#" + field);
  //         //     // })
  //         //   }
  //         // },
  //       },
  //       {
  //         type: "sftpd",
  //         name: "SFTP Server",
  //         iconCls: "x-fa fa-files-o",
  //         fields: [
  //           {
  //             xtype: "textfield",
  //             name: "app",
  //             fieldLabel: "App",
  //             allowBlank: false,
  //           },
  //           {
  //             xtype: "numberfield",
  //             name: "port",
  //             fieldLabel: "Port",
  //             minValue: 0,
  //             maxValue: 65535,
  //             allowBlank: false,
  //             listeners: {
  //               change: async function (cmp, value, oldValue, eOpts) {
  //                 await amfutil.portHandler(cmp, value);
  //               },
  //             },
  //           },
  //           // {
  //           //   xtype: "combobox",
  //           //   name: "module",
  //           //   fieldLabel: "Module",
  //           //   allowBlank: false,

  //           //   store: [],
  //           //   listeners: {
  //           //     beforerender: async function (scope) {
  //           //       var data = await amfutil.getCollectionData("services", {
  //           //         type: "modules",
  //           //       });
  //           //       scope.setStore(data[0].modules);
  //           //       console.log(data);
  //           //     },
  //           //   },
  //           // },

  //           {
  //             row: true,
  //             xtype: "loadkey",
  //             fieldLabel: "Server Key",
  //             name: "server_key",
  //           },
  //           {
  //             xtype: "checkbox",
  //             inputValue: true,
  //             uncheckedValue: false,
  //             name: "sync_register",
  //             fieldLabel: "Sync Register",
  //             allowBlank: false,
  //           },
  //         ],
  //       },
  //       // {
  //       //   type: "amq",
  //       //   name: "AMQ",
  //       //   iconCls: "x-fa fa-exchange",
  //       //   fields: [
  //       //     {
  //       //       xtype: "textfield",
  //       //       name: "app",
  //       //       fieldLabel: "App",
  //       //       allowBlank: false,
  //       //     },
  //       //     // {
  //       //     //   xtype: "combobox",
  //       //     //   name: "module",
  //       //     //   fieldLabel: "Module",
  //       //     //   allowBlank: false,

  //       //     //   store: [],
  //       //     //   listeners: {
  //       //     //     beforerender: async function (scope) {
  //       //     //       var data = await amfutil.getCollectionData("services", {
  //       //     //         type: "modules",
  //       //     //       });
  //       //     //       scope.setStore(data[0].modules);
  //       //     //       console.log(data);
  //       //     //     },
  //       //     //   },
  //       //     // },
  //       //     {
  //       //       xtype: "numberfield",
  //       //       name: "thread_count",
  //       //       fieldLabel: "Thread Count",
  //       //       allowBlank: false,
  //       //     },
  //       //     {
  //       //       xtype: "combobox",
  //       //       fieldLabel: "Input Topic",
  //       //       allowBlank: false,
  //       //       displayField: "description",
  //       //       valueField: "name",
  //       //       forceSelection: true,
  //       //       allowBlank: false,

  //       //       flex: 1,
  //       //       name: "input_topic",
  //       //       store: [],
  //       //       listeners: {
  //       //         beforerender: function (scope) {
  //       //           scope.setStore(
  //       //             Ext.create("Ext.data.Store", {
  //       //               proxy: {
  //       //                 type: "rest",
  //       //                 headers: {
  //       //                   Authorization: localStorage.getItem("access_token"),
  //       //                 },
  //       //                 url: `/api/topics`,
  //       //                 reader: {
  //       //                   type: "json",
  //       //                   rootProperty: "rows",
  //       //                 },
  //       //               },
  //       //               listeners: {
  //       //                 load: function (
  //       //                   store,
  //       //                   records,
  //       //                   successful,
  //       //                   operation,
  //       //                   eOpts
  //       //                 ) {
  //       //                   console.log(records);
  //       //                   console.log(successful);
  //       //                 },
  //       //               },
  //       //               autoLoad: true,
  //       //             })
  //       //           );
  //       //         },
  //       //       },
  //       //     },
  //       //   ],
  //       // },
  //       {
  //         type: "subscriber",
  //         name: "Subscriber",
  //         iconCls: "x-fa fa-arrow-down",
  //         fields: [
  //           {
  //             xtype: "numberfield",
  //             name: "subs_count",
  //             fieldLabel: "Subscriber Count",
  //             allowBlank: false,
  //           },
  //           {
  //             xtype: "combobox",
  //             fieldLabel: "Action",
  //             name: "handler",
  //             valueField: "_id",
  //             displayField: "name",
  //             listeners: {
  //               beforerender: function (scope) {
  //                 scope.setStore(amfutil.createCollectionStore("actions"));
  //               },
  //             },
  //           },
  //           {
  //             xtype: "combobox",
  //             fieldLabel: "Topic",
  //             allowBlank: false,
  //             displayField: "topic",
  //             valueField: "topic",
  //             forceSelection: true,
  //             allowBlank: false,

  //             flex: 1,
  //             name: "topic",
  //             listeners: {
  //               beforerender: function (scope) {
  //                 scope.setStore(amfutil.createCollectionStore("topics"));
  //               },
  //             },
  //           },
  //         ],
  //         process: function (form) {
  //           var values = form.getValues();
  //           values.active = true;
  //           values.dynamic = true;

  //           return values;
  //         },
  //       },
  //       {
  //         type: "defaults",
  //         name: "Defaults",
  //         iconCls: "x-fa fa-pencil",
  //         singleton: true,
  //         fields: [
  //           {
  //             // Fieldset in Column 1 - collapsible via toggle button
  //             xtype: "fieldset",
  //             title: "Default Values",
  //             row: true,

  //             itemId: "defaults",
  //             collapsible: true,
  //             onAdd: function (component, position) {
  //               // component.setTitle("Match Pattern" + position);
  //               console.log(component);
  //               console.log(position);
  //             },
  //             items: [
  //               {
  //                 xtype: "button",
  //                 text: "Add",
  //                 handler: function (button, event) {
  //                   var formpanel = button.up();

  //                   formpanel.insert(
  //                     formpanel.items.length - 1,
  //                     Ext.create("Amps.form.Defaults", {
  //                       title: "Default Value",
  //                     })
  //                   );
  //                 },
  //               },
  //             ],
  //           },
  //         ],

  //         load: function (form, record) {
  //           console.log(form);
  //           console.log(record);
  //           delete record._id;
  //           delete record.name;
  //           delete record.desc;
  //           delete record.type;

  //           var defaults = Object.entries(record).map((entry) => {
  //             return { field: entry[0], value: entry[1] };
  //           });

  //           defaults.forEach(function (def) {
  //             var dcon = form.down("#defaults");
  //             var length = dcon.items.length;
  //             var d = Ext.create("Amps.form.Defaults");
  //             d.down("#field").setValue(def.field);
  //             d.down("#value").setValue(def.value);
  //             dcon.insert(length - 1, d);
  //           });
  //         },

  //         process: function (form) {
  //           var values = form.getValues();
  //           var defaults = values.defaults
  //             ? Array.isArray(values.defaults)
  //               ? values.defaults.map((defaultobj) => {
  //                   return JSON.parse(defaultobj);
  //                 })
  //               : [JSON.parse(values.defaults)]
  //             : [];
  //           var processed = {};

  //           defaults.forEach((def) => {
  //             processed[def.field] = def.value;
  //           });

  //           delete values.field;
  //           delete values.value;
  //           delete values.defaults;

  //           Object.assign(values, processed);
  //           console.log(values);

  //           return values;
  //         },
  //       },
  //       // {
  //       //   type: "modules",
  //       //   name: "Modules",
  //       //   singleton: true,
  //       //   iconCls: "x-fa fa-cube",
  //       //   fields: [
  //       //     {
  //       //       // Fieldset in Column 1 - collapsible via toggle button
  //       //       xtype: "fieldset",
  //       //       title: "Modules",
  //       //       itemId: "modules",
  //       //       collapsible: true,
  //       //       row: true,
  //       //       onAdd: function (component, position) {
  //       //         // component.setTitle("Match Pattern" + position);
  //       //         console.log(component);
  //       //         console.log(position);
  //       //       },
  //       //       items: [
  //       //         {
  //       //           xtype: "button",
  //       //           text: "Add",
  //       //           handler: function (button, event) {
  //       //             var formpanel = button.up("fieldset");

  //       //             formpanel.insert(
  //       //               formpanel.items.length - 1,
  //       //               Ext.create("Amps.form.Keys", {
  //       //                 name: "modules",
  //       //                 label: "Module",
  //       //               })
  //       //             );
  //       //           },
  //       //         },
  //       //       ],
  //       //     },
  //       //   ],

  //       //   load: function (form, record) {
  //       //     console.log(form);
  //       //     console.log(record);
  //       //     record.modules = record.modules ? record.modules : [];

  //       //     record.modules.forEach(function (mod) {
  //       //       var dcon = form.down("#modules");
  //       //       var length = dcon.items.length;
  //       //       var d = Ext.create("Amps.form.Keys", {
  //       //         name: "modules",
  //       //         label: "Module",
  //       //       });
  //       //       d.down("#value").setValue(mod);
  //       //       dcon.insert(length - 1, d);
  //       //     });
  //       //   },

  //       //   process: function (form) {
  //       //     var values = form.getValues();
  //       //     console.log(values);
  //       //     // var defaults = values.defaults
  //       //     //   ? Array.isArray(values.defaults)
  //       //     //     ? values.defaults.map((defaultobj) => {
  //       //     //         return JSON.parse(defaultobj);
  //       //     //       })
  //       //     //     : [JSON.parse(values.defaults)]
  //       //     //   : [];
  //       //     // values.defaults = {};

  //       //     // defaults.forEach((def) => {
  //       //     //   values.defaults[def.field] = def.value;
  //       //     // });

  //       //     return values;
  //       //   },
  //       // },
  //     ],
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     options: ["active", "delete"],
  //     columns: [
  //       {
  //         text: "Name",
  //         dataIndex: "name",
  //         flex: 1,
  //         type: "text",
  //       },
  //       {
  //         text: "Type",
  //         dataIndex: "type",
  //         flex: 1,
  //         type: "text",
  //       },
  //       {
  //         text: "Description",
  //         dataIndex: "desc",
  //         flex: 1,
  //         type: "text",
  //       },
  //     ],
  //   },
  //   admin: {
  //     title: "Admin Users",
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     columns: [
  //       { text: "First Name", dataIndex: "firstname", flex: 1, type: "text" },
  //       { text: "Last Name", dataIndex: "lastname", flex: 1, type: "text" },
  //       {
  //         text: "Role",
  //         dataIndex: "role",
  //         flex: 1,
  //         type: "combo",
  //         options: [
  //           { field: "Admin", label: "Admin" },
  //           { field: "Guest", label: "Guest" },
  //         ],
  //       },
  //       { text: "Username", dataIndex: "username", flex: 1, type: "text" },
  //       { text: "Phone", dataIndex: "phone", flex: 1, type: "text" },
  //       { text: "Email", dataIndex: "email", flex: 1, type: "text" },
  //       { text: "Provider", dataIndex: "provider", flex: 1, type: "text" },
  //       { text: "Approved", dataIndex: "approved", flex: 1, type: "checkbox" },
  //     ],
  //     options: ["approve"],
  //   },
  //   keys: {
  //     title: "Keys",
  //     actionIcons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],
  //     options: ["delete"],
  //     object: "Key",
  //     fields: [
  //       {
  //         xtype: "textfield",
  //         name: "name",
  //         fieldLabel: "Key Name",
  //         allowBlank: false,
  //         width: 400,
  //         listeners: {
  //           // change: async function (cmp, value, oldValue, eOpts) {
  //           //   await duplicateHandler(cmp, {})
  //           // },
  //         },
  //       },
  //       {
  //         xtype: "combobox",
  //         fieldLabel: "User",
  //         allowBlank: false,
  //         name: "user",
  //         displayField: "username",
  //         valueField: "username",
  //         listeners: {
  //           beforerender: async function (scope) {
  //             scope.setStore(amfutil.createCollectionStore("accounts"));
  //           },
  //         },
  //       },
  //       {
  //         xtype: "combobox",
  //         fieldLabel: "Key Usage",
  //         allowBlank: false,
  //         displayField: "label",
  //         valueField: "field",
  //         forceSelection: true,
  //         flex: 1,
  //         name: "usage",
  //         store: ["RSA", "SSH", "Encryption", "Signing", "Cert"],
  //       },

  //       {
  //         xtype: "radiogroup",
  //         fieldLabel: "Type",
  //         name: "type",
  //         allowBlank: false,
  //         columns: 2,
  //         vertical: true,
  //         items: [
  //           { boxLabel: "Public", name: "type", inputValue: "public" },
  //           {
  //             boxLabel: "Private",
  //             name: "type",
  //             inputValue: "private",
  //           },
  //         ],
  //       },
  //       {
  //         xtype: "keyfield",
  //         name: "data",
  //         fieldLabel: "Key",
  //       },
  //     ],
  //     columns: [
  //       {
  //         text: "Name",
  //         dataIndex: "name",
  //         flex: 1,
  //         type: "text",
  //       },
  //       {
  //         text: "Username",
  //         dataIndex: "user",
  //         flex: 1,
  //         type: "text",
  //       },
  //       {
  //         text: "Usage",
  //         dataIndex: "usage",
  //         flex: 1,
  //         type: "combo",
  //         options: ["RSA", "ssh", "enc", "sign"],
  //       },
  //       {
  //         text: "Type",
  //         dataIndex: "type",
  //         flex: 1,
  //         type: "text",
  //       },
  //     ],
  //   },
  // },

  gridactions: {
    approve: {
      name: "approve_user",
      tooltip: "Approve User",
      itemId: "approve",
      handler: "approveUser",
      getClass: function (v, meta, record) {
        console.log(record);
        var style;
        if (record.data.approved) {
          style = "active";
        } else {
          style = "inactive";
        }
        return "x-fa fa-user-circle actionicon " + style;
      },
    },
    active: {
      name: "toggle_active",
      tooltip: "Toggle Active",
      itemId: "active",
      handler: "toggleActive",
      getClass: function (v, meta, record) {
        var style;
        if (record.data.active) {
          style = "x-fa fa-toggle-on active";
        } else {
          style = "x-fa fa-toggle-off inactive";
        }
        return "actionicon " + style;
      },
    },
    downloadufa: {
      name: "download_ufa",
      iconCls: "x-fa fa-download actionicon",
      tooltip: "Download UFA Agent",
      handler: "downloadUfaAgent",
    },
    delete: {
      name: "delete",
      iconCls: "x-fa fa-trash actionicon",
      tooltip: "Delete File Mapping",
      handler: "deleteItem",
    },
    link: {
      name: "link",
      iconCls: "x-fa fa-link actionicon",
      itemId: "copypwd",
      tooltip: "Click here to get link",
      handler: "getLink",
    },
    upload: {
      name: "upload",
      iconCls: "x-fa fa-upload actionicon",
      itemId: "upload",
      tooltip: "Upload File to Bucket",
      handler: "handleUpload",
    },
  },

  all_icons: ["addnewbtn", "searchpanelbtn", "clearfilter", "refreshbtn"],

  from: null,

  getElementByID: function (itemid) {
    return Ext.ComponentQuery.query("#" + itemid)[0];
  },

  logout: function () {
    amfutil.ajaxRequest({
      url: "/api/session/",
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "Delete",
      timeout: 30000,
      params: {},
      success: function (response) {
        localStorage.clear();
        window.location.href = "/";
      },
      failure: function (response) {
        console.log("fail");
      },
    });
  },

  check_redirect: function (scope) {
    var query = window.location.search.substring(1);
    var params = Ext.Object.fromQueryString(query);
    if (params.provider) {
      amfutil.providercallback(params, scope);
    }
  },

  convertNumbers: function (form, data) {
    console.log(form);
    console.log(data);
    console.log(form.getFields());
    form.getFields().items.forEach((field) => {
      if (field.xtype == "numberfield") {
        data[field.name] = parseInt(data[field.name]);
      }
    });
    console.log(data);
    return data;
  },

  onFailure: function (msg, response) {
    Ext.Msg.alert(
      msg,
      response.status == 403
        ? "You have insufficient permissions"
        : "Unknown Error"
    );
  },

  makeRandom: function () {
    return (Math.random() + 1).toString(36).substring(7);
  },

  providerlogin: function (provider) {
    Ext.Ajax.request({
      url: "/api/auth/" + provider + "/new",
      method: "GET",
      timeout: 30000,
      success: function (response) {
        var obj = Ext.decode(response.responseText).data;
        console.log(obj);
        localStorage.setItem(
          "session_params",
          JSON.stringify(obj.session_params)
        );
        location.href = obj.url;
      },
      failure: function (response) {
        console.log("fail");
      },
    });
  },

  text: function (label, name, value, extra) {
    return Object.assign(
      {
        xtype: "textfield",
        name: name,
        fieldLabel: label,
        value: value,
      },
      extra
    );
  },

  checkbox: function (label, name, value, extra) {
    return Object.assign(
      {
        xtype: "checkbox",
        inputValue: true,
        uncheckedValue: false,
        name: name,
        fieldLabel: label,
        value: value,
      },
      extra
    );
  },

  combo: function (label, name, store, val, disp) {
    return {
      xtype: "combobox",
      name: name,
      fieldLabel: label,
      displayField: disp,
      valueField: val,
      store: store,
    };
  },

  channelHandlers: function (channel) {
    console.log(channel);
    channel
      .join()
      .receive("ok", (resp) => {
        console.log("Joined successfully", resp);
      })
      .receive("error", (resp) => {
        console.log("Unable to join", resp);
      });
    channel.on("update", (msg) => {
      console.log(msg);
      if (msg.page == Ext.util.History.getToken())
        Ext.toast({
          html: "This data has been updated",
          title: "Alert",
          autoCloseDelay: 5000,
        });
    });
  },

  renderMainApp: function () {},

  broadcastEvent: function (
    event,
    message,
    callback = (payload) => console.log(payload)
  ) {
    amfutil.channel
      .push(event, message, 10000)
      .receive("ok", (payload) => callback(payload))
      .receive("error", (err) => console.log("phoenix errored", err))
      .receive("timeout", () => console.log("timed out pushing"));
  },
  providercallback: function (params, scope) {
    var session_params = localStorage.getItem("session_params");
    params.session_params = session_params;
    console.log(params);
    Ext.Ajax.request({
      url: "/api/auth/" + params.provider + "/callback",
      method: "POST",
      timeout: 30000,
      params: params,
      success: function (response) {
        var obj = Ext.decode(response.responseText);
        if (obj.unapproved) {
          Ext.toast({
            html: "<center>" + obj.unapproved + "</center>",
            autoCloseDelay: 5000,
          });
          window.history.replaceState({}, document.title, "/");
          scope.redirectTo("login", { replace: true });
          Ext.create({
            xtype: "auth",
          });
        } else if (obj.data) {
          localStorage.setItem("loggedIn", true);
          localStorage.setItem("access_token", obj.data.access_token);
          localStorage.setItem("renewal_token", obj.data.renewal_token);
          localStorage.setItem("user", JSON.stringify(obj.data.user));
          window.location.href = "/";
        }
        // mask.hide();
        console.log(obj);
      },
      failure: function (response) {
        console.log("fail");
        window.location.replace("/");
        // mask.hide();
      },
    });
  },

  get_user: function () {
    return JSON.parse(localStorage.getItem("user"));
  },

  addToCollection: async function (collection, body, success, failure) {
    var resp = await amfutil.ajaxRequest({
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      url: "api/" + collection,
      method: "POST",
      timeout: 60000,
      params: {},
      jsonData: body,
      success: success,
      failure: failure,
    });
    return Ext.decode(resp.responseText);
  },

  updateInCollection: function (collection, body, id, success, failure) {
    amfutil.ajaxRequest({
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      url: "api/" + collection + "/" + id,
      method: "PUT",
      timeout: 60000,
      params: {},
      jsonData: body,
      success: success,
      failure: failure,
    });
  },

  formatArrayField(values) {
    var parsed = values
      ? Array.isArray(values)
        ? values.map((val) => {
            return JSON.parse(val);
          })
        : [JSON.parse(values)]
      : [];
    var parms = {};

    parsed.forEach((v) => {
      parms[v.field] = v.value;
    });
    return parms;
  },

  formatMatchPatterns(values) {
    var patterns = values
      ? Array.isArray(values)
        ? values.map((pattern) => {
            return JSON.parse(pattern);
          })
        : [JSON.parse(values)]
      : [];
    console.log(patterns);
    var parsed = {};

    patterns.forEach((pattern) => {
      console.log(pattern);
      parsed[pattern.field] = {
        value: pattern.pattern,
        regex: pattern.regex,
      };
    });
    return parsed;
  },

  checkDuplicate: async function (clauses) {
    var response = await amfutil.ajaxRequest({
      url: "/api/duplicate",
      method: "POST",
      timeout: 60000,
      jsonData: clauses,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
    });

    var duplicate = Ext.decode(response.responseText);
    return duplicate;
  },

  loadParms: function (form, record, field) {
    var parms = Object.entries(record[field]).map((entry) => {
      return { field: entry[0], value: entry[1] };
    });

    parms.forEach(function (p) {
      var dcon = form.down("#parms");
      var length = dcon.items.length;
      if (typeof p.value === "boolean") {
        var d = Ext.create("Amps.form.Parm.Bool");
        d.down("#field").setValue(p.field);
        d.down("#value").setValue(p.value);
        dcon.insert(length - 1, d);
      } else {
        var d = Ext.create("Amps.form.Parm.String");
        d.down("#field").setValue(p.field);
        d.down("#value").setValue(p.value);
        dcon.insert(length - 1, d);
      }
    });
  },

  uniqueBucket: async function (cmp, value, oldValue, eOpts) {
    var reg = new RegExp("^[0-9a-z.-]+$");
    if (value.length >= 3) {
      if (reg.test(value)) {
        var duplicate = await amfutil.checkDuplicate({
          rules: { name: value },
        });

        if (duplicate) {
          cmp.setActiveError("Account or Bucket Already Exists");
          cmp.setValidation("Account or Bucket Already Exists");
          // cmp.isValid(false);
        } else {
          cmp.setActiveError();
          cmp.setValidation();
        }
      } else {
        cmp.setActiveError(
          "Username must be lowercase and contain only letters, numbers, hyphens, and periods."
        );
        cmp.setValidation(
          "Username must be lowercase and contain only letters, numbers, hyphens, and periods."
        );
      }
    } else {
      cmp.setActiveError("Username must be between 8 and 40 characters");
      cmp.setValidation("Username must be between 8 and 40 characters");
    }
  },

  uniqueUsername: async function (cmp, value, oldValue, eOpts) {
    var duplicate = await amfutil.checkDuplicate({
      users: { username: value },
    });

    if (duplicate) {
      cmp.setActiveError("Account or Bucket Already Exists");
      cmp.setValidation("Account or Bucket Already Exists");
      // cmp.isValid(false);
    } else {
      cmp.setActiveError();
      cmp.setValidation();
    }
  },

  getCollectionData: async function (collection, filters = {}) {
    console.log(filters);
    var resp = await amfutil.ajaxRequest({
      url: "/api/" + collection,
      method: "GET",
      timeout: 60000,
      params: { filters: JSON.stringify(filters ? filters : {}) },
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      failure: function () {
        amfutil.logout();
      },
    });
    var obj = Ext.decode(resp.responseText);
    return obj.rows;
  },
  uuid: function () {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  },

  updateQuery(key, value) {
    if ("URLSearchParams" in window) {
      var searchParams = new URLSearchParams(window.location.search);
      searchParams.set(key, value);
      var newRelativePathQuery =
        window.location.pathname +
        "?" +
        searchParams.toString() +
        window.location.hash;
      history.pushState(null, "", newRelativePathQuery);
    }
  },

  matchTopic: function (stopic, wtopic) {
    try {
      var spieces = stopic.split(".");
      var wpieces = wtopic.split(".");

      var match = wpieces.reduce((match, piece, idx) => {
        return (
          (match && spieces[idx] == piece) ||
          spieces[idx] == "*" ||
          spieces[idx] == ">"
        );
      }, true);
      return match;
    } catch {}
  },

  createHistoryStore: function (msgid, opts = {}) {
    return Ext.create(
      "Ext.data.Store",
      Object.assign(
        {
          proxy: {
            type: "rest",
            url: `/api/message_events/history/${msgid}`,
            headers: {
              Authorization: localStorage.getItem("access_token"),
            },
            // extraParams: { filters: JSON.stringify(filters) },
            // reader: {
            //   type: "json",
            //   rootProperty: "rows",
            //   totalProperty: "count",
            // },
            listeners: {
              load: function (data) {
                console.log(data);
              },
              exception: amfutil.refresh_on_failure,
            },
          },
          autoLoad: true,
        },
        opts
      )
    );
  },

  createCollectionStore: function (collection, filters = {}, opts = {}) {
    var store = Ext.create(
      "Ext.data.Store",
      Object.assign(
        {
          remoteSort: true,
          proxy: {
            type: "rest",
            url: `/api/${collection}`,
            headers: {
              Authorization: localStorage.getItem("access_token"),
            },
            extraParams: { filters: JSON.stringify(filters) },
            reader: {
              type: "json",
              rootProperty: "rows",
              totalProperty: "count",
            },
            listeners: {
              load: function (data) {
                console.log(data);
              },
              exception: amfutil.refresh_on_failure,
            },
          },
          autoLoad: true,
        },
        opts
      )
    );

    // store.on(
    //   "load",
    //   function (storescope, records, successful, operation, eOpts) {
    //     console.log("STORE SUCCESS: " + successful);
    //     if (!successful) {
    //       storescope.reload();
    //     }
    //   }
    // );
    return store;
  },

  createFieldStore: function (collection, id, field, opts = {}) {
    return Ext.create(
      "Ext.data.Store",
      Object.assign(opts, {
        proxy: {
          type: "rest",
          url: `/api/${collection}/${id}/${field}`,
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
      })
    );
  },

  renew_session: async function () {
    return await Ext.Ajax.request({
      url: "/api/session/renew",
      headers: {
        Authorization: localStorage.getItem("renewal_token"),
      },
      method: "POST",
      timeout: 30000,
      params: {},
      success: function (response) {
        //console.log(response);
        var obj = Ext.decode(response.responseText);
        console.log(obj);
        if (obj.data) {
          localStorage.setItem("access_token", obj.data.access_token);
          localStorage.setItem("renewal_token", obj.data.renewal_token);
        } else {
          Ext.Msg.show({
            title: "Unauthorized or Expired Session",
            message:
              "Your session has expired or is no longer authorized, you will be redirected to Login.",
          });
          amfutil.logout();
        }
      },
      failure: function (response) {
        Ext.Msg.show({
          title: "Unauthorized or Expired Session",
          message:
            "Your session has expired or is no longer authorized, you will be redirected to Login.",
        });
        amfutil.logout();
      },
    });
  },

  redirect: function (token, opts) {
    this.redirectTo(token, opts);
  },

  hideButtons: function (arr) {
    for (i = 0; i < arr.length; i++) {
      amfutil.getElementByID(arr[i]).setHidden(true);
    }
  },

  duplicateHandler: async function (cmp, value, message) {
    var duplicate = await amfutil.checkDuplicate(value);

    if (duplicate) {
      cmp.setActiveError(message);
      cmp.setValidation(message);
      // cmp.isValid(false);
    } else {
      cmp.setActiveError();
      cmp.setValidation();
    }
  },

  portHandler: async function (cmp, value) {
    var response = await amfutil.ajaxRequest({
      url: "/api/port/" + value,
      method: "GET",
      timeout: 60000,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
    });

    var inUse = Ext.decode(response.responseText);
    if (inUse) {
      cmp.setActiveError("Port is in use.");
      cmp.setValidation("Port is in use.");
      // cmp.isValid(false);
    } else {
      cmp.setActiveError();
      cmp.setValidation();
    }
  },

  getBuckets: async function () {
    let response = await amfutil.ajaxRequest({
      url: "/api/rules",
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "GET",
      timeout: 30000,
      params: {},
      success: function (response) {},
      failure: function (response) {
        console.log(response);
      },
    });
    var obj = Ext.decode(response.responseText);

    return obj.rows;
  },

  getAccountBuckets: async function (id) {
    console.log(id);
    let response = await amfutil.ajaxRequest({
      url: "/api/accounts/" + id,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "GET",
      timeout: 30000,
      params: {},
      success: function (response) {},
      failure: function (response) {
        console.log(response);
      },
    });
    console.log(response);
    var username = Ext.decode(response.responseText).username;
    var buckets = await amfutil.getBuckets();
    return buckets.filter((bucket) => bucket.account == username);
  },

  checkGlob: async function (pattern, test) {
    let response = await Ext.Ajax.request({
      url: "/api/util/glob",
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "POST",
      timeout: 30000,
      params: {},
      jsonData: { pattern: pattern, test: test },
      success: function (response) {},
      failure: function (response) {
        console.log(response);
      },
    });
    var isMatch = Ext.decode(response.responseText);
    return isMatch;
  },

  refresh_on_failure: async function (proxyScope, response, operation, eOpts) {
    // if (response.status == 401) {
    //   await amfutil.renew_session();
    //   proxyScope.setHeaders({
    //     "Authorization": localStorage.getItem("access_token"),
    //   });
    // }
  },

  ajaxRequest: async function (request) {
    return new Promise(function (resolve, reject) {
      request.headers = {
        Authorization: localStorage.getItem("access_token"),
      };
      var failure = Object.assign({}, { failure: request.failure }).failure;

      delete request.failure;
      // console.log(failure);
      Ext.Ajax.request(request).then(
        function (response, opts) {
          // debugger;
          // console.log(response);
          var obj = Ext.decode(response.responseText);
          // console.log(obj);
          resolve(response);
        },
        async function (response, opts) {
          // debugger;
          console.log(
            "server-side failure with status code " + response.status
          );
          if ((response.status = 401)) {
            await amfutil.renew_session();
            request.headers = {
              Authorization: localStorage.getItem("access_token"),
            };
            request.failure = failure;
            response = await Ext.Ajax.request(request);
            resolve(response);
          }
        }
      );
    });
  },

  setVisibility: function (id, visibility) {
    amfutil.getElementByID(id).setVisibility(visibility);
  },

  getById: async function (collection, id) {
    let response = await amfutil.ajaxRequest({
      url: "/api/" + collection + "/" + id,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "GET",
      timeout: 30000,
      params: {},
      success: function (response) {},
      failure: function (response) {
        console.log(response);
      },
    });
    var obj = Ext.decode(response.responseText);
    console.log(response);

    return obj;
  },

  getCurrentItem: async function (route) {
    if (!route) {
      route = Ext.util.History.getToken();
    }
    let response = await amfutil.ajaxRequest({
      url: "/api/" + route,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "GET",
      timeout: 30000,
      params: {},
      success: function (response) {},
      failure: function (response) {
        console.log(response);
      },
    });
    var obj = Ext.decode(response.responseText);
    console.log(response);

    return obj;
  },

  setGridStore: function (filters) {
    // console.log(filters);
    var route = Ext.util.History.currentToken;
    var grid = amfutil.getElementByID("main-grid");
    grid.setStore(
      Ext.create("Ext.data.Store", {
        start: 0,
        limit: 25,
        remoteSort: true,
        proxy: {
          type: "rest",
          headers: {
            Authorization: localStorage.getItem("access_token"),
          },
          extraParams: { filters: JSON.stringify(filters ? filters : {}) },
          url: `/api/${route}`,
          listeners: {
            exception: amfutil.refresh_on_failure,
          },
          reader: {
            type: "json",
            rootProperty: "rows",
            totalProperty: "count",
          },
        },
        autoLoad: true,
      })
    );
  },

  checkReg: function (regx, samplevalue, type) {
    console.log(regx, samplevalue, type);
    if (type === "add") {
      var isValid = true;
      try {
        var re = new RegExp(regx);
        if (samplevalue) {
          if (re.test(samplevalue)) {
            return true;
          } else {
            return false;
          }
        }
      } catch (e) {
        var isValid = false;
      }
    } else if (type === "update") {
      console.log("check in update");
      var isValid = true;
      try {
        var re = new RegExp(regx);
        if (samplevalue) {
          if (re.test(samplevalue)) {
            console.log("checking me valid regex");
            amfuilib.setVisibility("message_view_update", true);
            amfutil
              .getElementByID("message_view_update")
              .setHtml(
                ' <p style="text-align: center;font-weight: 600;color: green;margin-top: -14px;margin-left:0px;margin-bottom: -10px;"> <i  style="color: green;" class="fa fa-check" aria-hidden="true"></i> File Name Matched</p>'
              );
          } else {
            console.log("checking me valid regex");
            amfuilib.setVisibility("message_view_update", true);
            amfutil
              .getElementByID("message_view_update")
              .setHtml(
                ' <p style="text-align: center;font-weight: 600;color: red;margin-top: -14px;margin-left: 0px;margin-bottom: -10px;"><i  style="color: red;" class="fa fa-exclamation-triangle" aria-hidden="true"></i> File Name Not Matched</p>'
              );
          }
        }
      } catch (e) {
        var isValid = false;
      }
      if (!isValid) {
        amfuilib.setVisibility("regular_check_message_update", true);
        amfutil
          .getElementByID("regular_check_message_update")
          .setHtml(
            ' <p style="text-align: center;font-weight: 600;color: red;margin-top: -14px;margin-left: 0px;margin-bottom: -10px;"><i  style="color: red;" class="fa fa-exclamation-triangle" aria-hidden="true"></i>Please Enter Valid Regular Expression</p>'
          );
      } else {
        amfuilib.setVisibility("regular_check_message_update", false);
        amfutil
          .getElementByID("regular_check_message_update")
          .setHtml(
            ' <p style="text-align: center;font-weight: 600;color: green;margin-top: -14px;margin-left: 0px;margin-bottom: -10px;"> <i  style="color: green;" class="fa fa-check" aria-hidden="true"></i> File Name Matched</p>'
          );
      }
    }
  },

  clearFilter: function () {
    var form = amfutil.getElementByID("searchform");
    form.reset();
    var window = amfutil.getElementByID("searchwindow");
    window.clearForm();

    console.log(form);
    amfutil.setGridStore();

    amfutil.getElementByID("searchwindow").close();
    amfutil.getElementByID("searchpanelbtn").setIconCls("x-fa fa-search");
  },

  showButtons: function (arr) {
    for (i = 0; i < arr.length; i++) {
      amfutil.getElementByID(arr[i]).setHidden(false);
      amfutil.getElementByID(arr[i]).setDisabled(false);
    }
  },

  showItemButtons: function (route) {
    amfutil
      .getElementByID("actionbar")
      .down("#" + route)
      .show();
  },

  showActionIcons: function (providedRoute) {
    var route = providedRoute ? providedRoute : Ext.util.History.getToken();
    var page = ampsgrids.pages[route];
    console.log(page);
    console.log("show action icons");
    amfutil.hideAllButtons();
    if (page) {
      var pagebar = amfutil.getElementByID("actionbar").down("#page");
      pagebar.insert(0, page.actionIcons);
    } else {
      console.log(ampsgrids.grids[route].actionIcons);
      amfutil.showButtons(ampsgrids.grids[route].actionIcons);
    }

    //   amfutil.getElementByID("addnewbtn").componentname = "accounts";
  },

  showFieldIcons: function (collection, field) {
    console.log("show action icons");
    amfutil.hideAllButtons();
    var fieldMenu = amfutil.getElementByID("actionbar").down("#fieldactions");
    var items = ampsgrids.grids[collection].subgrids[field].actionIcons;
    fieldMenu.items.items.forEach((item) => {
      console.log(item);
      if (items.indexOf(item.itemId) >= 0) {
        console.log("showing");
        item.show();
      }
    });
    fieldMenu.show();
    //   amfutil.getElementByID("addnewbtn").componentname = "accounts";
  },

  hideAllButtons: function () {
    amfutil.hideButtons(amfutil.all_icons);
    var routes = Object.keys(ampsgrids.grids);
    routes.forEach((route) => {
      var itemMenu = amfutil.getElementByID("actionbar").down("#" + route);
      if (itemMenu) {
        itemMenu.hide();
      }
    });
    var fieldMenu = amfutil.getElementByID("actionbar").down("#fieldactions");
    if (fieldMenu) {
      fieldMenu.items.items.forEach((item) => {
        item.hide();
      });
      fieldMenu.hide();
    }
    amfutil.getElementByID("actionbar").down("#page").removeAll();
  },

  getItemField: async function () {
    var route = Ext.util.History.getToken();
    var tokens = route.split("/");
    if (tokens.length > 2) {
      route = tokens[0] + "/" + tokens[1];
    }
    return await amfutil.ajaxRequest({
      url: "/api/" + route,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "GET",
      timeout: 30000,
      params: {},
      success: function (response) {
        var obj = Ext.decode(response.responseText);
        return obj;
      },
      failure: function (response) {
        console.log("fail");
      },
    });
  },

  createFieldSearch: function (route, field, grid) {
    var items =
      ampsgrids.grids[route].subgrids[field].columns &&
      ampsgrids.grids[route].subgrids[field].columns.map((field) => {
        if (field.type) {
          return filterTypes[field.type](field);
        } else {
          return;
        }
      });

    return new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
      },
      itemId: "searchform",
      items: items,
      buttons: [
        {
          xtype: "button",
          text: "Apply Filter",
          itemId: "applyfilterufarule",
          handler: function (btn) {
            var form = btn.up("form").getForm();
            // var dateval = btn.up("form").down("datefiltervalue");
            // console.log(dateval);
            var fields = form.getFields();
            var values = form.getValues();
            var fields = ampsgrids.grids[route].subgrids[field].columns;
            // var fieldKeys = fields.map((field) => field.field);
            console.log(fields);
            console.log(values);
            var filters = {};
            var gridFilters = grid.getStore().getFilters(); // an Ext.util.FilterCollection
            fields.forEach((field) => {
              if (values[field.dataIndex] && values[field.dataIndex] != "") {
                if (field.type == "date") {
                  var data = JSON.parse(values[field.dataIndex]);
                  if (data["$gt"]) {
                    data["$gt"] = { $date: data["$gt"] };
                  }
                  if (data["$lt"]) {
                    data["$lt"] = { $date: data["$lt"] };
                  }
                  filters[field.dataIndex] = data;
                } else if (field.type == "text") {
                  gridFilters.add((item) => {
                    return item.data[field.dataIndex].includes(
                      values[field.dataIndex]
                    );
                  });
                } else if (field.type == "fileSize") {
                  console.log(values[field.dataIndex]);
                  filters[field.dataIndex] = JSON.parse(
                    values[field.dataIndex]
                  );
                  console.log(filters);
                } else {
                  gridFilters.add((item) => {
                    return (
                      item.data[field.dataIndex] == values[field.dataIndex]
                    );
                  });
                }
              }
            });

            amfutil.getElementByID("searchwindow").close();
            amfutil
              .getElementByID("searchpanelbtn")
              .setIconCls("x-fa fa-search");
          },
        },
        {
          xtype: "button",
          text: "Clear Filter",
          handler: function (btn) {
            grid.getStore().clearFilter();
            amfutil.getElementByID("searchwindow").close();
            amfutil
              .getElementByID("searchpanelbtn")
              .setIconCls("x-fa fa-search");
          },
        },
      ],
    });
  },

  createFormFilter: function () {
    var route = Ext.util.History.currentToken;
    console.log(ampsgrids.grids[route]);
    var items =
      ampsgrids.grids[route].columns &&
      ampsgrids.grids[route].columns.map((field) => {
        if (field.type) {
          return filterTypes[field.type](field);
        } else {
          return;
        }
      });

    return new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
      },
      itemId: "searchform",
      items: items,
      buttons: [
        {
          xtype: "button",
          text: "Apply Filter",
          itemId: "applyfilterufarule",
          handler: function (btn) {
            var form = btn.up("form").getForm();
            // var dateval = btn.up("form").down("datefiltervalue");
            // console.log(dateval);
            var fields = form.getFields();
            var values = form.getValues();
            var fields = ampsgrids.grids[route].columns;
            // var fieldKeys = fields.map((field) => field.field);
            console.log(fields);
            console.log(values);
            var filters = {};
            fields.forEach((field) => {
              if (values[field.dataIndex] && values[field.dataIndex] != "") {
                if (field.type == "date") {
                  var data = JSON.parse(values[field.dataIndex]);
                  if (data["$gt"]) {
                    data["$gt"] = { $date: data["$gt"] };
                  }
                  if (data["$lt"]) {
                    data["$lt"] = { $date: data["$lt"] };
                  }
                  filters[field.dataIndex] = data;
                } else if (field.type == "text") {
                  filters[field.dataIndex] = {
                    $regex: values[field.dataIndex],
                  };
                } else if (field.type == "fileSize") {
                  console.log(values[field.dataIndex]);
                  filters[field.dataIndex] = JSON.parse(
                    values[field.dataIndex]
                  );
                  console.log(filters);
                } else {
                  filters[field.dataIndex] = values[field.dataIndex];
                }
              }
            });
            console.log(filters);
            amfutil.setGridStore(filters);
            amfutil.getElementByID("searchwindow").close();
            amfutil
              .getElementByID("searchpanelbtn")
              .setIconCls("x-fa fa-search");
          },
        },
        {
          xtype: "button",
          text: "Clear Filter",
          handler: function (btn) {
            amfutil.clearFilter();
          },
        },
      ],
    });
  },

  copyTextdata: function (e) {
    var contextMenu = Ext.create("Ext.menu.Menu", {
      width: 100,
      items: [
        {
          text: "Copy",
          iconCls: "x-fa fa fa-copy",
          handler: function () {
            var input = CLIPBOARD_CONTENTS;
            navigator.clipboard.writeText(input).then(function () {});
          },
        },
      ],
    });
    e.stopEvent();
    contextMenu.showAt(e.pageX, e.pageY);
  },

  showCurrentTime: function () {
    var today = new Date().toLocaleString("en-US", {
      timeZone: server_time_zone,
    });
    var currenttime = new Date(today);
    var h = currenttime.getHours();
    var m = currenttime.getMinutes();
    var s = currenttime.getSeconds();
    if (h < 10) {
      h = "0" + h;
    }
    if (m < 10) {
      m = "0" + m;
    }
    if (s < 10) {
      s = "0" + s;
    }

    return h + ":" + m + ":" + s + " ";
  },
});
