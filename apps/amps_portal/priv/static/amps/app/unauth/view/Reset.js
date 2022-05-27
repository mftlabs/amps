Ext.define("Amps.Unauthorized.Reset", {
  extend: "Ext.form.Panel",
  xtype: "reset",
  itemId: "signupform",
  controller: "auth",
  bodyPadding: 10,
  title: "AMPortal Set Password",
  closable: false,
  autoShow: true,
  defaults: {
    fieldLabelWidth: 120,
  },
  layout: "vbox",
  constructor: function (args) {
    this.callParent(args);
    this.token = args["token"];
    if (args["username"]) {
      this.insert(0, {
        xtype: "displayfield",
        labelWidth: 200,

        name: "username",
        itemId: "username",
        fieldLabel: "Username",
        value: args["username"],
        submitValue: true,
      });
    }
  },

  items: [
    {
      xtype: "textfield",
      name: "password",
      itemId: "passwd",
      inputType: "password",
      fieldLabel: "Password",
      regex: new RegExp(
        "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$"
      ),
      regexText:
        "Password must be atleast 8 characters and include atleast an uppercase letter, a lowercase letter, a number, and one of the following symbols: #?!@$%^&*-",
      labelWidth: 200,
      maskRe: /[^\^ ]/,
      enableKeyEvents: true,
      listeners: {
        afterrender: function (cmp) {
          cmp.inputEl.set({
            autocomplete: "new-password",
          });
        },
        keypress: function (me, e) {
          var charCode = e.getCharCode();
          if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
            capslock_id = Ext.ComponentQuery.query("#signup_capslock_id")[0];
            capslock_id.setHidden(false);
          } else {
            me.isValid();
            capslock_id = Ext.ComponentQuery.query("#signup_capslock_id")[0];
            capslock_id.setHidden(true);
          }
        },
        change: function (me, e) {
          confPassword = Ext.ComponentQuery.query("#confpasswd")[0].getValue();
          password = me.value;
          if (confPassword.length != 0) {
            if (password != confPassword) {
              Ext.ComponentQuery.query("#signup_id")[0].setDisabled(true);
              var m = Ext.getCmp("confpasswd_id");
              m.setActiveError("Passwords doesn't match");
            } else {
              Ext.ComponentQuery.query("#signup_id")[0].setDisabled(false);
              var m = Ext.getCmp("confpasswd_id");
              m.unsetActiveError();
            }
          }
        },
      },
    },
    {
      xtype: "textfield",
      name: "confirmpswd",
      itemId: "confpasswd",
      labelWidth: 200,

      inputType: "password",
      maskRe: /[^\^ ]/,
      fieldLabel: "Confirm Password",
      allowBlank: false,
      enableKeyEvents: true,
      vtype: "passwordMatch",
      listeners: {
        keypress: function (me, e) {
          var charCode = e.getCharCode();
          if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
            capslock_id = Ext.ComponentQuery.query("#signup_capslock_id")[0];
            capslock_id.setHidden(false);
          } else {
            me.isValid();
            capslock_id = Ext.ComponentQuery.query("#signup_capslock_id")[0];
            capslock_id.setHidden(true);
          }
        },
      },
    },
    {
      html: '<p style="color:red;font-weight:600;"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Caps lock is on</p>',
      itemId: "signup_capslock_id",
      hidden: true,
    },
  ],
  buttons: [
    {
      text: "Set Password",
      formBind: true,
      cls: "button_class",
      itemId: "signup_id",
      handler: function (btn) {
        var form = btn.up("form");
        form.setLoading(true);
        var token = form.token;
        var values = form.getValues();
        delete values.confirm;
        console.log(token);
        Ext.Ajax.request({
          method: "POST",
          url: "api/users/password",
          jsonData: {
            token: token,
            user: values,
          },
          success: function (resp) {
            var a = form.up("container");
            var data = Ext.decode(resp.responseText);
            console.log(data);
            if (data.success) {
              Ext.toast(data["message"]);
              console.log(a);
              a.removeAll();
              a.insert(0, {
                xtype: "login",
              });
              form.setLoading(false);
            } else {
              Ext.toast(data["message"]);
              form.setLoading(false);
            }
          },
        });
      },
    },
    {
      text: "Cancel",
      cls: "button_class",
      handler: "onLoginInstead",
    },
  ],
});
