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
  resizable: true,
  bodyPadding: 25,
  height: 500,
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
    if (this.editing) {
      if (this.config.update && this.config.update.readOnly) {
        return fields.map((field) => {
          var f = Object.assign({}, field);

          if (this.config.update.readOnly.indexOf(f.name) >= 0) {
            f.xtype = "displayfield";
            f.submitValue = true;
          } else {
            if (f.items && f.items.length) {
              f.items = this.convertFields(f.items);
              // f.items =
            }
          }

          return f;
        });
      } else {
        return fields;
      }
    } else {
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
    }
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
      data = await amfutil.getById(this.route, this.record._id);
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
      this.insert(0, this.convertFields(this.fields));

      bcont.insert(0, [
        {
          text: "Update",
          itemId: "addaccount",
          cls: "button_class",
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

              route = scope.route
                ? route + "/" + scope.record._id
                : Ext.util.History.getToken();

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
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken().split("/")[0],
                  });
                  //   amfutil.getElementByID("pagelist").show();
                  amfutil.showActionIcons(route);

                  amfutil.getElementByID("main-grid").getStore().reload();
                  var form = btn.up("form");
                  // if (!form.subgrid) {
                  //   form.back();
                  // }
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
          cls: "button_class",
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
          cls: "button_class",
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

Ext.define("Amps.util.UpdateRecordController", {
  extend: "Ext.app.ViewController",
  singleton: true,

  updateRecord: function (record) {
    // amfutil.getElementByID("pagelist").hide();

    let route = Ext.util.History.getToken();
    if (route.split("/").length > 1) {
      route = route.split("/")[0];
    }

    amfutil.hideAllButtons();
    amfutil.getElementByID("edit_container").removeAll();
    // amfutil.getElementByID("actionbar").hide();
    const updateFunctions = {
      message_events: this.viewMessages,
      bucket: this.updateBucket,
      // accounts: this.viewAccounts,
      admin: this.updateUser,
      agentget: this.updateAgentGet,
      agentput: this.updateAgentPut,
      topics: this.updateTopic,
      // actions: this.updateAction,
      // services: this.updateService,
    };

    const close = () => {
      var page = Ext.util.History.getToken().split("/")[0];
      var count = amfutil.getElementByID("edit_container").items.length;
      console.log(count);
      if (count > 0) {
        amfutil.getElementByID("edit_container").items.items[0].destroy();
      }
      var pagePanel = amfutil.getElementByID("page-panel-id");
      pagePanel.setActiveItem(0);

      amfutil.redirect(page);
    };
    console.log("Load Update");
    var config = ampsgrids.grids[route]();
    var el;
    if (updateFunctions[route]) {
      el = updateFunctions[route](record, route, this, close);
    } else {
      if (config.subgrids) {
        el = this.viewSubGrids(record, route, this, close);
      } else {
        el = this.createForm(record, route, this, close);
      }
    }

    el = Ext.apply(el, { region: "center" });
    amfutil.getElementByID("edit_container").add(el);
  },

  createForm: function (record, route, scope, close, subgrid) {
    var grid = amfutil.getElementByID("main-grid");
    // scope = btn.lookupController();
    var config = ampsgrids.grids[route]();
    var fields = config.fields;
    if (config.update && config.update.fields) {
      fields.concat(config.update.fields);
    }

    var myForm = Ext.create("Amps.form.update");
    myForm.loadForm(config, record, true);
    console.log(config.types);

    console.log();

    return myForm;
  },

  viewMessages: function (record, route) {
    var details = Ext.create("Amps.view.messages.MessageActivity");
    console.log(details);
    delete record.id;
    // amfutil.showItemButtons(route);
    details.loadMessageActivity(record);

    return details;
  },

  viewSubGrids: function (record, route, scope, close) {
    var page = ampsgrids.grids[route]();
    var object = page.object;
    var tabItems = [
      Ext.apply(scope.createForm(record, route, this, close, true), {
        title: object + " Info",
      }),
    ].concat(
      Object.entries(page.subgrids).map((subgrid) => {
        var field = subgrid[0];

        var gridinfo = subgrid[1];
        function handleAction() {
          var tokens = Ext.util.History.getToken().split("/");
          if (tokens.length >= 3) {
            if (tokens.length > 3) {
              amfutil.hideAllButtons();
            } else {
              amfutil.showFieldIcons(tokens[0], tokens[2]);
            }
          }
        }
        if (gridinfo.grid) {
          var items = gridinfo.options
            ? gridinfo.options.map((option) => amfutil.gridactions[option])
            : null;

          var actioncolumn = {
            xtype: "actioncolumn",
            text: "Actions",
            dataIndex: "actions",
            controller: "rules",
            width: 175,
            items: items,
          };

          var grid = new Ext.grid.Panel({
            cls: "ufa-grid",
            itemId: `${route}-${field}`,
            field: field,

            plugins: ["gridfilters"],
            store: amfutil.createFieldStore(route, record._id, field),
            columns: gridinfo.columns.concat(items ? [actioncolumn] : null),
            bbar: {
              xtype: "pagingtoolbar",
              displayInfo: true,
            },
          });

          console.log(gridinfo.title);
          console.log(field);
          console.log(grid);

          var fieldPanel = new Ext.panel.Panel({
            title: gridinfo.title,
            layout: "card",
            field: field,
            itemId: field + "-page-panel",

            items: [grid],
            listeners: {
              afterlayout: function (fp, layout, eopts) {
                console.log(layout, "changed");
                handleAction();
              },
            },
          });

          grid.setListeners({
            rowdblclick: async function (
              grid,
              record,
              element,
              rowIndex,
              e,
              eOpts
            ) {
              console.log(rowIndex);
              console.log(route);
              // amfutil.hideAllButtons();
              let currRoute = Ext.util.History.getToken();
              var tbar = [
                {
                  xtype: "button",
                  text: "Back",
                  itemId: "detailsbackbtn",
                  iconCls: "fa fa-arrow-circle-left",
                  handler: function (btn) {
                    fieldPanel.setActiveItem(0);
                    amfutil.redirectTo(currRoute);
                    fieldPanel.remove(1);
                  },
                },
              ];

              const back = () => {
                fieldPanel.setActiveItem(0);
                amfutil.redirectTo(currRoute);
                fieldPanel.remove(1);
              };
              // amfutil.hideAllButtons();

              var config = page.subgrids[field];
              console.log(config);
              var fields = config.fields;
              if (config.update && config.update.fields) {
                fields.concat(config.update.fields);
              }

              var updateForm = Ext.create("Amps.form.update");
              updateForm.loadForm(config, record.data);
              var tokens = currRoute.split("/");
              var item = await amfutil.getById(tokens[0], tokens[1]);
              id = item._id;
              updateForm.entity = id;
              console.log(config.types);
              console.log(gridinfo);
              var win = Ext.create("Ext.window.Window", {
                title: "View " + config.object,
                layout: "fit",
                items: [updateForm],
                width: 600,
                height: 600,
                modal: true,
                listeners: {
                  hide: function () {
                    amfutil.redirectTo(currRoute);
                    // handleAction();
                  },
                },
              });
              win.show();

              // fieldPanel.insert({
              //   xtype: "panel",
              //   tbar: tbar,
              //   items: [updateForm],
              //   layout: "fit",
              // });
              amfutil.redirect(currRoute + "/" + record.data._id);
            },
          });

          return fieldPanel;
        } else {
          var updateForm = Ext.create("Amps.form.update");
          updateForm.loadForm(
            gridinfo,
            record[field] || {},
            false,
            false,
            false
          );
          var fieldPanel = new Ext.panel.Panel({
            title: gridinfo.title,
            layout: "card",
            field: field,
            itemId: field + "-page-panel",
            items: [updateForm],
            listeners: {
              afterlayout: function (fp, layout, eopts) {
                console.log(layout, "changed");
                handleAction();
              },
            },
          });

          return fieldPanel;
        }
      })
    );
    console.log(tabItems);

    var tabpanel = new Ext.tab.Panel({
      title: `Edit ${object}: ${record.username}`,
      listeners: {
        beforetabchange: function (tabPanel, newCard, oldCard, eOpts) {
          console.log(newCard);
          var tokens = Ext.util.History.getToken().split("/");
          if (newCard.field) {
            amfutil.redirect(`${tokens[0]}/${tokens[1]}/${newCard.field}`);
            amfutil.showFieldIcons(tokens[0], newCard.field);
          } else {
            amfutil.redirect(`${tokens[0]}/${tokens[1]}`);
          }
        },
      },
      items: tabItems,
    });
    return tabpanel;
  },

  viewAccounts: function (record, route, scope, close) {
    var tabItems = [
      Ext.apply(scope.updateAccounts(record, route, this, close), {
        title: "Account Info",
      }),
    ].concat(
      Object.entries(ampsgrids.grids[route].subgrids).map((subgrid) => {
        var field = subgrid[0];

        var gridinfo = subgrid[1];
        var items = gridinfo.options
          ? gridinfo.options.map((option) => amfutil.gridactions[option])
          : null;

        var actioncolumn = {
          xtype: "actioncolumn",
          text: "Actions",
          dataIndex: "actions",
          controller: "rules",
          width: 175,
          items: items,
        };

        var grid = new Ext.grid.Panel({
          cls: "ufa-grid",
          itemId: `${route}-${field}`,
          field: field,

          plugins: ["gridfilters"],
          store: amfutil.createFieldStore(route, record._id, field),
          columns: gridinfo.columns.concat(items ? [actioncolumn] : null),
          bbar: {
            xtype: "pagingtoolbar",
            displayInfo: true,
          },
        });

        console.log(gridinfo.title);
        console.log(field);

        var fieldPanel = new Ext.panel.Panel({
          title: gridinfo.title,
          layout: "card",
          field: field,
          itemId: field + "-page-panel",
          items: [grid],
          listeners: {
            afterlayout: function (fp, layout, eopts) {
              console.log(layout, "changed");
              var tokens = Ext.util.History.getToken().split("/");
              if (tokens.length >= 3) {
                if (tokens.length > 3) {
                  amfutil.hideAllButtons();
                } else {
                  amfutil.showFieldIcons(tokens[0], tokens[2]);
                }
              }
            },
          },
        });

        grid.setListeners({
          rowdblclick: function (grid, record, element, rowIndex, e, eOpts) {
            console.log(rowIndex);
            console.log(route);
            amfutil.hideAllButtons();
            let currRoute = Ext.util.History.getToken();
            var tbar = [
              {
                xtype: "button",
                text: "Back",
                itemId: "detailsbackbtn",
                iconCls: "fa fa-arrow-circle-left",
                handler: function (btn) {
                  fieldPanel.setActiveItem(0);
                  amfutil.redirectTo(currRoute);
                  fieldPanel.remove(1);
                },
              },
            ];

            const back = () => {
              fieldPanel.setActiveItem(0);
              amfutil.redirectTo(currRoute);
              fieldPanel.remove(1);
            };
            // amfutil.hideAllButtons();
            var updateForm = ampsgrids.grids[route].subgrids[field].update(
              record.data,
              route,
              tbar,
              back,
              scope
            );

            fieldPanel.insert(updateForm);
            amfutil.redirect(currRoute + "/" + rowIndex);
            fieldPanel.setActiveItem(1);
          },
        });

        return fieldPanel;
      })
    );
    console.log(tabItems);

    var tabpanel = new Ext.tab.Panel({
      title: `Edit Account: ${record.username}`,
      listeners: {
        beforetabchange: function (tabPanel, newCard, oldCard, eOpts) {
          console.log(newCard);
          var tokens = Ext.util.History.getToken().split("/");
          if (newCard.field) {
            amfutil.redirect(`${tokens[0]}/${tokens[1]}/${newCard.field}`);
            amfutil.showFieldIcons(tokens[0], newCard.field);
          } else {
            amfutil.redirect(`${tokens[0]}/${tokens[1]}`);
          }
        },
      },
      items: tabItems,
    });
    return tabpanel;
  },

  viewRules: function (record, route, scope, close) {
    // amfutil.getElementByID("actionbar").show();
    // amfutil.showFieldIcons(route, "rules");
    // var bucketid = record._id;

    // var items = ampsgrids.grids[route].subgrids["rules"].options
    //   ? ampsgrids.grids[route].subgrids["rules"].options.map(
    //       (option) => amfutil.gridactions[option]
    //     )
    //   : null;

    // var actioncolumn = {
    //   xtype: "actioncolumn",
    //   text: "Actions",
    //   dataIndex: "actions",
    //   controller: "rules",
    //   width: 175,
    //   items: items,
    // };

    // amfutil.redirect("topics/" + bucketid + "/rules");

    // var grid = new Ext.grid.Panel({
    //   cls: "ufa-grid",
    //   itemId: "bucket-rules",

    //   title: "Rules for Topic: " + record.name,

    //   plugins: ["gridfilters"],
    //   store: amfutil.createFieldStore(route, bucketid, "rules"),
    //   columns: ampsgrids.grids["topics"].subgrids.rules.columns.concat(
    //     items ? [actioncolumn] : null
    //   ),
    //   bbar: {
    //     xtype: "pagingtoolbar",
    //     displayInfo: true,
    //   },
    // });

    // var rulepanel = new Ext.panel.Panel({
    //   layout: "card",
    //   itemId: "rule-page-panel",
    //   items: [grid],
    // });

    // grid.setListeners({
    //   rowdblclick: function (grid, record, element, rowIndex, e, eOpts) {
    //     console.log(rowIndex);
    //     console.log(route);
    //     let currRoute = Ext.util.History.getToken();
    //     amfutil.hideAllButtons();
    //     rulepanel.insert(
    //       scope.updateRules(record.data, route, rowIndex, grid, rulepanel)
    //     );
    //     amfutil.redirect(currRoute + "/" + rowIndex);
    //     rulepanel.setActiveItem(1);
    //   },
    //   cellcontextmenu: function (
    //     table,
    //     td,
    //     cellIndex,
    //     record,
    //     tr,
    //     rowIndex,
    //     e
    //   ) {
    //     CLIPBOARD_CONTENTS = td.innerText;
    //     amfutil.copyTextdata(e);
    //   },
    // });

    // return rulepanel;

    var tabItems = [
      Ext.apply(scope.updateTopic(record, route, this, close), {
        title: "Topic Info",
      }),
    ].concat(
      Object.entries(ampsgrids.grids[route].subgrids).map((subgrid) => {
        var field = subgrid[0];

        var gridinfo = subgrid[1];
        var items = gridinfo.options
          ? gridinfo.options.map((option) => amfutil.gridactions[option])
          : null;

        var actioncolumn = {
          xtype: "actioncolumn",
          text: "Actions",
          dataIndex: "actions",
          controller: "rules",
          width: 175,
          items: items,
        };

        var grid = new Ext.grid.Panel({
          cls: "ufa-grid",
          itemId: `${route}-${field}`,
          field: field,
          record: record,

          plugins: ["gridfilters"],
          store: amfutil.createFieldStore(route, record._id, field),
          columns: gridinfo.columns.concat(items ? [actioncolumn] : null),
          bbar: {
            xtype: "pagingtoolbar",
            displayInfo: true,
          },
        });

        console.log(gridinfo.title);
        console.log(field);

        var fieldPanel = new Ext.panel.Panel({
          title: gridinfo.title,
          layout: "card",
          field: field,
          itemId: field + "-page-panel",
          items: [grid],
          listeners: {
            afterlayout: function (fp, layout, eopts) {
              console.log(layout, "changed");
              var tokens = Ext.util.History.getToken().split("/");
              if (tokens.length >= 3) {
                if (tokens.length > 3) {
                  amfutil.hideAllButtons();
                } else {
                  amfutil.showFieldIcons(tokens[0], tokens[2]);
                }
              }
            },
          },
        });

        grid.setListeners({
          rowdblclick: function (grid, record, element, rowIndex, e, eOpts) {
            console.log(rowIndex);
            console.log(route);
            amfutil.hideAllButtons();
            let currRoute = Ext.util.History.getToken();
            var tbar = [
              {
                xtype: "button",
                text: "Back",
                itemId: "detailsbackbtn",
                iconCls: "fa fa-arrow-circle-left",
                handler: function (btn) {
                  fieldPanel.setActiveItem(0);
                  amfutil.redirectTo(currRoute);
                  fieldPanel.remove(1);
                },
              },
            ];

            const back = () => {
              fieldPanel.setActiveItem(0);
              amfutil.redirectTo(currRoute);
              fieldPanel.remove(1);
            };
            // amfutil.hideAllButtons();
            var updateForm = ampsgrids.grids[route].subgrids[field].update(
              record.data,
              route,
              tbar,
              back,
              scope,
              record
            );

            fieldPanel.insert(updateForm);
            amfutil.redirect(currRoute + "/" + rowIndex);
            fieldPanel.setActiveItem(1);
          },
        });

        return fieldPanel;
      })
    );
    console.log(tabItems);

    var tabpanel = new Ext.tab.Panel({
      title: `Edit Topic: ${record.subject}`,
      style: {
        paddingLeft: 10,
        paddingRight: 10,
      },

      listeners: {
        beforetabchange: function (tabPanel, newCard, oldCard, eOpts) {
          console.log(newCard);
          var tokens = Ext.util.History.getToken().split("/");
          if (newCard.field) {
            amfutil.redirect(`${tokens[0]}/${tokens[1]}/${newCard.field}`);
            amfutil.showFieldIcons(tokens[0], newCard.field);
          } else {
            amfutil.redirect(`${tokens[0]}/${tokens[1]}`);
          }
        },
      },
      items: tabItems,
    });
    return tabpanel;
  },

  updateAction: function (record, route, scope, close) {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    console.log("record is ", record);
    var myForm = Ext.create("Amps.form.update");
    myForm.loadForm(
      "Action",
      [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Action Name",
          allowBlank: false,
          value: record.name,
          width: 400,
          listeners: {
            change: async function (cmp, value, oldValue, eOpts) {
              var duplicate = await amfutil.checkDuplicate({
                actions: { name: value },
              });

              if (duplicate) {
                cmp.setActiveError("Action Already Exists");
                cmp.setValidation("Action Already Exists");
                // cmp.isValid(false);
              } else {
                cmp.setActiveError();
                cmp.setValidation();
              }
            },
          },
        },
        {
          xtype: "combobox",
          fieldLabel: "Topic Type",
          allowBlank: false,
          displayField: "label",
          valueField: "field",
          forceSelection: true,
          flex: 1,
          name: "type",
          store: Object.entries(ampsgrids.grids.actions.types).map(
            (entry) => entry[1]
          ),
          listeners: {
            change: function (scope, value) {
              var form = scope.up("form");
              var actionparms = form.down("#action-parms");
              actionparms.removeAll();
              ampsgrids.grids.actions.types[value].fields.forEach((f) => {
                var field = {};
                field = Object.assign(field, f);
                field = Ext.apply(field, { value: record[field.name] });
                actionparms.insert(field);
              });
            },
            beforerender: function (scope, value) {
              scope.setValue(record.type);
            },
            afterrender: function (scope) {
              var form = scope.up("form");
              if (ampsgrids.grids.actions.types[record.type].load) {
                ampsgrids.grids.actions.types[record.type].load(form, record);
              }
            },
          },
        },
        {
          xtype: "container",
          itemId: "action-parms",
        },
      ],
      (values, form) => {
        console.log(values);
        if (ampsgrids.grids.actions.types[values.type].process) {
          values = ampsgrids.grids.actions.types[values.type].process(
            form,
            values
          );
        }
        values = amfutil.convertNumbers(form.getForm(), values);

        return values;
      }
    );
    return myForm;
  },

  updateTopic: function (record, route, scope, close) {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    console.log("record is ", record);

    var myForm = Ext.create("Amps.form.update");
    myForm.loadForm(
      {
        object: "Topic",
        fields: [
          {
            xtype: "textfield",
            name: "topic",
            fieldLabel: "Topic",
            allowBlank: false,
            value: record.topic,
            // listeners: {
            //   afterrender: function (cmp) {
            //     cmp.inputEl.set({
            //       autocomplete: "nope",
            //     });
            //   },
            //   change: amfutil.uniqueBucket,
            //   blur: function (item) {
            //     //  amfutil.removeSpaces(item.itemId);
            //   },
            // },
            width: 400,
            tooltip: "The Topic",
          },
          {
            xtype: "radiogroup",
            xtype: "radiogroup",
            fieldLabel: "Topic Type",
            name: "type",
            allowBlank: false,
            blankText: "Select One",
            columns: 3,
            vertical: true,
            tooltip: "The type/function of this topic.",
            items: [
              {
                boxLabel: "Action",
                margin: 5,
                flex: 1,
                name: "type",
                inputValue: "actions",
              },
              {
                flex: 1,
                margin: 5,

                boxLabel: "Service",
                name: "type",
                inputValue: "svcs",
              },
              {
                flex: 1,
                margin: 5,

                boxLabel: "Data",
                name: "type",
                inputValue: "data",
              },
            ],
          },
          {
            xtype: "textfield",
            name: "desc",
            fieldLabel: "Topic Description",
            value: record.desc,
            allowBlank: false,
            tooltip: "Topic Description",
            width: 400,
          },
        ],
      },
      record,
      true
    );
    return myForm;
  },

  updateService: function (record, route, scope, close) {
    console.log("loading");
    var grid = Ext.ComponentQuery.query("#main-grid")[0];

    var service = ampsgrids.grids["services"].types.find(
      (el) => el.type == record.type
    );
    var myForm = new Ext.form.Panel({
      title: "Update Service Details",
      defaults: {
        padding: 5,
        labelWidth: 180,
      },
      layout: { type: "vbox", align: "stretch" },
      height: 500,
      scrollable: true,
      items: [
        {
          xtype: "container",
          itemId: "formbox",
          layout: { type: "vbox", align: "stretch" },
          items: [
            {
              xtype: "container",
              layout: {
                type: "hbox",
                align: "stretch",
              },
              defaults: {
                margin: 5,
              },
              items: [
                {
                  xtype: "textfield",
                  fieldLabel: "Test",
                  flex: 1,
                },
                {
                  xtype: "textfield",
                  fieldLabel: "Test2",
                  flex: 1,
                },
              ],
            },
          ],
        },
      ],
      buttons: [
        {
          text: "Update",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: async function (btn) {
              console.log("click");
              var form = btn.up("form").getForm();
              var data;
              data = form.getValues();
              var fields = form.getFields();

              console.log(form);
              console.log(data);
              console.log(fields);
              if (service.process) {
                data = await service.process(form);
              } else {
                data = form.getValues();
              }

              service.fields.forEach((field) => {
                console.log(field);

                if (field.xtype == "numberfield") {
                  data[field.name] = parseInt(data[field.name]);
                }
              });

              console.log(data);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: amfutil.getElementByID("edit_container"),
              });
              mask.show();

              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "/api/" + Ext.util.History.getToken(),
                method: "PUT",
                timeout: 60000,
                params: {},
                jsonData: data,
                success: function (response) {
                  mask.hide();
                  amfutil.getElementByID("addaccount").setDisabled(false);
                  Ext.toast("Account updated");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken().split("/")[0],
                  });
                  //   amfutil.getElementByID("pagelist").show();
                  amfutil.showActionIcons(route);

                  grid.getStore().reload();
                  close();
                },
                failure: function (response) {
                  mask.hide();
                  amfutil.getElementByID("addaccount").setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Update User", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              amfutil.redirect(Ext.util.History.getToken().split("/")[0]);
            },
          },
        },
      ],
    });

    var form = myForm.down("container");
    console.log(form);
    form.removeAll();

    var hbox = {
      xtype: "container",
      layout: {
        type: "hbox",
        align: "stretch",
      },
      defaults: {
        margin: 5,
        flex: 1,
      },
    };

    var type = ampsgrids.grids["services"].types.find(
      (type) => type.type == record.type
    );
    console.log(type.fields);
    console.log(ampsgrids.grids["services"]);
    var fields = [];
    fields = fields.concat(ampsgrids.grids["services"].commonFields);
    fields = fields.concat(type.fields);

    var items = [];
    var com = hbox;
    com.items = [
      {
        xtype: "displayfield",
        name: "type",
        fieldLabel: "Type",
        value: record.type,
        submitValue: true,
      },
    ];
    form.insert(com);

    for (var i = 0; i < fields.length; i++) {
      var field = {};
      field = Object.assign(field, fields[i]);
      if (!field.skip) {
        field = Ext.apply(field, { value: record[field.name] });
      }
      console.log(field.name);
      if (field.name == "name") {
        field.xtype = "displayfield";
      }
      if (field.row) {
        form.insert(field);
      } else {
        items.push(field);
        if (items.length == 2) {
          var row = hbox;
          row.items = items;

          form.insert(row);
          items = [];
        } else if (i == fields.length - 1) {
          var row = hbox;
          items.push({
            xtype: "displayfield",
          });
          row.items = items;

          form.insert(row);
          items = [];
        }
      }
    }

    if (service.load) {
      service.load(form, record);
    }

    return myForm;
  },

  updateQueue: function (record, route, scope, close) {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    console.log("record is ", record);
    var myForm = Ext.create("Amps.form.update");
    myForm.loadForm("Queue", [
      {
        xtype: "textfield",
        name: "name",
        fieldLabel: "Queue Name",
        allowBlank: false,
        value: record.name,
        // listeners: {
        //   afterrender: function (cmp) {
        //     cmp.inputEl.set({
        //       autocomplete: "nope",
        //     });
        //   },
        //   change: amfutil.uniqueBucket,
        //   blur: function (item) {
        //     //  amfutil.removeSpaces(item.itemId);
        //   },
        // },
        width: 400,
      },
      {
        xtype: "combobox",
        fieldLabel: "Queue Type",
        allowBlank: false,
        displayField: "label",
        valueField: "field",
        value: record.type,
        forceSelection: true,
        flex: 1,
        name: "type",
        store: [
          {
            field: "fifo",
            label: "First in, First Out",
          },
          {
            field: "lifo",
            label: "Last in, First Out",
          },
          {
            field: "priority",
            label: "Priority",
          },
        ],
      },
      {
        xtype: "textfield",
        name: "description",
        fieldLabel: "Queue Description",
        value: record.description,
        // maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
        allowBlank: false,
        // listeners: {
        //   afterrender: function (cmp) {
        //     cmp.inputEl.set({
        //       autocomplete: "nope",
        //     });
        //   },
        //   change: amfutil.uniqueBucket,
        //   blur: function (item) {
        //     //  amfutil.removeSpaces(item.itemId);
        //   },
        // },
        width: 400,
      },
    ]);
    return myForm;
  },

  updateUser: function (record, route, scope, close) {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    console.log("record is ", record);
    var myForm = new Ext.form.Panel({
      title: "User Details",
      defaults: {
        padding: 5,
        labelWidth: 180,
      },
      height: 500,
      scrollable: true,
      items: [
        {
          xtype: "displayfield",
          name: "username",
          fieldLabel: "User Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          vtype: "alphnumVtype",
          vtypeText: "Please enter a valid user name",
          allowBlank: false,
          itemId: "username",
          value: record["username"],
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            blur: function (item) {
              //  amfutil.removeSpaces(item.itemId);
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
            change: async function (cmp) {
              await amfutil.duplicateHandler(
                cmp,
                { admin: { username: value } },
                "Admin User Already Exists",
                amfutil.nameValidator
              );
            },
          },
          width: 550,
        },
        {
          xtype: "textfield",
          name: "given_name",
          itemId: "given_name",
          fieldLabel: "Given Name",
          vtype: "textbox",
          value: record["firstname"],
          vtypeText: "Please enter a valid given name",
          allowBlank: false,
          width: 550,
        },
        {
          xtype: "textfield",
          name: "surname",
          itemId: "surname",
          fieldLabel: "Surname",
          allowBlank: false,
          vtype: "textbox",
          value: record["lastname"],
          vtypeText: "Please enter a valid surname",
          width: 550,
        },
        {
          xtype: "textfield",
          itemId: "email",
          name: "email",
          vtype: "email",
          fieldLabel: "Email",
          value: record["email"],
          allowBlank: false,
          width: 550,
        },
        {
          xtype: "textfield",
          name: "phone_number",
          fieldLabel: "Phone Number",
          allowBlank: true,
          value: record["phone"],
          itemId: "phone_number",
          vtype: "phone",
          width: 550,
       
        },
        {
          xtype: "combobox",
          name: "role",
          fieldLabel: "Role",
          allowBlank: false,
          value: record["role"],
          itemId: "role",
          store: ["Admin", "Guest"],
          width: 550,
        },
        {
          xtype: "checkbox",
          name: "approved",
          value: record["approved"],
          fieldLabel: "Approved",
          uncheckedValue: false,
          inputValue: true,
          allowBlank: false,
          forceSelection: true,
        },
      ],
      buttons: [
        {
          text: "Update",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var username = form.findField("username").getSubmitValue();
              var given_name = form.findField("given_name").getSubmitValue();
              var surname = form.findField("surname").getSubmitValue();
              var email = form.findField("email").getSubmitValue();
              var phone_number = form
                .findField("phone_number")
                .getSubmitValue();
              var approved = form.findField("approved").getSubmitValue();
              var role = form.findField("role").getSubmitValue();
              // page_size = grid.store.pageSize;
              amfutil.getElementByID("addaccount").setDisabled(true);

              var scope = this;
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: amfutil.getElementByID("edit_container"),
              });
              mask.show();

              var user = {
                username: username,
                firstname: given_name,
                lastname: surname,
                email: email,
                phone: phone_number,
                approved: approved,
                role: role,
              };


              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "/api/" + route + "/" + record._id,
                method: "PUT",
                timeout: 60000,
                params: {},
                jsonData: user,
                success: function (response) {
                  mask.hide();
                  amfutil.getElementByID("addaccount").setDisabled(false);
                  Ext.toast("Account updated");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken().split("/")[0],
                  });
                  //   amfutil.getElementByID("pagelist").show();
                  amfutil.showActionIcons(route);

                  grid.getStore().reload();
                  close();
                },
                failure: function (response) {
                  mask.hide();
                  amfutil.getElementByID("addaccount").setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Update User", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              amfutil.redirect(Ext.util.History.getToken().split("/")[0]);
            },
          },
        },
      ],
    });
    return myForm;
  },

  updateAccounts: function (record, route, scope, close) {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    console.log("record is ", record);
    var myForm = new Ext.form.Panel({
      title: "Account Details",
      defaults: {
        padding: 5,
        labelWidth: 180,
        width: 550,
      },
      height: 500,
      scrollable: true,
      items: [
        {
          xtype: "displayfield",
          name: "username",
          fieldLabel: "User Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          vtype: "alphnumlowercaseVtype",
          vtypeText: "Username must only use lowercase letters and numbers",
          allowBlank: false,
          itemId: "username",
          value: record["username"],
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            blur: function (item) {},
          },
          width: 550,
        },

        {
          xtype: "textfield",
          name: "given_name",
          itemId: "given_name",
          fieldLabel: "Given Name",
          vtype: "textbox",
          value: record["given_name"],
          vtypeText: "Please enter a valid given name",
          allowBlank: false,
          width: 550,
          listeners: {
            blur: function (field) {},
            change: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "surname",
          itemId: "surname",
          fieldLabel: "Surname",
          allowBlank: false,
          vtype: "textbox",
          value: record["surname"],
          vtypeText: "Please enter a valid surname",
          width: 550,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          itemId: "email",
          name: "email",
          vtype: "email",
          fieldLabel: "Email",
          value: record["email"],
          allowBlank: false,
          width: 550,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "phone_number",
          fieldLabel: "Phone Number",
          allowBlank: false,
          value: record["phone_number"],
          itemId: "phone_number",
          vtype: "phone",
          width: 550,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "edit_ufa_home_folder",
          itemId: "edit_ufa_home_folder",
          fieldLabel: "UFA Home Folder",
          allowBlank: false,
          value: record.ufahome,
        },
        {
          xtype: "textfield",
          name: "edit_config_polling_interval",
          itemId: "edit_config_polling_interval",
          fieldLabel: "Configuration Polling Interval(Sec)",
          value: record.cinterval,
        },
        {
          xtype: "textfield",
          name: "edit_heartbeat_polling_interval",
          itemId: "edit_heartbeat_polling_interval",
          fieldLabel: "Hearbeat Polling Interval(Sec)",
          value: record.hinterval,
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
          },
        },
        {
          xtype: "textfield",
          name: "edit_log_file_path",
          itemId: "edit_log_file_path",
          fieldLabel: "Log File Path",
          value: record.logpath,
          readOnly: true,
          listeners: {
            focus: function (cmp) {
              cmp.setReadOnly(false);
            },
          },
        },
        {
          xtype: "checkboxfield",
          name: "edit_debug_logging",
          itemId: "edit_debug_logging",
          fieldLabel: "Debug Logging",
          value: record.debug,
        },
        {
          xtype: "displayfield",
          name: "edit_aws_access_key_id",
          itemId: "edit_aws_access_key_id",
          fieldLabel: "Access Key Id",
          value: record.aws_access_key_id,
        },
        {
          xtype: "textfield",
          name: "edit_aws_secret_access_key",
          itemId: "edit_aws_secret_access_key",
          fieldLabel: "Secret Access Key",
          inputType: "password",
          validator: function (val) {
            // remove non-numeric characters
            var errMsg = "Must be between 8 and 40 characters";
            // if the numeric value is not 10 digits return an error message
            return (val.length >= 8 && val.length <= 40) || val.length == 0
              ? true
              : errMsg;
          },
          readOnly: true,
          listeners: {
            focus: function (cmp) {
              cmp.setReadOnly(false);
            },
          },
        },
      ],
      buttons: [
        {
          text: "Update",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var username = form.findField("username").getSubmitValue();
              var given_name = form.findField("given_name").getSubmitValue();
              var surname = form.findField("surname").getSubmitValue();
              var email = form.findField("email").getSubmitValue();
              var phone_number = form
                .findField("phone_number")
                .getSubmitValue();
              // page_size = grid.store.pageSize;
              var ufa_home_folder = form
                .findField("edit_ufa_home_folder")
                .getSubmitValue();
              var config_polling_interval = form
                .findField("edit_config_polling_interval")
                .getSubmitValue();
              var heartbeat_polling_interval = form
                .findField("edit_heartbeat_polling_interval")
                .getSubmitValue();
              var log_file_path = form
                .findField("edit_log_file_path")
                .getSubmitValue();
              var debug_logging = form
                .findField("edit_debug_logging")
                .getValue();
              var aws_access_key_id = form
                .findField("edit_aws_access_key_id")
                .getSubmitValue();
              var aws_secret_access_key = form
                .findField("edit_aws_secret_access_key")
                .getSubmitValue();
              amfutil.getElementByID("addaccount").setDisabled(true);

              var scope = this;
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: amfutil.getElementByID("edit_container"),
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "/api/" + route + "/" + record._id,
                method: "PUT",
                timeout: 60000,
                params: {},
                jsonData: {
                  id: record._id,
                  username: username,
                  password: record["password"],
                  given_name: given_name,
                  surname: surname,
                  given_name: given_name,
                  email: email,
                  phone_number: phone_number,
                  ufahome: ufa_home_folder,
                  cinterval: config_polling_interval,
                  hinterval: heartbeat_polling_interval,
                  logpath: log_file_path,
                  debug: debug_logging,
                  aws_access_key_id: aws_access_key_id,
                  aws_secret_access_key: aws_secret_access_key,
                },
                success: function (response) {
                  var page = Ext.util.History.getToken().split("/")[0];
                  mask.hide();
                  amfutil.getElementByID("addaccount").setDisabled(false);
                  Ext.toast("Account updated");
                  amfutil.broadcastEvent("update", {
                    page: page,
                  });
                  //   amfutil.getElementByID("pagelist").show();
                  amfutil.showActionIcons(route);
                  grid.getStore().reload();
                  amfutil.redirect(page);
                  close();
                },
                failure: function (response) {
                  mask.hide();
                  amfutil.getElementByID("addaccount").setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Update Account", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              close();
            },
          },
        },
      ],
    });
    return myForm;
  },

  updateRules: function (record, route, idx, grid, rulepanel) {
    // var grid = Ext.ComponentQuery.query("#bucket-rules")[0];
    // var rulepanel = Ext.ComponentQuery.query("#rule-page-panel")[0];
    var tokens = Ext.util.History.getToken().split("/");
    console.log(record);
    console.log(grid);
    console.log(rulepanel);
    console.log("record is ", record);
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
      },
      scrollable: "y",
      items: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Name",
          forceSelection: true,
          listeners: {
            afterrender: function (field) {
              field.focus();
            },
            onchange: function () {},
          },
          value: record.name,
        },
        {
          xtype: "checkbox",
          name: "active",
          fieldLabel: "Active",
          uncheckedValue: false,
          inputValue: true,
          allowBlank: false,
          forceSelection: true,
          listeners: {
            afterrender: function (field) {
              field.focus();
            },
            onchange: function () {},
          },
          value: record.active,
        },
        {
          xtype: "checkbox",
          name: "ediflag",
          fieldLabel: "Parse EDI Data",
          uncheckedValue: false,
          inputValue: true,
          allowBlank: false,
          forceSelection: true,
          listeners: {
            afterrender: function (field) {
              field.focus();
            },
            onchange: function () {},
          },
          value: record.ediflag,
        },
        {
          xtype: "checkbox",
          name: "scanflag",
          fieldLabel: "Perform Antivirus Scan",
          uncheckedValue: false,
          inputValue: true,
          allowBlank: false,
          forceSelection: true,
          value: record.scanflag,
        },
        {
          xtype: "combobox",
          name: "action",
          fieldLabel: "Action",
          queryMode: "local",
          itemId: "action",
          store: Ext.create("Ext.data.Store", {
            fields: ["value", "label"],
            data: [
              { value: "mailbox", label: "Mailbox" },
              { value: "hold", label: "Hold" },
            ],
          }),
          //   value: record.action,
          displayField: "label",
          valueField: "value",
          listeners: {
            change: async function (combo, val, eOpts) {
              var container = this.up().query("#actioncond")[0];
              console.log(record);
              if (val == "hold") {
                container.removeAll();
                container.insert({
                  xtype: "combobox",
                  fieldLabel: "Status",
                  name: "status",
                  itemId: "status",
                  store: [
                    { value: "received", label: "Received" },
                    { value: "held", label: "Held" },
                    { value: "warning", label: "Warning" },
                    { value: "failed", label: "Failed" },
                  ],
                  valueField: "value",
                  displayField: "label",
                  value: record.parms.status,
                });
                container.insert({
                  xtype: "textfield",
                  fieldLabel: "Reason",
                  name: "reason",
                  itemId: "reason",
                  value: record.parms.reason,
                });
              } else if (val == "mailbox") {
                var buckets = await amfutil.getBuckets();
                buckets = buckets.map((bucket) => {
                  return bucket.name;
                });
                console.log("mailbox");
                container.removeAll();
                container.insert({
                  xtype: "combobox",
                  fieldLabel: "Bucket",
                  name: "bucket",
                  value: record.parms.mailbox,
                  store: buckets,
                });
                container.insert({
                  xtype: "textfield",
                  fieldLabel: "Prefix",
                  name: "prefix",
                  value: record.parms.prefix,
                  validator: function (val) {
                    if (val == "") {
                      return true;
                    } else {
                      if (val[0] == "/") {
                        return "Prefix cannot begin with /";
                      } else {
                        return true;
                      }
                    }
                  },
                });
              }
              console.log();
            },
          },
          allowBlank: false,
          forceSelection: true,
        },
        {
          xtype: "fieldcontainer",
          itemId: "actioncond",
        },
        {
          // Fieldset in Column 1 - collapsible via toggle button
          xtype: "fieldset",
          title: "Match Patterns",
          collapsible: true,
          onAdd: function (component, position) {
            // component.setTitle("Match Pattern" + position);
            console.log(component);
            console.log(position);
          },
          itemId: "matchpatterns",
          items: [
            {
              xtype: "button",
              text: "Add",
              handler: function (button, event) {
                var formpanel = button.up();

                formpanel.insert(
                  formpanel.items.length - 1,
                  Ext.create("Amps.form.Matchpattern")
                );
              },
            },
          ],
        },
        {
          // Fieldset in Column 1 - collapsible via toggle button
          xtype: "fieldset",
          title: "Default Metadata",
          collapsible: true,
          onAdd: function (component, position) {
            // component.setTitle("Match Pattern" + position);
            console.log(component);
            console.log(position);
          },
          itemId: "defaults",
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
          text: "Save",
          itemId: "add",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var fields = form.getFields();
              var values = form.getValues();
              var rule = {};
              console.log(values);
              rule.ediflag = values.ediflag;
              rule.scanflag = values.scanflag;
              rule.action = values.action;
              rule.name = values.name;
              rule.parms = {};

              rule.active = values.active;

              switch (rule.action) {
                case "hold":
                  rule.parms.status = values.status;
                  rule.parms.reason = values.reason;
                  break;
                case "mailbox":
                  rule.parms.mailbox = values.bucket;
                  rule.parms.prefix = values.prefix.length
                    ? values.prefix.slice(-1) == "/"
                      ? values.prefix
                      : values.prefix + "/"
                    : values.prefix;
                  break;
                default:
                  console.log(`Invalid Action`);
              }

              var patterns = values.patterns
                ? Array.isArray(values.patterns)
                  ? values.patterns.map((pattern) => {
                      return JSON.parse(pattern);
                    })
                  : [JSON.parse(values.patterns)]
                : [];

              rule.patterns = {};

              patterns.forEach((pattern) => {
                rule.patterns[pattern.field] = {
                  value: pattern.pattern,
                  regex: pattern.regex,
                };
              });

              var defaults = values.defaults
                ? Array.isArray(values.defaults)
                  ? values.defaults.map((defaultobj) => {
                      return JSON.parse(defaultobj);
                    })
                  : [JSON.parse(values.defaults)]
                : [];
              rule.defaults = {};

              defaults.forEach((def) => {
                rule.defaults[def.field] = def.value;
              });

              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: amfutil.getElementByID("edit_container"),
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "/api/" + Ext.util.History.getToken(),
                method: "PUT",
                timeout: 60000,
                params: {},
                jsonData: rule,
                success: function (response) {
                  var data = Ext.decode(response.responseText);
                  mask.hide();
                  Ext.toast("Record updated");
                  console.log(data);
                  // var rules = data.rules.map((rule) =>
                  //   Object.assign(rule, rule.parms)
                  // );
                  // console.log(rules);
                  rulepanel.setActiveItem(0);
                  while (rulepanel.items.length > 1) {
                    rulepanel.remove(rulepanel.items.length - 1);
                  }
                  amfutil.showItemButtons(route);
                  grid.getStore().reload();
                  amfutil.redirect(
                    tokens[0] + "/" + tokens[1] + "/" + tokens[2]
                  );
                  // //   amfutil.getElementByID("pagelist").show();
                  // amfutil.showActionIcons(route);
                },
                failure: function (response) {
                  mask.hide();
                  amfutil.onFailure("Failed to Update Rule", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              rulepanel.setActiveItem(0);
              while (rulepanel.items.length > 1) {
                rulepanel.remove(rulepanel.items.length - 1);
              }
              amfutil.redirect(tokens[0] + "/" + tokens[1] + "/" + tokens[2]);
              amfutil.showItemButtons(route);
              //   amfutil.getElementByID("pagelist").show();
            },
          },
        },
      ],
    });

    var action = myForm.down("#action");
    action.setValue(record.action);

    console.log(record);
    // if (record.action == "hold") {
    //   myForm.down("#status").setValue(record.parms.status);
    //   myForm.down("#reason").setValue(record.parms.reason);
    // } else {
    //   myForm.down("#bucket").setValue(record.parms.mailbox);
    // }

    record.patterns = record.patterns ? record.patterns : {};

    var patterns = Object.entries(record.patterns).map((entry) => {
      return Object.assign({ field: entry[0] }, entry[1]);
    });

    patterns.forEach(function (pattern) {
      var mcontainer = myForm.down("#matchpatterns");
      var length = mcontainer.items.length;
      var mp = Ext.create("Amps.form.Matchpattern");
      mp.down("#field").setValue(pattern.field);
      mp.down("#regex").setValue(pattern.regex);
      mp.down("#pattern").setValue(pattern.value);
      mcontainer.insert(length - 1, mp);
    });

    record.defaults = record.defaults ? record.defaults : {};

    var defaults = Object.entries(record.defaults).map((entry) => {
      return { field: entry[0], value: entry[1] };
    });

    defaults.forEach(function (def) {
      var dcon = myForm.down("#defaults");
      var length = dcon.items.length;
      var d = Ext.create("Amps.form.Defaults");
      d.down("#field").setValue(def.field);
      d.down("#value").setValue(def.value);
      dcon.insert(length - 1, d);
    });

    return myForm;
  },

  updateAgentGet: function (record, route, updateScope, close) {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    return new Ext.form.Panel({
      title: "Agent Get Details",
      height: 500,
      defaults: {
        padding: 10,
        labelWidth: 180,
        width: 450,
      },
      items: [
        {
          xtype: "hiddenfield",
          name: "edit_get_id",
          value: record._id,
        },
        {
          xtype: "textfield",
          name: "edit_rule_name",
          itemId: "edit_rule_name",
          fieldLabel: "Rule Name",
          allowBlank: false,
          value: record.name,
        },
        {
          xtype: "textfield",
          name: "edit_rule_type",
          itemId: "edit_rule_type",
          fieldLabel: "Rule Type",
          allowBlank: false,
          value: record.rtype,
        },
        {
          xtype: "textfield",
          name: "edit_bpoll",
          itemId: "edit_bpoll",
          fieldLabel: "Bucket Polling Interval(Sec)",
          allowBlank: false,
          value: record.bpoll,
        },
        {
          xtype: "textfield",
          name: "edit_bretry",
          itemId: "edit_bretry",
          fieldLabel: "Get Failure Retry Wait",
          value: record.bretry,
        },
        {
          xtype: "textfield",
          name: "edit_bucket",
          itemId: "edit_bucket",
          fieldLabel: "Bucket Name",
          allowBlank: false,
          value: record.bucket,
        },
        {
          xtype: "textfield",
          name: "edit_prefix",
          itemId: "edit_prefix",
          fieldLabel: "Bucket Path Prefix",
          value: record.prefix,
        },
        {
          xtype: "textfield",
          name: "edit_folder",
          itemId: "edit_folder",
          fieldLabel: "Download Folder Name",
          allowBlank: false,
          value: record.folder,
        },
        {
          xtype: "radiogroup",
          fieldLabel: "Acknowledgment Mode",
          vertical: true,
          id: "edit_ackmode",
          items: [
            { boxLabel: "None", name: "edit_ackmode", inputValue: "none" },
            {
              boxLabel: "Archive",
              name: "edit_ackmode",
              inputValue: "archive",
            },
            { boxLabel: "Delete", name: "edit_ackmode", inputValue: "delete" },
          ],
          listeners: {
            render: function (obj) {
              if (record.ackmode == "none") {
                amfutil
                  .getElementByID("edit_ackmode")
                  .setValue({ edit_ackmode: "none" });
              } else if (record.ackmode == "archive") {
                amfutil
                  .getElementByID("edit_ackmode")
                  .setValue({ edit_ackmode: "archive" });
              } else if (record.ackmode == "delete") {
                amfutil
                  .getElementByID("edit_ackmode")
                  .setValue({ edit_ackmode: "delete" });
              }
            },
            /*change: function (obj) {
              if (obj.value == "move:tofolder") {
                fname = amfutil.getElementByID("edit_get_fname");
                fname.setHidden(false);
                fname.setValue("");
              } else {
                fname = amfutil.getElementByID("edit_get_fname");
                fname.setHidden(true);
              }
            },*/
          },
        },
        /*{
          xtype: "textfield",
          name: "edit_get_fname",
          itemId: "edit_get_fname",
          hidden: true,
          fieldLabel: "Folder Name",
          value: record.fname,
        },*/
      ],
      buttons: [
        {
          xtype: "button",
          text: "Update",
          cls: "button_class",
          itemId: "edit_agentget_id",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var id = form.findField("edit_get_id").getSubmitValue();
              var rule_name = form.findField("edit_rule_name").getSubmitValue();
              var rule_type = form.findField("edit_rule_type").getSubmitValue();
              var bpoll = form.findField("edit_bpoll").getSubmitValue();
              var bretry = form.findField("edit_bretry").getSubmitValue();
              var bucket = form.findField("edit_bucket").getSubmitValue();
              var prefix = form.findField("edit_prefix").getSubmitValue();
              var folder = form.findField("edit_folder").getSubmitValue();
              var ackmode = Ext.getCmp("edit_ackmode")
                .items.get(0)
                .getGroupValue();
              //fname = form.findField("edit_get_fname").getSubmitValue();

              var scope = this;
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: amfutil.getElementByID("edit_container"),
              });
              mask.show();
              amfutil.getElementByID("edit_agentget_id").setDisabled(true);
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "/api/" + route + "/" + id,
                method: "PUT",
                timeout: 60000,
                params: {},
                jsonData: {
                  id: id,
                  name: rule_name,
                  rtype: rule_type,
                  bpoll: bpoll,
                  bretry: bretry,
                  bucket: bucket,
                  prefix: prefix,
                  folder: folder,
                  ackmode: ackmode,
                  //"fname": fname,
                  active: true,
                },
                success: function (response) {
                  amfutil.getElementByID("edit_agentget_id").setDisabled(false);
                  mask.hide();
                  Ext.toast("Record updated");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken().split("/")[0],
                  });
                  //amfutil.getElementByID('pagelist').show()
                  amfutil.showActionIcons(route);
                  console.log(route);
                  console.log(grid);
                  grid.getStore().reload();
                  close();
                  console.log("closed");
                },
                failure: function (response) {
                  amfutil.getElementByID("edit_agentget_id").setDisabled(false);
                  mask.hide();
                  amfutil.onFailure(
                    "Failed to Update Agent Get Rule",
                    response
                  );
                },
              });
            },
          },
        },
        {
          xtype: "button",
          cls: "button_class",
          text: "Cancel",
          listeners: {
            click: function (btn) {
              //amfutil.getElementByID('pagelist').show()
              amfutil.showActionIcons(route);

              grid.getStore().reload();
              close();
            },
          },
        },
      ],
    });
  },

  updateAgentPut: function (record, route, updateScope, close) {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    var form = new Ext.form.Panel({
      title: "Agent Put Details",
      height: 500,
      scrollable: true,
      defaults: {
        padding: 10,
        labelWidth: 180,
        width: 450,
      },
      items: [
        {
          xtype: "hiddenfield",
          name: "edit_put_id",
          value: record._id,
        },
        {
          xtype: "textfield",
          name: "edit_rule_name",
          fieldLabel: "Rule Name",
          allowBlank: false,
          value: record.name,
        },
        {
          xtype: "textfield",
          name: "edit_rule_type",
          fieldLabel: "Rule Type",
          allowBlank: false,
          value: record.rtype,
        },
        {
          xtype: "textfield",
          name: "fpoll",
          itemId: "fpoll",
          fieldLabel: "File Polling Interval(Sec)",
          allowBlank: false,
          value: record.fpoll,
          maskRe: /[0-9]/,
        },
        {
          xtype: "textfield",
          name: "fretry",
          itemId: "fretry",
          fieldLabel: "Failure Retry Wait",
          allowBlank: false,
          value: record.fretry,
          maskRe: /[0-9]/,
        },
        {
          xtype: "checkboxfield",
          name: "regex",
          itemId: "regex",
          fieldLabel: "Regex Flag",
          value: record.regex,
        },
        {
          xtype: "textfield",
          name: "fmatch",
          itemId: "fmatch",
          fieldLabel: "File Match Pattern",
          value: record.fmatch,
        },
        {
          xtype: "textfield",
          name: "bucket",
          itemId: "bucket",
          allowBlank: false,
          fieldLabel: "Upload Bucket Name",
          value: record.bucket,
        },
        {
          xtype: "textfield",
          name: "bpath",
          itemId: "bpath",
          fieldLabel: "Upload Bucket Path",
          value: record.bpath,
        },
        /*  {
                xtype: "textfield",
                name: "fmeta",
                itemId: "fmeta",
                fieldLabel: "File Metadata",
                value:record.fmeta
            },*/
        {
          // Fieldset in Column 1 - collapsible via toggle button
          xtype: "fieldset",
          title: "File Metadata",
          collapsible: true,
          itemId: "filemetadataset",
          margin: { left: 10 },
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
                  Ext.create("Amps.form.FileMetaData")
                );
              },
            },
          ],
        },
        {
          xtype: "radiogroup",
          fieldLabel: "Acknowledgment Mode",
          vertical: true,
          id: "put_edit_ackmode",
          items: [
            { boxLabel: "None", name: "edit_ackmode", inputValue: "none" },
            {
              boxLabel: "Archive",
              name: "edit_ackmode",
              inputValue: "archive",
            },
            { boxLabel: "Delete", name: "edit_ackmode", inputValue: "delete" },
          ],
          listeners: {
            render: function (obj) {
              if (record.ackmode == "none") {
                amfutil
                  .getElementByID("put_edit_ackmode")
                  .setValue({ put_edit_ackmode: "none" });
              } else if (record.ackmode == "archive") {
                amfutil
                  .getElementByID("put_edit_ackmode")
                  .setValue({ put_edit_ackmode: "archive" });
              } else if (record.ackmode == "delete") {
                amfutil
                  .getElementByID("put_edit_ackmode")
                  .setValue({ put_edit_ackmode: "delete" });
              }
            },
            /*change: function (obj) {
              if (obj.value == "move:tofolder") {
                fname = amfutil.getElementByID("edit_get_fname");
                fname.setHidden(false);
                fname.setValue("");
              } else {
                fname = amfutil.getElementByID("edit_get_fname");
                fname.setHidden(true);
              }
            },*/
          },
        },
        /*{
          xtype: "textfield",
          name: "fname",
          itemId: "fname",
          hidden: true,
          fieldLabel: "Folder Name",
          //value:record.fname
        },*/
      ],
      buttons: [
        {
          xtype: "button",
          text: "Update",
          cls: "button_class",
          itemId: "edit_agentput_id",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var id = form.findField("edit_put_id").getSubmitValue();
              var rule_name = form.findField("edit_rule_name").getSubmitValue();
              var rule_type = form.findField("edit_rule_type").getSubmitValue();
              var fpoll = form.findField("fpoll").getSubmitValue();
              var fretry = form.findField("fretry").getSubmitValue();
              var regex = form.findField("regex").getValue();
              var fmatch = form.findField("fmatch").getSubmitValue();
              var bucket = form.findField("bucket").getSubmitValue();
              var bpath = form.findField("bpath").getSubmitValue();
              // fmeta = form.findField("fmeta").getSubmitValue();
              var ackmode = Ext.getCmp("put_edit_ackmode")
                .items.get(0)
                .getGroupValue();
              var values = form.getValues();
              console.log(values);
              var fmeta = values.field;
              var field_metadata = [];
              if (Array.isArray(values.field) && Array.isArray(values.value)) {
                var lengthis = values.field.length;
                console.log(lengthis);
                for (let i = 0; i < lengthis; i++) {
                  field_metadata.push({
                    key: values.field[i],
                    value: values.value[i],
                  });
                }
              } else {
                field_metadata = [{ key: values.field, value: values.value }];
              }

              console.log(field_metadata);
              var scope = this;
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: amfutil.getElementByID("edit_container"),
              });
              mask.show();
              amfutil.getElementByID("edit_agentput_id").setDisabled(true);

              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "/api/" + route + "/" + record._id,
                method: "PUT",
                timeout: 60000,
                params: {},
                jsonData: {
                  id: record._id,
                  name: rule_name,
                  rtype: rule_type,
                  fpoll: fpoll,
                  fretry: fretry,
                  regex: regex,
                  fmatch: fmatch,
                  bucket: bucket,
                  bpath: bpath,
                  fmeta: field_metadata,
                  ackmode: ackmode,
                  //"movetofolder_name": fname,
                  active: true,
                },
                success: function (response) {
                  mask.hide();
                  var page = Ext.util.History.getToken().split("/")[0];
                  amfutil.getElementByID("edit_agentput_id").setDisabled(false);
                  Ext.toast("Agent Put updated");
                  amfutil.broadcastEvent("update", {
                    page: page,
                  });
                  console.log(page);
                  //amfutil.getElementByID('pagelist').show()
                  amfutil.showActionIcons(route);
                  console.log(grid);
                  grid.getStore().reload();
                  close();
                },
                failure: function (response) {
                  mask.hide();
                  amfutil.getElementByID("edit_agentput_id").setDisabled(false);
                  var msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure(
                    "Failed to Update Agent Put Rule",
                    response
                  );
                },
              });
            },
          },
        },
        {
          xtype: "button",
          cls: "button_class",
          text: "Cancel",
          listeners: {
            click: function (btn) {
              //amfutil.getElementByID('pagelist').show()
              amfutil.showActionIcons(route);
              grid.getStore().reload();
              close();
            },
          },
        },
      ],
    });
    console.log(record.fmeta);
    for (let i = 0; i < record.fmeta.length; i++) {
      console.log("each filemeta data is", record.fmeta[i]);
      console.log(amfutil.getElementByID("filemetadataset").items.length);
      console.log(amfutil.getElementByID("filemetadataset"));
      amfutil
        .getElementByID("filemetadataset")
        .insert(amfutil.getElementByID("filemetadataset").items.length - 1, {
          xtype: "fieldset",
          title: "File Metadata",
          itemId: "filed-set-" + i,
          defaults: { anchor: "100%" },
          layout: "anchor",
          items: [
            {
              xtype: "fieldcontainer",
              layout: "hbox",
              items: [
                {
                  xtype: "textfield",
                  flex: 1,
                  fieldLabel: "Key",
                  labelWidth: 33,
                  name: "field",
                  itemId: "field",
                  value: record.fmeta[i]["key"],
                },
                {
                  xtype: "splitter",
                },
                {
                  xtype: "textfield",
                  fieldLabel: "Value",
                  flex: 1,
                  labelWidth: 33,
                  name: "value",
                  itemId: "value",
                  value: record.fmeta[i]["value"],
                },
              ],
            },
            {
              xtype: "button",
              iconCls: "x-fa fa-trash",
              handler: function (button, event) {
                console.log(button);
                button
                  .up("fieldset")
                  .up("fieldset")
                  .remove(button.up("fieldset"));
              },
            },
          ],
        });
    }
    if (record.ackmode == "move:tofolder") {
      console.log("move:tofolder");
      amfutil.getElementByID("fname").setHidden(false);
      amfutil.getElementByID("fname").setValue(record.movetofolder_name);
    }

    return form;
  },
});
