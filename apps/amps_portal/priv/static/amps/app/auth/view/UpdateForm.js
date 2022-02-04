Ext.define("Amps.form.update", {
  xtype: "updateform",
  extend: "Ext.form.Panel",
  layout: {
    type: "vbox",
    vertical: true,
    align: "stretch",
  },
  defaults: {
    labelWidth: 175,
  },
  bodyPadding: 20,
  //   height: 500,
  scrollable: true,

  back: () => {
    var page = Ext.util.History.getToken().split("/")[0];
    var count = amfutil.getElementByID("edit_container").items.length;
    if (count > 0) {
      amfutil.getElementByID("edit_container").items.items[0].destroy();
    }
    var pagePanel = amfutil.getElementByID("page-panel-id");
    pagePanel.setActiveItem(0);

    amfutil.redirect(page);
  },

  convertFields: function (fields) {
    return fields.map((field) => {
      var f = Object.assign({}, field);

      if (f.xtype == "radiogroup") {
        f.xtype = "displayfield";
        if (f.value) {
          f.value = f.value[f.name];
        }
      } else if (f.xtype == "button") {
        f.disabled = true;
      } else if (f.xtype == "displayfield") {
        f.displaying = true;
      } else {
        f.readOnly = true;
        f.forceSelection = false;
        if (f.items && f.items.length) {
          f.items = this.convertFields(f.items);
          // f.items =
        }
      }

      return f;
    });
  },

  setValue: async function (field) {
    var f = await Object.assign({}, field);
    // console.log(f);
    var config = this.config;
    var record = this.record;
    var scope = this;
    // console.log(f);
    f.value = record[f.name];

    if (f.xtype == "radiogroup") {
      f.value = {};
      f.value[f.name] = record[f.name];
    } else {
      if (f.items && f.items.length) {
        f.items = await Promise.all(
          f.items.map(async (item) => {
            return scope.setValue(item);
          })
        );
      }
    }

    return f;
  },

  setValues: async function (fields) {
    var scope = this;

    console.log(fields);
    fields = await Promise.all(
      fields.map(async function (field) {
        return scope.setValue(field);
      })
    );
    return fields;
  },

  update: async function () {
    var data;
    if (this.route) {
      data = await amfutil.getCurrentItem(this.route);
    } else {
      data = await amfutil.getCurrentItem();
    }
    console.log(data);
    if (this.config.transform) {
      data = this.config.transform(data);
    }
    this.record = data;
    this.edit();
  },
  edit: async function () {
    console.log("edit");
    var route = this.route;
    var scope = this;

    this.fields = await this.setValues(this.fields);

    console.log();
    var config = this.config;
    var record = this.record;
    console.log(record);
    var bcont = this.down("#buttoncont");

    this.removeAll();
    bcont.removeAll();
    console.log(bcont);
    var typefields;
    if (config.types) {
      typefields = await this.setValues(config.types[record.type].fields);
      console.log(this.fields);
      var idx = this.fields.findIndex((el) => el.name == "type");
      if (idx > -1) {
        this.fields[idx].xtype = "displayfield";
        this.fields[idx].submitValue = true;
      }
      console.log(idx);
    }
    if (this.editing) {
      console.log(this.fields);
      this.insert(0, this.fields);

      bcont.insert(0, [
        {
          text: "Update",
          itemId: "addaccount",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var values = form.getValues();
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: btn.up("updateform"),
              });
              mask.show();
              console.log(values);
              values = btn.up("form").process(btn.up("form"), values);
              console.log(values);
              values = amfutil.convertNumbers(form, values);
              console.log(values);
              var user = amfutil.get_user();
              console.log(scope);
              if (scope.audit) {
                values.modifiedby = user.firstname + " " + user.lastname;
                values.modified = new Date().toISOString();
              }

              route = scope.route ? route : Ext.util.History.getToken();

              console.log(route);
              console.log(values);
              if (route.split("/").length > 2) {
                values = Object.assign(scope.record, values);
              }

              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "/api/" + route,
                method: "PUT",
                timeout: 60000,
                params: {},
                jsonData: values,
                success: function (response) {
                  var route = Ext.util.History.getToken().split("/")[0];
                  var item = btn.up("form").item;
                  mask.hide();
                  Ext.toast(`${item} updated`);
                  //   amfutil.broadcastEvent("update", {
                  //     page: Ext.util.History.getToken().split("/")[0],
                  //   });
                  btn.up("form").update();
                },
                failure: function (response) {
                  mask.hide();
                  amfutil.getElementByID("addaccount").setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Update", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              btn.up("form").edit();
            },
          },
        },
      ]);
    } else {
      this.insert(0, this.convertFields(this.fields));
      bcont.insert(0, [
        {
          text: "Edit",
          listeners: {
            click: function (btn) {
              console.log("Click");
              btn.up("form").edit();
            },
          },
        },
      ]);
    }

    if (typefields) {
      console.log(typefields);
      typefields = amfutil.scanFields(typefields);
      this.down("#typeparms").setConfig({ defaults: this.defaults });
      if (this.editing) {
        this.down("#typeparms").insert(0, typefields);
      } else {
        this.down("#typeparms").insert(0, this.convertFields(typefields));
      }
      if (config.types[record.type].load) {
        config.types[record.type].load(this, record);
      }
    }
    this.editing = !this.editing;
  },
  loadForm: function (config, record, title, route = false, audit = true) {
    this.config = config;
    this.record = record;
    if (config.transform) {
      this.record = config.transform(record);
    }
    if (title) {
      this.title = "Update " + config.object;
    }

    this.route = route;

    if (audit) {
      this.audit = audit;
    }

    this.fields = config.fields;
    if (config.update && config.update.fields) {
      this.fields = this.fields.concat(config.update.fields);
    }
    var user = amfutil.get_user();

    if (this.audit) {
      this.fields = this.fields.concat([
        {
          xtype: "displayfield",
          fieldLabel: "Created By",
          submitValue: true,
          name: "createdby",
        },

        {
          xtype: "displayfield",
          fieldLabel: "Created on",
          submitValue: true,
          name: "created",
        },

        {
          xtype: "displayfield",
          fieldLabel: "Last Modified By",
          submitValue: true,
          name: "modifiedby",
        },

        {
          xtype: "displayfield",
          fieldLabel: "Modified on",
          submitValue: true,
          name: "modified",
        },
      ]);
    }

    this.fields = amfutil.scanFields(this.fields);

    console.log(this.fields);
    this.item = config.object;
    // this.subgrid = subgrid;
    if (config.update && config.update.process) {
      this.process = config.update.process;
    } else {
      this.process = (form, val) => val;
    }

    this.editing = false;
    // fields.forEach((field) => {
    this.edit();
    console.log(this.fields);
  },
  dockedItems: [
    {
      xtype: "toolbar",
      dock: "bottom",
      ui: "footer",
      itemId: "buttoncont",
      // defaults: {
      //   minWidth: 200,
      // },
    },
  ],
});
