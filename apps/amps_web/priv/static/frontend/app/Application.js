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
        Ext.create({
          xtype: "app-main",
        });
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
