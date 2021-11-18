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
              text: "File Time",
              dataIndex: "ftime",
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

                    function download(filename, text) {
                      var element = document.createElement("a");
                      element.setAttribute(
                        "href",
                        "data:text/plain;charset=utf-8," +
                          encodeURIComponent(text)
                      );
                      element.setAttribute("download", filename);

                      element.style.display = "none";
                      document.body.appendChild(element);

                      element.click();

                      document.body.removeChild(element);
                    }

                    if (msg.data) {
                      download("hello.txt", msg.data);
                    } else {
                      var pbar = new Ext.Progress();

                      var msgbox = Ext.Msg.show({
                        title: "Downloading...",
                        items: [pbar],
                        width: 300,
                        progress: true,
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
                    }
                  },
                  // Start file download.
                },
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
                  },
                  record: user,
                },
              ],
            },
            {
              title: "Reset Password",
              iconCls: "x-fa fa-key",
              html: "Contact Screen",
            },
          ],
        },
      };
    },
  },
});
