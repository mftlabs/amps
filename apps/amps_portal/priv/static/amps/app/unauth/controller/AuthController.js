Ext.define("Amps.controller.AuthController", {
  extend: "Ext.app.ViewController",

  alias: "controller.auth",

  require: ["Amps.view.main.Main"],
  routes: {
    "*": "onRoute",
  },

  onRoute: function () {
    if (!localStorage.getItem("loggedIn")) {
      this.redirectTo("login", { replace: true });
    }
  },

  onLoginClick: function (btn) {
    var Mask = new Ext.LoadMask({
      target: btn.up(),
      msg: "Loading ...",
    });
    Mask.show();
    var scope = this;
    btn.disable();
    var values = btn.up("formpanel").getValues();
    console.log(values);
    Ext.Ajax.request({
      url: "/api/session",
      method: "POST",
      timeout: 30000,
      params: {},
      jsonData: {
        user: values,
      },
      success: function (response) {
        //console.log(response);
        Mask.hide();
        var obj = Ext.decode(response.responseText);
        if (obj.data) {
          localStorage.setItem("loggedIn", true);
          localStorage.setItem("access_token", obj.data.access_token);
          localStorage.setItem("renewal_token", obj.data.renewal_token);
          localStorage.setItem("user", JSON.stringify(obj.data.user));
          // localStorage.setItem(
          //   "userdetails",
          //   obj.firstname + " " + obj.lastname
          // );
          var from = ampsutil.from;
          if (from) {
            from = "#" + from;
          } else {
            from = "";
          }
          console.log("/" + from);
          window.location.href = "/" + from;
          window.location.reload();
        } else {
          Ext.ComponentQuery.query("#loginbtn")[0].enable();
          Ext.toast({
            title: "Authentication Failed",
            html: "<center>Failed to login</center>",
            autoCloseDelay: 10000,
          });
        }
      },
      failure: function (response) {
        Mask.hide();
        Ext.ComponentQuery.query("#loginbtn")[0].enable();
        Ext.toast(Ext.decode(response.responseText).error.message);
      },
    });
  },
  onSignupInstead: function () {
    console.log("Going to show Signup form");
    var fp = this.getView().up("panel");
    console.log(fp);
    fp.removeAll();
    fp.insert(0, {
      xtype: "signup",
    });
  },

  onLoginInstead: function () {
    console.log(this.getView());
    var fp = this.getView().up("panel");

    fp.removeAll();
    fp.insert(0, {
      xtype: "login",
    });
  },

  onSignupClick: function (btn) {
    var Mask = new Ext.LoadMask({
      target: Ext.ComponentQuery.query("signup")[0],
      msg: "Loading ...",
    });
    var fp = this.getView().up("panel");
    Mask.show();
    var scope = this;
    Ext.ComponentQuery.query("#signup_id")[0].disable();
    var form = btn.up("formpanel");
    var values = form.getValues();
    if (values.password != values.confpasswd) {
      Ext.msg.Alert("Error", "Passwords not matched");
      return;
    }
    values.rules = [];
    values.profiles = [];
    values.ufa = {
      stime: new Date().toISOString(),
      debug: false,
      logfile: "",
      hinterval: 30,
      cinterval: 30,
      max: 100,
    };
    delete values.confpasswd;
    Ext.Ajax.request({
      url: "/api/users/reg",
      method: "POST",
      timeout: 30000,
      params: {},
      jsonData: values,
      success: function (response) {
        Mask.hide();
        var obj = Ext.decode(response.responseText);
        if (obj.success) {
          setTimeout(function () {
            Ext.toast({
              html: "<center>Your account has been created<br/>You may log in after the account is approved</center>",
              autoCloseDelay: 5000,
            });
            fp.removeAll();

            fp.insert(0, {
              xtype: "login",
            });
          }, 1000);
        } else {
          Ext.toast({
            html: obj.message,
            autoCloseDelay: 5000,
          });
          Ext.ComponentQuery.query("#signup_id")[0].enable();
        }
      },
      failure: function (response) {
        Mask.hide();
        Ext.ComponentQuery.query("#signup_id")[0].enable();
        Ext.toast({
          title: "Failed",
          html: "<center>Failed to register account.</center>",
          autoCloseDelay: 5000,
        });
      },
    });
  },

  init: function () {
    Ext.apply(Ext.form.field.VTypes, {
      passwordCheck: function (val) {
        var reg =
          /^.*(?=.{8,32})(?=.*\d)(?=.*[!@#$%^&*{}:;.])(?=.*[a-z])(?=.*[A-Z])/;
        return reg.test(val);
      },
      passwordCheckText:
        "Password must contain a combination of one or more upper case letters, one more lower case letters, one or more digits and one or more special characters consists of @#!$[]{};:.,Password must have a minimum of 8 characters and a maximum of 32 characters",
      passwordMatch: function (value, field) {
        var password = field.up("form").down("#" + "passwd");
        return value == password.getValue();
      },
      passwordMatchText: "Passwords doesn't match",
    });
  },
});
