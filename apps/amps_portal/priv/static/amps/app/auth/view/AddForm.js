Ext.define("Amps.form.add", {
  extend: "Ext.window.Window",
  xtype: "addform",
  modal: true,
  minWidth: 500,
  // maxHeight: 600,
  scrollable: true,
  // resizable: false,
  layout: "fit",
  loadForm: function (
    item,
    fields,
    process = (form, val) => val,
    route,
    success
  ) {
    this.item = item;
    this.title = "Create " + item;
    this.process = process;
    var user = amfutil.get_user();

    if (route) {
      this.route = route;
    }
    if (success) {
      this.success = success;
    }
    console.log(fields);
    fields = amfutil.scanFields(fields);
    console.log(fields);

    fields.forEach((field) => {
      this.down("form").insert(field);
    });
  },

  items: [
    {
      xtype: "form",
      bodyPadding: 10,
      defaults: {
        padding: 5,
        labelWidth: 100,
      },
      getInvalidFields: function () {
        var invalidFields = [];
        Ext.suspendLayouts();
        this.getForm()
          .getFields()
          .filterBy(function (field) {
            if (field.validate()) return;
            invalidFields.push(field);
          });
        Ext.resumeLayouts(true);
        console.log(invalidFields);
        return invalidFields;
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
          formBind: true,
          listeners: {
            click: async function (btn) {
              var scope = btn.up("addform");
              var grid = amfutil.getElementByID("main-grid");
              var form = btn.up("form").getForm();
              var values = form.getValues();
              console.log(values);

              values = this.up("window").process(btn.up("form"), values);
              console.log(values);
              values = amfutil.convertNumbers(form, values);
              console.log(values);

              var user = await amfutil.userInfo();

              values.createdby = user.firstname + " " + user.lastname;
              values.created = new Date().toISOString();

              values.modifiedby = user.firstname + " " + user.lastname;
              values.modified = new Date().toISOString();

              console.log(values);

              btn.setDisabled(true);
              console.log(scope);

              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: btn.up("addform"),
              });
              mask.show();
              console.log(scope.route);

              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url:
                  "api/" +
                  (scope.route ? scope.route : Ext.util.History.getToken()),
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
                  if (scope.success) {
                    scope.success();
                  }
                  btn.up("window").close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  amfutil.onFailure("Failed to Create User", response);
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
              this.up("window").close();
            },
          },
        },
      ],
    },
  ],
});
