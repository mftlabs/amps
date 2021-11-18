Ext.define("Amps.Unauthorized.Viewport", {
  extend: "Ext.Container",
  xtype: "unauthorized",
  itemId: "auth-viewport",
  layout: "fit",
  fullscreen: true,
  controller: "auth",
  scrollable: true,
  style: {
    backgroundColor: "#32404e",
  },
  constructor: function (args) {
    console.log(args);
    this.callParent(args);
    console.log(args);
    var ap = this.down("#authpanel");
    if (args["reset"]) {
      ap.removeAll();
      ap.insert(0, {
        xtype: "reset",
        username: args["reset"].username,
        token: args["reset"].token,
      });
      var clean_uri =
        location.protocol + "//" + location.host + location.pathname;

      window.history.replaceState({}, document.title, clean_uri);
    }
  },
  items: [
    {
      xtype: "container",
      layout: "center",
      items: [
        {
          xtype: "panel",
          itemId: "authpanel",
          width: 500,
          items: [{ xtype: "login" }],
          // buttons: [
          //   {
          //     formBind: true,
          //     style:
          //       "background: url('images/btn_google_signin_dark_normal_web@2x.png') no-repeat; background-size: cover !important; width: 166.1px; height: 40px; border: none;",
          //     itemId: "googlebtn",
          //     handler: function () {
          //       amfutil.providerlogin("google");
          //     },
          //   },
          // ],
        },
      ],
    },
  ],
});
