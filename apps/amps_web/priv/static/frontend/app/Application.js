/**
 * The main application class. An instance of this class is created by app.js when it
 * calls Ext.application(). This is the ideal place to handle application launch and
 * initialization details.
 */
var allow_enterkey = true;

Ext.define("AmpsDasboard.Application", {
  extend: "Ext.app.Application",

  name: "AmpsDasboard",
  style: "background-color: #32404e;",
  require: ["AmpsDasboard.view.login.Login", "AmpsDasboard.view.main.Main"],

  quickTips: false,
  platformConfig: {
    desktop: {
      quickTips: true,
    },
  },
  launch: function () {
    var route = Ext.util.History.getToken();
    console.log(route);
    amfutil = AmpsDasboard.util.Utilities;
    amfuploads = AmpsDasboard.window.Uploads;
    window.onbeforeunload = function () {
      if (amfuploads.uploads.length) {
        return "Your files have not finished uploadeding...";
      }
    };

    amfutil.check_redirect(this);
    updateformutil = AmpsDasboard.util.UpdateRecordController;
    var routes = Object.keys(amfutil.grids).concat(Object.keys(amfutil.pages));
    console.log(routes);
    var isInFrame = window.location != window.parent.location ? true : false;
    if (isInFrame) {
      window.location.href = "/invalid-request";
      return;
    }

    window.channel = window.userSocket.channel("notifications");

    amfutil.channel = window.channel;
    let channel = window.channel;
    amfutil.channelHandlers(channel);

    var query = window.location.search.substring(1);
    var params = Ext.Object.fromQueryString(query);

    if (params.provider) {
      console.log("redirecting");
    } else {
      if (!localStorage.getItem("access_token")) {
        amfutil.from = Ext.util.History.getToken();
        console.log(amfutil.from);
        this.redirectTo("login", { replace: true });
        Ext.create({
          xtype: "auth",
        });
      } else {
        Ext.create({
          xtype: "app-main",
        });
      }
    }
    console.log(
      JSON.stringify(
        Object.entries({
          app: "amps",
          name: "SYSTEM",
          node_id: "001",
          site_id: "AA",
          sched_interval: 10000,
          retry_delay: 60000,
          storage_root: "c://tools/amps/data",
          storage_temp: "c://tools/amps/temp",
          storage_logs: "c://tools/amps/logs",
          python_path: "/Tools",
          registration_queue: "registerq",
        }).map((entry) => ({
          field: entry[0],
          value: entry[1],
        }))
      )
    );

    var tokens = route.split("/");

    if (routes.indexOf(tokens[0]) >= 0) {
      console.log("Valid Route");
      if (tokens.length > 2) {
        this.redirectTo(tokens[0] + "/" + tokens[1]);
      } else {
      }
    } else {
      this.redirectTo("messages");
    }

    console.log(route);
    console.log(routes);
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
