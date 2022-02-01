Ext.define("Amps.Utilities", {
  singleton: true,

  ajaxRequest: async function (request) {
    return new Promise(function (resolve, reject) {
      request.headers = {
        Authorization: localStorage.getItem("access_token"),
      };
      var failure = Object.assign({}, { failure: request.failure }).failure;

      delete request.failure;
      // console.log(failure);
      Ext.Ajax.request(request).then(
        function (response, opts) {
          // debugger;
          // console.log(response);
          var obj = Ext.decode(response.responseText);
          // console.log(obj);
          resolve(response);
        },
        async function (response, opts) {
          // debugger;
          console.log(
            "server-side failure with status code " + response.status
          );
          if ((response.status = 401)) {
            await ampsutil.renew_session();
            request.headers = {
              Authorization: localStorage.getItem("access_token"),
            };
            request.failure = failure;
            response = await Ext.Ajax.request(request);
            resolve(response);
          }
        }
      );
    });
  },

  userInfo: async function () {
    var resp = await ampsutil.ajaxRequest({
      method: "GET",
      url: "api/user",
    });
    return Ext.decode(resp.responseText);
  },

  getCurrentItem: async function (route) {
    if (!route) {
      route = Ext.util.History.getToken();
    }
    let response = await ampsutil.ajaxRequest({
      url: "/api/" + route,
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "GET",
      timeout: 30000,
      params: {},
      success: function (response) {},
      failure: function (response) {
        console.log(response);
      },
    });
    var obj = Ext.decode(response.responseText);
    console.log(response);

    return obj;
  },
  convertNumbers: function (form, data) {
    console.log(form);
    Object.entries(form.getFields()).forEach((field) => {
      if (field[1].xtype == "numberfield") {
        data[field[0]] = parseInt(data[field[0]]);
      }
    });
    return data;
  },

  logout: function () {
    ampsutil.ajaxRequest({
      url: "/api/session/",
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "Delete",
      timeout: 30000,
      params: {},
      success: function (response) {
        localStorage.clear();
        window.location.href = "/";
      },
      failure: function (response) {
        console.log("fail");
      },
    });
  },

  getElementByID: function (itemid) {
    return Ext.ComponentQuery.query("#" + itemid)[0];
  },

  createCollectionStore: function (collection, filters = {}, opts = {}) {
    var store = Ext.create(
      "Ext.data.Store",
      Object.assign(
        {
          remoteSort: true,
          proxy: {
            type: "rest",
            url: `/api/${collection}`,
            headers: {
              Authorization: localStorage.getItem("access_token"),
            },
            extraParams: { filters: JSON.stringify(filters) },
            reader: {
              type: "json",
              rootProperty: "rows",
              totalProperty: "count",
            },
            listeners: {
              load: function (data) {
                console.log(data);
              },
              exception: ampsutil.refresh_on_failure,
            },
          },
          autoLoad: true,
        },
        opts
      )
    );

    // store.on(
    //   "load",
    //   function (storescope, records, successful, operation, eOpts) {
    //     console.log("STORE SUCCESS: " + successful);
    //     if (!successful) {
    //       storescope.reload();
    //     }
    //   }
    // );
    return store;
  },

  renew_session: async function () {
    return await Ext.Ajax.request({
      url: "/api/session/renew",
      headers: {
        Authorization: localStorage.getItem("renewal_token"),
      },
      method: "POST",
      timeout: 30000,
      params: {},
      success: function (response) {
        //console.log(response);
        var obj = Ext.decode(response.responseText);
        console.log(obj);
        if (obj.data) {
          localStorage.setItem("access_token", obj.data.access_token);
          localStorage.setItem("renewal_token", obj.data.renewal_token);
        } else {
          Ext.Msg.show({
            title: "Unauthorized or Expired Session",
            message:
              "Your session has expired or is no longer authorized, you will be redirected to Login.",
          });
          ampsutil.logout();
        }
      },
      failure: function (response) {
        Ext.Msg.show({
          title: "Unauthorized or Expired Session",
          message:
            "Your session has expired or is no longer authorized, you will be redirected to Login.",
        });
        ampsutil.logout();
      },
    });
  },

  createForm: function (config) {
    var win = Ext.create("Amps.form.add", config.window);
    win.loadForm(config.object, config.fields, (form, values) => {
      if (config.add && config.add.process) {
        values = config.add.process(form, values);
      }
      return values;
    });
    win.show();
  },
  scanFields: function (fields) {
    fields = fields.map((field) => {
      field = ampsutil.scan(field);
      return field;
    });
    return fields;
  },
  scan: function (field) {
    if (field.tooltip) {
      field = amfutil.tooltip(field);
    } else if (field.items && field.items.length) {
      field.items = field.items.map((item) => {
        return ampsutil.scan(item);
      });
    }

    return field;
  },

  renderFileSize: function fileSize(size) {
    var i = Math.floor(Math.log(size) / Math.log(1000));
    return (
      (size / Math.pow(1000, i)).toFixed(2) * 1 +
      " " +
      ["B", "kB", "MB", "GB", "TB"][i]
    );
  },

  tooltip: function (field, opts) {
    return Object.assign(
      {
        xtype: "fieldcontainer",
        row: field.row,
        layout: {
          type: "hbox",
          align: "stretch",
        },
        items: [
          Ext.apply(field, {
            flex: 1,
          }),
          {
            xtype: "fieldcontainer",
            layout: "center",
            width: 20,
            maxHeight: 50,

            listeners: {
              afterrender: function (me) {
                // Register the new tip with an element's ID
                Ext.tip.QuickTipManager.register({
                  target: me.getId(), // Target button's ID
                  text: field.tooltip, // Tip content
                });
              },
              destroy: function (me) {
                Ext.tip.QuickTipManager.unregister(me.getId());
              },
            },
            items: [
              {
                xtype: "component",
                cls: "x-fa fa-info",
                itemId: "info-icon",
              },
            ],
          },
        ],
      },
      opts
    );
  },
});
