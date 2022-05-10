Ext.define("Amps.panel.Startup", {
  extend: "Ext.panel.Panel",
  xtype: "startup",
  title: "Startup",
  layout: "card",
  bodyStyle: "padding:15px",
  width: 400,
  scrollable: true,
  itemId: "wizard",
  defaultListenerScope: true,
  constructor(args) {
    this.callParent([args]);
  },

  items: [
    {
      xtype: "form",
      scrollable: true,
      layout: {
        type: "vbox",
        align: "stretch",
      },
      defaults: {
        labelWidth: 150,
      },
      itemId: "card-0",
      items: [
        {
          xtype: "component",
          autoEl: "h3",
          html: "Create Root User",
        },
        {
          xtype: "textfield",
          name: "username",
          itemId: "username",
          maskRe: /[^\^ ]/,
          fieldLabel: "User name",
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
              var resp = await amfutil.ajaxRequest({
                url: `api/duplicate_username/${value}`,
              });

              var duplicate = Ext.decode(resp.responseText);

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
        {
          xtype: "textfield",
          name: "firstname",
          itemId: "firstname",
          fieldLabel: "First name",
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
          fieldLabel: "Last name",
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
          name: "password",
          itemId: "passwd",
          inputType: "password",
          fieldLabel: "Password",
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
                capslock_id = Ext.ComponentQuery.query(
                  "#signup_capslock_id"
                )[0];
                capslock_id.setHidden(false);
              } else {
                me.isValid();
                capslock_id = Ext.ComponentQuery.query(
                  "#signup_capslock_id"
                )[0];
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
          name: "confirm",
          itemId: "confpasswd",
          inputType: "password",
          maskRe: /[^\^ ]/,
          fieldLabel: "Confirm Password",
          allowBlank: false,
          enableKeyEvents: true,
          vtype: "passwordMatch",
          labelStyle: "white-space: nowrap;",
          listeners: {
            keypress: function (me, e) {
              var charCode = e.getCharCode();
              if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                capslock_id = Ext.ComponentQuery.query(
                  "#signup_capslock_id"
                )[0];
                capslock_id.setHidden(false);
              } else {
                me.isValid();
                capslock_id = Ext.ComponentQuery.query(
                  "#signup_capslock_id"
                )[0];
                capslock_id.setHidden(true);
              }
            },
          },
        },
        {
          xtype: "textfield",
          name: "email",
          itemId: "email",
          fieldLabel: "Email",
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
          fieldLabel: "Phone Number",
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
      bbar: [
        "->",
        {
          itemId: "card-next",
          text: "Next &raquo;",
          handler: "showNext",
          formBind: true,
        },
      ],
    },
    {
      xtype: "form",

      itemId: "card-1",
      scrollable: true,

      items: [
        {
          xtype: "component",
          autoEl: "h3",
          html: "Configure Application Defaults",
        },
        {
          xtype: "fieldcontainer",
          layout: {
            type: "vbox",
            align: "stretch",
          },
          defaults: {
            labelWidth: 150,
          },
          items: [
            // {
            //   xtype: "textfield",
            //   name: "storage_root",
            //   fieldLabel: "Permanent Storage Path",
            //   value: "/data/amps/data",
            // },
            {
              xtype: "textfield",
              name: "storage_temp",
              fieldLabel: "Temp Path",
              value: "/data/amps/tmp",
            },
            // {
            //   xtype: "textfield",
            //   name: "storage_logs",
            //   fieldLabel: "Logs Path",
            //   value: "/data/amps/logs",
            // },
            {
              xtype: "textfield",
              name: "python_path",
              fieldLabel: "Script Module Path",
              value: "/data/amps/modules",
            },
            {
              xtype: "numberfield",
              name: "hinterval",
              fieldLabel: "History Interval",
              value: "2500",
            },
            {
              xtype: "numberfield",
              name: "TTL (days)",
              fieldLabel: "Time to Live(Days)",
              allowBlank: false,
              value: "60",
            },
          ],
        },
      ],
      bbar: [
        "->",
        {
          itemId: "card-prev",
          text: "&laquo; Previous",
          handler: "showPrevious",
        },
        {
          itemId: "card-next",
          text: "Next &raquo;",
          handler: "showNext",
          formBind: true,
        },
      ],
      bbar: [
        "->",
        {
          itemId: "card-prev",
          text: "&laquo; Previous",
          handler: "showPrevious",
          // disabled: true,
        },
        {
          itemId: "card-next",
          formBind: true,
          text: "Finish",
          handler: async function (scope) {
            var rootform = scope.up("startup").down("#card-0");
            var defaultform = scope.up("startup").down("#card-1");

            var defaultvalues = amfutil.convertNumbers(
              defaultform.getForm(),
              defaultform.getValues()
            );
            var mask = new Ext.LoadMask({
              msg: "Loading...",
              target: scope.up("startup"),
            });
            mask.show();
            var rootvalues = rootform.getValues();
            delete rootvalues.confirm;

            var resp = await Ext.Ajax.request({
              method: "post",
              url: "/api/startup",
              jsonData: {
                root: rootvalues,
                system: defaultvalues,
              },
              success: function () {
                Ext.toast("Startup Configuration Successful");
                window.location.reload();
              },
              failure: function () {
                Ext.toast("Startup Configuration Unsuccessful");
                mask.hide();
              },
            });
            console.log(resp);
            console.log();
          },
        },
      ],
    },
  ],

  showNext: function () {
    console.log("Next");
    this.doCardNavigation(1);
  },

  showPrevious: function (btn) {
    this.doCardNavigation(-1);
  },

  doCardNavigation: function (incr) {
    var me = this;
    var l = me.getLayout();
    var i = l.activeItem.itemId.split("card-")[1];
    var next = parseInt(i, 10) + incr;
    l.setActiveItem(next);

    // me.down("#card-prev").setDisabled(next === 0);
    // me.down("#card-next").setDisabled(next === 2);
  },
});
