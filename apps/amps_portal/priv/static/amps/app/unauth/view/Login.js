Ext.define("Amps.Unauthorized.Login", {
  extend: "Ext.Panel",
  xtype: "login",
  controller: "auth",
  itemId: "loginform",
  // padding: 10,
  title: "AMPortal Login",
  items: {
    xtype: "formpanel",
    reference: "form",
    items: [
      {
        xtype: "textfield",
        name: "username",
        itemId: "username",
        label: "User name",
        maskRe: /[^\^ ]/,
        allowBlank: false,
        validateOnBlur: true,
        listeners: {
          afterrender: function (field) {
            try {
              field.focus();
            } catch (e) {}
          },
        },
      },
      {
        xtype: "textfield",
        name: "password",
        itemId: "passwd",
        inputType: "password",
        label: "Password",
        allowBlank: false,
        enableKeyEvents: true,
        listeners: {
          specialkey: function (textfield, e) {
            var pass1 = Ext.ComponentQuery.query("#passwd")[0].getValue();
            if (pass1 != "") {
              if (e.getKey() == e.ENTER && allow_enterkey) {
                allow_enterkey = false;
                btn = Ext.ComponentQuery.query("#loginbtn")[0];
                this.up("login").getController().onLoginClick(btn);
              }
            }
          },
          keypress: function (me, e) {
            var charCode = e.getCharCode();
            if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
              capslock_id = Ext.ComponentQuery.query("#capslock_id")[0];
              capslock_id.setHidden(false);
            } else {
              me.isValid();
              capslock_id = Ext.ComponentQuery.query("#capslock_id")[0];
              capslock_id.setHidden(true);
            }
          },
        },
      },
      {
        html: '<p style="color:red;font-weight:600;"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Caps lock is on</p>',
        itemId: "capslock_id",
        hidden: true,
      },
    ],
    buttons: [
      {
        text: "Login",
        formBind: true,
        cls: "button_class",
        flex: 1,
        itemId: "loginbtn",
        handler: "onLoginClick",
      },
      {
        text: "Signup",
        flex: 1,
        cls: "button_class",
        itemId: "signup_btn_id",
        handler: "onSignupInstead",
      },
    ],
  },
});
