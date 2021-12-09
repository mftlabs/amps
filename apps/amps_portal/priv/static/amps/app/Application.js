/**
 * The main application class. An instance of this class is created by app.js when it
 * calls Ext.application(). This is the ideal place to handle application launch and
 * initialization details.
 */

Ext.define("Amps.Application", {
  extend: "Ext.app.Application",

  name: "Amps",

  // quickTips: false,
  // platformConfig: {
  //   desktop: {
  //     quickTips: true,
  //   },
  // },
  // defaultToken: "home",
  // onAppUpdate: function () {
  //   Ext.Msg.confirm(
  //     "Application Update",
  //     "This application has an update, reload?",
  //     function (choice) {
  //       if (choice === "yes") {
  //         window.location.reload();
  //       }
  //     }
  //   );
  // },
  launch: async function () {
    ampsutil = Amps.Utilities;

    console.log(ampsutil);
    console.log("launch");
    var route = Ext.util.History.getToken();
    console.log(route);
    if (route == "setpassword") {
      // var query = window.location.search.substring(0);
      const urlParams = new URLSearchParams(window.location.search);
      var token = urlParams.get("token");
      var resp = await ampsutil.ajaxRequest({
        method: "GET",
        url: "api/users/token/" + token,
      });
      console.log(resp);
      var result = Ext.decode(resp.responseText);
      if (result.status == "success") {
        console.log(result.username);
        Ext.create({
          xtype: "unauthorized",
          reset: {
            username: result.username,
            token: token,
          },
        });
      }
      if (result.status == "error") {
        console.log(result.error);
      }
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
        // ampsgrids = Amps.util.Grids;
        // ampsgrids.getGrids();
        // ampsgrids.getPages();
        // var routes = Object.keys(ampsgrids.grids).concat(
        //   Object.keys(ampsgrids.pages)
        // );
        // console.log(route);
        // console.log(routes);
        // if (routes.indexOf(tokens[0]) >= 0) {
        //   console.log("Valid Route");
        //   if (tokens.length > 2) {
        //     this.redirectTo(tokens[0] + "/" + tokens[1]);
        //   } else {
        //   }
        // } else {
        //   this.redirectTo("messages");
        // }
        ampsuploads = Amps.Authorized.Uploads;
        Ext.Viewport.add({
          xtype: "authorized",
        });
      }
    }
  },
});
