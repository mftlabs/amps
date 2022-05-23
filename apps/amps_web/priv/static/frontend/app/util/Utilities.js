const sizeUnits = {
  B: 1,
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

Ext.define("Amps.column.Socket", {
  extend: "Ext.grid.column.Widget",
  cellFocusable: false,
  xtype: "socketcolumn",
  config: null,
  constructor: function (args) {
    this.callParent([args]);
    this.config = args["config"];
  },
  widget: {
    xtype: "socketwidget",
  },
  onWidgetAttach: function (col, widget, rec) {
    clearInterval(widget.timer);
    widget.removeAll();

    var config = col.config(rec.data, widget);

    if (config) {
      widget.load(config.event, config.payload, config.callback, config.cond);
    }
  },
});

Ext.define("Amps.widget.Socket", {
  extend: "Ext.container.Container",
  xtype: "socketwidget",
  timer: null,
  style: {
    background: "transparent",
  },

  listeners: {
    beforedestroy: function (scope) {
      console.log("destroying");
      clearInterval(scope.timer);
    },
  },
  layout: "fit",

  constructor: function (config) {
    // It is important to remember to call the Widget superclass constructor
    // when overriding the constructor in a derived class. This ensures that
    // the element is initialized from the template, and that initConfig() is
    // is called.
    this.callParent([config]);
  },
  load: function (event, parms, callback, cond, time) {
    var scope = this;
    var data = this._rowContext.record.data;
    var cb;
    if (callback) {
      cb = function (payload) {
        callback(scope, payload);
      };
    } else {
      cb = function (payload) {
        scope.removeAll();

        scope.insert({
          xtype: "component",
          html: payload,
        });
      };
    }

    scope.timer = amfutil.socketLoop(event, parms, cb, cond, time);
  },
});

const filterTypes = {
  tag: (field, opts = {}) => {
    return Object.assign(
      {
        xtype: "tagfield",
        fieldLabel: field.text,
        name: field.dataIndex,
        store: field["options"],
        emptyText: "Filter by " + field.text,
        displayField: "label",
        valueField: "field",
        queryMode: "local",
        filterPickList: true,
      },
      opts
    );
  },
  aggregate: (field) => {
    return {
      xtype: "combobox",
      fieldLabel: field.text,
      name: field.dataIndex,
      emptyText: "Filter by " + field.text,
      listeners: {
        beforerender: async function (scope) {
          var res = await amfutil.ajaxRequest({
            url: `api/${field.collection}/aggregate/${field.dataIndex}`,
          });
          var nodes = Ext.decode(res.responseText);
          scope.setStore(nodes);
        },
      },
    };
  },
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
  combo: (field, opts) => {
    return Object.assign(
      {
        xtype: "combobox",
        fieldLabel: field.text,
        name: field.dataIndex,
        displayField: "label",
        valueField: "field",
        store: field.options,
        emptyText: "Filter by " + field.text,
      },
      opts
    );
  },

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
  fileSize: (field) => {
    function setHiddenValue() {
      var curr = {};
      var hidden = amfutil.getElementByID(field.dataIndex + "sizefiltervalue");
      var minUnit = amfutil
        .getElementByID(field.dataIndex + "minUnit")
        .getValue();
      var minSize = amfutil
        .getElementByID(field.dataIndex + "minSize")
        .getValue();
      var maxUnit = amfutil
        .getElementByID(field.dataIndex + "maxUnit")
        .getValue();
      var maxSize = amfutil
        .getElementByID(field.dataIndex + "maxSize")
        .getValue();

      if (minSize && minUnit) {
        curr["$gt"] = minSize * sizeUnits[minUnit];
      }

      if (maxSize && maxUnit) {
        curr["$lt"] = maxSize * sizeUnits[maxUnit];
      }
      console.log(curr);
      hidden.setValue(JSON.stringify(curr));
    }

    return new Ext.form.FieldSet({
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
              minValue: 0,
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
                    fieldObj.getValue() != "" &&
                    fieldObj.getValue() != null
                  ) {
                    if (minUnit.value == null || minUnit.value == "") {
                      minUnit.setValue("KB");
                    }
                  } else {
                    console.log("going to set allow blank true");
                    minUnit.allowBlank = true;
                  }
                  setHiddenValue();
                },
              },
            },
            {
              xtype: "combo",
              name: "minsizeunit",
              fieldLabel: "Size Unit",
              store: ["B", "KB", "MB", "GB", "TB"],
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
                    fieldObj.getValue() != "" &&
                    fieldObj.getValue() != null
                  ) {
                    if (minSize.value == null || minSize.value == "") {
                      minSize.setValue(1);
                    }
                  } else {
                    console.log("going to set allow blank true");
                    minSize.allowBlank = true;
                  }

                  setHiddenValue();
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
              minValue: 0,
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
                  console.log();
                  var val = fieldObj.getValue();
                  console.log(val);
                  if (val != "" && val != null) {
                    if (maxUnit.value == null || maxUnit.value == "") {
                      maxUnit.setValue("KB");
                    }
                  } else {
                    console.log("going to set allow blank true");
                    maxUnit.allowBlank = true;
                  }

                  setHiddenValue();
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
              store: ["B", "KB", "MB", "GB", "TB"],
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
                  var val = fieldObj.getValue();
                  console.log(val);
                  if (val != "" && val != null) {
                    if (maxSize.value == null || maxSize.value == "") {
                      maxSize.setValue(1);
                    }
                  } else {
                    console.log("going to set allow blank true");
                    maxSize.allowBlank = true;
                  }
                  setHiddenValue();
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
    });
  },
};

