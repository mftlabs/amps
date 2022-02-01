Ext.define("Amps.form.add", {
  extend: "Ext.Dialog",
  xtype: "addform",
  modal: true,
  minWidth: 500,
  // maxHeight: 600,
  scrollable: true,
  // resizable: false,
  layout: "fit",
  loadForm: function (item, fields, process = (form, val) => val, request) {
    this.item = item;
    this.title = "Create " + item;
    this.process = process;

    if (request) {
      this.request = request;
    }
    console.log(fields);
    fields = ampsutil.scanFields(fields);
    console.log(fields);

    // fields.forEach((field) => {
    this.down("formpanel").insert(0, fields);
    // });
  },

  items: [
    {
      xtype: "formpanel",
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
          handler: function (btn) {
            var scope = btn.up("addform");

            var form = btn.up("formpanel");
            var values = scope.getValues();
            console.log(values);

            values = this.up("dialog").process(btn.up("formpanel"), values);
            console.log(values);
            values = ampsutil.convertNumbers(form, values);
            console.log(values);

            var user = ampsutil.get_user();

            values.createdby = user.firstname + " " + user.lastname;
            values.created = new Date().toISOString();

            values.modifiedby = user.firstname + " " + user.lastname;
            values.modified = new Date().toISOString();

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

              ampsutil.ajaxRequest({
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
                  var item = btn.up("dialog").item;
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast(`${item} created`);
                  var tokens = Ext.util.History.getToken().split("/");
                  // amfutil.broadcastEvent("update", {
                  //   page: tokens[0],
                  // });

                  if (tokens.length > 1) {
                    ampsutil
                      .getElementByID(`${tokens[0]}-${tokens[2]}`)
                      .getStore()
                      .reload();
                  } else {
                    ampsutil.getElementByID("main-grid").getStore().reload();
                  }
                  btn.up("dialog").close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  // amfutil.onFailure("Failed to Create User", response);
                },
              });
            }
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          handler: function (btn) {
            this.up("dialog").close();
          },
        },
      ],
    },
  ],
});
