Ext.define("Amps.Unauthorized.Viewport", {
  extend: "Ext.container.Viewport",
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
    this.callParent([args]);
    console.log(args);
    // var ap = this.down("#authpanel");
    // if (args["reset"]) {
    //   ap.removeAll();
    //   ap.insert(0, {
    //     xtype: "reset",
    //     username: args["reset"].username,
    //     token: args["reset"].token,
    //   });
    //   var clean_uri =
    //     location.protocol + "//" + location.host + location.pathname;

    //   window.history.replaceState({}, document.title, clean_uri);
    // }
  },
  items: [
    {
      xtype: "container",
      layout: "center",
      items: [
        {
          xtype: "panel",
          itemId: "authpanel",
          items: [{ xtype: "login" }],
          // layout: "center",

          buttons: [
            {
              xtype: "button",
              text: "Forgot Password",
              handler: function () {
                var dialog = Ext.create({
                  xtype: "dialog",
                  title: "Send Password Reset Email",
                  width: 500,
                  maximizable: true,
                  items: [
                    {
                      xtype: "formpanel",
                      items: [
                        {
                          xtype: "textfield",
                          name: "email",
                          label: "Email",
                        },
                      ],
                      buttons: [
                        {
                          text: "Close",
                          handler: function () {
                            dialog.destroy();
                          },
                        },
                        {
                          text: "Submit",
                          formBind: true,
                          handler: async function (scope) {
                            var form = scope.up("formpanel");
                            var email = form.getValues().email;
                            var resp = await ampsutil.ajaxRequest({
                              method: "POST",
                              url: "/api/users/link/" + email,
                              jsonData: { host: window.location.origin },
                              failure: function () {
                                Ext.toast("Error sending password reset email");
                              },
                            });
                            var data = Ext.decode(resp.responseText);
                            if (data.success) {
                              Ext.toast(
                                "Please check your email for a password reset email."
                              );
                            } else {
                              Ext.toast("Could not find user with that email");
                            }
                            form.reset();
                          },
                        },
                      ],
                    },
                  ],
                });

                dialog.show();
              },
            },
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
        },
      ],
    },
  ],
});
