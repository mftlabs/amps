Ext.define("Amps.Authorized.Update", {
  extend: "Ext.form.Panel",
  xtype: "updateform",
  layout: {
    type: "vbox",
    vertical: true,
    // align: "stretch",
  },
  defaults: {
    labelWidth: 175,
  },
  scrollable: true,

  convertFields: function (fields) {
    return fields.map((field) => {
      var f = Object.assign({}, field);

      if (["textfield", "numberfield", "combobox"].indexOf(f.xtype) > -1) {
        f.xtype = "displayfield";
      } else if (f.xtype == "radiogroup") {
        console.log(f);
        f.xtype = "displayfield";
        console.log(f);
        f.value = f.value[f.name];
      } else {
        f.readOnly = true;
      }
      return f;
    });
  },

  setValues: async function () {
    var config = this.config;
    var record = this.record;
    this.fields = this.fields.map((field) => {
      var f = Object.assign({}, field);
      f.value = record[f.name];
      if (f.xtype == "radiogroup") {
        f.value = {};
        f.value[f.name] = record[f.name];
      }
      return f;
    });
    console.log(this.fields);
  },

  update: async function () {
    console.log("Update");
    var data = await ampsutil.getCurrentItem();
    console.log(data);
    this.record = data;
    this.edit();
  },
  edit: function () {
    console.log("edit");
    this.setValues();

    console.log();
    var config = this.config;
    var record = this.record;
    console.log(record);
    var bcont = this.down("#buttoncont");
    console.log(bcont);
    this.removeAll();
    bcont.removeAll();

    var typefields;
    if (config.types) {
      typefields = config.types[record.type].fields.map((field) => {
        var f = Object.assign({}, field);
        console.log(this.record, f.name);
        console.log(this.record[f.name]);
        f.value = this.record[f.name];
        if (f.xtype == "radiogroup") {
          f.value = {};
          f.value[f.name] = record[f.name];
        }
        console.log(f);
        return f;
      });
      console.log(this.fields);
      var idx = this.fields.findIndex((el) => el.name == "type");
      if (idx > -1) {
        this.fields[idx].xtype = "displayfield";
        this.fields[idx].submitValue = true;
      }
      console.log(idx);
    }
    if (this.editing) {
      this.insert(0, this.fields);

      bcont.insert(0, [
        {
          text: "Update",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          handler: function (btn) {
            var form = btn.up("formpanel");
            var values = form.getValues();
            console.log(values);
            var scope = this;
            var mask = new Ext.LoadMask({
              msg: "Please wait...",
              target: btn.up("formpanel"),
            });
            mask.show();

            values = ampsutil.convertNumbers(form, values);

            values = btn.up("formpanel").process(values, btn.up("formpanel"));

            ampsutil.ajaxRequest({
              headers: {
                Authorization: localStorage.getItem("access_token"),
              },
              url: "/api/" + Ext.util.History.getToken(),
              method: "PUT",
              timeout: 60000,
              params: {},
              jsonData: values,
              success: function (response) {
                var route = Ext.util.History.getToken().split("/")[0];
                var item = btn.up("formpanel").item;
                mask.hide();
                Ext.toast(`${item} updated`);
                // ampsutil.broadcastEvent("update", {
                //   page: Ext.util.History.getToken().split("/")[0],
                // });
                //   ampsutil.getElementByID("pagelist").show();
                // ampsutil.showActionIcons(route);
                // if (!form.subgrid) {
                //   form.back();
                // }
                btn.up("formpanel").update();
              },
              failure: function (response) {
                mask.hide();
                ampsutil.getElementByID("addaccount").setDisabled(false);
                msg = response.responseText.replace(/['"]+/g, "");
                // ampsutil.onFailure("Failed to Update", response);
              },
            });
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          handler: function (btn) {
            btn.up("formpanel").edit();
          },
        },
      ]);
    } else {
      this.insert(0, this.convertFields(this.fields));
      bcont.insert(0, [
        {
          text: "Edit",
          cls: "button_class",
          handler: function (btn) {
            console.log("Click");
            btn.up("formpanel").edit();
          },
        },
      ]);
    }

    if (typefields) {
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
  constructor: function (args) {
    this.callParent(args);
    this.config = args["config"];
    this.record = args["record"];
    var config = this.config;
    var record = this.record;
    this.fields = config.fields;
    if (config.update && config.update.fields) {
      this.fields = this.fields.concat(config.update.fields);
    }
    this.item = config.object;
    // this.subgrid = subgrid;
    if (config.update && config.update.process) {
      this.process = config.update.process;
    } else {
      this.process = (val) => val;
    }

    this.editing = false;
    // fields.forEach((field) => {
    this.edit();
    console.log(this.fields);
  },
  items: [
    {
      xtype: "toolbar",
      itemId: "buttoncont",
      docked: "bottom",
      items: [],
    },
  ],
});
