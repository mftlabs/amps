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
                await amfutil.renew_session();
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

      var ufaConfig = {
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
      };

      var rulesConfig = {
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
                fieldLabel: "File Polling Interval(Sec)",
                maskRe: /[0-9]/,
                // vtype: "alphnumVtype",
                // vtypeText: "Please enter a valid file polling interval",
                itemId: "fpoll",
                value: "300",
              },
              // {
              //   xtype: "textfield",
              //   name: "fretry",
              //   fieldLabel: "Failure Retry Wait",
              //   maskRe: /[0-9]/,
              //   // vtypeText: "Please enter a valid Failure Retry Wait",
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
            window: { height: 300 },
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
                  amfutil.combo(
                    "Mailbox",
                    "mailbox",
                    amfutil.mailboxStore(),
                    "name",
                    "name",
                    {
                      listeners: {
                        beforerender: async function (scope) {
                          console.log("BEFORE");
                          console.log(scope.getStore());
                        },
                        change: async function (scope, val) {
                          var form = scope.up("form");
                          var user = await amfutil.userInfo();

                          if (val) {
                            var topic = scope
                              .up("fieldcontainer")
                              .down("#topic");
                            topic.setValue(
                              `amps.mailbox.${user["username"]}.${val}`
                            );
                          }
                        },
                      },
                    }
                  ),
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
          {
            xtype: "textfield",
            name: "name",
            fieldLabel: "Rule Name",
            allowBlank: false,
            listeners: {
              beforerender: async function (scope) {
                var tokens = Ext.util.History.getToken().split("/");
                var user = await amfutil.userInfo();
                scope.setListeners({
                  change: async function (cmp, value, oldValue, eOpts) {
                    await amfutil.duplicateHandler(
                      cmp,
                      { "rules.name": value },
                      "Agent Rule Already Exists",
                      amfutil.nameValidator
                    );
                  },
                });
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
                console.log(combo.up("window"));
                formfields.removeAll();

                formfields.insert(
                  0,
                  amfutil.scanFields(rulesConfig.types[val].fields)
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
            return values;
          },
        },
        update: {
          process: function (form, values) {
            console.log(values);
            values.subs_count = values.subs_count.toString();

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
            record.fmeta = JSON.parse(record.fmeta);
          }
          return record;
        },
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
              var win = Ext.create("Amps.form.add", rulesConfig.window);
              win.loadForm(
                rulesConfig.object,
                rulesConfig.fields,
                (form, values) => {
                  if (rulesConfig.add && rulesConfig.add.process) {
                    values = rulesConfig.add.process(form, values);
                  }
                  return values;
                },
                "rules",
                function () {
                  store.reload();
                }
              );
              win.show();
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
          layout: {
            type: "hbox",
            align: "stretch",
          },
          items: [
            {
              xtype: "container",
              layout: {
                type: "vbox",
                align: "stretch",
              },
              flex: 2,
              items: [
                {
                  xtype: "panel",
                  title: "Agent Download",
                  flex: 4,
                  layout: "fit",

                  items: [
                    {
                      xtype: "form",
                      padding: 20,
                      scrollable: true,
                      layout: {
                        type: "vbox",
                        align: "stretch",
                      },
                      items: [
                        {
                          xtype: "textfield",
                          itemId: "host",
                          name: "host",
                          fieldLabel: "Host",
                          allowBlank: false,
                          value:
                            window.location.protocol +
                            "//" +
                            window.location.host,
                        },
                        {
                          xtype: "combo",
                          allowBlank: false,
                          name: "os",
                          fieldLabel: "Operating System",
                          store: [
                            {
                              field: "linux",
                              label: "Linux",
                            },
                            {
                              field: "windows",
                              label: "Windows",
                            },
                            {
                              field: "darwin",
                              label: "macOS",
                            },
                          ],
                          displayField: "label",
                          valueField: "field",
                        },
                        {
                          xtype: "radiogroup",
                          fieldLabel: "Type",
                          allowBlank: false,
                          columns: 2,
                          items: [
                            {
                              boxLabel: "64-Bit",
                              inputValue: "64",
                              name: "arch",
                              checked: true,
                            },
                            {
                              boxLabel: "32-Bit",
                              name: "arch",
                              inputValue: "32",
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
                              xtype: "combobox",
                              fieldLabel: "Auth Token",
                              flex: 1,
                              name: "token",
                              allowBlank: false,
                              forceSelection: true,
                              store: {
                                proxy: {
                                  type: "rest",
                                  url: `/api/tokens/`,
                                  headers: {
                                    Authorization:
                                      localStorage.getItem("access_token"),
                                  },

                                  // extraParams: { filters: JSON.stringify(filters) },
                                  listeners: {
                                    load: function (data) {
                                      console.log(data);
                                    },
                                    exception: amfutil.refresh_on_failure,
                                  },
                                },
                                autoLoad: true,
                              },
                              valueField: "id",
                              displayField: "name",
                            },
                            {
                              xtype: "button",
                              margin: {
                                left: 5,
                              },
                              iconCls: "x-fa fa-plus",
                              handler: function () {
                                var tokensConfig = amfutil.config.tokens;
                                var win = Ext.create(
                                  "Amps.form.add",
                                  tokensConfig.window
                                );
                                win.loadForm(
                                  tokensConfig.object,
                                  tokensConfig.fields,
                                  (form, values) => {
                                    return values;
                                  },
                                  "tokens",
                                  () => {
                                    this.up()
                                      .down("combobox")
                                      .getStore()
                                      .reload();
                                  }
                                );
                                win.show();
                              },
                            },
                          ],
                        },

                        {
                          xtype: "container",
                          layout: "hbox",
                          margin: {
                            top: 10,
                          },

                          items: [
                            {
                              xtype: "button",
                              text: "Download",
                              itemId: "download",
                              flex: 1,
                              formBind: true,
                              listeners: {
                                click: async function (btn) {
                                  var form = btn.up("form").getForm();
                                  var values = form.getValues();

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
                                    "/api/ufa/agent?" +
                                      new URLSearchParams(values),
                                    {
                                      headers: {
                                        Authorization:
                                          localStorage.getItem("access_token"),
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
                                          if (
                                            entry[0] == "content-disposition"
                                          ) {
                                            filename =
                                              entry[1].match(
                                                /filename="(.+)"/
                                              )[1];
                                          }
                                        }
                                        console.log(size);

                                        console.log(response);
                                        const reader =
                                          response.body.getReader();
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
                                                  msgbox.updateProgress(
                                                    progress / size
                                                  );
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
                            },
                          ],
                        },
                      ],
                      buttons: [],
                    },
                  ],
                },
                {
                  xtype: "splitter",
                },
                {
                  xtype: "panel",
                  title: "Agent Config",
                  flex: 5,
                  layout: "fit",

                  tbar: [
                    {
                      xtype: "button",
                      iconCls: "x-fa fa-refresh",
                      handler: async function (scope) {
                        var panel = scope.up("panel");
                        panel.setLoading(true);
                        panel.removeAll();
                        var data = await amfutil.getCurrentItem("ufa/config");

                        var updateForm = Ext.create("Amps.form.update");
                        updateForm.loadForm(
                          ufaConfig,
                          data,
                          false,
                          "ufa/config",
                          false
                        );
                        panel.insert(updateForm);
                        panel.setLoading(false);
                      },
                    },
                  ],
                  listeners: {
                    beforerender: async function (scope) {
                      var data = await amfutil.getCurrentItem("ufa/config");

                      var updateForm = Ext.create("Amps.form.update");
                      updateForm.loadForm(
                        ufaConfig,
                        data,
                        false,
                        "ufa/config",
                        false
                      );
                      scope.insert(updateForm);
                    },
                  },
                },
              ],
            },
            {
              xtype: "grid",
              title: "Agent Rules",
              store: store,
              listeners: {
                rowdblclick: async function (grid, record) {
                  var record = record.data;

                  rulesConfig.store = store;
                  var user = await amfutil.userInfo();
                  var updateForm = Ext.create("Amps.form.update", {
                    entity: user,
                  });
                  updateForm.loadForm(
                    rulesConfig,
                    record,
                    false,
                    `rules/${record._id}`
                  );
                  var win = new Ext.window.Window({
                    modal: true,
                    minWidth: 500,
                    width: 600,
                    minHeight: 600,
                    height: 600,
                    title: "Update Agent Rule",
                    // maxHeight: 600,
                    scrollable: true,
                    // resizable: false,
                    layout: "fit",
                    items: [updateForm],
                  });
                  win.show();
                },
              },

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
                    { field: "upload", fieldLabel: "Upload" },
                    { field: "download", fieldLabel: "Download" },
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
                  xtype: "actioncolumn",
                  text: "Action",
                  items: [
                    {
                      iconCls: "x-fa fa-trash",
                      handler: async function (grid, rowIndex, colIndex) {
                        console.log(rowIndex);
                        var rule = grid.getStore().getAt(rowIndex).data;
                        console.log(rule);
                        Ext.Msg.confirm(
                          "Confirm Rule Deletion",
                          "Delete this rule?",
                          function (btn) {
                            if (btn == "yes") {
                              console.log("yes");
                              amfutil.ajaxRequest({
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
              ],
              flex: 3,
            },
          ],
        },
      };
    },
    inbox: function () {
      var store = Ext.create("Ext.data.Store", {
        remoteSort: true,
        sorters: [
          {
            property: "mtime",
            direction: "DESC",
          },
        ],
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
            // exception: async function (proxy, response, options, eOpts) {
            //   console.log("exception");
            //   if (response.status == 401) {
            //     await amfutil.renew_session();
            //     proxy.setHeaders({
            //       Authorization: localStorage.getItem("access_token"),
            //     });
            //     store.reload();
            //   }
            // },
          },
        },
        autoLoad: true,
      });
      return {
        actionbar: [
          amfutil.searchbtn("main-grid"),
          {
            xtype: "button",
            iconCls: "x-fa fa-refresh",
            handler: function () {
              store.reload();
            },
          },
          {
            xtype: "button",
            itemId: "clearfilter",
            html: '<img src="resources/images/clear-filters.png" />',
            handler: "onClearFilter",
            tooltip: "Clear Filter",
            style: "cursor:pointer;",
          },
        ],
        view: {
          xtype: "grid",
          title: "Inbox",
          store: store,
          itemId: "main-grid",
          columns: [
            {
              text: "Mailbox",
              dataIndex: "mailbox",
              type: "tag",
              searchOpts: {
                store: {
                  proxy: {
                    type: "ajax",
                    url: "api/mailboxes",
                    headers: {
                      Authorization: localStorage.getItem("access_token"),
                    },
                  },
                  autoLoad: true,
                },
                displayField: "name",
                valueField: "name",
              },
            },
            {
              text: "Message ID",
              dataIndex: "msgid",
              type: "text",
              flex: 1,
            },
            {
              text: "File Name",
              dataIndex: "fname",
              type: "text",
              flex: 1,
            },
            {
              text: "File Size",
              dataIndex: "fsize",
              flex: 1,
              renderer: amfutil.renderFileSize,
              type: "fileSize",
            },
            {
              text: "Mailbox Time",
              dataIndex: "mtime",
              flex: 1,
              type: "date",
            },
            {
              text: "Status",
              dataIndex: "status",
              flex: 1,
              type: "text",
            },
            {
              xtype: "actioncolumn",
              text: "Actions",
              dataIndex: "actions",
              cellFocusable: false,
              width: 175,
              items: [
                {
                  xtype: "button",
                  iconCls: "x-fa fa-download",
                  handler: async function (grid, rowIndex, colIndex) {
                    console.log(rowIndex);
                    var msg = grid.getStore().getAt(rowIndex).data;

                    var pbar = new Ext.Progress();

                    var msgbox = Ext.MessageBox.show({
                      title: "Please wait",
                      msg: "Downloading...",
                      progressText: "Downloading...",
                      width: 300,
                      progress: true,
                      closable: false,
                    });
                    await amfutil.renew_session();
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
                            "Failed to Download Message"
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
                  handler: async function (grid, rowIndex, colIndex) {
                    console.log(rowIndex);
                    var msg = grid.getStore().getAt(rowIndex).data;

                    Ext.Msg.confirm(
                      "Confirm Message Deletion",
                      "Are you sure you want to delete this message?",
                      function (btn) {
                        if (btn == "yes") {
                          console.log("yes");
                          amfutil.ajaxRequest({
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
          ],
          bbar: {
            xtype: "pagingtoolbar",
            displayInfo: true,
          },
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
        },
      };
    },
    mailboxes: function () {
      var config = amfutil.config.mailboxes;
      var store = Ext.create("Ext.data.Store", {
        remoteSort: true,
        proxy: {
          type: "rest",
          url: `/api/mailboxes`,
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
            // exception: async function (proxy, response, options, eOpts) {
            //   console.log("exception");
            //   if (response.status == 401) {
            //     await amfutil.renew_session();
            //     proxy.setHeaders({
            //       Authorization: localStorage.getItem("access_token"),
            //     });
            //     store.reload();
            //   }
            // },
          },
        },
        autoLoad: true,
      });
      return {
        actionbar: [
          amfutil.addbtn(config, store, "mailboxes"),
          // amfutil.searchbtn("main-grid"),
          {
            xtype: "button",
            iconCls: "x-fa fa-refresh",
            handler: function () {
              store.reload();
            },
          },
          // {
          //   xtype: "button",
          //   itemId: "clearfilter",
          //   html: '<img src="resources/images/clear-filters.png" />',
          //   handler: "onClearFilter",
          //   tooltip: "Clear Filter",
          //   style: "cursor:pointer;",
          // },
        ],
        view: {
          xtype: "grid",
          title: config.title,
          store: store,
          itemId: "main-grid",
          columns: config.columns,
          bbar: {
            xtype: "pagingtoolbar",
            displayInfo: true,
          },
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
            rowdblclick: amfutil.updateHandler(config),
          },
        },
      };
    },

    user: async function () {
      var user = await amfutil.userInfo();
      var config = {
        object: "User",
        fields: [
          {
            xtype: "displayfield",
            name: "username",
            fieldLabel: "User Name",
            allowBlank: false,
            submitValue: true,
          },
          {
            xtype: "displayfield",
            name: "email",
            submitValue: true,
            fieldLabel: "Email",
            allowBlank: false,
          },
          {
            xtype: "textfield",
            name: "firstname",
            allowBlank: false,

            fieldLabel: "First Name",
          },
          {
            xtype: "textfield",
            name: "lastname",
            allowBlank: false,

            fieldLabel: "Last Name",
          },
          {
            xtype: "textfield",
            name: "phone",
            fieldLabel: "Phone",
            allowBlank: false,
          },
        ],
      };

      var updateForm = Ext.create("Amps.form.update");
      updateForm.loadForm(config, user, false, "user", false);

      var tokensConfig = amfutil.config.tokens;

      var store = Ext.create("Ext.data.Store", {
        proxy: {
          type: "rest",
          url: `/api/tokens/`,
          headers: {
            Authorization: localStorage.getItem("access_token"),
          },

          // extraParams: { filters: JSON.stringify(filters) },
          listeners: {
            load: function (data) {
              console.log(data);
            },
            exception: amfutil.refresh_on_failure,
          },
        },
        autoLoad: true,
      });

      return {
        view: {
          xtype: "tabpanel",
          layout: "fit",
          items: [
            {
              title: "Info",
              iconCls: "x-fa fa-user",
              layout: "fit",
              items: [updateForm],
            },
            {
              title: "Reset Password",
              iconCls: "x-fa fa-key",
              items: [
                {
                  xtype: "container",
                  padding: 25,
                  width: 325,
                  items: [
                    {
                      xtype: "form",
                      layout: "vbox",
                      // layout: "fit",
                      items: [
                        {
                          xtype: "textfield",
                          name: "password",
                          itemId: "pass",
                          inputType: "password",
                          fieldLabel: "Password",
                          maskRe: /[^\^ ]/,
                          allowBlank: false,
                          enableKeyEvents: true,
                          validators: {
                            fn: function (pass) {
                              var confirm = this.up("form").down("#confirm");
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
                              if (
                                !e.shiftKey &&
                                charCode >= 65 &&
                                charCode <= 90
                              ) {
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
                          fieldLabel: "Confirm Password",
                          allowBlank: false,
                          enableKeyEvents: true,
                          validators: {
                            fn: function (confirm) {
                              var pass = this.up("form").down("#pass");
                              var val = pass.getValue();

                              return confirm === val || "Passwords don't match";
                            },
                          },
                          fieldLabelStyle: "white-space: nowrap;",
                          listeners: {
                            keypress: function (me, e) {
                              var charCode = e.getCharCode();
                              if (
                                !e.shiftKey &&
                                charCode >= 65 &&
                                charCode <= 90
                              ) {
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
                          itemId: "signup_id",
                          handler: function (btn) {
                            var form = btn.up("form");
                            var token = form.token;
                            var values = form.getValues();
                            delete values.confirm;
                            amfutil.ajaxRequest({
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
            {
              title: "Auth Tokens",
              xtype: "grid",
              iconCls: "x-fa fa-lock",
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
              lbar: [
                {
                  iconCls: "x-fa fa-plus",
                  handler: function () {
                    var win = Ext.create("Amps.form.add", tokensConfig.window);
                    win.loadForm(
                      tokensConfig.object,
                      tokensConfig.fields,
                      (form, values) => {
                        return values;
                      },
                      "tokens",
                      function () {
                        store.reload();
                      }
                    );
                    win.show();
                  },
                },
                {
                  iconCls: "x-fa fa-refresh",
                  handler: function () {
                    store.reload();
                  },
                },
              ],
              store: store,
              columns: [
                {
                  dataIndex: "name",
                  text: "Name",
                  flex: 1,
                },
                {
                  dataIndex: "id",
                  text: "Id",
                  flex: 1,
                },
                {
                  xtype: "actioncolumn",

                  items: [
                    {
                      iconCls: "x-fa fa-key actionicon",
                      handler: async function (grid, rowIndex, colIndex) {
                        console.log(rowIndex);
                        var rec = grid.getStore().getAt(rowIndex).data;
                        this.up("grid").setLoading(true);
                        amfutil.ajaxRequest({
                          url: `/api/tokens/secret/${rec._id}`,
                          success: (resp) => {
                            var secret = Ext.decode(resp.responseText);
                            amfutil.copyToClipboard(secret);
                            this.up("grid").setLoading(false);
                          },
                          failure: () => {
                            Ext.toast("Could not fetch token secret");
                            this.up("grid").setLoading(false);
                          },
                        });
                      },
                    },
                    amfutil.deleteAction(
                      "Confirm Token Deletion",
                      "Delete this token?",
                      "tokens",
                      store
                    ),
                  ],
                },
              ],
            },
          ],
        },
      };
    },

    ufa_logs: function () {
      var store = Ext.create("Ext.data.Store", {
        remoteSort: true,
        proxy: {
          type: "rest",
          url: `/api/ufa_logs`,
          headers: {
            Authorization: localStorage.getItem("access_token"),
          },
          extraParams: {},
          reader: {
            type: "json",
            rootProperty: "rows",
            totalProperty: "count",
          },
          listeners: {
            load: function (data) {
              console.log(data);
            },
            // exception: async function (proxy, response, options, eOpts) {
            //   console.log("exception");
            //   if (response.status == 401) {
            //     await amfutil.renew_session();
            //     proxy.setHeaders({
            //       Authorization: localStorage.getItem("access_token"),
            //     });
            //     store.reload();
            //   }
            // },
          },
        },
        autoLoad: true,
      });

      store.sort("etime", "DESC");

      console.log(store);

      return {
        sorters: [{ property: "etime", direction: "DESC" }],
        actionbar: [
          amfutil.searchbtn("main-grid"),
          {
            xtype: "button",
            iconCls: "x-fa fa-refresh",
            handler: function () {
              console.log(store);
              store.reload();
            },
          },
          {
            xtype: "button",
            itemId: "clearfilter",
            html: '<img src="resources/images/clear-filters.png" />',
            handler: "onClearFilter",
            tooltip: "Clear Filter",
            style: "cursor:pointer;",
          },
        ],
        view: {
          xtype: "grid",
          itemId: "main-grid",
          title: "UFA Logs",

          store: store,

          columns: [
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
              type: "text",
            },
          ],
          bbar: {
            xtype: "pagingtoolbar",
            displayInfo: true,
          },
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
        },
      };
    },
  },
});