Ext.define("Amps.util.Utilities", {
  extend: "Ext.app.ViewController",
  singleton: true,
  renewPromise: null,
  socketPromise: null,

  channel: null,
  socket: null,
  stores: [],

  gridactions: {
    loadDemo: {
      name: "loadMe",
      tooltip: "Load Demo",
      iconCls: "x-fa fa-upload actionicon",
      itemId: "loaddemo",
      handler: "loadDemo",
    },
    readme: {
      name: "readme",
      tooltip: "View README",
      iconCls: "x-fa fa-info-circle actionicon",
      itemId: "readme",
      handler: "showReadme",
    },
    approve: {
      name: "approve_user",
      tooltip: "Approve User",
      itemId: "approve",
      handler: "approveUser",
      getClass: function (v, meta, record) {
        // console.log(record);
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
    archive: {
      name: "toggle_archive",
      tooltip: "Toggle Archive",
      itemId: "archive",
      handler: "toggleArchive",
      getClass: function (v, meta, record) {
        var style;
        if (record.data.archive) {
          style = "x-fa fa-archive active";
        } else {
          style = "x-fa fa-archive inactive";
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
    reprocess: {
      name: "reprocess",
      iconCls: "x-fa fa-undo",
      itemId: "reprocess",
      tooltip: "Click here to reprocess message",
      handler: "reprocess",
      isActionDisabled: function (v, r, c, i, record) {
        if (!record.data.topic || record.data.synch) {
          return true;
        } else {
          return false;
        }
      },
    },
    reset: {
      name: "link",
      iconCls: "x-fa fa-key actionicon",
      itemId: "resetPassword",
      tooltip: "Click here to reset user password",
      isActionDisabled: function (v, r, c, i, record) {
        if (!record.data.approved) {
          return true;
        } else {
          return false;
        }
      },
      handler: "resetPassword",
    },
    resetAdmin: {
      name: "link",
      iconCls: "x-fa fa-key actionicon",
      itemId: "resetPassword",
      tooltip: "Click here to reset user password",
      handler: "resetAdminPassword",
      isActionDisabled: function (v, r, c, i, record) {
        if (!record.data.approved) {
          return true;
        } else {
          return false;
        }
      },
    },
    changePassAdmin: {
      xtype: "button",
      name: "changepassword",
      iconCls: "x-fa fa-refresh actionicon",
      itemId: "changePassword",
      tooltip: "Click here to change user password",
      handler: "onChangeAdminPassword",
      style: "cursor:pointer;",
    },
    upload: {
      name: "upload",
      iconCls: "x-fa fa-upload actionicon",
      itemId: "upload",
      tooltip: "Upload File to Topic",
      handler: "handleUpload",
    },
    event: {
      name: "event",
      iconCls: "x-fa fa-arrow-circle-right actionicon",
      itemId: "event",
      tooltip: "Send Event to Topic",
      handler: "sendEvent",
    },
    reroute: {
      name: "reroute",
      iconCls: "x-fa fa-random actionicon",
      itemId: "event",
      tooltip: "Reroute Event to new Topic",
      handler: "reroute",
    },
    clearenv: {
      name: "clearenv",
      iconCls: "x-fa fa-ban actionicon",
      itemId: "clearenv",
      tooltip: "Clear Environment",
      handler: "clearEnv",
    },
    exportenv: {
      name: "exportenv",
      iconCls: "x-fa fa-download actionicon",
      itemId: "exportenv",
      tooltip: "Export Environment as Demo",
      handler: "exportEnv",
    },
    getsecret: {
      name: "getsecret",
      iconCls: "x-fa fa-key actionicon",
      itemId: "getsecret",
      tooltip: "Get Secret",
      handler: "getSecret",
    },
    //   loop: {
    //     name: "loop",
    //     style: {
    //       width: "min-content",
    //       height: "min-content",
    //     },
    //     iconCls: "x-fa fa-spinner fa-pulse actionicon",
    //     tooltip: "Loop Detection",
    //     listeners: {
    //       render: function (scope) {
    //         console.log(scope);
    //         // amfutil.ajaxRequest({
    //         //   url: "api/loop/"
    //         // })
    //       },
    //     },
    //     handler: function (grid, rowIndex, colIndex) {
    //       var rec = grid.getStore().getAt(rowIndex);
    //       alert("Edit " + rec.get("name"));
    //     },
    //   },
  },

  all_icons: [
    "addnewbtn",
    "searchpanelbtn",
    "clearfilter",
    "refreshbtn",
    "reprocess",
    "reroute",
    "export",
  ],

  from: null,

  mapping: {
    action: { label: "Action" },
    data: { label: "Message Data" },
    etime: { label: "Event Time" },
    fname: { label: "Message Name" },
    fpath: { label: "Message Path" },
    fsize: { label: "Message Size" },
    ftime: { label: "Message Time" },
    ktopic: { label: "Kafka Topic" },
    mailbox: { label: "Mailbox" },
    msgid: { label: "Message ID" },
    mtime: { label: "Mailbox Time" },
    parent: { label: "Parent" },
    recipient: { label: "Recipient" },
    rel: { label: "Relevance" },
    service: { label: "Service" },
    sid: { label: "Session ID" },
    status: { label: "Status" },
    subscriber: { label: "Subscriber" },
    topic: { label: "Topic" },
    user: { label: "User" },
    _id: { label: "Database ID" },
    index: { label: "Database Index" },
    method: { label: "Request Method" },
    request_path: { label: "Request Path" },
    route_path: { label: "Route Path" },
    stime: { label: "Status Time" },
    path_params: { label: "Path Params" },
  },

  getElementByID: function (itemid) {
    return Ext.ComponentQuery.query("#" + itemid)[0];
  },

  logout: function () {
    localStorage.clear();
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

  changePasswordAdmin: function (id) {
    var changePasswordWindow = new Ext.window.Window({
      title: "Change Password",
      modal: true,
      scrollable: true,
      resizable: false,
      width: 600,
      height: 250,
      layout: "fit",
      items: [
        {
          xtype: "form",
          defaults: {
            padding: 5,
            labelWidth: 140,
          },
          scrollable: true,
          items: [
            // {
            //   xtype: "textfield",
            //   name: "oldpassword",
            //   fieldLabel: "Old Password",
            //   inputType: "password",
            //   allowBlank: false,
            //   maskRe: /[^\^ ]/,
            //   //vtype: "passwordCheck",
            //   itemId: "oldpassword",
            //   enableKeyEvents: true,
            //   width: 550,
            //   listeners: {
            //     afterrender: function (cmp) {
            //       cmp.inputEl.set({
            //         autocomplete: "old-password",
            //       });
            //     },
            //     keypress: function (me, e) {
            //       var charCode = e.getCharCode();
            //       if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
            //         capslock_id =
            //           Ext.ComponentQuery.query("#user_capslock_id")[0];
            //         capslock_id.setHidden(false);
            //       } else {
            //         me.isValid();
            //         capslock_id =
            //           Ext.ComponentQuery.query("#user_capslock_id")[0];
            //         capslock_id.setHidden(true);
            //       }
            //     },
            //   },
            // },
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
              width: 550,
              listeners: {
                afterrender: function (cmp) {
                  cmp.inputEl.set({
                    autocomplete: "new-password",
                  });
                },
                keypress: function (me, e) {
                  var charCode = e.getCharCode();
                  if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                    capslock_id =
                      Ext.ComponentQuery.query("#user_capslock_id")[0];
                    capslock_id.setHidden(false);
                  } else {
                    me.isValid();
                    capslock_id =
                      Ext.ComponentQuery.query("#user_capslock_id")[0];
                    capslock_id.setHidden(true);
                  }
                },
                change: function (me, e) {
                  confPassword = amfutil
                    .getElementByID("confirmpwd")
                    .getValue();
                  password = me.value;
                  if (confPassword.length != 0) {
                    if (password != confPassword) {
                      //amfutil.getElementByID('confpasswd').focus();
                      var m = Ext.getCmp("confpasswd_id");
                      m.setActiveError("Passwords doesn't match");
                    } else {
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
              vtype: "ChangepasswordMatch",
              itemId: "confirmpwd",
              enableKeyEvents: true,
              width: 550,
              listeners: {
                keypress: function (me, e) {
                  var charCode = e.getCharCode();
                  if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                    capslock_id =
                      Ext.ComponentQuery.query("#user_capslock_id")[0];
                    capslock_id.setHidden(false);
                  } else {
                    me.isValid();
                    capslock_id =
                      Ext.ComponentQuery.query("#user_capslock_id")[0];
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
          ],

          buttons: [
            {
              text: "Change",
              formBind: true,
              handler: function () {
                var win = this.up("window");
                win.setLoading(true);
                password = amfutil.getElementByID("password").getValue();
                // oldpassword = amfutil.getElementByID("oldpassword").getValue();
                confirmpwd = amfutil.getElementByID("confirmpwd").getValue();
                // if (password == oldpassword) {
                //   win.setLoading(false);
                //   Ext.toast("Old password & new password con't same");
                // } else {
                console.log(id, password);
                amfutil.ajaxRequest({
                  url: "api/admin/changepassword/" + id,
                  method: "post",
                  jsonData: {
                    password: password,
                    // oldpassword: oldpassword,
                  },
                  success: function () {
                    changePasswordWindow.close();
                    Ext.toast("Password changed successfully");
                    //   grid.getStore().reload();
                  },
                  failure: function () {
                    win.setLoading(false);
                    Ext.toast("Change password failed");
                  },
                });
                // }
              },
            },
            {
              text: "Cancel",
              cls: "button_class",
              itemId: "cancel",
              listeners: {
                click: function (btn) {
                  changePasswordWindow.close();
                },
              },
            },
          ],
        },
      ],
    });
    changePasswordWindow.show();
  },

  check_redirect: function (scope) {
    var query = window.location.search.substring(1);
    var params = Ext.Object.fromQueryString(query);
    if (params.provider) {
      amfutil.providercallback(params, scope);
    }
  },

  convertNumbers: function (form, data) {
    form.getFields().items.forEach((field) => {
      if (field.xtype == "numberfield") {
        data[field.name] = parseInt(data[field.name]);
      }
    });
    return data;
  },

  onFailure: function (msg, response) {
    Ext.Msg.alert(
      msg,
      response.status == 403
        ? "You have insufficient permissions"
        : response.responseText
        ? response.responseText
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

  text: function (label, name, opts = {}) {
    return Object.assign(
      {
        xtype: "textfield",
        name: name,
        fieldLabel: label,
        allowBlank: false,
      },
      opts
    );
  },

  checkbox: function (label, name, value, opts) {
    return Object.assign(
      {
        xtype: "checkbox",
        inputValue: true,
        uncheckedValue: false,
        name: name,
        fieldLabel: label,
        value: value,
      },
      opts
    );
  },

  check: function (label, name, opts = {}) {
    return Object.assign(
      {
        xtype: "checkbox",
        inputValue: true,
        uncheckedValue: false,
        name: name,
        fieldLabel: label,
      },
      opts
    );
  },

  combo: function (label, name, store, val = null, disp = null, opts = {}) {
    return Object.assign(
      {
        xtype: "combobox",
        minChars: 1,
        triggerAction: "all",
        typeAhead: true,
        queryMode: "local",
        blankText: "Select One",

        name: name,
        fieldLabel: label,
        displayField: disp,
        valueField: val,
        store: {
          type: "chained",
          source: store,
        },
        allowBlank: false,
        forceSelection: true,
      },
      opts
    );
  },

  localCombo: function (
    label,
    name,
    store,
    val = null,
    disp = null,
    opts = {}
  ) {
    return Object.assign(
      {
        xtype: "combobox",
        minChars: 1,
        typeAhead: true,
        queryMode: "local",
        name: name,
        fieldLabel: label,
        displayField: disp,
        valueField: val,
        store: store,
        allowBlank: false,
      },
      opts
    );
  },

  typeFields: function (config) {
    return [
      {
        itemId: "types",
        xtype: "container",
        layout: {
          type: "vbox",
          align: "stretch",
        },
        items: [
          amfutil.localCombo(
            `${config.object} Type`,
            "type",
            Object.entries(config.types).map((entry) => entry[1]),
            "field",
            "label",
            {
              listeners: {
                beforerender: function (scope) {
                  var val = scope.getValue();
                  if (val) {
                    scope
                      .up("form")
                      .down("#type")
                      .setHtml(config.types[val].label);
                  }
                },
                change: function (scope, value) {
                  var form = scope.up("form");
                  var parms = form.down("#typeparms");
                  parms.removeAll();
                  var fields = amfutil.scanFields(config.types[value].fields);
                  console.log(fields);
                  parms.insert(0, fields);
                  var sel = scope.getSelection();
                  scope.up("form").down("#type").setHtml(sel.data.label);
                },
              },
            }
          ),
          {
            xtype: "container",
            layout: "center",
            padding: 10,
            style: {
              "font-weight": "600",
              "font-size": "1rem",
            },
            items: [
              {
                itemId: "type",
                xtype: "component",
                autoEl: "div",
                html: `Select ${config.object} Type`,
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
      },
    ];
  },

  channelHandlers: async function (channel) {
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
      amfutil.stores
        .filter((store) => store.config.collection == msg.page)
        .forEach((store) => store.store.reload());
      if (msg.page == Ext.util.History.getToken())
        Ext.toast({
          html: "This data has been updated",
          title: "Alert",
          autoCloseDelay: 5000,
        });
    });

    var user = await amfutil.fetch_user();
    console.log(user);

    channel.on(user.username, async (event) => {
      if (event["env"] == "reset") {
        amfutil.updateEnv();
      }
    });
    console.log(channel);
  },

  renderMainApp: function () {},

  broadcastEvent: async function (
    event,
    message,
    callback = (payload) => console.log(payload)
  ) {
    if (amfutil.socketPromise) {
      return;
    }
    if (event == "update") {
      amfutil.stores
        .filter((store) => store.config.collection == message.page)
        .forEach((store) => store.store.reload());
    }
    amfutil.channel
      .push(event, message, 10000)
      .receive("ok", (payload) => callback(payload))
      .receive("error", (err) => console.log("phoenix errored", err))
      .receive("timeout", async () => {
        await amfutil.updateChannel();
        console.log("timed out pushing");
      });
  },
  updateChannel: async function () {
    if (amfutil.socketPromise) {
      await amfutil.socketPromise;
    } else {
      amfutil.socketPromise = new Promise(function (resolve, reject) {
        if (amfutil.socket) {
          amfutil.socket.disconnect();
          delete amfutil.socket;
        }
        var token = localStorage.getItem("access_token");
        console.log(token);
        amfutil.socket = new window.pSocket("/socket", {
          params: { token: token },
        });
        amfutil.socket.connect();

        amfutil.socket.onError(async function (e) {
          console.log(e);

          amfutil.socket.disconnect();
          amfutil.socketPromise = null;

          await amfutil.renew_session();

          reject();
        });

        amfutil.socket.onOpen(async function () {
          var channel = amfutil.socket.channel("notifications");

          amfutil.channel = channel;

          amfutil.channelHandlers(channel);
          amfutil.socketPromise = null;
          resolve();
        });
      });
      await amfutil.socketPromise;
    }
  },

  reloadStores: function () {
    var stores = Ext.StoreManager.getRange();
    stores.forEach((store) => store.reload());
    amfutil.stores.forEach((store) => store.store.reload());
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

  fetch_user: async function () {
    var resp = await amfutil.ajaxRequest({
      url: "api/user/info",
    });
    return Ext.decode(resp.responseText);
  },

  updateEnv: async function () {
    var mask = new Ext.LoadMask({
      msg: "Changing Environment...",
      target: amfutil.getElementByID("main-viewport"),
    });
    mask.show();
    await amfutil.getElementByID("env").fireEvent("updateenv");
    amfutil.reloadStores();
    setTimeout(function () {
      mask.hide();
    }, 500);
    // mask.hide();
  },

  addToCollection: async function (
    collection,
    body,
    success = () => null,
    failure = () => null
  ) {
    var resp = await amfutil.ajaxRequest({
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      url: "api/" + collection,
      method: "POST",
      timeout: 60000,
      params: {},
      jsonData: body,
      success: function () {
        success();
        amfutil.broadcastEvent("update", {
          page: collection,
        });
      },
      failure: function () {
        failure();
      },
    });
    return Ext.decode(resp.responseText);
  },

  updateInCollection: function (collection, body, id, success, failure) {
    return amfutil.ajaxRequest({
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

  nameValidator(val) {
    var regex = new RegExp("(\\s|-)");
    // Check for white space
    if (regex.test(val)) {
      //alert();
      return "Names cannot contain spaces or hyphens.";
    }
  },

  nameLowerCaseValidator(val) {
    var regex = new RegExp("(\\s|-)");
    // Check for white space
    if (regex.test(val)) {
      //alert();
      return "Names cannot contain spaces or hyphens.";
    }

    var lower = new RegExp("^[a-z_]+$");

    if (!lower.test(val)) {
      return "Name can only contain lowercase letters and underscores.";
    }
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

  getAllHeaders: function () {
    var headers = {};
    Object.entries(ampsgrids.grids).forEach((grid) => {
      var h = amfutil.getHeaders(grid[0]);
      if (h) {
        headers[grid[0]] = h;
      }
    });
    return JSON.stringify(headers);
  },

  getHeaders: function (collection) {
    var config = ampsgrids.grids[collection]();
    return amfutil.getFromConfig(config);
  },

  getFromConfig: function (config) {
    var headers = [];
    if (config.fields) {
      amfutil.searchFields(config.fields, function (field) {
        if (field.name != null) {
          console.log(field.name);
          headers.push(field.name);
        }
        return field;
      });
      var types = {};

      if (config.types) {
        Object.entries(config.types).forEach((entry) => {
          var typeconfig = entry[1];
          var typeheaders = [];
          amfutil.searchFields(typeconfig.fields, function (field) {
            if (field.name != null) {
              console.log(field.name);
              typeheaders.push(field.name);
            }
            return field;
          });
          types[entry[0]] = amfutil.uniques(typeheaders);
        });
      }
      var subgrids = {};

      if (config.subgrids) {
        Object.entries(config.subgrids).forEach((s) => {
          var cf = s[1];
          if (!cf.grid) {
            amfutil.searchFields(cf.fields, function (field) {
              if (field.name != null) {
                console.log(field.name);
                headers.push(s[0] + "/" + field.name);
              }
              return field;
            });
          } else {
            subgrids[s[0]] = amfutil.getFromConfig(cf);
          }
        });
      }

      return {
        headers: amfutil.uniques(headers),
        types: Object.keys(types).length === 0 ? null : types,
        subgrids: Object.keys(subgrids).length === 0 ? null : subgrids,
      };
    }
  },

  uniques: function (arr) {
    var a = [];
    for (var i = 0, l = arr.length; i < l; i++)
      if (a.indexOf(arr[i]) === -1 && arr[i] !== "") a.push(arr[i]);
    return a;
  },

  getCollectionData: async function (collection, filters = {}) {
    var resp = await amfutil.ajaxRequest({
      url: "/api/store/" + collection,
      method: "GET",
      timeout: 60000,
      params: { params: JSON.stringify({ filters: filters ? filters : {} }) },
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

  onboardingColumn() {
    return {
      xtype: "widgetcolumn",
      selectable: false,
      focusable: false,
      cellFocusable: false,
      text: "Onboarding",
      widget: {
        xtype: "container",
        cls: "widgetbutton",
        loadUser: async function (user) {
          this.clearListeners();

          this.removeAll();
          this.insert({
            xtype: "container",
            flex: 1,
            layout: "center",
            items: [
              {
                xtype: "component",
                cls: "x-fa fa-spinner fa-pulse",
              },
            ],
          });
          var resp = await amfutil.ajaxRequest({
            url: `api/auth/${user.username}`,
          });
          var auths = Ext.decode(resp.responseText);
          this.getEl().clearListeners();
          this.getEl().on("click", function () {
            var win = new Ext.window.Window({
              title: `Onboarding Statuses for ${user.username}`,
              width: 600,
              height: 600,
              modal: true,
              layout: "fit",
              items: [
                {
                  xtype: "grid",
                  store: auths,

                  columns: [
                    {
                      text: "Provider",
                      dataIndex: "name",
                      flex: 1,
                    },
                    {
                      text: "Node",
                      dataIndex: "node",
                      flex: 1,
                    },
                    {
                      text: "Status",
                      dataIndex: "status",
                      flex: 1,
                      renderer: function (val) {
                        return val ? "Active" : "Inactive/Unavailable";
                      },
                    },
                  ],
                },
              ],
            });
            win.show();
            console.log(auths);
          });
          console.log(auths);
          this.removeAll();
          var color;
          var status = auths.reduce((acc, next) => {
            return acc && next.status;
          }, true);

          if (status) {
            color = "green";
          } else {
            if (auths.some((e) => e.status === true)) {
              color = "yellow";
            } else {
              color = "red";
            }
          }
          var items = [
            {
              xtype: "component",
              cls: `x-fa fa-info-circle`,
            },
            {
              xtype: "component",
              html: "View",
            },
            {
              xtype: "container",
              layout: "center",
              items: [
                {
                  xtype: "component",
                  html: `<div class="led ${color}"></div>`,
                },
              ],
            },
          ];
          this.insert(0, items);
        },
        layout: { type: "hbox", align: "stretch" },
        defaults: {
          padding: 5,
        },
      },

      onWidgetAttach: function (col, widget, rec) {
        console.log(rec.data.username);
        widget.loadUser(rec.data);
      },
    };
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
    } catch (e) {}
  },

  searchFields: function (fields, func) {
    fields = fields.map((field) => {
      field = amfutil.search(field, func);
      return field;
    });
    console.log(fields);
    return fields;
  },

  search: function (field, func) {
    console.log(field);

    field = func(field);
    console.log(field);
    if (field.items && field.items.length) {
      field.items = field.items.map((item) => {
        return amfutil.search(item, func);
      });
    }

    return field;
  },

  scanFields: function (fields) {
    fields = fields.map((field) => {
      field = amfutil.scan(field);
      return field;
    });
    return fields;
  },
  scan: function (field) {
    if (field.tooltip) {
      field = amfutil.tooltip(field);
    } else if (field.items && field.items.length) {
      field.items = field.items.map((item) => {
        return amfutil.scan(item);
      });
    }

    return field;
  },

  renderContainer: function (itemId, items, opts = {}) {
    return Object.assign(
      {
        hidden: true,
        disabled: true,
        xtype: "fieldcontainer",
        itemId: itemId,
        layout: {
          type: "vbox",
          align: "stretch",
        },
        items: items,
      },
      opts
    );
  },

  getMetadataFields: async function () {
    var rows = await amfutil.getCollectionData("fields");
    var mapping = amfutil.mapping;
    rows.forEach((row) => {
      mapping[row.field] = row.desc;
    });

    return mapping;
  },

  showFormattedText: function (val) {
    return new Ext.window.Window({
      title: `View`,
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
              html: val,
            },
          ],
        },
      ],
    });
  },

  reprocess: function (grid, msgid) {
    return amfutil.ajaxRequest({
      url: "api/msg/reprocess/" + msgid,
      method: "post",
      success: function () {
        grid.getStore().reload();
      },
    });
  },

  socketLoop: function (
    event,
    parms,
    callback,
    cond = function () {
      return true;
    },
    time = 1000
  ) {
    function broadcast(data) {
      amfutil.broadcastEvent(event, parms, (payload) => {
        callback(payload);
      });
    }

    var timer = setInterval(function () {
      if (cond()) {
        broadcast();
      } else {
        clearInterval(timer);
      }
    }, time);
    broadcast();
    return timer;
  },

  tooltip: function (field, opts) {
    return Object.assign(
      {
        xtype: "fieldcontainer",
        row: field.row,
        layout: {
          type: "hbox",
          align: "stretch",
        },
        items: [
          Ext.apply(field, {
            flex: 1,
          }),
          {
            xtype: "fieldcontainer",
            layout: "center",
            width: 20,
            maxHeight: 50,

            listeners: {
              afterrender: function (me) {
                // Register the new tip with an element's ID
                Ext.tip.QuickTipManager.register({
                  target: me.getId(), // Target button's ID
                  text: field.tooltip, // Tip content
                });
              },
              destroy: function (me) {
                Ext.tip.QuickTipManager.unregister(me.getId());
              },
            },
            items: [
              {
                xtype: "component",
                cls: "x-fa fa-info",
                itemId: "info-icon",
              },
            ],
          },
        ],
      },
      opts
    );
  },

  hexToRgb: function (hex) {
    hex = hex.trim();
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    console.log(result);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  },

  luminance: function (R8bit, G8bit, B8bit) {
    var RsRGB = R8bit / 255;
    var GsRGB = G8bit / 255;
    var BsRGB = B8bit / 255;

    var R =
      RsRGB <= 0.03928 ? RsRGB / 12.92 : Math.pow((RsRGB + 0.055) / 1.055, 2.4);
    var G =
      GsRGB <= 0.03928 ? GsRGB / 12.92 : Math.pow((GsRGB + 0.055) / 1.055, 2.4);
    var B =
      BsRGB <= 0.03928 ? BsRGB / 12.92 : Math.pow((BsRGB + 0.055) / 1.055, 2.4);

    // For the sRGB colorspace, the relative luminance of a color is defined as:
    var L = 0.2126 * R + 0.7152 * G + 0.0722 * B;

    return L;
  },

  loadKey: function (fieldLabel, name, opts) {
    return amfutil.dynamicCreate(
      amfutil.combo(
        fieldLabel,
        name,
        amfutil.createCollectionStore("keys", {}, { autoLoad: true }),
        "_id",
        "name",
        opts
      ),
      "keys"
    );
  },

  outputTopic: function () {
    return amfutil.dynamicCreate(
      amfutil.combo(
        "Output Topic",
        "output",
        amfutil.createCollectionStore("topics", {}, { autoLoad: true }),
        "topic",
        "topic",
        {
          tooltip: "The topic to which this message will be sent",
        }
      ),
      "topics"
    );
  },

  dynamicCreate: function (field, collection, opts = {}) {
    return Object.assign(
      {
        xtype: "fieldcontainer",
        dynamic: true,
        layout: {
          type: "hbox",
          align: "stretch",
        },
        tooltip: field.tooltip ? field.tooltip : null,
        flex: 1,
        items: [
          Ext.apply(field, {
            flex: 1,
            tooltip: field.tooltip ? null : field.tooltip,
          }),
          {
            xtype: "container",
            layout: "center",
            margin: { left: 5 },
            cls: "button",
            items: [
              {
                xtype: "button",
                iconCls: "x-fa fa-refresh",
                cls: "button_light",
                focusable: false,
                style: {
                  "font-size": "1rem",
                },
                handler: async function (btn) {
                  var config = ampsgrids.grids[collection]();
                  var cb = btn.up("fieldcontainer").down("combobox");
                  cb.getStore().source.reload();
                },
              },
            ],
          },
          {
            xtype: "container",
            layout: "center",
            cls: "button",
            margin: { left: 5 },

            items: [
              {
                xtype: "button",
                iconCls: "x-fa fa-plus",
                cls: "button_light",
                focusable: false,
                style: {
                  "font-size": "1rem",
                },
                handler: async function (btn) {
                  var config = ampsgrids.grids[collection]();
                  var cb = btn.up("fieldcontainer").down("combobox");
                  var win = Ext.create("Amps.form.add", config.window);
                  win.loadForm(
                    config.object,
                    config.fields,
                    (form, values) => {
                      if (config.add && config.add.process) {
                        values = config.add.process(form, values);
                      }
                      return values;
                    },
                    function (btn, values) {
                      var mask = new Ext.LoadMask({
                        msg: "Please wait...",
                        target: btn.up("addform"),
                      });
                      mask.show();
                      amfutil.ajaxRequest({
                        headers: {
                          Authorization: localStorage.getItem("access_token"),
                        },
                        url: "api/" + collection,
                        method: "POST",
                        timeout: 60000,
                        params: {},
                        jsonData: values,
                        success: function (response) {
                          var data = Ext.decode(response.responseText);
                          console.log(cb.getStore());

                          cb.getStore().source.reload();
                          mask.hide();
                          var item = btn.up("window").item;
                          btn.setDisabled(false);
                          console.log(data);
                          Ext.toast(`${item} created`);
                          amfutil.broadcastEvent("update", {
                            page: collection,
                          });
                          btn.up("window").close();
                        },
                        failure: function (response) {
                          mask.hide();
                          btn.setDisabled(false);
                          amfutil.onFailure("Failed to Create User", response);
                        },
                      });
                    }
                  );
                  win.show();
                },
              },
            ],
          },
        ],
      },
      opts
    );
  },

  dynamicRemove: function (field) {
    var r = field.items[0];
    r.tooltip = field.tooltip;
    return r;
  },

  formatFileName: function (opts = {}) {
    return {
      xtype: "fieldcontainer",
      layout: {
        type: "vbox",
        align: "stretch",
      },
      items: [
        Object.assign(
          {
            xtype: "textfield",
            name: "format",
            fieldLabel: "File Name Format",
            allowBlank: false,
            tooltip: "Specifies how to build the filename for the message.",
          },
          opts
        ),
        amfutil.infoBlock(
          "Any text in between {} will be replaced by corresponding metadata. If there was an original file name, it can be referenced via {fname}.<br> A timestamp may be generated using the following tokens. <br>{YYYY} - Four Digit Year | {YY} - Two Digit Year | {MM} - Month | {DD} - Day | {HH} - Hour | {mm} - Minute | {SS} - Second | {MS} - Millisecond"
        ),
      ],
    };
  },

  infoBlock(message) {
    return {
      xtype: "container",
      layout: "fit",
      padding: 5,
      items: [
        {
          xtype: "container",

          style: {
            background: "#5fa2dd",
            color: "white",
          },
          layout: {
            type: "hbox",
            align: "stretch",
          },
          items: [
            {
              xtype: "container",
              layout: "center",
              width: 35,
              items: [
                {
                  xtype: "component",
                  cls: "x-fa fa-info-circle",
                },
              ],
            },

            {
              xtype: "component",
              padding: 5,

              flex: 1,
              autoEl: "div",
              style: {
                "font-size": ".8rem",
                "font-weight": 400,
              },

              html: message,
            },
          ],
        },
      ],
    };
  },

  dateRenderer: function (val) {
    var date = new Date(val);
    var ms = date.getMilliseconds();
    var result = date.toLocaleString();
    var end = result.slice(-3);
    // const result = new Date(str).getTime();
    return result.slice(0, -3) + ":" + ms + end;
  },

  createHistoryStore: function (msgid, opts = {}) {
    return Ext.create(
      "Ext.data.Store",
      Object.assign(
        {
          pageSize: 10,

          proxy: {
            type: "rest",
            url: `/api/message_events/history/${msgid}`,
            headers: {
              Authorization: localStorage.getItem("access_token"),
            },

            // extraParams: { filters: JSON.stringify(filters) },
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
        },
        opts
      )
    );
  },

  createPageStore: function (collection, filters = {}, opts = {}, extra = {}) {
    var store = Ext.create(
      "Ext.data.Store",
      Object.assign(
        {
          storeId: "page",
          remoteSort: true,
          proxy: {
            type: "rest",
            url: `/api/${collection}`,
            headers: {
              Authorization: localStorage.getItem("access_token"),
            },
            extraParams: {
              params: JSON.stringify(
                Object.assign({ filters: filters }, extra)
              ),
            },
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

  compareOpts: function (x, y, val = true) {
    if (x && y) {
      Object.entries(x).forEach((entry) => {
        var v = entry[1];
        if (
          typeof entry[1] === "object" &&
          !Array.isArray(entry[1]) &&
          entry[1] !== null
        ) {
          val = amfutil.compareOpts(x[entry[0]], y[entry[0]], val);
        } else {
          val = val && y[entry[0]] == x[entry[0]];
        }
      });
      return val && Object.keys(x).length == Object.keys(y).length;
    } else {
      val = false;
    }

    return val;
  },

  scriptStore: function () {
    return {
      storeId: "script",
      proxy: {
        type: "ajax",
        url: "/api/scripts",
        headers: {
          Authorization: localStorage.getItem("access_token"),
        },
        reader: {
          type: "json",
        },
      },
      autoLoad: true,
    };
  },

  pyserviceStore: function () {
    return {
      storeId: "pyservice",
      proxy: {
        type: "ajax",
        url: "/api/pyservices",
        headers: {
          Authorization: localStorage.getItem("access_token"),
        },
        reader: {
          type: "json",
        },
      },
      autoLoad: true,
    };
  },

  createCollectionStore: function (
    collection,
    filters = {},
    opts = {},
    extra = {}
  ) {
    var check = amfutil.stores.find(
      (store) =>
        store.config.collection == collection &&
        amfutil.compareOpts(store.config.filters, filters) &&
        amfutil.compareOpts(store.config.opts, opts) &&
        amfutil.compareOpts(store.config.extra, extra)
    );
    if (check) {
      return check.store;
    } else {
      var store = Ext.create(
        "Ext.data.Store",
        Object.assign(
          {
            pageSize: 150,
            remoteSort: true,
            proxy: {
              type: "rest",
              url: `/api/store/${collection}`,
              headers: {
                Authorization: localStorage.getItem("access_token"),
              },

              extraParams: {
                params: JSON.stringify(
                  Object.assign({ filters: filters }, extra)
                ),
              },

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
      amfutil.stores.push({
        store: store,
        config: {
          collection: collection,
          filters: filters,
          opts: opts,
          extra: extra,
        },
      });
      return store;
    }
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

  renderListeners: function (render, ar, change) {
    return {
      afterrender: function (scope) {
        var val = scope.getValue();
        render(scope, val);
        if (ar) {
          ar(scope, val);
        }
      },
      change: function (scope, val) {
        render(scope, val);
        if (change) {
          change(scope, val);
        }
      },
    };
  },

  renew_session: async function () {
    // console.log(localStorage.getItem("renewing"));

    if (amfutil.renewPromise) {
      await amfutil.renewPromise;
    } else {
      // localStorage.setItem("renewing", "true");
      amfutil.renewPromise = new Promise(function (resolve, reject) {
        Ext.Ajax.request({
          url: "/api/session/renew",
          headers: {
            Authorization: localStorage.getItem("renewal_token"),
          },
          method: "POST",
          timeout: 30000,
          params: {},
          success: async function (response) {
            //console.log(response);
            var obj = Ext.decode(response.responseText);
            console.log(obj);
            if (obj.data) {
              var token = obj.data.access_token;
              localStorage.setItem("access_token", token);
              localStorage.setItem("renewal_token", obj.data.renewal_token);
              await amfutil.updateChannel();
              // localStorage.removeItem("renewing");
            } else {
              Ext.Msg.show({
                title: "Unauthorized or Expired Session",
                message:
                  "Your session has expired or is no longer authorized, you will be redirected to Login.",
              });
              amfutil.logout();
            }
            amfutil.renewPromise = null;

            resolve();
          },
          failure: function (response) {
            Ext.Msg.show({
              title: "Unauthorized or Expired Session",
              message:
                "Your session has expired or is no longer authorized, you will be redirected to Login.",
            });
            amfutil.logout();
            amfutil.renewPromise = null;

            reject();
          },
        });
      });
      await amfutil.renewPromise;
    }
  },

  redirect: function (token, opts) {
    this.redirectTo(token, opts);
  },

  hideButtons: function (arr) {
    for (i = 0; i < arr.length; i++) {
      amfutil.getElementByID(arr[i]).setHidden(true);
    }
  },

  duplicateValidation: function (config, check) {
    var obj = Object.assign(config, {
      validator: function (val) {
        // check(this, val);
        return this.validCheck;
      },
      validCheck: true,
      check: async function () {
        await check(this, this.getValue());
      },
      duplicate: true,
      listeners: amfutil.duplicateListeners(check),
    });
    return obj;
  },

  duplicateVal: function (config, getClauses, message, validator) {
    var check = async function (cmp, value) {
      var clauses = await getClauses(cmp, value);
      await amfutil.duplicateHandler(cmp, clauses, message, validator);
    };
    var obj = Object.assign(config, {
      validator: function (val) {
        // check(this, val);
        return this.validCheck;
      },
      validCheck: true,
      check: async function () {
        await check(this, this.getValue());
      },
      duplicate: true,
      listeners: amfutil.duplicateListeners(check),
    });
    return obj;
  },

  duplicateIdCheck: function (clauses, cmp) {
    var form = cmp.up("form");
    if (form.idcheck) {
      if (form.record && form.record._id) {
        clauses["bool"] = {
          must_not: {
            match: { _id: form.record._id },
          },
        };
      }
    }

    return clauses;
  },

  duplicateListeners: function (check, ar, change) {
    return {
      afterrender: async function (scope) {
        var val = scope.getValue();
        if (ar) {
          ar(scope, val);
        }
        check(scope, val);
      },
      change: async function (scope, val) {
        if (change) {
          change(scope, val);
        }
        check(scope, val);
      },
    };
  },

  customValidation: async function (cmp, value, custom, message, validator) {
    return new Promise(async (resolve, reject) => {
      var duplicate = await custom(value);

      if (duplicate) {
        // cmp.markInvalid(message);
        // cmp.setActiveError(message);

        // cmp.setValidation(message);
        cmp.validCheck = message;
        // cmp.isValid(false);
      } else {
        if (validator) {
          var invalid = validator(cmp.getValue());
          if (invalid) {
            // cmp.markInvalid(invalid);
            // cmp.setActiveError(invalid);

            // cmp.setValidation(invalid);
            cmp.validCheck = invalid;
          } else {
            // cmp.clearInvalid();
            // cmp.unsetActiveError();

            // cmp.setValidation();
            cmp.validCheck = true;
          }
        } else {
          // cmp.clearInvalid();
          // cmp.unsetActiveError();

          // cmp.setValidation();
          cmp.validCheck = true;
        }
      }

      cmp.validate();

      resolve();
    });
  },

  duplicateHandler: async function (cmp, value, message, validator) {
    return new Promise(async (resolve, reject) => {
      var duplicate = await amfutil.checkDuplicate(value);

      if (duplicate) {
        // cmp.markInvalid(message);
        // cmp.setActiveError(message);

        // cmp.setValidation(message);
        cmp.validCheck = message;
        // cmp.isValid(false);
      } else {
        if (validator) {
          var invalid = validator(cmp.getValue());
          if (invalid) {
            // cmp.markInvalid(invalid);
            // cmp.setActiveError(invalid);

            // cmp.setValidation(invalid);
            cmp.validCheck = invalid;
          } else {
            // cmp.clearInvalid();
            // cmp.unsetActiveError();

            // cmp.setValidation();
            cmp.validCheck = true;
          }
        } else {
          // cmp.clearInvalid();
          // cmp.unsetActiveError();

          // cmp.setValidation();
          cmp.validCheck = true;
        }
      }

      cmp.validate();

      resolve();
    });
  },

  processTypes: function (collection, form, values) {
    var config = ampsgrids.grids[collection]();
    if (config.types[values.type].process) {
      values = config.types[values.type].process(form, values);
    }

    values = amfutil.convertNumbers(form.getForm(), values);

    return values;
  },

  portHandler: async function (cmp, value) {
    var form = cmp.up("form");
    var id;
    if (form.idcheck) {
      if (form.record && form.record._id) {
        id = form.record._id;
      }
    }
    if (value) {
      var response = await amfutil.ajaxRequest({
        url: "/api/port/" + value,
        method: "POST",
        timeout: 60000,
        headers: {
          Authorization: localStorage.getItem("access_token"),
        },
        jsonData: id
          ? {
              id: id,
            }
          : {},
      });

      var inUse = Ext.decode(response.responseText);
      return inUse;
    } else {
      return false;
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
          if (response.status == 401) {
            await amfutil.renew_session();
            request.headers = {
              Authorization: localStorage.getItem("access_token"),
            };
            request.failure = failure;
            response = await Ext.Ajax.request(request);
            if (response.status < 200 || response.status > 299) {
            }
          } else {
            failure(response);
          }
          resolve(response);
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

  setGridStore: function (filters, config) {
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
          extraParams: {
            params: JSON.stringify({ filters: filters ? filters : {} }),
          },
          url: `/api/store/${route}`,
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
    console.log(config);

    if (config && config.sort) {
      var store = grid.getStore();

      amfutil.setStoreSort(store, config.sort);
    }
  },

  setStoreSort(store, sort) {
    Object.entries(sort).forEach((sort) => {
      store.sort(sort[0], sort[1]);
    });
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
    amfutil.setGridStore({}, ampsgrids.grids[Ext.util.History.getToken()]());

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
    console.log(route);
    console.log(ampsgrids.pages);
    console.log("show action icons");
    amfutil.hideAllButtons();
    if (Object.keys(ampsgrids.pages).indexOf(route) >= 0) {
      var page = ampsgrids.pages[route]();
      var pagebar = amfutil.getElementByID("actionbar").down("#page");
      pagebar.insert(0, page.actionIcons);
    } else {
      console.log(ampsgrids.grids[route]().actionIcons);
      amfutil.showButtons(ampsgrids.grids[route]().actionIcons);
    }

    //   amfutil.getElementByID("addnewbtn").componentname = "accounts";
  },

  showFieldIcons: function (collection, field) {
    console.log("show action icons");
    amfutil.hideAllButtons();
    var fieldMenu = amfutil.getElementByID("actionbar").down("#fieldactions");
    var items = ampsgrids.grids[collection]().subgrids[field].actionIcons;
    if (items) {
      fieldMenu.items.items.forEach((item) => {
        if (items.indexOf(item.itemId) >= 0) {
          console.log("showing");
          item.show();
        }
      });
      fieldMenu.show();
    }

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
    var page = ampsgrids.grids[route]();
    var items =
      page.subgrids[field].columns &&
      page.subgrids[field].columns.map((field) => {
        if (field.type) {
          if (field.searchOpts) {
            return filterTypes[field.type](field, field.searchOpts);
          } else {
            return filterTypes[field.type](field);
          }
        } else {
          return;
        }
      });

    return new Ext.form.Panel({
      defaults: {
        padding: 20,
        labelWidth: 140,
      },
      itemId: "searchform",
      scrollable: true,
      items: items,
      padding: 5,
      buttons: [
        {
          xtype: "button",
          text: "Apply Filter",
          itemId: "applyfilterufarule",
          handler: async function (btn) {
            var form = btn.up("form").getForm();
            // var dateval = btn.up("form").down("datefiltervalue");
            // console.log(dateval);
            var fields = form.getFields();
            var values = form.getValues();
            var config = ampsgrids.grids[route]().subgrids[field];
            console.log(config);
            if (config.store) {
              var filters = amfutil.getFilters(form, config.columns);
              console.log(filters);
              config.store(filters).then((store) => {
                grid.setStore(store);
              });
            } else {
              var fields = config.columns;
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
            }

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
    var page = ampsgrids.grids[route]();
    console.log(ampsgrids.grids[route]());
    var items =
      page.columns &&
      page.columns.map((field) => {
        if (field.type) {
          if (field.searchOpts) {
            return filterTypes[field.type](field, field.searchOpts);
          } else {
            return filterTypes[field.type](field);
          }
        } else {
          return;
        }
      });

    return new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
      },
      padding: 20,
      scrollable: true,

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
            var values = form.getValues();
            var fields = ampsgrids.grids[route]().columns;
            // var fieldKeys = fields.map((field) => field.field);
            console.log(fields);
            console.log(values);
            var filters = amfutil.getFilters(form, fields);
            console.log(filters);
            amfutil.setGridStore(filters, page);

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

  getFilters: function (form, fields) {
    var values = form.getValues();
    // var fieldKeys = fields.map((field) => field.field);
    console.log(fields);
    console.log(values);
    var filters = {};
    fields.forEach((field) => {
      console.log(field);
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
          filters[field.dataIndex] = JSON.parse(values[field.dataIndex]);
          console.log(filters);
        } else if (field.type == "combo" || field.type == "aggregate") {
          filters[field.dataIndex] = values[field.dataIndex];
        } else {
          filters[field.dataIndex] = { $in: values[field.dataIndex] };
        }
      }
    });
    return filters;
  },

  copyTextdata: function (e, extra = []) {
    var contextMenu = Ext.create("Ext.menu.Menu", {
      items: [
        {
          text: "Copy",
          iconCls: "x-fa fa fa-copy",
          handler: function () {
            var input = CLIPBOARD_CONTENTS;
            navigator.clipboard.writeText(input).then(function () {});
          },
        },
      ].concat(extra),
    });
    e.stopEvent();
    contextMenu.showAt(e.pageX, e.pageY);
  },

  renderFileSize: function fileSize(size, m, r) {
    if (size == null) {
      if (r.data.data) {
        size = new Blob([r.data.data]).size;
      } else {
        return "Not Applicable";
      }
    }
    var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1000));
    return (
      (size / Math.pow(1000, i)).toFixed(2) * 1 +
      " " +
      ["B", "kB", "MB", "GB", "TB"][i]
    );
  },

  capitalize: (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  consumerConfig: (topicbuilder, tooltip, msg = null) => {
    var tb = topicbuilder(function (scope, val) {
      var updated = this.up("fieldset").down("#updated");
      updated.update();
    });
    console.log(tb);
    return {
      xtype: "fieldset",
      title: "Consumer Config",
      layout: {
        type: "vbox",
        align: "stretch",
      },
      items: [
        amfutil.infoBlock(
          msg
            ? msg
            : 'Certain rules, actions, or services require the creation of a topic consumer which determines which subset of events to process. This block allows for the configuration of that subscriber and changing any of these values after creation will result in the creation of a new consumer. (i.e. If the consumer is configured with a Deliver Policy of "All" and 50 messages are consumed, updating the consumer config and leaving the delivery policy of "All" will result in the reprocessing of those messages.)'
        ),
        {
          xtype: "displayfield",
          name: "updated",
          itemId: "updated",
          fieldLabel: "Config Updated",
          renderer: function (val) {
            return val ? "True" : "False";
          },
          update: function () {
            this.setValue(true);
          },
          submitValue: true,
        },
        {
          xtype: "fieldcontainer",
          layout: {
            type: "vbox",
            align: "stretch",
          },
          items: tb,
        },
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
            listeners: amfutil.renderListeners(
              function (scope, val) {
                var conts = ["by_start_time"];

                conts.forEach((cont) => {
                  console.log(cont);
                  var c = scope.up("fieldset").down("#" + cont);
                  console.log(c);
                  c.setHidden(val != cont);
                  c.setDisabled(val != cont);
                });
              },
              null,
              function (scope) {
                var updated = scope.up("fieldset").down("#updated");
                updated.update();
              }
            ),
          }
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
              tooltip: 'The start time for the "Start Time" deliver policy',
              listeners: {
                change: function (scope, val) {
                  var updated = scope.up("fieldset").down("#updated");
                  updated.update();
                },
              },
            },
          ],
        },
      ],
    };
  },

  download: async function (url, method = "get", body = {}) {
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
    await fetch(url, {
      headers: {
        Authorization: localStorage.getItem("access_token"),
        "Content-Type": "application/json",
      },
      method: method,
      body: method.toLowerCase() == "get" ? null : JSON.stringify(body),
    })
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
                  console.log(progress);

                  msgbox.updateProgress(progress / size);
                  controller.enqueue(value);
                  return pump();
                });
              }
            },
          });
        } else {
          msgbox.close();
          Ext.MessageBox.alert("Error", "Failed to Download");
          throw new Error("Something went wrong");
        }
      })
      .then((stream) => new Response(stream))
      .then((response) => response.blob())
      .then((blob) => {
        console.log(blob);
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
