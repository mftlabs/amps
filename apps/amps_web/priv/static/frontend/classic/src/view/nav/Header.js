Ext.define("Amps.view.nav.Header", {
  extend: "Ext.container.Container",
  xtype: "appheader",
  layout: "hbox",
  maxHeight: 75,
  align: "center",
  style: "background:#32404e;padding:5px;color:white;",
  defaults: {
    xtype: "container",
    flex: 1,
  },
  cls: "ufa-header",
  items: [
    {
      html: '<img src="/resources/images/agiledatainc.png" style="width:209px;padding-top: 10px; transform: scale(.75);" />',
    },
    {
      html: '<h1 class="headerclass2" style="padding-top:15px;" >AMPS Dashboard</h1>',
      style: "text-align:center;",
    },
    {
      xtype: "container",
      style: "text-align:right;",
      layout: {
        type: "hbox",
        pack: "end",
      },
      items: [
        {
          xtype: "container",
          style: "text-align:right;",
          layout: {
            type: "vbox",
            pack: "end",
          },
          items: [
            {
              xtype: "container",
              style: "text-align:right;margin-top:20px;padding-right:5px;",
              itemId: "header_userinfo",
              cls: "headerclass",
              html:
                "Welcome " +
                (function () {
                  var user = JSON.parse(localStorage.getItem("user"));
                  if (user) {
                    return user.firstname + " " + user.lastname;
                  }
                  return;
                })(),
              //padding: '17 0',
              //margin : {right: 10}
            },
            {
              xtype: "displayfield",
              itemId: "current_time",
              listeners: {
                render: function () {
                  var runner = new Ext.util.TaskRunner();
                  taskrunner = runner.start({
                    interval: 1000,
                    run: function () {
                      amfutil
                        .getElementByID("current_time")
                        .setValue(
                          '<strong style="color:white" class="headerclass">Server Time ' +
                            "(" +
                            server_time_zone +
                            ") " +
                            '<span style="font-size:15px">' +
                            amfutil.showCurrentTime() +
                            "</span>" +
                            "</strong>"
                        );
                    },
                  });
                },
              },
            },
          ],
        },

        {
          xtype: "button",
          //text: 'Logout',
          iconCls: "x-fa fa-compass size",
          cls: "button_class",
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
          //tooltip:'Logout',
          margin: "10 0",
          //handler: 'onLogout'
        },
      ],
    },
  ],
});
