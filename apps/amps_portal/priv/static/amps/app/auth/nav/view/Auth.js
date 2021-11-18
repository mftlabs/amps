Ext.define("Amps.Authorized.Viewport", {
  xtype: "authorized",
  extend: "Ext.Container",
  style: {
    backgroundColor: "white",
  },
  title: "Main",
  layout: {
    type: "vbox",
    align: "stretch",
  },
  controller: "page",
  fullscreen: true,
  scrollable: true,
  defaults: {
    xtype: "container",
  },

  items: [
    {
      xtype: "container",
      height: 75,
      padding: 15,
      layout: "hbox",
      style: {
        backgroundColor: "var(--background-color)",
      },
      items: [
        {
          xtype: "container",
          width: 250,
          layout: { type: "vbox", pack: "center" },
          items: [
            {
              xtype: "container",
              layout: { type: "hbox", pack: "start" },

              items: [
                {
                  html: `<div >AMPortal</div>`,
                  style: {
                    fontSize: "3rem",
                  },
                },
              ],
            },
          ],
        },
        {
          xtype: "container",
          flex: 1,
        },
        {
          xtype: "container",
          width: 250,
          layout: { type: "vbox", pack: "center" },
          items: [
            {
              xtype: "container",
              layout: { type: "hbox", pack: "end" },

              items: [
                {
                  html: "AMPortal",
                },
              ],
            },
          ],
        },
      ],
    },

    {
      xtype: "container",
      flex: 1,
      layout: {
        type: "hbox",
        align: "stretch",
      },

      items: [
        {
          xtype: "navbar",
          title: "Main Menu",
          itemId: "mainmenu",
          width: 250,
          cls: "ufa-menu shadowed",
          style: {
            "box-shadow":
              "rgba(67, 71, 85, 0.27) 0px 0px 0.25em, rgba(90, 125, 188, 0.05) 0px 0.25em 1em",
          },
        },
        {
          flex: 1,
          xtype: "container",
          layout: "fit",
          itemId: "mainpage",

          style: {
            "margin-left": "5",
            "margin-right": "5",
            "margin-bottom": "5",
            "box-shadow":
              "rgba(67, 71, 85, 0.27) 0px 0px 0.25em, rgba(90, 125, 188, 0.05) 0px 0.25em 1em",
          },
        },
        {
          xtype: "container",
          width: 50,
          itemId: "actionbar",
          layout: { type: "vbox", align: "stretch" },
          style: {
            backgroundColor: "var(--background-color)",
            "box-shadow":
              "rgba(67, 71, 85, 0.27) 0px 0px 0.25em, rgba(90, 125, 188, 0.05) 0px 0.25em 1em",
          },
          defaults: {
            height: 50,
          },
        },
      ],
    },
    {
      xtype: "container",
      height: 35,
      layout: "hbox",
      style: {
        backgroundColor: "#fafafa",
      },
      items: [
        {
          xtype: "container",
          style: {
            "margin-left": 10,
          },
          layout: { type: "vbox", pack: "center" },
          items: [
            {
              xtype: "container",
              layout: { type: "hbox", pack: "start" },

              items: [
                {
                  html: `© 2021 Agile Data Inc, All rights are reserved.`,
                },
              ],
            },
          ],
        },
        {
          xtype: "container",
          flex: 1,
        },
        {
          xtype: "container",
          style: {
            "margin-right": 10,
          },
          layout: { type: "vbox", pack: "center" },
          items: [
            {
              xtype: "container",
              layout: { type: "hbox", pack: "end" },

              items: [
                {
                  html: "Designed By Agile Data Inc.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
