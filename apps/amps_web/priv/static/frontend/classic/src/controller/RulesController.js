Ext.define("Amps.controller.RulesController", {
  extend: "Ext.app.ViewController",
  alias: "controller.rules",
  // requires: [
  //   "Amps.view.messages.MessageDetails",
  //   // "MftDashboard.view.trackntrace.SessionLogs",
  // ],

  onAddNewButtonClicked: function (btn) {
    this.addRule(btn);
  },

  addRule: function (btn) {
    grid = amfutil.getElementByID("bucket-rules");
    scope = btn.lookupController();
    route = Ext.util.History.currentToken;
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Name",
          forceSelection: true,
          listeners: {
            afterrender: function (field) {
              field.focus();
            },
            onchange: function () {},
          },
        },
        {
          xtype: "checkbox",
          name: "active",
          fieldLabel: "Active",
          value: true,
          uncheckedValue: false,
          inputValue: true,
          allowBlank: false,
          forceSelection: true,
          listeners: {
            afterrender: function (field) {
              field.focus();
            },
            onchange: function () {},
          },
        },
        {
          xtype: "checkbox",
          name: "ediflag",
          fieldLabel: "Parse EDI Data",
          uncheckedValue: false,
          inputValue: true,
          allowBlank: false,
          forceSelection: true,
          listeners: {
            afterrender: function (field) {
              field.focus();
            },
            onchange: function () {},
          },
        },
        {
          xtype: "checkbox",
          name: "scanflag",
          fieldLabel: "Perform Antivirus Scan",
          uncheckedValue: false,
          inputValue: true,
          allowBlank: false,
          forceSelection: true,
        },
        {
          xtype: "combobox",
          name: "action",
          fieldLabel: "Action",
          queryMode: "local",
          store: Ext.create("Ext.data.Store", {
            fields: ["value", "label"],
            data: [
              { value: "mailbox", label: "Mailbox" },
              { value: "hold", label: "Hold" },
            ],
          }),
          displayField: "label",
          valueField: "value",
          listeners: {
            select: async function (combo, record, eOpts) {
              var container = this.up().query("#actioncond")[0];
              if (record.data.value == "hold") {
                container.removeAll();
                container.insert({
                  xtype: "combobox",
                  fieldLabel: "Status",
                  name: "status",
                  store: [
                    { value: "received", label: "Received" },
                    { value: "held", label: "Held" },
                    { value: "warning", label: "Warning" },
                    { value: "failed", label: "Failed" },
                  ],
                  valueField: "value",
                  displayField: "label",
                });
                container.insert({
                  xtype: "textfield",
                  fieldLabel: "Reason",
                  name: "reason",
                });
              } else if (record.data.value == "mailbox") {
                var buckets = await amfutil.getBuckets();
                buckets = buckets.map((bucket) => bucket.name);
                console.log("mailbox");
                container.removeAll();
                container.insert({
                  xtype: "combobox",
                  fieldLabel: "Bucket",
                  name: "bucket",
                  store: buckets,
                });
                container.insert({
                  xtype: "textfield",
                  fieldLabel: "Prefix",
                  name: "prefix",
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
                });
              }
              console.log();
            },
          },
          allowBlank: false,
          forceSelection: true,
        },
        {
          xtype: "fieldcontainer",
          itemId: "actioncond",
        },
        {
          // Fieldset in Column 1 - collapsible via toggle button
          xtype: "fieldset",
          title: "Match Patterns",
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
                var formpanel = button.up();

                formpanel.insert(
                  formpanel.items.length - 1,
                  Ext.create("Amps.form.Matchpattern")
                );
              },
            },
          ],
        },
        {
          // Fieldset in Column 1 - collapsible via toggle button
          xtype: "fieldset",
          title: "Default Metadata",
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
                var formpanel = button.up();

                formpanel.insert(
                  formpanel.items.length - 1,
                  Ext.create("Amps.form.Defaults")
                );
              },
            },
          ],
        },
      ],
      buttons: [
        {
          text: "Save",
          itemId: "add",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var fields = form.getFields();
              var values = form.getValues();
              var rule = { parms: {} };
              console.log(values);
              rule.ediflag = values.ediflag;
              rule.scanflag = values.scanflag;
              rule.action = values.action;
              rule.name = values.name;

              rule.active = values.active;

              console.log(values.prefix.length);

              switch (rule.action) {
                case "hold":
                  rule.parms.status = values.status;
                  rule.parms.reason = values.reason;
                  break;
                case "mailbox":
                  rule.parms.mailbox = values.bucket;
                  rule.parms.prefix = values.prefix.length
                    ? values.prefix.slice(-1) == "/"
                      ? values.prefix
                      : values.prefix + "/"
                    : values.prefix;

                  break;
                default:
                  console.log(`Invalid Action`);
              }
              var patterns = values.patterns
                ? Array.isArray(values.patterns)
                  ? values.patterns.map((pattern) => {
                      return JSON.parse(pattern);
                    })
                  : [JSON.parse(values.patterns)]
                : [];
              rule.patterns = {};

              patterns.forEach((pattern) => {
                console.log(pattern);
                rule.patterns[pattern.field] = {
                  value: pattern.pattern,
                  regex: pattern.regex,
                };
              });

              var defaults = values.defaults
                ? Array.isArray(values.defaults)
                  ? values.defaults.map((defaultobj) => {
                      return JSON.parse(defaultobj);
                    })
                  : [JSON.parse(values.defaults)]
                : [];
              rule.defaults = {};

              defaults.forEach((def) => {
                rule.defaults[def.field] = def.value;
              });

              console.log(rule);
              // page_size = grid.store.pageSize;
              // btn.setDisabled(true);
              var route = Ext.util.History.getToken();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/" + route,
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: rule,
                success: function (response) {
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  console.log(data);
                  var rules = data.rules.map((rule) =>
                    Object.assign(rule, rule.parms)
                  );

                  grid.getStore().loadData(rules);

                  Ext.toast("Rule Created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("bucket-rules");
                  win.close();
                },
                failure: function (response) {
                  btn.setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Create Rule", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "rule_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Rule",
      modal: true,
      width: 550,
      height: 500,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  onSearchPanel: function (btn) {
    var treenav = Ext.ComponentQuery.query("#treenavigation")[0];
    treenav.setSelection(0);
    console.log(btn.iconCls);

    var window = amfutil.getElementByID("searchwindow");

    window.loadForm("rules", "rules", amfutil.getElementByID("bucket-rules"));

    console.log(this);
    // window.show();
    if (!window.isVisible()) {
      btn.setIconCls("x-fa fa-angle-double-right");
      window.show();
      window.setPosition(
        amfutil.getElementByID("center-main").getBox().width -
          window.getSize().width,
        0
      );
      console.log("showing");

      /*if(currentNode== '0'){
                      MftDashboard.util.Utilities.loadMessageActivity();
                  }
                  if(currentNode== '1'){
                      MftDashboard.util.Utilities.loadSessionActivity();
                  }*/
    } else {
      // elem2 = Ext.ComponentQuery.query("#searchpanel")[0];
      // elem2.setHidden(true);
      btn.setIconCls("x-fa fa-search");
      window.hide();
      console.log("hiding");
    }
  },
  onRefreshButtonClicked: async function () {
    console.log("refresh");
    var resp = await amfutil.getItemField();
    var data = Ext.decode(resp.responseText);
    var rules = data.rules.map((rule) => Object.assign(rule, rule.parms));
    var grid = amfutil.getElementByID("bucket-rules");
    grid.getStore().reload();
  },

  onClearFilter: async function () {
    var grid = amfutil.getElementByID("bucket-rules");
    grid.getStore().clearFilter();
  },
});
