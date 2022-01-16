Ext.define("Amps.Pages", {
  singleton: true,
  pages: {
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
          {
            xtype: "button",
            iconCls: "x-fa fa-search",
            handler: function () {
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
                  xtype: "button",
                  iconCls: "x-fa fa-download",
                  handler: async function (scope, val) {
                    console.log(scope);
                    console.log(val);
                    var widget = scope.up("widget");
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
                                return reader.read().then(({ done, value }) => {
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
