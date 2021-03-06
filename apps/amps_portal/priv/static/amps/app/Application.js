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

  quickTips: false,
  platformConfig: {
    desktop: {
      quickTips: true,
    },
  },
  launch: async function () {
    amfutil = Amps.Utilities;

    console.log(amfutil);
    console.log("launch");
    var route = Ext.util.History.getToken();
    console.log(route);
    if (route == "setpassword") {
      // var query = window.location.search.substring(0);
      const urlParams = new URLSearchParams(window.location.search);
      var token = urlParams.get("token");
      amfutil.ajaxRequest({
        method: "GET",
        url: "api/users/token/" + token,
        success: function (resp) {
          var result = Ext.decode(resp.responseText);
          if (result.success) {
            Ext.create({
              xtype: "unauthorized",
              reset: {
                username: result.username,
                token: token,
              },
            });
          } else {
            window.location.href = window.location.pathname;
          }
        },
        failure: function () {
          window.location.href = window.location.pathname;
        },
      });
      // var params = Ext.Object.fromQueryString(query);
      // console.log(params);
    } else {
      if (!localStorage.getItem("access_token")) {
        // amfutil.from = Ext.util.History.getToken();
        // console.log(amfutil.from);
        this.redirectTo("login", { replace: true });
        Ext.create({
          xtype: "unauthorized",
        });
      } else {
        ampsuploads = Amps.Authorized.Uploads;

        var routes = Object.keys(Amps.Pages.pages);
        const tokens = route.split("/");
        if (routes.indexOf(tokens[0]) >= 0) {
          console.log("Valid Route");
          if (tokens.length > 2) {
            this.redirectTo(tokens[0] + "/" + tokens[1]);
          } else {
          }
        } else {
          this.redirectTo("inbox", { replace: true });
        }

        Ext.create({
          xtype: "authorized",
        });
      }
    }
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

Ext.override(Ext.data.Store, {
  constructor: function (config) {
    this.callParent([config]);
    var store = this;
    this.proxy.setListeners({
      exception: async function (proxy, response, options, eOpts) {
        console.log("exception");
        if (response.status == 401) {
          await amfutil.renew_session();
          proxy.setHeaders({
            Authorization: localStorage.getItem("access_token"),
          });
          store.reload();
        }
      },
    });
    // this.proxy.on("exception", this.onProxyException, this);
  },
});
