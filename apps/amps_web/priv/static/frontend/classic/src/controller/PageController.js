// const icons = {
//   approve: {
//     name: "approve_user",
//     tooltip: "Approve User",
//     itemId: "approve",
//     handler: "approveUser",
//     getClass: function (v, meta, record) {
//       console.log(record);
//       var style;
//       if (record.data.approved) {
//         style = "active";
//       } else {
//         style = "inactive";
//       }
//       return "x-fa fa-user-circle actionicon " + style;
//     },
//   },
//   toggle: {
//     name: "enable_disable",
//     iconCls: "x-fa fa-toggle-on actionicon",
//     tooltip: "Enable",
//     handler: "toggleActive",
//   },
//   delete: {
//     name: "delete",
//     iconCls: "x-fa fa-trash actionicon",
//     tooltip: "Delete File Mapping",
//     handler: "deleteItem",
//   },
//   copy: {
//     name: "copy",
//     iconCls: "x-fa fa-key",
//     itemId: "copypwd",
//     tooltip: "Click here to copy password",
//     handler: "copyPassword",
//   },
// };

Ext.define("Amps.controller.PageController", {
  extend: "Ext.app.ViewController",

  alias: "controller.page",
  routes: {
    ":collection/:id": {
      before: "beforeItemPage",
      action: "onItemPage",
    },
    ":collection": {
      before: "beforePage",
      action: "onPage",
    },
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
    console.log("before");
    var gridmask = new Ext.LoadMask({
      msg: "Please wait...",
      target: amfutil.getElementByID("main-grid"),
    });
    gridmask.show();
    var tokens = Ext.util.History.getToken().split("/");
    var mask = new Ext.LoadMask({
      msg: "Please wait...",
      target: amfutil.getElementByID("edit_container"),
    });
    mask.show();
    amfutil.ajaxRequest({
      url: "/api/" + tokens[0] + "/" + tokens[1],
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "GET",
      timeout: 30000,
      params: {},
      success: function (response) {
        var obj = Ext.decode(response.responseText);

        updateformutil.updateRecord(obj);
        gridmask.destroy();
        mask.destroy();
        action.resume();
      },
      failure: function (response) {
        action.stop();
        gridmask.destroy();

        mask.destroy();

        console.log(response);
      },
    });
  },

  onItemPage: function (collection, id, field) {
    console.log("onItemPage");
    console.log(collection);
    console.log(id);

    amfutil.getElementByID("page-panel-id").setActiveItem(1);
  },

  onRoute: function () {
    var route = Ext.util.History.currentToken;
    var tokens = route.split("/");
    var grids = ampsgrids.grids;
    var pages = ampsgrids.pages;

    console.log(route);
    var routes = Object.keys(grids).concat(Object.keys(pages));
    var treenav = Ext.ComponentQuery.query("#treenavigation")[0];
    newSelection = treenav.getStore().findRecord("rowCls", tokens[0]);
    console.log(newSelection);
    if (routes.indexOf(tokens[0]) >= 0) {
      treenav.setSelection(newSelection);
    } else {
      this.redirectTo("message_events");
    }
  },

  beforePage: function () {
    var route = Ext.util.History.getToken();
    var tokens = route.split("/");
    console.log(route);
    if (tokens.length == 1) {
      console.log(tokens);

      var grids = ampsgrids.grids;
      var pages = Object.keys(ampsgrids.pages);
      var mp = amfutil.getElementByID("main-page");
      console.log(mp);
      mp.removeAll(true);
      if (pages.indexOf(route) >= 0) {
        var config = ampsgrids.pages[route]();
        amfutil.getElementByID("page-handler").setActiveItem(1);

        console.log(config.view);
        mp.insert(0, config.view);
      } else {
        amfutil.getElementByID("page-handler").setActiveItem(0);

        var parent = this.getView().down("#grid-wrapper");
        parent.removeAll();

        var options = ["delete"];
        var config = ampsgrids.grids[route]();
        console.log(config);

        var column = {
          xtype: "actioncolumn",
          text: "Actions",
          flex: 1,
          // dataIndex: "actions",
          width: "max-content",
          items: config.options
            ? config.options.map((option) => amfutil.gridactions[option])
            : [],
        };

        console.log(route);

        var mask = new Ext.LoadMask({
          msg: "Please wait...",
          target: this.getView(),
        });
        mask.show();

        var filter = localStorage.getItem(`${route}_filter`);

        if (filter) {
          filter = JSON.parse(filter);
        } else {
          filter = config.filter ? config.filter : {};
        }

        var store = Ext.StoreManager.lookup(route);

        store = store
          ? store
          : amfutil.createPageStore(Ext.util.History.getToken(), filter);

        if (store.isLoaded) {
          mask.hide();
        } else {
          store.on(
            "load",
            function (scope, records, successful, operation, eOpts) {
              // console.log("wait");
              // var data;
              // if (config.process) {
              //   data = await config.process(records);
              //   console.log(data);
              //   scope.loadData(data);
              // }

              // console.log(data);
              // console.log("waited");
              mask.hide();
            }
          );
        }

        var grid = new Amps.view.main.List({
          title: config.title,
          stateId: route,
          store: store,
          itemId: "main-grid",
          columns: config.columns.concat(config.options ? [column] : []),
        });

        console.log(grid);

        parent.insert(grid);

        var sort = localStorage.getItem(`${route}_sort`);
        console.log("grid inserted");

        grid.setListeners({
          sortchange: function (ct, col, dir) {
            console.log(col);
            console.log(dir);
            var sortval = {};
            sortval[col["dataIndex"]] = dir;
            localStorage.setItem(`${route}_sort`, JSON.stringify(sortval));
          },
          dblclick: {
            element: "body", //bind to the underlying body property on the panel
            fn: function (grid, rowIndex, e, obj) {
              var record = grid.record.data;
              console.log(obj);
              console.log(config.dblclick);
              if (config.dblclick) {
                config.dblclick(record);
              } else {
                amfutil.redirectTo(route + "/" + record._id);
              }
              grid.setLoading(false);
            },
          },
          cellcontextmenu: function (
            table,
            td,
            cellIndex,
            record,
            tr,
            rowIndex,
            e
          ) {
            CLIPBOARD_CONTENTS = td.innerText;
            amfutil.copyTextdata(e);
          },
        });
        if (sort) {
          console.log(sort);
          amfutil.setGridSort(JSON.parse(sort), route);
        } else {
          if (config.sort) {
            amfutil.setGridSort(config.sort, route);
          } else {
            amfutil.setGridSort({ name: "ASC" }, route);
          }
        }
        grid.fireEvent("checkfilter", "");
      }

      amfutil.getElementByID("page-panel-id").setActiveItem(0);
      var window = amfutil.getElementByID("searchwindow");

      window.clearForm();
      amfutil.getElementByID("searchpanelbtn").setIconCls("x-fa fa-search");
      window.hide();

      window.loadForm();
      var count = amfutil.getElementByID("edit_container").items.length;
      console.log(count);
      if (count > 0) {
        amfutil.getElementByID("edit_container").items.items[0].destroy();
      }

      amfutil.showActionIcons(route);
    }
  },

  onPage: function (value) {
    // console.log(amfutil.channel);

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
    id = rec.data._id;
    amfutil.ajaxRequest({
      url:
        tokens.length > 1
          ? "/api/" + route + "/" + id
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

  toggleArchive: function (grid, rowIndex, colIndex) {
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

    data.archive = !data.archive;

    var status;

    if (data.archive) {
      status = "Toggled Archive On";
    } else {
      status = "Toggled Archive Off";
    }

    mask.show();
    var id;
    id = rec.data._id;
    amfutil.ajaxRequest({
      url:
        tokens.length > 1
          ? "/api/" + route + "/" + id
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
        amfutil.onFailure("Failed to Toggle Archive", response);
        grid.getStore().reload();
      },
    });
  },

  approveAdmin: function (grid, rowIndex, colIndex) {
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

  approveUser: function (grid, rowIndex, colIndex) {
    const route = Ext.util.History.currentToken;
    var rec = grid.getStore().getAt(rowIndex);

    var approveWin = new Ext.window.Window({
      title: "Approve User",
      modal: true,
      width: 400,
      height: 300,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      items: [
        {
          xtype: "form",
          flex: 1,
          defaults: {
            padding: 5,
            labelWidth: 140,
          },
          // layout: {
          //   type: "vbox",
          //   align: "stretch",
          // },
          scrollable: true,
          items: [
            amfutil.combo(
              "Group",
              "group",
              amfutil.createCollectionStore("groups"),
              "_id",
              "name"
            ),
          ],

          buttons: [
            {
              text: "Approve",
              formBind: true,
              handler: function (scope) {
                var form = this.up("form").getForm();
                scope.up("window").setLoading(true);
                var group = form.getValues().group;
                // console.log(files);
                amfutil.ajaxRequest({
                  url: "/api/users/approve/" + rec.data._id,
                  headers: {
                    Authorization: localStorage.getItem("access_token"),
                  },
                  method: "POST",
                  timeout: 60000,
                  params: {},
                  jsonData: {
                    group: group,
                  },
                  success: function (resp) {
                    scope.up("window").setLoading(false);

                    amfutil.broadcastEvent("update", {
                      page: Ext.util.History.getToken(),
                    });
                    Ext.toast({
                      title: "Approved",
                      html: "<center>User Approved</center>",
                      autoCloseDelay: 5000,
                    });
                    grid.getStore().reload();
                    var data = Ext.decode(resp.responseText);
                    var items = [
                      {
                        xtype: "component",
                        autoEl: "h3",
                        style: {
                          "text-align": "center",
                        },
                        html: "User Successfully Approved",
                      },
                      {
                        xtype: "container",
                        layout: "center",
                        items: [
                          {
                            xtype: "button",
                            text: "Copy Password",
                            handler: function (btn) {
                              navigator.clipboard
                                .writeText(data.success.password)
                                .then(
                                  function () {
                                    console.log(
                                      "Async: Copying to clipboard was successful!"
                                    );
                                    Ext.toast("Copied to clipboard");
                                  },
                                  function (err) {
                                    console.error(
                                      "Async: Could not copy text: ",
                                      err
                                    );
                                  }
                                );
                            },
                          },
                        ],
                      },
                    ];

                    approveWin.removeAll();
                    approveWin.insert(0, items);
                    approveWin.setLoading(false);
                  },
                  failure: function (response) {
                    amfutil.onFailure("Failed to Approve", response);
                  },
                });
                // msgbox.anchorTo(Ext.getBody(), "br");
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
    approveWin.show();
  },

  getSecret: async function (grid, rowIndex, colIndex) {
    var rec = grid.getStore().getAt(rowIndex).data;
    var route = Ext.util.History.getToken();
    route = route.split("/");
    route.pop();
    route = route.join("/");
    var user = await amfutil.getCurrentItem(route);
    var secret = await amfutil.getCollectionData("tokens", {
      username: user["username"],
    });

    console.log(secret);
    navigator.clipboard.writeText(secret[0][rec["id"]]).then(
      function () {
        console.log("Async: Copying to clipboard was successful!");
        Ext.toast("Copied to clipboard");
      },
      function (err) {
        console.error("Async: Could not copy text: ", err);
      }
    );
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
          "This action can't be deleted, it is in use by one or more subscribers.";
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
            console.log(rec);
            amfutil.ajaxRequest({
              url:
                tokens.length == 1
                  ? "/api/" + route + "/" + id
                  : "/api/" + route + "/" + id,
              headers: {
                Authorization: localStorage.getItem("access_token"),
              },
              method: "DELETE",
              timeout: 60000,
              params: {},
              jsonData: tokens.length > 1 ? rec.data : {},
              success: async function (response) {
                var data = Ext.decode(response.responseText);
                mask.hide();
                amfutil.broadcastEvent("update", {
                  page: tokens[0],
                });
                Ext.toast({
                  title: "Delete",
                  html: "<center>Deleted Record</center>",
                  autoCloseDelay: 5000,
                });
                console.log(route);

                if (route == "environments") {
                  await amfutil.updateEnv();
                }

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
  onChangeAdminPassword: async function (grid, rowIndex, colIndex, e) {
    var record = grid.getStore().getAt(rowIndex);
    console.log(record);
    amfutil.changePasswordAdmin(record.data._id);
  },

  resetAdminPassword: async function (grid, rowIndex, colIndex, e) {
    var record = grid.getStore().getAt(rowIndex);

    var win = new Ext.window.Window({
      title: "Confirm Password Reset",
      width: 400,
      height: 300,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      padding: 25,
      items: [
        {
          flex: 1,
          layout: "center",
          xtype: "container",
          items: [
            {
              xtype: "button",
              text: "Reset Password",
              scale: "large",
              handler: async function (scope) {
                var win = scope.up("window");
                win.setLoading(true);
                var resp = await amfutil.ajaxRequest({
                  method: "GET",
                  url: "/api/admin/reset/" + record.data._id,
                  failure: function () {
                    Ext.toast("Couldn't reset password");
                  },
                });
                var data = Ext.decode(resp.responseText);
                var items = [
                  {
                    xtype: "component",
                    autoEl: "h3",
                    style: {
                      "text-align": "center",
                    },
                    html: "Password Successfully Reset",
                  },

                  {
                    xtype: "container",
                    layout: "center",
                    items: [
                      {
                        xtype: "button",
                        text: "Copy Password",
                        handler: function (btn) {
                          navigator.clipboard
                            .writeText(data.success.password)
                            .then(
                              function () {
                                console.log(
                                  "Async: Copying to clipboard was successful!"
                                );
                                Ext.toast("Copied to clipboard");
                              },
                              function (err) {
                                console.error(
                                  "Async: Could not copy text: ",
                                  err
                                );
                              }
                            );
                        },
                      },
                    ],
                  },
                ];

                win.removeAll();
                win.insert(0, items);
                win.setLoading(false);
              },
            },
          ],
        },
      ],
    });
    win.show();
  },

  showReadme: function (grid, rowIndex) {
    var rec = grid.getStore().getAt(rowIndex);
    var win = new Ext.window.Window({
      width: 600,
      padding: 20,
      scrollable: true,
      height: 700,
      title: "README",
      layout: "fit",
      items: [
        {
          xtype: "component",
          html: rec.data.readme,
        },
      ],
    });
    win.show();
  },

  loadDemo: function (grid, rowIndex) {
    var rec = grid.getStore().getAt(rowIndex);
    var win = new Ext.window.Window({
      width: 600,
      height: 200,
      padding: 20,
      scrollable: true,
      title: "Load Demo",
      layout: "fit",
      listeners: {
        afterrender: async function () {
          this.setLoading(true);
          var user = await amfutil.fetch_user();
          var form = Ext.create({
            xtype: "form",

            layout: "fit",

            listeners: {
              afterrender: async function () {
                this.setLoading(true);

                var envs = await amfutil.getCollectionData("environments");
                envs.push({ name: "", desc: "default" });
                this.insert({
                  xtype: "fieldcontainer",
                  layout: {
                    type: "vbox",
                    align: "stretch",
                  },
                  padding: 15,
                  items: [
                    amfutil.localCombo(
                      "Environment",
                      "env",
                      envs,
                      "name",
                      "desc",
                      {
                        value: user.config.env,
                      }
                    ),
                  ],
                });
                this.setLoading(false);
              },
            },
            buttons: [
              {
                text: "Load Into Environment",
                handler: async function (btn) {
                  var win = btn.up("window");
                  win.setLoading(true);
                  var values = btn.up("form").getValues();
                  await amfutil.updateInCollection(
                    "admin",
                    { config: { env: values.env } },
                    user._id,
                    function () {
                      amfutil.updateEnv();
                      win.hide();
                      var importWin = new Ext.window.Window({
                        title: "Import Demo",
                        modal: true,
                        layout: "card",
                        // closable: false,
                        width: 0.8 * window.innerWidth,
                        height: 0.8 * window.innerHeight,

                        items: [
                          {
                            xtype: "imports",
                            imports: rec.data.imports,
                            scripts: rec.data.scripts,
                          },
                        ],
                      });
                      importWin.show();
                    },
                    function () {
                      win.setLoading(false);
                      Ext.toast("Failed to load into environment");
                    }
                  );
                },
              },
              {
                text: "Cancel",
                handler: function (btn) {
                  btn.up("window").close();
                },
              },
            ],
          });
          this.insert(form);
          this.setLoading(false);
        },
      },
    });
    win.show();
  },
  resetPassword: async function (grid, rowIndex, colIndex, e) {
    var record = grid.getStore().getAt(rowIndex);

    var win = new Ext.window.Window({
      title: "Confirm Password Reset",
      width: 400,
      height: 300,
      modal: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      padding: 25,
      items: [
        {
          flex: 1,
          layout: "center",
          xtype: "container",
          items: [
            {
              xtype: "button",
              text: "Reset Password",
              scale: "large",
              handler: async function (scope) {
                var win = scope.up("window");
                win.setLoading(true);
                var resp = await amfutil.ajaxRequest({
                  method: "GET",
                  url: "/api/users/reset/" + record.data._id,
                  failure: function () {
                    win.setLoading(false);
                    Ext.toast("Couldn't reset password");
                  },
                });
                var data = Ext.decode(resp.responseText);
                var items = [
                  {
                    xtype: "component",
                    autoEl: "h3",
                    style: {
                      "text-align": "center",
                    },
                    html: "Password Successfully Reset",
                  },

                  {
                    xtype: "container",
                    layout: "center",
                    items: [
                      {
                        xtype: "button",
                        text: "Copy Password",
                        handler: function (btn) {
                          navigator.clipboard
                            .writeText(data.success.password)
                            .then(
                              function () {
                                console.log(
                                  "Async: Copying to clipboard was successful!"
                                );
                                Ext.toast("Copied to clipboard");
                              },
                              function (err) {
                                console.error(
                                  "Async: Could not copy text: ",
                                  err
                                );
                              }
                            );
                        },
                      },
                    ],
                  },
                ];

                win.removeAll();
                win.insert(0, items);
                win.setLoading(false);
              },
            },
          ],
        },
      ],
    });

    // Ext.MessageBox.confirm(
    //   "Reset Password",
    //   `Are you sure you want to reset ${record.data.firstname} ${record.data.lastname}'s password?`,
    //   async function (res) {
    //     if (res == "yes") {
    //       console.log("yes");
    //       var resp = await amfutil.ajaxRequest({
    //         method: "GET",
    //         url: "/api/users/reset/" + record.data._id,
    //         failure: function () {
    //           Ext.toast("Couldn't reset password");
    //         },
    //       });
    //       var data = Ext.decode(resp.responseText);
    //       if (data.success) {
    //         var win = new Ext.window.Window({
    //           title: "Password Reset",
    //           modal: true,
    //           width: 300,
    //           padding: 10,
    //           layout: {
    //             type: "vbox",
    //             align: "stretch",
    //           },
    //           items: [
    //             {
    //               xtype: "component",
    //               autoEl: "h3",
    //               html: "Password Successfully Reset",
    //             },

    //             {
    //               xtype: "container",
    //               layout: "center",
    //               items: [
    //                 {
    //                   xtype: "button",
    //                   text: "Copy Password",
    //                   handler: function (btn) {
    //                     navigator.clipboard
    //                       .writeText(data.success.password)
    //                       .then(
    //                         function () {
    //                           console.log(
    //                             "Async: Copying to clipboard was successful!"
    //                           );
    //                           Ext.toast("Copied to clipboard");
    //                         },
    //                         function (err) {
    //                           console.error(
    //                             "Async: Could not copy text: ",
    //                             err
    //                           );
    //                         }
    //                       );
    //                   },
    //                 },
    //               ],
    //             },
    //           ],
    //         });
    //         win.show();
    //       }
    //     }
    //   }
    // );

    // console.log(resp);
    win.show();
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
      url: "/api/users/link/" + record.data._id,
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
      title: "Upload File to Topic: " + rec.data.topic,
      modal: true,
      width: 600,
      height: 500,
      scrollable: true,
      resizable: false,
      layout: "fit",
      padding: 10,
      items: [
        {
          xtype: "form",
          defaults: {
            padding: 5,
            labelWidth: 140,
          },
          layout: {
            type: "vbox",
            align: "stretch",
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
                var files = fields.items[0].extractFileInput().files;

                var meta = amfutil.formatArrayField(values.defaults);
                console.log(meta);
                // console.log(files);
                Array.from(files).forEach((file) => {
                  var topic = rec.data.topic;
                  amfuploads.handleUpload(
                    encodeURI("api/upload/" + topic),
                    file,
                    meta
                  );

                  // msgbox.anchorTo(Ext.getBody(), "br");
                });
                grid.getStore().reload();

                uploadWindow.close();
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

  reroute: async function (grid, rowIndex, colIndex) {
    var rec = grid.getStore().getAt(rowIndex);
    var uploadWindow = new Ext.window.Window({
      title: "Reroute Event",
      modal: true,
      width: 600,
      height: 500,
      scrollable: true,
      resizable: false,
      layout: "fit",
      padding: 10,
      items: [
        {
          xtype: "form",
          defaults: {
            padding: 5,
            labelWidth: 140,
          },
          // layout: {
          //   type: "vbox",
          //   align: "stretch",
          // },
          scrollable: true,
          items: [
            amfutil.outputTopic(),
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
              text: "Send",
              formBind: true,
              handler: function (scope) {
                var form = this.up("form").getForm();
                scope.up("window").setLoading(true);
                var fields = form.getFields();
                var values = form.getValues();

                var meta = amfutil.formatArrayField(values.defaults);
                console.log(meta);
                // console.log(files);
                amfutil.ajaxRequest({
                  url: "api/msg/reroute/" + rec.data._id,
                  method: "post",
                  jsonData: {
                    meta: JSON.stringify(meta),
                    topic: values.output,
                  },
                  success: function () {
                    uploadWindow.close();
                    grid.getStore().reload();
                  },
                });
                // msgbox.anchorTo(Ext.getBody(), "br");
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

  sendEvent: async function (grid, rowIndex, colIndex) {
    console.log("Upload");
    var rec = grid.getStore().getAt(rowIndex);
    var uploadWindow = new Ext.window.Window({
      title: "Send Event to Topic: " + rec.data.topic + "?",
      modal: true,
      width: 600,
      height: 500,
      scrollable: true,
      resizable: false,
      layout: "fit",
      padding: 10,
      items: [
        {
          xtype: "form",
          defaults: {
            padding: 5,
            labelWidth: 140,
          },
          layout: {
            type: "vbox",
            align: "stretch",
          },
          scrollable: true,
          items: [
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
              text: "Send",
              handler: function () {
                var form = this.up("form").getForm();
                var fields = form.getFields();
                var values = form.getValues();

                var meta = amfutil.formatArrayField(values.defaults);
                console.log(meta);
                var topic = rec.data.topic;
                // console.log(files);
                amfutil.ajaxRequest({
                  url: "api/event/" + topic,
                  method: "post",
                  jsonData: { meta: JSON.stringify(meta) },
                  success: function () {
                    grid.getStore().reload();
                    uploadWindow.close();
                  },
                });
                // msgbox.anchorTo(Ext.getBody(), "br");
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

  reprocess: async function (grid, rowIndex, colIndex, e) {
    var g = grid.up();
    g.setLoading(true);
    var record = grid.getStore().getAt(rowIndex).data;
    console.log(record);
    try {
      Ext.toast("Reprocessing");

      await amfutil.reprocess(grid, record._id);
      g.setLoading(false);

      Ext.toast("Reprocessed");
    } catch (e) {
      g.setLoading(false);
      Ext.toast("Failed to Reprocessing");
    }
  },

  skip: async function (grid, rowIndex, colIndex, e) {
    var mask = new Ext.LoadMask({
      msg: "Please wait...",
      target: grid,
    });
    var msgbox = Ext.MessageBox.show({
      title: "Confirm skipping of message",
      message: "Are you sure you want to skip this message?",
      buttons: Ext.MessageBox.YESNO,
      defaultFocus: "#no",
      prompt: false,
      fn: function (btn) {
        if (btn == "yes") {
          mask.show();
          var rec = grid.getStore().getAt(rowIndex);
          console.log(rowIndex);
          var id = rec.data._id;
          console.log(rec);
          amfutil.ajaxRequest({
            url: `/api/service/skip/${id}`,
            method: "POST",
            timeout: 60000,
            params: {},
            success: async function (response) {
              var data = Ext.decode(response.responseText);
              mask.hide();
              Ext.toast({
                title: "Skipping",
                html: "<center>Message marked for skip</center>",
                autoCloseDelay: 5000,
              });
              console.log(route);
              grid.getStore().reload();
            },
            failure: function (response) {
              mask.hide();
              amfutil.onFailure("Error skipping Message", response);
              grid.getStore().reload();
            },
          });
        }
      },
    });
  },

  clearEnv: async function (grid, rowIndex) {
    var record = grid.getStore().getAt(rowIndex).data;

    Ext.MessageBox.show({
      title: "Clear Environment",
      message: `Are you sure you want to clear this environment? This will delete all Database collections prefixed ${
        record.name
      }-, all Vault keys prefixed with ${
        record.name
      }- and all NATS Streams prefixed with ${record.name.toUpperCase()}-`,
      buttons: Ext.MessageBox.YESNO,
      defaultFocus: "#no",
      prompt: false,
      fn: function (btn) {
        if (btn == "yes") {
          var mask = new Ext.LoadMask({
            msg: "Clearing Environment...",
            target: amfutil.getElementByID("main-viewport"),
          });
          mask.show();
          grid.setLoading(true);
          amfutil.ajaxRequest({
            url: "/api/environments/clear/" + encodeURI(record.name),
            method: "post",
            timeout: 60000,
            success: function (response) {
              var data = Ext.decode(response.responseText);
              grid.setLoading(false);
              mask.hide();
              var tokens = Ext.util.History.getToken().split("/");

              amfutil.broadcastEvent("update", {
                page: tokens[0],
              });
              Ext.toast({
                title: "Delete",
                html: "<center>Cleared Environment</center>",
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
              grid.setLoading(false);
              amfutil.onFailure("Failed to Clear", response);
              grid.getStore().reload();
            },
          });
        }
      },
    });
  },

  exportEnv: async function (grid, rowIndex) {
    var record = grid.getStore().getAt(rowIndex).data;

    var uploadWindow = new Ext.window.Window({
      title: "Export Environment as Demo",
      modal: true,
      width: 600,
      height: 500,
      scrollable: true,
      resizable: false,
      layout: "fit",
      padding: 10,
      items: [
        {
          xtype: "form",
          defaults: {
            padding: 5,
            labelWidth: 140,
          },
          // layout: {
          //   type: "vbox",
          //   align: "stretch",
          // },
          scrollable: true,
          items: [
            amfutil.text("Name", "name", {
              allowBlank: false,
            }),
            amfutil.text("Description", "desc", {
              allowBlank: false,
            }),
          ],

          buttons: [
            {
              text: "Export",
              formBind: true,
              handler: function (scope) {
                var form = this.up("form").getForm();
                uploadWindow.setLoading(true);
                var fields = form.getFields();
                var values = form.getValues();
                amfutil.download(
                  "api/environments/export/" + record.name,
                  "post",
                  values
                );
                uploadWindow.close();
                // msgbox.anchorTo(Ext.getBody(), "br");
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

  downloadExcelFormat: function (scope) {
    var values = scope.up("form").getValues();
    var type = values.type;
    if (type) {
      if (type == "collection") {
        if (values.collection) {
          amfutil.download("/api/data/import/sample/" + values.collection);
        } else {
          Ext.toast("Select a collection");
        }
      } else {
        if (values.collection) {
          if (values.field) {
            amfutil.download(
              "/api/data/import/sample/" +
                values.collection +
                "/" +
                values.field
            );
          } else {
            Ext.toast("Select a field");
          }
        } else {
          Ext.toast("Select a collection");
        }
      }
    } else {
      Ext.toast("Select a type");
    }
  },

  onImportClear: function (scope) {
    scope.up("form").reset();
  },
});

Ext.define("Amps.window.Uploads", {
  extend: "Ext.window.Window",
  singleton: true,
  width: 700,
  height: 500,
  closeAction: "method-hide",
  uploads: [],
  title: "Uploads",

  update: function () {
    this.down("grid").setStore(this.uploads);
  },

  handleUpload: async function (url, file, metadata = false, show = true) {
    var scope = this;

    return new Promise(async (resolve, reject) => {
      await amfutil.renew_session();
      var data = new FormData();
      console.log(url);

      data.append("file", file);
      if (metadata) {
        data.append("meta", JSON.stringify(metadata));
      }

      let request = new XMLHttpRequest();
      request.open("POST", url);
      request.setRequestHeader(
        "Authorization",
        localStorage.getItem("access_token")
      );

      var id = Math.floor(Math.random() * Date.now());
      console.log(id);
      // upload progress event
      var startTime = new Date();

      request.upload.addEventListener("progress", function (e) {
        // upload progress as percentage
        console.log(e);
        var endTime = new Date();
        var timeDiff = endTime - startTime;
        if (timeDiff > 500) {
          let progress = e.loaded / e.total;
          var idx = scope.uploads.findIndex((item) => item.id == id);
          if (progress > 0.99) {
            progress = 0.99;
          }
          scope.uploads[idx].progress = progress;
          console.log(scope.uploads[idx]);
          startTime = new Date();
          scope.update();
        }
      });

      // request finished event
      request.addEventListener("load", function (e) {
        console.log(request.status);
        console.log(request.response);
        var idx = scope.uploads.findIndex((item) => item.id == id);
        scope.uploads[idx].progress = 1;

        scope.uploads[idx].status = "Uploaded";
        scope.update();
        resolve(request);
      });

      request.addEventListener("abort", function (e) {
        var idx = scope.uploads.findIndex((item) => item.id == id);

        scope.uploads[idx].status = "Aborted";
        scope.update();
      });

      scope.uploads.push({
        id: id,
        progress: 0,
        fname: file.name,
        request: request,
        status: "Uploading",
      });

      console.log(data);
      // send POST request to server
      request.send(data);
      if (show) {
        scope.show();
      }
      scope.update();
    });
  },

  removeUpload: function (id) {
    var removeIndex = this.uploads.map((item) => item.id).indexOf(id);
    removeIndex >= 0 && this.uploads.splice(removeIndex, 1);
    this.update();
  },

  hasPending: function () {
    var pending = this.uploads.filter((item) => item.status == "Uploading");
    return pending.length;
  },

  cancelUpload: function (grid, rowIndex) {
    var rec = grid.getStore().getAt(rowIndex);
    console.log(rec);
    rec.data.request.abort();
    this.update();
  },
  items: [
    {
      xtype: "grid",

      columns: [
        { text: "File Name", dataIndex: "fname", flex: 1, type: "text" },
        { text: "Topic", dataIndex: "topic", flex: 1, type: "text" },
        {
          text: "Upload Progress",
          dataIndex: "progress",
          flex: 2,
          xtype: "widgetcolumn",
          widget: {
            xtype: "progress",
            textTpl: "{percent}%",
          },
        },
        {
          text: "Status",
          dataIndex: "status",
        },
        {
          xtype: "actioncolumn",
          text: "Actions",
          dataIndex: "actions",
          width: 175,
          items: [
            {
              name: "cancel",
              iconCls: "x-fa fa-stop-circle actionicon",
              tooltip: "Cancel File Upload",
              handler: function (grid, rowIndex, colIndex, btn, e, record) {
                console.log("Cancel");
                grid.up("window").cancelUpload(grid, rowIndex);
              },
              isActionDisabled: function (
                view,
                rowIndex,
                colIndex,
                item,
                record
              ) {
                return !(record.get("status") == "Uploading");
              },
            },
            {
              name: "cancel",
              iconCls: "x-fa fa-times-circle actionicon",
              tooltip: "Cancel File Upload",
              handler: function (grid, rowIndex, colIndex, btn, e, record) {
                grid.up("window").cancelUpload(grid, rowIndex);
                grid.up("window").removeUpload(record.data.id);
              },
            },
          ],
        },
      ],
    },
  ],
});
