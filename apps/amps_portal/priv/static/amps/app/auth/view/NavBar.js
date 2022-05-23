Ext.define("Amps.Authorized.NavBar", {
  extend: "Ext.container.Container",
  xtype: "navbar",
  controller: "menu",

  layout: { type: "vbox", align: "stretch" },
  items: [
    {
      xtype: "button",
      iconCls: "x-fa fa-bars",
      handler: "toggleNavType",
      // style: "box-shadow: none; background: #fafafa;",
      // cls: "button_class",
    },
    {
      flex: 1,
      xtype: "container",
      scrollable: true,
      layout: "fit",
      // style: {
      //   background: "#32404e",
      // },
      items: [
        {
          xtype: "treenav",
        },
      ],
    },
    {
      height: 50,
      xtype: "container",
      layout: "center",
      // style: {
      //   background: "#fafafa",
      // },
      // defaults: {
      //   margin: "5",
      // },
      layout: "fit",
      items: [
        {
          xtype: "button",
          // ui: "action",
          itemId: "usermenu",
          iconCls: "x-fa fa-user",
          text: "User",
          listeners: {
            beforerender: async function (btn) {
              var user = await amfutil.userInfo();
              console.log(user);
              if (user) {
                btn.setText(user.username);
              }
            },
          },
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
                // {
                //   text: "Uploads",

                //   iconCls: "x-fa fa-upload",
                //   handler: function () {
                //     console.log(ampsuploads);
                //     ampsuploads.show();
                //   },
                // },
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
