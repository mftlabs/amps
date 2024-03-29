/**
 * The main application class. An instance of this class is created by app.js when it
 * calls Ext.application(). This is the ideal place to handle application launch and
 * initialization details.
 */
var allow_enterkey = true;

Ext.define("Amps.Application", {
  extend: "Ext.app.Application",

  name: "Amps",
  style: "background-color: #32404e;",
  require: ["Amps.view.login.Login", "Amps.view.main.Main"],

  quickTips: false,
  platformConfig: {
    desktop: {
      quickTips: true,
    },
  },
  launch: async function () {
    Ext.state.Manager.setProvider(new Ext.state.LocalStorageProvider());
    var link = document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "icon";
    link.href = "images/favicon.ico"; //assumes favicon is in the app root as it should be
    document.getElementsByTagName("head")[0].appendChild(link);
    var route = Ext.util.History.getToken();
    console.log(route);
    amfutil = Amps.util.Utilities;

    amfuploads = Amps.window.Uploads;

    // window.addEventListener("beforeunload", function (e) {
    //   // the absence of a returnValue property on the event will guarantee the browser unload happens
    //   if (amfuploads.hasPending()) {
    //     console.log("stop");
    //     e.preventDefault();
    //     e.returnValue = "Your files have not finished uploadeding...";
    //   } else {
    //     delete e["returnValue"];
    //   }
    // });

    window.onbeforeunload = function () {};

    amfutil.check_redirect(this);
    updateformutil = Amps.util.UpdateRecordController;

    var isInFrame = window.location != window.parent.location ? true : false;
    if (isInFrame) {
      window.location.href = "/invalid-request";
      return;
    }

    var query = window.location.search.substring(1);
    var params = Ext.Object.fromQueryString(query);
    var tokens = route.split("/");

    if (params.provider) {
      console.log("redirecting");
    } else {
      if (!localStorage.getItem("access_token")) {
        amfutil.from = Ext.util.History.getToken();
        console.log(amfutil.from);
        this.redirectTo("login", { replace: true });
        var resp = await Ext.Ajax.request({
          method: "get",
          url: "api/startup",
        });
        var initialized = Ext.decode(resp.responseText);
        Ext.create({
          xtype: "auth",
          init: initialized,
        });
      } else {
        Ext.getBody().mask();

        var collections = ["actions", "services", "providers"];

        for (const col of collections) {
          var extra = await amfutil.getPlugins(col);

          console.log(extra);
          amfutil.plugins[col] = extra;
        }

        Ext.getBody().unmask();

        ampsgrids = Amps.util.Grids;
        var routes = Object.keys(ampsgrids.grids).concat(
          Object.keys(ampsgrids.pages)
        );
        amfutil.updateChannel();
        console.log(route);
        console.log(routes);
        if (routes.indexOf(tokens[0]) >= 0) {
          console.log("Valid Route");
          if (tokens.length > 2) {
            this.redirectTo(tokens[0] + "/" + tokens[1]);
          } else {
          }
        } else {
          this.redirectTo("message_events");
        }
        window.createLangClient(localStorage.getItem("access_token"));
        Ext.create("Ext.data.Store", {
          storeId: "metadata",
          proxy: {
            type: "ajax",
            headers: {
              Authorization: localStorage.getItem("access_token"),
            },
            url: "/api/fields",
            reader: {
              type: "json",
              rootProperty: function (data) {
                var mapping = amfutil.mapping;
                return data.rows.concat(
                  Object.entries(mapping).map((m) => {
                    return { field: m[0], desc: m[1].label };
                  })
                );
              },
            },
          },
          autoLoad: true,
        });
        Ext.create({
          xtype: "app-main",
        });

        // testing = JSON.parse(
        //   '{"mq_integration":{"test":{"path":"mq_integration/test","size":845},"testme":{"path":"mq_integration/testme","size":851}},"name":{"name":{"name":{"testme":{"path":"name/name/name/testme","size":851}},"name2":{"test":{"path":"name/name/name2/test","size":845}},"test":{"path":"name/name/test","size":845},"testme":{"path":"name/name/testme","size":851}},"test":{"path":"name/test","size":845},"testme":{"path":"name/testme","size":851}},"test":{"path":"test","size":845},"testme":{"path":"testme","size":851}}'
        // );
      }
    }
    // console.log(
    //   JSON.stringify(
    //     Object.entries({
    //       app: "amps",
    //       name: "SYSTEM",
    //       node_id: "001",
    //       site_id: "AA",
    //       sched_interval: 10000,
    //       retry_delay: 60000,
    //       storage_root: "c://tools/amps/data",
    //       storage_temp: "c://tools/amps/temp",
    //       storage_logs: "c://tools/amps/logs",
    //       python_path: "/Tools",
    //       registration_queue: "registerq",
    //     }).map((entry) => ({
    //       field: entry[0],
    //       value: entry[1],
    //     }))
    //   )
    // );
  },
  // defaultToken: "home",
  onAppUpdate: function () {
    Ext.Msg.confirm(
      "Application Update",
      "This application has an update, reload?",
      function (choice) {
        if (choice === "yes") {
          window.location.reload();
        }
      }
    );
  },
});
