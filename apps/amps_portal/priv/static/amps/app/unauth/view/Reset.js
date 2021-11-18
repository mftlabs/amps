Ext.define("Amps.Unauthorized.Reset", {
  extend: "Ext.form.Panel",
  xtype: "reset",
  itemId: "signupform",
  controller: "auth",
  padding: 10,
  title: "AMPortal Set Password",
  closable: false,
  autoShow: true,
  defaults: {
    labelWidth: 120,
  },
  layout: "vbox",
  constructor: function (args) {
    this.callParent(args);
    this.token = args["token"];
    if (args["username"]) {
      this.insert(0, {
        xtype: "displayfield",
        name: "username",
        itemId: "username",
        label: "Username",
        value: args["username"],
      });
    }
  },

  items: [
    {
      xtype: "textfield",
      name: "password",
      itemId: "pass",
      inputType: "password",
      label: "Password",
      maskRe: /[^\^ ]/,
      allowBlank: false,
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
      },
    },
    {
      xtype: "textfield",
      name: "confirm",
      itemId: "confirm",
      inputType: "password",
      maskRe: /[^\^ ]/,
      label: "Confirm Password",
      allowBlank: false,
      enableKeyEvents: true,
      validators: {
        fn: function (confirm) {
          var pass = this.up("formpanel").down("#pass");
          var val = pass.getValue();
          if (val && val.length > 0) {
            return confirm === val || "Passwords don't match";
          }
        },
      },
      labelStyle: "white-space: nowrap;",
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
        var form = btn.up("formpanel");
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
          success: function () {
            var a = form.up("container");
            console.log(a);
            a.removeAll();
            a.insert(0, {
              xtype: "login",
            });
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
