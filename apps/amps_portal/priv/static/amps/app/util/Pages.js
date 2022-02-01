Ext.define("Amps.Pages", {
  singleton: true,
  pages: {
    ufa: function () {
      var store = Ext.create("Ext.data.Store", {
        remoteSort: true,
        proxy: {
          type: "rest",
          url: `/api/rules`,
          headers: {
            Authorization: localStorage.getItem("access_token"),
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
            exception: async function (proxy, response, options, eOpts) {
              console.log("exception");
              if (response.status == 401) {
                await ampsutil.renew_session();
                proxy.setHeaders({
                  Authorization: localStorage.getItem("access_token"),
                });
                store.reload();
              }
            },
          },
        },
        autoLoad: true,
      });

      var config = {
        window: { width: 600, height: 600 },
        object: "Agent Rule",
        types: {
          upload: {
            type: "download",
            name: "Download",
            fields: [
              {
                xtype: "textfield",
                name: "fpoll",
                label: "File Polling Interval(Sec)",
                maskRe: /[0-9]/,
                vtype: "alphnumVtype",
                vtypeText: "Please enter a valid file polling interval",
                itemId: "fpoll",
                value: "300",
              },
              {
                xtype: "textfield",
                name: "fretry",
                label: "Failure Retry Wait",
                maskRe: /[0-9]/,
                vtypeText: "Please enter a valid Failure Retry Wait",
                itemId: "fretry",
                value: "5",
              },
              {
                xtype: "checkboxfield",
                name: "regex",
                itemId: "regex",
                label: "Regex Flag",
                uncheckedValue: false,
                inputValue: true,
                allowBlank: false,
                forceSelection: true,
              },
              {
                xtype: "textfield",
                itemId: "fmatch",
                name: "fmatch",
                label: "File Match Pattern",
              },
              {
                xtype: "textfield",
                name: "format",
                label: "Upload Format",
                itemId: "bpath",
              },
              {
                xtype: "parmfield",
                title: "File Metadata",
                types: ["string"],
                name: "fmeta",
              },
              {
                xtype: "fieldcontainer",
                label: "Acknowledgment Mode",
                // itemId: "ackmode",
                allowBlank: false,
                layout: "vbox",
                // name: "ackmode",
                defaults: {
                  margin: 5,
                },
                items: [
                  {
                    xtype: "radiofield",
                    flex: 1,
                    label: "None",
                    value: "none",
                    name: "ackmode",
                    // checked: true,
                  },
                  {
                    flex: 1,

                    xtype: "radiofield",
                    label: "Archive",
                    name: "ackmode",
                    value: "archive",
                  },
                  {
                    flex: 1,

                    xtype: "radiofield",
                    label: "Delete",
                    name: "ackmode",
                    value: "delete",
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
                label: "File Polling Interval(Sec)",
                allowBlank: false,
                value: "300",
              },
              {
                xtype: "textfield",
                name: "bretry",
                itemId: "bretry",
                label: "Get Failure Retry Wait",
                value: "5",
              },
              {
                xtype: "combobox",
                name: "bucket",
                itemId: "bucket",
                label: "Bucket Name",
                allowBlank: false,
                forceSelection: true,
              },
              {
                xtype: "textfield",
                name: "prefix",
                itemId: "prefix",
                label: "Bucket Path Prefix",
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
                label: "Download Folder Name",
                allowBlank: false,
              },
              {
                xtype: "radiogroup",
                label: "Acknowledgment Mode",
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
            label: "Rule Name",
            allowBlank: false,
            listeners: {
              change: async function (cmp, value, oldValue, eOpts) {
                await ampsutil.duplicateHandler(
                  cmp,
                  { users: { "rules.name": value } },
                  "Agent Rule Already Exists",
                  ampsutil.nameValidator
                );
              },
            },
          },

          {
            name: "type",
            label: "Rule Type",
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

                formfields.insert(0, config.types[val].fields);
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
              label: "Folder Name",
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
        },
        transform: function (record) {
          console.log(record);
          if (record.fmeta) {
            record.fmeta = JSON.parse(record.fmeta);
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
      };

      return {
        actionbar: [
          // {
          //   xtype: "button",
          //   iconCls: "x-fa fa-search",
          //   handler: function () {
          //     store.rexload();
          //   },
          // },
          {
            xtype: "button",
            iconCls: "x-fa fa-plus",
            handler: function () {
              ampsutil.createForm(config);
              store.reload();
            },
          },
          {
            xtype: "button",
            iconCls: "x-fa fa-refresh",
            handler: function () {
              store.reload();
            },
          },
        ],
        view: {
          xtype: "container",
          layout: "hbox",
          items: [
            {
              xtype: "container",
              layout: "vbox",
              flex: 1,
              items: [
                {
                  xtype: "panel",
                  title: "Agent",
                  flex: 1,
                },
                {
                  xtype: "panel",
                  title: "Agent Config",
                  flex: 2,
                },
              ],
            },
            {
              xtype: "grid",
              title: "Agent Rules",
              store: store,

              // add: {
              //   process: function (form, values) {
              //     console.log(values);
              //     var rule = {};
              //     if (values.type == "upload") {
              //       var fmeta = {};
              //       console.log(values.fmeta);
              //       rule.fmeta = JSON.stringify(
              //         amfutil.formatArrayField(values.fmeta)
              //       );

              //       rule["name"] = values.name;
              //       rule["type"] = values.type;
              //       rule["fpoll"] = values.fpoll;
              //       rule["fretry"] = values.fretry;
              //       rule["regex"] = values.regex;
              //       rule["fmatch"] = values.fmatch;
              //       rule["bucket"] = values.bucket;
              //       rule["bpath"] = values.bpath;
              //       rule["ackmode"] = values.ackmode;
              //       rule.active = true;
              //     } else {
              //       rule = {
              //         name: values.name,
              //         type: values.type,
              //         fpoll: values.fpoll,
              //         bretry: values.bretry,
              //         bucket: values.bucket,
              //         prefix: values.prefix.length
              //           ? values.prefix.slice(-1) == "/"
              //             ? values.prefix
              //             : values.prefix + "/"
              //           : values.prefix,
              //         folder: values.folder,
              //         ackmode: values.ackmode,
              //         active: true,
              //       };
              //     }
              //     return rule;
              //   },
              // },
              // update: {
              //   process: function (form, values) {
              //     console.log(values);
              //     var rule = {};
              //     if (values.type == "upload") {
              //       var fmeta = {};
              //       console.log(values.fmeta);
              //       rule.fmeta = JSON.stringify(
              //         amfutil.formatArrayField(values.fmeta)
              //       );

              //       rule["name"] = values.name;
              //       rule["type"] = values.type;
              //       rule["fpoll"] = values.fpoll;
              //       rule["fretry"] = values.fretry;
              //       rule["regex"] = values.regex;
              //       rule["fmatch"] = values.fmatch;
              //       rule["bucket"] = values.bucket;
              //       rule["bpath"] = values.bpath;
              //       rule["ackmode"] = values.ackmode;
              //       rule.active = true;
              //     } else {
              //       rule = {
              //         name: values.name,
              //         type: values.type,
              //         fpoll: values.fpoll,
              //         bretry: values.bretry,
              //         bucket: values.bucket,
              //         prefix: values.prefix.length
              //           ? values.prefix.slice(-1) == "/"
              //             ? values.prefix
              //             : values.prefix + "/"
              //           : values.prefix,
              //         folder: values.folder,
              //         ackmode: values.ackmode,
              //         active: true,
              //       };
              //     }
              //     return rule;
              //   },
              // },

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
                {
                  cell: {
                    xtype: "widgetcell",
                    widget: {
                      xtype: "container",

                      items: [
                        {
                          xtype: "button",
                          iconCls: "x-fa fa-trash",
                          handler: async function (scope, val) {
                            console.log(scope);
                            console.log(val);
                            var widget = scope.up("widgetcell");
                            console.log(widget);
                            var rule = widget._record.data;
                            Ext.Msg.confirm(
                              "Confirm Rule Deletion",
                              "Delete this rule?",
                              function (btn) {
                                if (btn == "yes") {
                                  console.log("yes");
                                  ampsutil.ajaxRequest({
                                    url: "api/rules/" + rule._id,
                                    method: "delete",
                                    success: function () {
                                      store.reload();
                                    },
                                  });
                                }
                              }
                            );
                          },
                        },
                      ],
                    },
                    // Start file download.
                  },

                  // tpl: '<div class="x-fa fa-trash"></div>',
                  // width: 20,
                },
              ],
              flex: 2,
            },
          ],
        },
      };
    },
    inbox: function () {
      var store = Ext.create("Ext.data.Store", {
        remoteSort: true,
        proxy: {
          type: "rest",
          url: `/api/inbox`,
          headers: {
            Authorization: localStorage.getItem("access_token"),
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
            exception: async function (proxy, response, options, eOpts) {
              console.log("exception");
              if (response.status == 401) {
                await ampsutil.renew_session();
                proxy.setHeaders({
                  Authorization: localStorage.getItem("access_token"),
                });
                store.reload();
              }
            },
          },
        },
        autoLoad: true,
      });

      store.sort("mtime", "DESC");

      console.log(store);

      return {
        actionbar: [
          // {
          //   xtype: "button",
          //   iconCls: "x-fa fa-search",
          //   handler: function () {
          //     store.reload();
          //   },
          // },
          {
            xtype: "button",
            iconCls: "x-fa fa-refresh",
            handler: function () {
              store.reload();
            },
          },
        ],
        view: {
          xtype: "grid",

          title: "Inbox",

          store: store,

          columns: [
            {
              text: "File Name",
              dataIndex: "fname",
              flex: 1,
            },
            {
              text: "File Size",
              dataIndex: "fsize",
              flex: 1,
              renderer: ampsutil.renderFileSize,
            },
            {
              text: "Mailbox Time",
              dataIndex: "mtime",
              flex: 1,
            },
            {
              text: "Status",
              dataIndex: "status",
              flex: 1,
            },
            {
              cell: {
                xtype: "widgetcell",
                widget: {
                  xtype: "container",

                  items: [
                    {
                      xtype: "button",
                      iconCls: "x-fa fa-download",
                      handler: async function (scope, val) {
                        console.log(scope);
                        console.log(val);
                        var widget = scope.up("widgetcell");
                        console.log(widget);
                        var msg = widget._record.data;

                        var pbar = new Ext.Progress();

                        var msgbox = new Ext.MessageBox();
                        msgbox.show({
                          title: "Downloading...",
                          items: [pbar],
                          width: 300,
                          closable: false,
                        });
                        await ampsutil.renew_session();
                        await fetch("/api/msg/" + msg.msgid, {
                          headers: {
                            Authorization: localStorage.getItem("access_token"),
                          },
                        })
                          .then(async (response) => {
                            if (response.ok) {
                              var progress = 0;
                              var size;
                              for (let entry of response.headers.entries()) {
                                if (entry[0] == "content-length") {
                                  size = entry[1];
                                }
                              }
                              filename = msg.fname;
                              console.log(size);

                              console.log(response);
                              const reader = response.body.getReader();
                              return new ReadableStream({
                                start(controller) {
                                  return pump();
                                  function pump() {
                                    return reader
                                      .read()
                                      .then(({ done, value }) => {
                                        // When no more data needs to be consumed, close the stream
                                        if (done) {
                                          controller.close();
                                          return;
                                        }
                                        // Enqueue the next data chunk into our target stream
                                        progress += value.length;
                                        pbar.setValue(progress / size);
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
                    {
                      xtype: "button",
                      iconCls: "x-fa fa-trash",
                      handler: async function (scope, val) {
                        console.log(scope);
                        console.log(val);
                        var widget = scope.up("widgetcell");
                        console.log(widget);
                        var msg = widget._record.data;
                        Ext.Msg.confirm(
                          "Confirm Message Deletion",
                          "Are you sure you want to delete this message?",
                          function (btn) {
                            if (btn == "yes") {
                              console.log("yes");
                              ampsutil.ajaxRequest({
                                url: "api/msg/" + msg.msgid,
                                method: "delete",
                                success: function () {
                                  store.reload();
                                },
                              });
                            }
                          }
                        );
                      },
                    },
                  ],
                },
                // Start file download.
              },

              // tpl: '<div class="x-fa fa-trash"></div>',
              // width: 20,
            },
          ],
          plugins: [
            {
              type: "pagingtoolbar",
            },
          ],
        },
      };
    },

    user: async function () {
      var user = await ampsutil.userInfo();
      var fields = [
        {
          xtype: "textfield",
          flex: 1,
          name: "username",
          label: "User Name",
        },
        {
          xtype: "textfield",
          flex: 1,
          name: "firstname",

          label: "First Name",
        },
        {
          xtype: "textfield",
          flex: 1,
          name: "lastname",

          label: "Last Name",
        },
        {
          xtype: "textfield",
          flex: 1,
          name: "phone",
          label: "Phone",
        },
        {
          xtype: "textfield",
          flex: 1,
          name: "email",
          label: "Email",
        },
      ];
      return {
        view: {
          xtype: "tabpanel",
          items: [
            {
              title: "Info",
              iconCls: "x-fa fa-user",
              layout: "fit",
              items: [
                {
                  xtype: "updateform",
                  config: {
                    fields: fields,
                    object: "User Info",
                  },
                  record: user,
                },
              ],
            },
            {
              title: "Reset Password",
              iconCls: "x-fa fa-key",
              layout: "fit",
              items: [
                {
                  xtype: "formpanel",
                  items: [
                    {
                      xtype: "textfield",
                      name: "password",
                      itemId: "pass",
                      inputType: "password",
                      label: "Password",
                      maskRe: /[^\^ ]/,
                      allowBlank: false,
                      enableKeyEvents: true,
                      validators: {
                        fn: function (pass) {
                          var confirm = this.up("formpanel").down("#confirm");
                          var val = confirm.getValue();
                          confirm.validate();
                          return true;
                        },
                      },
                      listeners: {
                        afterrender: function (cmp) {
                          cmp.inputEl.set({
                            autocomplete: "new-password",
                          });
                        },
                        keypress: function (me, e) {
                          var charCode = e.getCharCode();
                          if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                            capslock_id = Ext.ComponentQuery.query(
                              "#signup_capslock_id"
                            )[0];
                            capslock_id.setHidden(false);
                          } else {
                            me.isValid();
                            capslock_id = Ext.ComponentQuery.query(
                              "#signup_capslock_id"
                            )[0];
                            capslock_id.setHidden(true);
                          }
                        },
                      },
                    },
                    {
                      xtype: "textfield",
                      name: "confirm",
                      itemId: "confirm",
                      inputType: "password",
                      maskRe: /[^\^ ]/,
                      label: "Confirm Password",
                      allowBlank: false,
                      enableKeyEvents: true,
                      validators: {
                        fn: function (confirm) {
                          var pass = this.up("formpanel").down("#pass");
                          var val = pass.getValue();

                          return confirm === val || "Passwords don't match";
                        },
                      },
                      labelStyle: "white-space: nowrap;",
                      listeners: {
                        keypress: function (me, e) {
                          var charCode = e.getCharCode();
                          if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                            capslock_id = Ext.ComponentQuery.query(
                              "#signup_capslock_id"
                            )[0];
                            capslock_id.setHidden(false);
                          } else {
                            me.isValid();
                            capslock_id = Ext.ComponentQuery.query(
                              "#signup_capslock_id"
                            )[0];
                            capslock_id.setHidden(true);
                          }
                        },
                      },
                    },
                    {
                      html: '<p style="color:red;font-weight:600;"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Caps lock is on</p>',
                      itemId: "signup_capslock_id",
                      hidden: true,
                    },
                  ],
                  buttons: [
                    {
                      text: "Update Password",
                      formBind: true,
                      cls: "button_class",
                      itemId: "signup_id",
                      handler: function (btn) {
                        var form = btn.up("formpanel");
                        var token = form.token;
                        var values = form.getValues();
                        delete values.confirm;
                        ampsutil.ajaxRequest({
                          method: "PUT",
                          url: "api/user",
                          jsonData: values,
                          success: function () {
                            Ext.toast("Password Updated");
                            form.reset();
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
      };
    },
  },
});
