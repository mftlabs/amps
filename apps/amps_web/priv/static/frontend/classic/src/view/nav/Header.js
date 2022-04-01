Ext.define("Amps.view.nav.Header", {
  extend: "Ext.container.Container",
  xtype: "appheader",
  maxHeight: 75,
  // align: "center",
  style: "background:#32404e;padding:5px;color:white;",
  defaults: {
    xtype: "container",
    flex: 1,
  },
  // cls: "ufa-header",
  layout: { type: "hbox", align: "stretch" },

  items: [
    {
      xtype: "container",
      autoEl: "div",
      layout: {
        type: "vbox",
        align: "begin",
        vertical: true,
        pack: "middle",
      },
      items: [
        {
          xtype: "component",
          autoEl: {
            tag: "img",
            src: "/images/logo",
            style: `
            width: 200;
            height: 50; 
            object-fit: contain;
            position: absolute; 
            left: 0;
            object-position: 0 0;
          `,
          },
        },
      ],
    },
    {
      xtype: "component",
      flex: 1,
      style:
        "padding-top:24px;font-weight:600;font-size:24px;text-align:center;",
      html: "AMPS Console",
    },
    {
      xtype: "container",
      layout: {
        type: "vbox",
        align: "end",
      },
      style: { "font-size": 14 },
      width: 300,

      items: [
        {
          xtype: "container",
          flex: 1,
          layout: "center",
          items: [
            {
              xtype: "component",
              style: {
                color: "white",
                "font-weight": 600,
              },
              itemId: "env",
              listeners: {
                beforerender: async function () {
                  var user = await amfutil.fetch_user();
                  this.setHtml(
                    `Current Environment: ${
                      user.config.env == "" ? "default" : user.config.env
                    }`
                  );
                },
                updateenv: async function () {
                  var user = await amfutil.fetch_user();
                  this.setHtml(
                    `Current Environment: ${
                      user.config.env == "" ? "default" : user.config.env
                    }`
                  );
                },
              },
            },
          ],
        },
        {
          xtype: "container",
          flex: 1,
          layout: "center",
          items: [
            {
              xtype: "component",
              style: {
                color: "white",
                "font-weight": 600,
              },

              listeners: {
                beforerender: function (scope) {
                  scope.setHtml(
                    "Server Time (" +
                      server_time_zone +
                      ") " +
                      amfutil.showCurrentTime()
                  );
                  var runner = new Ext.util.TaskRunner();
                  taskrunner = runner.start({
                    interval: 1000,
                    run: function () {
                      scope.setHtml(
                        "Server Time (" +
                          server_time_zone +
                          ") " +
                          amfutil.showCurrentTime()
                      );
                    },
                  });
                },
              },
            },
          ],
        },
      ],
    },
  ],
});
