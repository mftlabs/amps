Ext.define("Amps.form.add", {
  extend: "Ext.window.Window",
  xtype: "addform",
  modal: true,
  minWidth: 500,
  // maxHeight: 600,
  scrollable: true,
  // resizable: false,
  layout: "fit",

  constructor(args) {
    this.callParent([args]);
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

  loadForm: function (
    item,
    fields,
    process = (form, val) => val,
    request = false,
    entity = null
  ) {
    this.item = item;
    this.setTitle("Create " + item);
    this.process = process;

    if (request) {
      this.request = request;
    }
    fields = amfutil.scanFields(fields);
    console.log(fields);
    this.down("form").setConfig("entity", entity);
    this.down("form").insert(0, fields);
  },

  items: [
    {
      xtype: "form",
      entity: null,

      bodyPadding: 10,
      defaults: {
        padding: 5,
        labelWidth: 100,
      },
      layout: {
        type: "vbox",
        vertical: true,
        align: "stretch",
      },
      scrollable: true,
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var scope = btn.up("addform");
              var grid = amfutil.getElementByID("main-grid");
              var form = btn.up("form").getForm();
              var values = form.getValues();
              console.log(values);
              values = amfutil.convertNumbers(form, values);
              console.log(values);

              values = this.up("window").process(btn.up("form"), values);
              console.log(values);

              var user = amfutil.get_user();

              values.createdby = user.firstname + " " + user.lastname;
              values.created = new Date().toISOString();

              values.modifiedby = user.firstname + " " + user.lastname;
              values.modified = new Date().toISOString();

              delete values.id;

              btn.setDisabled(true);
              console.log(scope);
              if (scope.request) {
                scope.request(btn, values);
              } else {
                var mask = new Ext.LoadMask({
                  msg: "Please wait...",
                  target: btn.up("addform"),
                });
                mask.show();

                amfutil.ajaxRequest({
                  headers: {
                    Authorization: localStorage.getItem("access_token"),
                  },
                  url: "api/" + Ext.util.History.getToken(),
                  method: "POST",
                  timeout: 60000,
                  params: {},
                  jsonData: values,
                  success: function (response) {
                    mask.hide();
                    var item = btn.up("window").item;
                    btn.setDisabled(false);
                    var data = Ext.decode(response.responseText);
                    Ext.toast(`${item} created`);
                    var tokens = Ext.util.History.getToken().split("/");
                    amfutil.broadcastEvent("update", {
                      page: tokens[0],
                    });

                    if (tokens.length > 1) {
                      amfutil
                        .getElementByID(`${tokens[0]}-${tokens[2]}`)
                        .getStore()
                        .reload();
                    } else {
                      amfutil.getElementByID("main-grid").getStore().reload();
                    }
                    btn.up("window").close();
                  },
                  failure: function (response) {
                    mask.hide();
                    btn.setDisabled(false);
                    amfutil.onFailure("Failed to Create User", response);
                  },
                });
              }
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              this.up("window").close();
            },
          },
        },
      ],
    },
  ],
});
