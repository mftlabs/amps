Ext.define("AmpsDasboard.controller.AuthController", {
  extend: "Ext.app.ViewController",

  alias: "controller.auth",

  require: ["AmpsDasboard.view.main.Main"],
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
      target: Ext.ComponentQuery.query("login")[0],
      msg: "Loading ...",
    });
    Mask.show();
    var scope = this;
    Ext.ComponentQuery.query("#loginbtn")[0].disable();
    var form = btn.up("form").getForm();
    console.log(form);
    var username = form.findField("username").getSubmitValue();
    var passwd = form.findField("password").getSubmitValue();
    Ext.Ajax.request({
      url: "/api/session",
      method: "POST",
      timeout: 30000,
      params: {},
      jsonData: {
        user: {
          username: Ext.String.trim(username),
          password: passwd,
        },
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
          var from = amfutil.from;
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
            html: obj.message,
            autoCloseDelay: 10000,
          });
        }
      },
      failure: function (response) {
        Mask.hide();
        Ext.ComponentQuery.query("#loginbtn")[0].enable();
        Ext.toast({
          title: "Failed",
          html: "<center>Failed to login</center>",
          autoCloseDelay: 10000,
        });
      },
    });
  },
  onSignupInstead: function () {
    console.log("Going to show Signup form");
    var fp = this.getView().up("panel");
    console.log(fp);
    fp.insert({
      xtype: "signup",
    });
    fp.remove(amfutil.getElementByID("loginform"), true);
  },

  onLoginInstead: function () {
    console.log(this.getView());
    var fp = this.getView().up("panel");
    fp.insert({
      xtype: "login",
    });
    fp.remove(amfutil.getElementByID("signupform"), true);
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
    var form = btn.up("form").getForm();
    var username = form.findField("username").getSubmitValue();
    var passwd = form.findField("passwd").getSubmitValue();
    var confpasswd = form.findField("confpasswd").getSubmitValue();
    var firstname = form.findField("firstname").getSubmitValue();
    var lastname = form.findField("lastname").getSubmitValue();
    var email = form.findField("email").getSubmitValue();
    var phone = form.findField("phone").getSubmitValue();
    if (passwd != confpasswd) {
      Ext.msg.Alert("Error", "Passwords not matched");
      return;
    }
    Ext.Ajax.request({
      url: "/api/user/reg",
      method: "POST",
      timeout: 30000,
      params: {},
      jsonData: {
        username: Ext.String.trim(username),
        password: passwd,
        confirmpswd: confpasswd,
        firstname: Ext.String.trim(firstname),
        lastname: Ext.String.trim(lastname),
        email: email,
        phone: phone,
      },
      success: function (response) {
        Mask.hide();
        var obj = Ext.decode(response.responseText);
        if (obj.success) {
          setTimeout(function () {
            Ext.toast({
              html: "<center>Your account has been created<br/>You may log in after the account is approved</center>",
              autoCloseDelay: 5000,
            });
            fp.insert({
              xtype: "login",
            });
            fp.remove(amfutil.getElementByID("signupform"), true);
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
