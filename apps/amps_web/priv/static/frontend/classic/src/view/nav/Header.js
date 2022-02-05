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
      width: 209,
      xtype: "component",
      width: 209,

      style: {
        "padding-top": 10,
      },
      html: '<img src="/resources/images/agiledatainc.png" style="transform: scale(.75);" />',
    },
    {
      xtype: "component",
      flex: 1,
      style:
        "padding-top:24px;font-weight:600;font-size:24px;text-align:center;",
      html: "AMPS Dashboard",
    },
    {
      xtype: "container",
      layout: "center",
      style: {},
      width: 300,

      items: [
        {
          xtype: "component",
          style: {
            color: "white",
            "font-weight": 600,
            "font-size": 16,
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
});
