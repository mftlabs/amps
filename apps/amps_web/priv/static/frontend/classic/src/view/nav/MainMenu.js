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
