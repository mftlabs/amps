Ext.define("Amps.util.Grids", {
  singleton: true,
  grids: {},
  pages: {},

  getGrids: function () {
    this.grids = {
      messages: {
        title: "Message Activity",
        actionIcons: ["searchpanelbtn", "clearfilter", "refreshbtn"],
        columns: [
          { text: "Message ID", dataIndex: "msgid", flex: 1, type: "text" },
          {
            text: "Account",
            dataIndex: "account",
            flex: 1,
            value: "true",
            type: "text",
          },
          {
            text: "Bucket",
            dataIndex: "bucket",
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
          { text: "Status Time", dataIndex: "stime", flex: 1, type: "date" },
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
      },
      customers: {
        title: "Customers",
        object: "Customer",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
        ],
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
      },
      users: {
        title: "Users",
        object: "User",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
        ],
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
          process: function (values, form) {
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
                      ampsgrids.grids["users"].subgrids["rules"].types[val]
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
              process: function (values, form) {
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
              process: function (values, form) {
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
      },
      actions: {
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
            process: function (values) {
              console.log(values);
              values.parms = amfutil.formatArrayField(values.parms);
              delete values.field;
              delete values.value;
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
                displayField: "desc",
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
            ],
          },
          zip: {
            field: "zip",
            label: "Zip",
            fields: [
              {
                xtype: "textfield",
                fieldLabel: "File Name Format",
                name: "file_format",
                allowBlank: false,

                // Arrange radio buttons into two columns, distributed vertically
              },
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
            process: function (values, form) {
              console.log(values);
              var rulecomp = form.down("formrules");
              var names = rulecomp.ruleNames;
              var rules = [];

              names.forEach((name) => {
                var topicname = name + "-topic";
                var patternname = name + "-patterns";
                console.log(values[patternname]);
                console.log(amfutil.formatMatchPatterns(values[patternname]));
                rules.push({
                  topic: values[topicname],
                  patterns: amfutil.formatMatchPatterns(values[patternname]),
                });
                delete values[topicname];
                delete values[patternname];
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
          change_delimiter: {
            field: "change_delimiter",
            label: "Change Delimeter",
            fields: [
              {
                fieldLabel: "Destination OS",
                xtype: "combobox",
                name: "os",
                valueField: "field",
                displayField: "label",
                store: [
                  {
                    field: "LF",
                    label: "Linux",
                  },
                  {
                    field: "CRLF",
                    label: "Windows",
                  },
                ],
                allowBlank: false,
              },
            ],
          },
          pgp_encrypt: {
            field: "pgp_encrypt",
            label: "PGP Encrypt",
            fields: [
              {
                xtype: "combobox",
                fieldLabel: "Partner Encryption Key",
                name: "partner_key",
                store: Ext.create("Amps.store.Key"),
                // listeners: {
                //   beforerender: async function (scope) {
                //     var store = await amfutil.createCollectionStore("keys");
                //     scope.setStore(store);
                //   },
                // },
                valueField: "name",
                displayField: "name",
                allowBlank: false,
              },
              {
                xtype: "checkbox",
                fieldLabel: "Compress",
                name: "compress",
                uncheckedValue: false,
                inputValue: true,
                allowBlank: false,
              },
              {
                xtype: "checkbox",
                fieldLabel: "Armor",
                name: "armor",
                uncheckedValue: false,
                inputValue: true,
                allowBlank: false,
              },
              {
                xtype: "combobox",
                fieldLabel: "Vault Signing Key",
                name: "signing_key",
                store: amfutil.createCollectionStore(
                  "keys",
                  {},
                  { autoLoad: true }
                ),
                valueField: "name",
                displayField: "name",
              },
            ],
          },
          pgp_decrypt: {
            field: "pgp_decrypt",
            label: "PGP Decrypt",
            fields: [
              {
                xtype: "combobox",
                fieldLabel: "Decrypt Key",
                name: "descrypt_key",
                store: amfutil.createCollectionStore(
                  "keys",
                  {},
                  { autoLoad: true }
                ),
                valueField: "name",
                displayField: "name",
                allowBlank: false,
              },
              {
                xtype: "combobox",
                fieldLabel: "Partner Signing Key",
                name: "partner_signing_key",
                store: amfutil.createCollectionStore(
                  "keys",
                  {},
                  { autoLoad: true }
                ),
                valueField: "name",
                displayField: "name",
                allowBlank: false,
              },
              {
                xtype: "checkbox",
                fieldLabel: "Verify",
                name: "verify",
                uncheckedValue: false,
                inputValue: true,
                allowBlank: false,
              },
            ],
          },
          http_api: {
            field: "http_api",
            label: "HTTP API",
            fields: [
              {
                xtype: "textfield",
                name: "url",
                fieldLabel: "URL",
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
              },
              {
                xtype: "textfield",
                name: "querystring",
                fieldLabel: "Query String",
              },
              {
                // Fieldset in Column 1 - collapsible via toggle button
                xtype: "fieldset",
                title: "Headers",
                itemId: "parms",
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
                xtype: "checkbox",
                uncheckedValue: false,
                inputValue: true,
                name: "oauth",
                fieldLabel: "OAuth",
                listeners: {
                  change: function (scope, val) {
                    console.log(scope);
                    console.log(val);
                    var form = scope.up("form");
                    var cont = form.down("#oauthcont");
                    console.log(cont);
                    var items = ["oauthurl", "oauthuser", "oauthpassword"];
                    items.forEach((item) => {
                      var field = form.down("#" + item);
                      field.setHidden(!val);
                      field.setDisabled(!val);
                    });
                  },
                },
              },
              {
                xtype: "textfield",
                name: "oauth_url",
                itemId: "oathurl",
                fieldLabel: "OAuth URL",
                hidden: true,
                disabled: true,
              },
              {
                xtype: "textfield",
                name: "oauth_user",
                itemId: "oauthuser",

                fieldLabel: "OAuth User",
                hidden: true,
                disabled: true,
              },
              {
                xtype: "textfield",
                name: "oauth_password",
                itemId: "oauthpassword",

                fieldLabel: "OAuth Password",
                hidden: true,
                disabled: true,
              },
            ],
            load: function (form, record) {
              amfutil.loadParms(form, record, "headers");
            },
            process: function (values) {
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
              },
              {
                xtype: "numberfield",
                name: "port",
                fieldLabel: "Port",
              },
              {
                xtype: "textfield",
                name: "folder",
                fieldLabel: "Folder",
              },
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
              {
                xtype: "combobox",
                name: "account",
                fieldLabel: "Account",
                displayField: "username",
                valueField: "username",
                store: amfutil.createCollectionStore(
                  "accounts",
                  {},
                  { autoLoad: true }
                ),
              },
            ],
          },
          sftpget: {
            field: "sftpget",
            label: "SFTP GET",
            fields: [
              {
                xtype: "textfield",
                name: "host",
                fieldLabel: "Host",
              },
              {
                xtype: "textfield",
                name: "port",
                fieldLabel: "Port",
              },
              {
                xtype: "textfield",
                name: "folder",
                fieldLabel: "Folder",
              },
              {
                xtype: "combobox",
                name: "account",
                fieldLabel: "Account",
                displayField: "username",
                valueField: "username",
                store: amfutil.getCollectionData("accounts"),
              },
              {
                xtype: "radiogroup",
                fieldLabel: "Acknowledgement Mode",
                itemId: "ackmode",
                allowBlank: false,
                columns: 3,
                width: 400,
                items: [
                  {
                    boxLabel: "Archive",
                    name: "ackmode",
                    inputValue: "archive",
                  },
                  {
                    boxLabel: "Delete",
                    name: "ackmode",
                    inputValue: "delete",
                    // checked: true,
                  },
                ],
                listeners: {
                  change: function (scope) {
                    var form = scope.up("form");
                    var archfolder = form.down("#archive-folder");
                    var mode = scope.getValue().ackmode;
                    if (mode == "archive") {
                      archfolder.setHidden(false);
                      archfolder.setDisabled(false);
                    } else {
                      archfolder.setHidden(true);
                      archfolder.setDisabled(true);
                    }
                  },
                },
              },
              {
                xtype: "textfield",
                hidden: true,
                disabled: true,
                itemId: "archive-folder",
                fieldLabel: "Archive Folder",
                name: "archive_folder",
              },
              {
                xtype: "textfield",
                name: "file_match_pattern",
                fieldLabel: "File Match Pattern",
              },
            ],
          },
          smtp: {
            field: "smtp",
            label: "SMTP",
            fields: [
              {
                xtype: "textfield",
                name: "url",
                fieldLabel: "URL",
              },
              {
                xtype: "textfield",
                name: "account",
                fieldLabel: "Account",
              },
              {
                xtype: "textfield",
                name: "password",
                fieldLabel: "Password",
              },
            ],
          },
          kafka_put: {
            field: "kafka_put",
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
                xtype: "textfield",
                fieldLabel: "Partition",
                name: "partition",
              },
            ],
          },
          kafka_get: {
            field: "kafka_get",
            label: "Kafka GET",
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
                xtype: "textfield",
                fieldLabel: "Partition",
                name: "partition",
              },
              {
                xtype: "textfield",
                fieldLabel: "Group",
                name: "group",
              },
              {
                // Fieldset in Column 1 - collapsible via toggle button
                xtype: "fieldset",
                title: "Parameters",
                itemId: "parms",
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
                    menu: {
                      items: [
                        {
                          text: "Boolean",

                          handler: function (button, event) {
                            var formpanel = button.up("fieldset");

                            formpanel.insert(
                              formpanel.items.length - 1,
                              Ext.create("Amps.form.Parm.Bool")
                            );
                          },
                        },
                        {
                          text: "String",

                          handler: function (button, event) {
                            var formpanel = button.up("fieldset");

                            formpanel.insert(
                              formpanel.items.length - 1,
                              Ext.create("Amps.form.Parm.String")
                            );
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
            load: function (form, record) {
              amfutil.loadParms(form, record, "parms");
            },
            process: function (values) {
              values.parms = amfutil.formatArrayField(values.parms);
              delete values.field;
              delete values.value;
              return values;
            },
          },
          s3_put: {
            field: "s3_put",
            label: "S3 PUT",
            fields: [
              {
                xtype: "textfield",
                name: "bucket",
                fieldLabel: "Bucket",
              },
              {
                xtype: "textfield",
                name: "region",
                fieldLabel: "Region",
              },
              {
                xtype: "textfield",
                name: "access_id",
                fieldLabel: "Access Id",
              },
              {
                xtype: "textfield",
                name: "access_key",
                fieldLabel: "Access Key",
              },
              {
                xtype: "combobox",
                name: "operation",
                fieldLabel: "Operation",
                valueField: "field",
                displayField: "label",
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
                listeners: {
                  change: function (scope, val) {
                    var pat = scope.up("form").down("#matchpattern");
                    if (val == "get") {
                      pat.setHidden(false);
                      pat.setDisabled(false);
                    } else {
                      pat.setHidden(true);
                      pat.setDisabled(true);
                    }
                  },
                },
              },
              {
                xtype: "textfield",
                name: "file_format",
                fieldLabel: "File Format",
              },
              {
                xtype: "textfield",
                itemId: "matchpattern",
                name: "file_match_pattern",
                hidden: true,
                disabled: true,
                fieldLabel: "File Match Pattern",
              },
              {
                xtype: "checkbox",
                name: "use_proxy",
                fieldLabel: "Use Proxy",
                uncheckedValue: false,
                inputValue: true,
                listeners: {
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
        },
        object: "Action",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
        ],
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
                    Object.entries(ampsgrids.grids.actions.types).map(
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
                  ampsgrids.grids.actions.types[value].fields
                );
              },
            },
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
        add: {
          process: function (values, form) {
            if (ampsgrids.grids.actions.types[values.type].process) {
              values = ampsgrids.grids.actions.types[values.type].process(
                values,
                form
              );
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
          process: (values, form) => {
            console.log(values);
            if (ampsgrids.grids.actions.types[values.type].process) {
              values = ampsgrids.grids.actions.types[values.type].process(
                values,
                form
              );
            }
            values = amfutil.convertNumbers(form.getForm(), values);

            return values;
          },
        },
        options: ["active", "delete"],
      },
      topics: {
        title: "Topics",
        object: "Topic",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
        ],
        fields: [
          {
            xtype: "textfield",
            name: "topic",
            fieldLabel: "Topic Subject",
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
          {
            xtype: "textfield",
            name: "desc",
            fieldLabel: "Topic Description",
            allowBlank: false,

            width: 400,
          },
        ],
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
            xtype: "textfield",
            name: "topic",
            fieldLabel: "Topic",
            allowBlank: false,
            listeners: {
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
      },
      queues: {
        title: "Queues",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
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
      },
      services: {
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
        },
        types: {
          httpd: {
            type: "httpd",
            name: "HTTP Server",
            iconCls: "x-fa fa-feed",
            fields: [
              {
                xtype: "textfield",
                name: "app",
                fieldLabel: "App",
                allowBlank: false,
              },
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
                name: "data",
                fieldLabel: "Server Cert",
                // hidden: true,
                // disabled: true,
              },
              {
                itemId: "key",
                row: true,
                xtype: "loadkey",
                name: "data",
                fieldLabel: "Server Key",
                // hidden: true,
                // disabled: true,
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
            fields: [
              {
                xtype: "textfield",
                name: "app",
                fieldLabel: "App",
                allowBlank: false,
              },
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
                uncheckedValue: false,
                name: "sync_register",
                fieldLabel: "Sync Register",
                allowBlank: false,
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
              values.dynamic = true;

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
        ],
      },
      admin: {
        title: "Admin Users",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
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
        options: ["approve"],
      },
      keys: {
        title: "Keys",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
        ],
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
          {
            xtype: "combobox",
            fieldLabel: "User",
            allowBlank: false,
            name: "user",
            displayField: "username",
            valueField: "username",
            store: amfutil.createCollectionStore(
              "accounts",
              {},
              { autoLoad: true }
            ),
          },
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
      },
    };
  },

  getPages: function () {
    this.pages = {
      monitoring: {
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
                        scope.down("#status").setHtml(
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
                        Ext.util.History.getToken().split("/")[0] ==
                        "monitoring"
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
      },
      wizard: {
        view: {
          xtype: "panel",
          title: "AMPS Wizard",
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

              itemId: "card-0",
              items: [
                {
                  html: `           <h1>AMPS Wizard</h1>
                    <hr style="height:1px;border:none;color:lightgray;background-color:lightgray;"><h4>Step 1 of 3: Define an action below.</h4>`,
                },
                {
                  xtype: "fieldcontainer",

                  listeners: {
                    beforerender: function (scope) {
                      scope.insert(0, ampsgrids.grids["actions"].fields);
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
                      scope.insert(0, ampsgrids.grids["topics"].fields);
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
                      var services = ampsgrids.grids["services"];
                      var fields = services.fields.concat(
                        services.types["subscriber"].fields
                      );

                      // console.log(action);
                      // console.log(topic);
                      scope.insert(
                        0,
                        fields.map((field) => {
                          if (field.name == "action" || field.name == "topic") {
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
                    action = ampsgrids.grids["actions"].add.process(
                      action,
                      actionform
                    );

                    var topic = topicform.getForm().getValues();
                    topic = amfutil.convertNumbers(topicform.getForm(), topic);

                    var subscriber = subscriberform.getForm().getValues();
                    subscriber = amfutil.convertNumbers(
                      subscriberform.getForm(),
                      subscriber
                    );

                    subscriber.type = "subscriber";
                    subscriber.active = true;

                    var wizard = scope.up("#wizard");

                    var actionid = await amfutil.addToCollection(
                      "actions",
                      action
                    );
                    console.log(actionid);
                    var topicid = await amfutil.addToCollection(
                      "topics",
                      topic
                    );
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
                  action.setValue(
                    actionform.down("textfield[name=name]").getValue()
                  );
                  topic.setValue(
                    topicform.down("textfield[name=topic]").getValue()
                  );
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
        },
      },
      defaults: {
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
                                msg = response.responseText.replace(
                                  /['"]+/g,
                                  ""
                                );
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
                              Authorization:
                                localStorage.getItem("access_token"),
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
                                  amfutil.onFailure(
                                    "Failed to Update",
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
      },
      subscribers: {
        title: "Subscribers",
        actionIcons: [
          "addnewbtn",
          "searchpanelbtn",
          "clearfilter",
          "refreshbtn",
        ],
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
              return (
                `<a href="${"#actions/" + value.id}">` + value.name + "</a>"
              );
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
      },
    };
  },
});
