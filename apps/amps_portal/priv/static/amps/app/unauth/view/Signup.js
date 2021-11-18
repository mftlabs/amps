Ext.define("Amps.Unauthorized.Signup", {
  extend: "Ext.Panel",
  xtype: "signup",
  itemId: "signupform",
  controller: "auth",
  bodyPadding: 10,
  title: "AMPS Dashboard Signup",
  closable: false,
  autoShow: true,

  items: {
    xtype: "formpanel",

    defaults: {
      labelWidth: 120,
    },
    layout: "vbox",
    items: [
      {
        xtype: "container",
        layout: "hbox",
        items: [
          {
            xtype: "textfield",
            name: "username",
            itemId: "username",
            maskRe: /[^\^ ]/,
            label: "User name",
            allowBlank: false,
            listeners: {
              afterrender: function (cmp) {
                try {
                  cmp.focus();
                } catch (e) {}
                cmp.inputEl.set({
                  autocomplete: "nope",
                });
              },
              change: async function (cmp, value, oldValue, eOpts) {
                var duplicate = await amfutil.checkDuplicate({
                  users: { username: value },
                });

                if (duplicate) {
                  cmp.setActiveError("User Already Exists");
                  cmp.setValidation("User Already Exists");
                  // cmp.isValid(false);
                } else {
                  cmp.setActiveError();
                  cmp.setValidation();
                }
              },
            },
          },
        ],
      },
      {
        xtype: "container",
        layout: "hbox",
        items: [
          {
            xtype: "textfield",
            name: "firstname",
            flex: 1,
            itemId: "firstname",
            label: "First name",
            allowBlank: false,
            maskRe: /[^\^ ]/,
            listeners: {
              afterrender: function (cmp) {
                cmp.inputEl.set({
                  autocomplete: "nope",
                });
              },
            },
          },
          {
            xtype: "textfield",
            name: "lastname",
            itemId: "lastname",
            flex: 1,
            label: "Last name",
            allowBlank: false,
            maskRe: /[^\^ ]/,
            listeners: {
              afterrender: function (cmp) {
                cmp.inputEl.set({
                  autocomplete: "nope",
                });
              },
            },
          },
        ],
      },

      {
        xtype: "textfield",
        name: "passwd",
        itemId: "passwd",
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
          change: function (me, e) {
            confPassword =
              Ext.ComponentQuery.query("#confpasswd")[0].getValue();
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
        name: "confpasswd",
        itemId: "confpasswd",
        inputType: "password",
        maskRe: /[^\^ ]/,
        label: "Confirm Password",
        allowBlank: false,
        enableKeyEvents: true,
        vtype: "passwordMatch",
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
        xtype: "textfield",
        name: "email",
        itemId: "email",
        label: "Email",
        allowBlank: false,
        listeners: {
          afterrender: function (cmp) {
            cmp.inputEl.set({
              autocomplete: "nope",
            });
          },
        },
      },
      {
        xtype: "textfield",
        name: "phone",
        label: "Phone Number",
        allowBlank: false,
        itemId: "phone_number",
        vtype: "phone",
      },

      {
        html: '<p style="color:red;font-weight:600;"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Caps lock is on</p>',
        itemId: "signup_capslock_id",
        hidden: true,
      },
    ],
    buttons: [
      {
        text: "Signup",
        formBind: true,
        cls: "button_class",
        itemId: "signup_id",
        handler: "onSignupClick",
      },
      {
        text: "Login",
        cls: "button_class",
        handler: "onLoginInstead",
      },
    ],
  },
});
