Ext.define("Amps.view.nav.MainMenu", {
  extend: "Ext.container.Container",
  xtype: "mainmenu",
  requires: [
    "Amps.controller.MenuController",
    "Amps.view.nav.MainMenuModel",
    "Amps.view.main.MainModel",
    //  'Amps.view.nav.TreeNav'
  ],
  controller: "menu",
  viewModel: "mainmenu",
  layout: "border",
  items: [
    {
      region: "north",
      xtype: "button",
      iconCls: "x-fa fa-bars",
      handler: "toggleNavType",
      style: {
        "box-shadow": "none",
        border: "none",
        // background: "var(--secondary-color)",
      },
      // cls: "button_class",
    },
    {
      region: "center",
      xtype: "container",
      scrollable: true,
      style: {
        background: "var(--secondary-color)",
      },
      items: [
        {
          xtype: "treenav",
        },
      ],
    },
    {
      height: 50,
      region: "south",
      xtype: "container",
      layout: "hbox",
      style: {
        background: "#32404e",
      },
      defaults: {
        margin: "5",
      },
      items: [
        // {
        //   xtype: "button",
        //   iconCls: "x-fa fa-upload",
        //   tooltip: "Uploads",
        //   flex: 1,
        //   handler: "showUploads",
        // },
        {
          xtype: "button",
          itemId: "usermenu",
          iconCls: "x-fa fa-user",
          flex: 3,
          text: (function () {
            var user = JSON.parse(localStorage.getItem("user"));
            if (user) {
              return user.firstname + " " + user.lastname;
            }
            return;
          })(),
          menuAlign: "bl-tl",
          menu: {
            items: []
              .concat(
                localStorage.getItem("user") &&
                  (JSON.parse(localStorage.getItem("user")).provider ==
                    "vault" ||
                    JSON.parse(localStorage.getItem("user")).provider == "db")
                  ? [
                      {
                        text: "Change Password",
                        iconCls: "x-fa fa-user-circle-o",
                        handler: "onResetPassword",
                      },
                    ]
                  : []
              )
              .concat([
                {
                  text: "Uploads",

                  iconCls: "x-fa fa-upload",
                  handler: "showUploads",
                },
                {
                  text: "Change Password",
                  iconCls: "x-fa fa-key",
                  handler: "onChangePassword",
                },
                {
                  text: "Change Environment",
                  iconCls: "x-fa fa-photo",
                  handler: function () {
                    var win = new Ext.window.Window({
                      title: "Change Environment",
                      width: 300,
                      height: 200,
                      modal: true,
                      layout: "fit",
                      listeners: {
                        afterrender: async function () {
                          this.setLoading(true);
                          var user = await amfutil.fetch_user();
                          var form = Ext.create({
                            xtype: "form",

                            layout: "fit",

                            listeners: {
                              afterrender: async function () {
                                this.setLoading(true);

                                var envs = await amfutil.getCollectionData(
                                  "environments",
                                  { active: true }
                                );
                                envs.push({ name: "", desc: "default" });
                                this.insert({
                                  xtype: "fieldcontainer",
                                  layout: {
                                    type: "vbox",
                                    align: "stretch",
                                  },
                                  padding: 15,
                                  items: [
                                    amfutil.localCombo(
                                      "Environment",
                                      "env",
                                      envs,
                                      "name",
                                      "desc",
                                      {
                                        value: user.config.env,
                                      }
                                    ),
                                  ],
                                });
                                this.setLoading(false);
                              },
                            },
                            buttons: [
                              {
                                text: "Change Environment",
                                handler: async function (btn) {
                                  var win = btn.up("window");
                                  win.setLoading(true);
                                  var values = btn.up("form").getValues();
                                  await amfutil.updateInCollection(
                                    "admin",
                                    { config: { env: values.env } },
                                    user._id,
                                    function () {
                                      amfutil.updateEnv();

                                      win.setLoading(false);
                                      win.hide();
                                    },
                                    function () {
                                      win.setLoading(false);
                                      Ext.toast(
                                        "Failed to change environment."
                                      );
                                    }
                                  );
                                },
                              },
                              {
                                text: "Cancel",
                                handler: function (btn) {
                                  btn.up("window").close();
                                },
                              },
                            ],
                          });
                          this.insert(form);
                          this.setLoading(false);
                        },
                      },
                    });
                    win.show();
                  },
                },
                {
                  text: "Logout",

                  iconCls: "x-fa fa-sign-out",
                  handler: "onLogout",
                },
              ]),
          },
        },
      ],
    },
  ],
});
