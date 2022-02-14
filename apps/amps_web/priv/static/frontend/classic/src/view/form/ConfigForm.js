Ext.define("Amps.form.config", {
  xtype: "configform",
  extend: "Ext.form.Panel",
  layout: {
    type: "vbox",
    vertical: true,
    align: "stretch",
  },
  defaults: {
    labelWidth: 175,
  },
  resizable: true,
  bodyPadding: 25,
  height: 500,
  scrollable: true,
  getInvalidFields: function () {
    var invalidFields = [];
    Ext.suspendLayouts();
    this.form.getFields().filterBy(function (field) {
      if (field.validate()) return;
      invalidFields.push(field);
    });
    Ext.resumeLayouts(true);
    return invalidFields;
  },

  setValue: async function (field) {
    var f = await Object.assign({}, field);
    var config = this.config;
    var record = this.record;
    var scope = this;
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

    fields = await Promise.all(
      fields.map(async function (field) {
        return scope.setValue(field);
      })
    );
    return fields;
  },

  load: async function (resolve) {
    var route = this.route;
    var scope = this;

    this.fields = await this.setValues(this.fields);

    var config = this.config;
    var record = this.record;
    var typefields;
    this.insert(0, this.fields);

    try {
      if (config.types) {
        typefields = await this.setValues(config.types[record.type].fields);
      }

      if (typefields) {
        typefields = amfutil.scanFields(typefields);
        this.down("#typeparms").setConfig({ defaults: this.defaults });
        this.down("#typeparms").insert(0, typefields);

        if (config.types[record.type].load) {
          config.types[record.type].load(this, record);
        }

        this.getForm().findField("type").setReadOnly(true);
      }
    } catch (e) {
      this.error = "Mismatch between specified type and imported data.";
    }

    resolve();
  },
  loadForm: function (config, record, title, route = false, audit = true) {
    return new Promise((resolve, reject) => {
      this.config = config;
      this.record = record;
      if (config.transform) {
        this.record = config.transform(record);
      }
      if (title) {
        this.title = config.object;
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

      this.item = config.object;
      // this.subgrid = subgrid;
      if (config.add && config.add.process) {
        this.process = config.add.process;
      } else {
        this.process = (form, val) => val;
      }

      this.editing = false;
      // fields.forEach((field) => {
      this.load(resolve);
    });
  },
});
