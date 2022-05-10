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
          items: [{ xtype: "login" }],
          // layout: "center",

          buttons: [
            {
              xtype: "button",
              text: "Forgot Password",
              handler: function () {
                var win = Ext.create({
                  xtype: "window",
                  bodyPadding: 20,
                  title: "Send Password Reset Email",
                  modal: true,
                  items: [
                    {
                      xtype: "form",
                      items: [
                        {
                          xtype: "textfield",
                          name: "email",
                          fieldLabel: "Email",
                        },
                      ],
                      buttons: [
                        {
                          text: "Submit",
                          formBind: true,
                          handler: async function (scope) {
                            win.setLoading(true);
                            var form = scope.up("form");
                            var email = form.getValues().email;
                            var resp = await amfutil.ajaxRequest({
                              method: "POST",
                              url: "/api/users/link/" + email,
                              jsonData: { host: window.location.origin },
                              failure: function () {
                                win.setLoading(false);
                                Ext.toast("Error sending password reset email");
                              },
                            });
                            var data = Ext.decode(resp.responseText);
                            if (data.success) {
                              Ext.toast(
                                "Please check your email for a password reset email."
                              );
                              win.destroy();
                            } else {
                              Ext.toast("Could not find user with that email");
                              win.setLoading(false);
                            }
                          },
                        },
                        {
                          text: "Cancel",
                          handler: function () {
                            win.destroy();
                          },
                        },
                      ],
                    },
                  ],
                });

                win.show();
              },
              listeners: {
                beforerender: async function () {
                  var hidden = !(await amfutil.emailEnabled());
                  this.setHidden(hidden);
                },
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
