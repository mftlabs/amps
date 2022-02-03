Ext.define("Amps.Authorized.PageController", {
  extend: "Ext.app.ViewController",

  alias: "controller.page",
  routes: {
    ":collection/:id": {
      before: "beforeItemPage",
      action: "onItemPage",
    },
    ":collection": "onPage",
    "*": "onRoute",
    // ":collection/:id/:field": "onItemPage",
  },

  // onItem: function (collection, id) {
  //   console.log("onItem");
  //   if (collection == "rules") {
  //     this.redirectTo(collection + "/" + id + "/rules");
  //   }
  // },

  beforeItemPage: function (collection, id, action) {
    // console.log("before");
    // var tokens = Ext.util.History.getToken().split("/");
    // var mask = new Ext.LoadMask({
    //   msg: "Please wait...",
    //   target: amfutil.getElementByID("edit_container"),
    // });
    // mask.show();
    // amfutil.ajaxRequest({
    //   url: "/api/" + tokens[0] + "/" + tokens[1],
    //   headers: {
    //     Authorization: localStorage.getItem("access_token"),
    //   },
    //   method: "GET",
    //   timeout: 30000,
    //   params: {},
    //   success: function (response) {
    //     var obj = Ext.decode(response.responseText);

    //     updateformutil.updateRecord(obj);
    //     mask.destroy();
    //     action.resume();
    //   },
    //   failure: function (response) {
    //     action.stop();
    //     console.log(response);
    //   },
    // });

    action.resume();
  },

  onItemPage: function (collection, id, field) {
    console.log("onItemPage");
    console.log(collection);
    console.log(id);

    // amfutil.getElementByID("page-panel-id").setActiveItem(1);
  },

  onRoute: function () {
    var route = Ext.util.History.currentToken;
    var tokens = route.split("/");
    var routes = Object.keys(Amps.Pages.pages);
    var treenav = ampsutil.getElementByID("treenav");
    newSelection = treenav.getStore().findRecord("rowCls", tokens[0]);
    if (routes.indexOf(tokens[0]) >= 0) {
      treenav.setSelection(newSelection);
    } else {
      this.redirectTo("inbox");
    }
  },

  onPage: async function (value) {
    // console.log(amfutil.channel);
    var route = Ext.util.History.getToken();
    console.log(route);

    var config = await Amps.Pages.pages[route]();
    var main = ampsutil.getElementByID("mainpage");
    main.removeAll();
    main.insert(0, config.view);

    var actionbar = ampsutil.getElementByID("actionbar");
    actionbar.removeAll();

    if (config.actionbar) {
      actionbar.insert(0, config.actionbar);
    }

    // var tokens = route.split("/");
    // console.log(route);
    // if (tokens.length == 1) {
    //   console.log(tokens);

    //   var grids = ampsgrids.grids;
    //   var pages = Object.keys(ampsgrids.pages);
    //   if (pages.indexOf(route) >= 0) {
    //     amfutil.getElementByID("page-handler").setActiveItem(1);
    //     var mp = amfutil.getElementByID("main-page");
    //     console.log(mp);
    //     mp.removeAll();
    //     mp.insert(0, ampsgrids.pages[route].view);
    //   } else {
    //     amfutil.getElementByID("page-handler").setActiveItem(0);

    //     var grid = this.getView().down("#main-grid");
    //     var options = ["delete"];
    //     console.log(ampsgrids.grids[route]);

    //     var column = {
    //       xtype: "actioncolumn",
    //       text: "Actions",
    //       dataIndex: "actions",
    //       width: 175,
    //       items: ampsgrids.grids[route].options
    //         ? ampsgrids.grids[route].options.map(
    //             (option) => amfutil.gridactions[option]
    //           )
    //         : [],
    //     };

    //     console.log(route);
    //     grid.setTitle(grids[route].title);
    //     var mask = new Ext.LoadMask({
    //       msg: "Please wait...",
    //       target: grid,
    //     });
    //     mask.show();
    //     if (route == "uploads") {
    //       grid.reconfigure(
    //         amfutil.uploads,
    //         grids[route].columns.concat(
    //           ampsgrids.grids[route].options ? [column] : null
    //         )
    //       );
    //       mask.hide();
    //     } else {
    //       grid.reconfigure(
    //         amfutil.createCollectionStore(Ext.util.History.getToken(), {}),
    //         grids[route].columns.concat(
    //           ampsgrids.grids[route].options ? [column] : null
    //         )
    //       );
    //     }

    //     var store = grid.getStore();
    //     store.on(
    //       "load",
    //       async function (scope, records, successful, operation, eOpts) {
    //         console.log("wait");
    //         var data;
    //         if (grids[route].process) {
    //           data = await grids[route].process(records);
    //           console.log(data);
    //           scope.loadData(data);
    //         }

    //         console.log(data);
    //         console.log("waited");
    //         mask.hide();
    //       }
    //     );

    //     if (route == "messages") {
    //       store.sort("stime", "DESC");
    //     }

    //     grid.setListeners({
    //       dblclick: {
    //         element: "body", //bind to the underlying body property on the panel
    //         fn: function (grid, rowIndex, e, obj) {
    //           var record = grid.record.data;
    //           var scope = this;
    //           amfutil.redirectTo(route + "/" + record._id);
    //         },
    //       },
    //       cellcontextmenu: function (
    //         table,
    //         td,
    //         cellIndex,
    //         record,
    //         tr,
    //         rowIndex,
    //         e
    //       ) {
    //         CLIPBOARD_CONTENTS = td.innerText;
    //         amfutil.copyTextdata(e);
    //       },
    //     });
    //   }
    //   amfutil.getElementByID("page-panel-id").setActiveItem(0);
    //   var window = amfutil.getElementByID("searchwindow");

    //   window.clearForm();
    //   amfutil.getElementByID("searchpanelbtn").setIconCls("x-fa fa-search");
    //   window.hide();
    //   var count = amfutil.getElementByID("edit_container").items.length;
    //   console.log(count);
    //   if (count > 0) {
    //     amfutil.getElementByID("edit_container").items.items[0].destroy();
    //   }
    //   amfutil.showActionIcons(route);
    // }
    // amfutil.renew_session();

    console.log("bottom");
  },

  toggleActive: function (grid, rowIndex, colIndex) {
    var route = Ext.util.History.getToken();
    var tokens = route.split("/");
    var rec = grid.getStore().getAt(rowIndex);
    var data = rec.data;
    if (tokens.length > 1) {
      if (rec.data.parms) {
        Object.keys(rec.data.parms).forEach((key) => {
          delete data[key];
        });
      }
    }
    delete data["id"];
    var mask = new Ext.LoadMask({
      msg: "Please wait...",
      target: grid,
    });

    data.active = !data.active;

    var status;

    if (data.active) {
      status = "Toggled Active";
    } else {
      status = "Toggled Inactive";
    }

    mask.show();
    var id;
    if (tokens.length == 1) {
      id = rec.data._id;
    }
    amfutil.ajaxRequest({
      url:
        tokens.length > 1
          ? "/api/" + route + "/" + rowIndex
          : "/api/" + route + "/" + id,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "PUT",
      timeout: 60000,
      params: {},
      jsonData: data,
      success: function (response) {
        console.log(response);
        var data = Ext.decode(response.responseText);
        mask.hide();
        amfutil.broadcastEvent("update", {
          page: Ext.util.History.getToken(),
        });
        Ext.toast({
          title: "Success",
          html: `<center>${status}</center>`,
          autoCloseDelay: 3000,
        });
        if (tokens.length > 1) {
          console.log(tokens[2]);
          console.log(data);
          var rows = data[tokens[2]].map((item) =>
            Object.assign(item, item.parms)
          );
          grid.getStore().loadData(rows);
        } else {
          grid.getStore().reload();
        }
      },
      failure: function (response) {
        mask.hide();
        amfutil.onFailure("Failed to Set Active", response);
        grid.getStore().reload();
      },
    });
  },

  approveUser: function (grid, rowIndex, colIndex) {
    const route = Ext.util.History.currentToken;
    var mask = new Ext.LoadMask({
      msg: "Please wait...",
      target: grid,
    });
    var rec = grid.getStore().getAt(rowIndex);
    var id = rec.data._id;
    var data = rec.data;
    data.approved = true;
    delete data.id;
    console.log(data);
    delete data.password;
    console.log(data);
    amfutil.ajaxRequest({
      url: "/api/" + route + "/" + id,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "PUT",
      timeout: 60000,
      params: {},
      jsonData: data,
      success: function (response) {
        mask.hide();
        amfutil.broadcastEvent("update", {
          page: Ext.util.History.getToken(),
        });
        Ext.toast({
          title: "Approved",
          html: "<center>User Approved</center>",
          autoCloseDelay: 5000,
        });
        grid.getStore().reload();
      },
      failure: function (response) {
        amfutil.onFailure("Failed to Approve", response);
      },
    });
  },

  deleteItem: async function (grid, rowIndex, colIndex) {
    console.log(rowIndex);
    var rec = grid.getStore().getAt(rowIndex);
    const route = Ext.util.History.currentToken;
    var tokens = route.split("/");
    var data = rec.data;
    if (rec.data.parms) {
      if (tokens.length > 1) {
        Object.keys(rec.data.parms).forEach((key) => {
          delete data[key];
        });
      }
    }

    delete data["id"];
    console.log(data);
    var mask = new Ext.LoadMask({
      msg: "Please wait...",
      target: grid,
    });

    var deletable = true;

    var title = "Delete Record";
    var msg = "Are you sure you want to delete?";

    if (tokens[0] == "services") {
      var response = await amfutil.ajaxRequest({
        url: "/api/service/" + rec.data.name,
        headers: {
          Authorization: localStorage.getItem("access_token"),
        },
        timeout: 60000,
      });
      var active = Ext.decode(response.responseText);
      console.log(active);
      if (active) {
        msg =
          "This service is currently running, are you sure you want to delete it?";
      }
    } else if (tokens[0] == "actions") {
      var rows = await amfutil.getCollectionData("services", {
        handler: rec.data._id,
      });
      console.log(rows);
      if (rows.length) {
        deletable = false;
        msg =
          "This action can't be deleted, it is in use by one or more rules.";
        title = "Error: Action in Use.";
      }
    }

    if (deletable) {
      return Ext.MessageBox.show({
        title: title,
        cls: "delete_btn",
        message: msg,
        buttons: Ext.MessageBox.YESNO,
        defaultFocus: "#no",
        prompt: false,
        fn: function (btn) {
          if (btn == "yes") {
            mask.show();
            var rec = grid.getStore().getAt(rowIndex);
            console.log(rowIndex);
            var id = rec.data._id;
            amfutil.ajaxRequest({
              url:
                tokens.length == 1
                  ? "/api/" + route + "/" + id
                  : "/api/" + route + "/" + rowIndex,
              headers: {
                Authorization: localStorage.getItem("access_token"),
              },
              method: "DELETE",
              timeout: 60000,
              params: {},
              jsonData: tokens.length > 1 ? rec.data : {},
              success: function (response) {
                var data = Ext.decode(response.responseText);
                mask.hide();
                amfutil.broadcastEvent("update", {
                  page: Ext.util.History.getToken(),
                });
                Ext.toast({
                  title: "Delete",
                  html: "<center>Deleted Record</center>",
                  autoCloseDelay: 5000,
                });
                if (tokens.length > 1) {
                  // console.log(tokens[2]);
                  // console.log(data);
                  // var rows = data[tokens[2]].map((item) =>
                  //   Object.assign(item, item.parms)
                  // );
                  grid.getStore().reload();
                } else {
                  grid.getStore().reload();
                }
              },
              failure: function (response) {
                mask.hide();
                amfutil.onFailure("Failed to Delete", response);
                grid.getStore().reload();
              },
            });
          }
        },
      });
    } else {
      return Ext.MessageBox.show({
        title: title,
        msg: msg,
      });
    }
  },

  getLink: async function (grid, rowIndex, colIndex, e) {
    var record = grid.getStore().getAt(rowIndex);
    console.log(record);
    var url = window.location.protocol + "//";
    var subdomain = window.location.host.split(".")[0];
    var host = window.location.host.replace(subdomain + ".", "");
    url += host + "/api/users/link/" + record.data._id;

    var resp = await amfutil.ajaxRequest({
      method: "GET",
      url: url,
    });

    var link = Ext.decode(resp.responseText);
    console.log(link);

    navigator.clipboard.writeText(link).then(
      function () {
        console.log("Async: Copying to clipboard was successful!");
        Ext.toast("Copied to clipboard");
      },
      function (err) {
        console.error("Async: Could not copy text: ", err);
      }
    );
  },

  downloadUfaAgent: async function (grid, rowIndex, colIndex) {
    var rec = grid.getStore().getAt(rowIndex);
    var downloadWindow = new Ext.window.Window({
      title: "Download Agent",
      modal: true,
      width: 500,
      scrollable: true,
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
          scrollable: true,
          items: [
            {
              xtype: "textfield",
              itemId: "host",
              name: "host",
              fieldLabel: "Host",
              allowBlank: false,
              value: window.location.hostname,
            },
            {
              xtype: "combo",
              allowBlank: false,
              name: "os",
              fieldLabel: "Operating System",
              store: [
                {
                  field: "linux",
                  label: "Linux",
                },
                {
                  field: "windows",
                  label: "Windows",
                },
                {
                  field: "mac",
                  label: "macOS",
                },
              ],
              displayField: "label",
              valueField: "field",
            },
            {
              xtype: "radiogroup",
              fieldLabel: "Type",
              allowBlank: false,
              columns: 2,
              items: [
                {
                  boxLabel: "64-Bit",
                  inputValue: "64",
                  name: "arch",
                  checked: true,
                },
                {
                  boxLabel: "32-Bit",
                  name: "arch",
                  inputValue: "32",
                },
              ],
            },
          ],
          buttons: [
            {
              text: "Download",
              itemId: "download",
              cls: "button_class",
              formBind: true,
              listeners: {
                click: async function (btn) {
                  downloadWindow.hide();
                  var form = btn.up("form").getForm();
                  var values = form.getValues();

                  var filename;
                  var msgbox = Ext.MessageBox.show({
                    title: "Please wait",
                    msg: "Downloading...",
                    progressText: "Downloading...",
                    width: 300,
                    progress: true,
                    closable: false,
                  });
                  await amfutil.renew_session();
                  await fetch(
                    "/api/agent/download/" +
                      rec.data._id +
                      "?" +
                      new URLSearchParams(values),
                    {
                      headers: {
                        Authorization: localStorage.getItem("access_token"),
                      },
                    }
                  )
                    .then(async (response) => {
                      if (response.ok) {
                        var progress = 0;
                        var size;
                        for (let entry of response.headers.entries()) {
                          if (entry[0] == "content-length") {
                            size = entry[1];
                          }
                          if (entry[0] == "content-disposition") {
                            filename = entry[1].match(/filename="(.+)"/)[1];
                          }
                        }
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
                                msgbox.updateProgress(progress / size);
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
            },
            {
              text: "Cancel",
              cls: "button_class",
              itemId: "cancel",
              listeners: {
                click: function (btn) {
                  downloadWindow.close();
                },
              },
            },
          ],
        },
      ],
    });

    downloadWindow.show();
  },

  handleUpload: async function (grid, rowIndex, colIndex) {
    console.log("Upload");
    var rec = grid.getStore().getAt(rowIndex);
    var uploadWindow = new Ext.window.Window({
      title: "Upload File to Topic: " + rec.data.desc,
      modal: true,
      width: 500,
      scrollable: true,
      resizable: false,
      layout: "fit",
      items: [
        {
          xtype: "form",
          defaults: {
            padding: 5,
            labelWidth: 140,
            width: 480,
          },
          scrollable: true,
          items: [
            {
              xtype: "filefield",
              name: "file",
              fieldLabel: "Files",
              msgTarget: "side",
              allowBlank: false,
              buttonText: "Select Files...",
              listeners: {
                // render: function (scope) {
                //   scope.fileInputEl.dom.setAttribute("multiple", true);
                // },
              },
            },
            {
              // Fieldset in Column 1 - collapsible via toggle button
              xtype: "fieldset",
              title: "Additional Metadata",
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
              text: "Upload",
              handler: function () {
                var form = this.up("form").getForm();
                var fields = form.getFields();
                var values = form.getValues();
                var files = fields.items[1].extractFileInput().files;

                var defaults = values.defaults
                  ? Array.isArray(values.defaults)
                    ? values.defaults.map((defaultobj) => {
                        return JSON.parse(defaultobj);
                      })
                    : [JSON.parse(values.defaults)]
                  : [];

                console.log(defaults);
                var meta = defaults.map((def) => {
                  return { field: "x-amz-meta-" + def.field, value: def.value };
                });
                // console.log(files);
                Array.from(files).forEach((file) => {
                  var prefix = values.prefix.length
                    ? values.prefix.slice(-1) == "/"
                      ? values.prefix
                      : values.prefix + "/"
                    : values.prefix;
                  amfutil.ajaxRequest({
                    jsonData: {
                      fname: prefix + file.name,
                      bucket: rec.data.name,
                      host: window.location.hostname,
                    },
                    url: "/api/upload",
                    headers: {
                      Authorization: localStorage.getItem("access_token"),
                    },
                    method: "POST",
                    timeout: 60000,
                    success: function (response) {
                      var url = Ext.decode(response.responseText);
                      console.log(file);
                      console.log(url);
                      uploadWindow.close();
                      amfuploads.handleUpload(
                        url,
                        file,
                        prefix,
                        rec.data.name,
                        meta
                      );

                      // msgbox.anchorTo(Ext.getBody(), "br");
                    },
                  });
                });
              },
            },
            {
              text: "Cancel",
              cls: "button_class",
              itemId: "cancel",
              listeners: {
                click: function (btn) {
                  uploadWindow.close();
                },
              },
            },
          ],
        },
      ],
    });
    uploadWindow.show();
  },
});
