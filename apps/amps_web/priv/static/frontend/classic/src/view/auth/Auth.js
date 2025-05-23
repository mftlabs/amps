Ext.define("Amps.view.auth.Auth", {
  extend: "Ext.container.Viewport",
  xtype: "auth",
  itemId: "auth-viewport",
  layout: "fit",
  fullscreen: true,
  controller: "auth",
  scrollable: true,
  constructor(args) {
    this.callParent([args]);
    if (!args["init"]) {
      this.down("#center").insert({
        xtype: "startup",
      });
    } else {
      this.down("#center").insert({
        xtype: "panel",
        itemdId: "authpanel",
        items: [{ xtype: "login" }],
        buttons: [
          // {
          //   formBind: true,
          //   style:
          //     "background: url('images/btn_google_signin_dark_normal_web@2x.png') no-repeat; background-size: cover !important; width: 166.1px; height: 40px; border: none;",
          //   itemId: "googlebtn",
          //   handler: function () {
          //     amfutil.providerlogin("google");
          //   },
          // },
        ],
      });
    }
  },

  items: [
    {
      xtype: "container",
      cls: "ufa-auth",
      layout: "center",
      itemId: "center",
      items: [],
    },
  ],
});
