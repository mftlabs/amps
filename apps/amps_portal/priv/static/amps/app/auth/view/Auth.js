Ext.define("Amps.Authorized.Viewport", {
  xtype: "authorized",
  extend: "Ext.container.Viewport",
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
      layout: "border",
      style: {
        backgroundColor: "var(--main-color)",
      },
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
          xtype: "container",
          region: "center",
          layout: "center",
          flex: 1,
          style: {
            color: "white",
            "font-size": 36,
            "font-weight": "500",
          },
          items: [
            {
              xtype: "component",
              html: `<i>AMP</i>ortal`,
            },
          ],
        },
        {
          xtype: "container",
          layout: "center",
          region: "east",
          width: 100,
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
            // "margin-left": "5",
            // "margin-right": "5",
            // "margin-bottom": "5",
            margin: 5,
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
            backgroundColor: "var(--main-color)",
            "box-shadow":
              "rgba(67, 71, 85, 0.27) 0px 0px 0.25em, rgba(90, 125, 188, 0.05) 0px 0.25em 1em",
          },
          defaults: {
            height: 50,
            // margin: 2,
          },
        },
      ],
    },
    {
      xtype: "container",
      height: 50,
      layout: {
        type: "hbox",
        align: "stretch",
      },
      style: {
        backgroundColor: "var(--main-color)",
      },
      items: [
        {
          xtype: "container",
          layout: "center",
          width: 300,
          style: {
            color: "white",
          },
          items: [
            {
              xtype: "component",
              html: `© 2021 Agile Data Inc, All rights are reserved.`,
            },
          ],
        },
        {
          xtype: "container",
          flex: 1,
        },
        {
          xtype: "container",
          width: 200,
          style: {
            color: "white",
            "text-align": "right",
          },
          layout: "center",

          items: [
            {
              xtype: "component",
              html: `Designed by Agile Data Inc.`,
            },
          ],
        },
      ],
    },
    {
      xtype: "searchwindow",
      itemId: "searchwindow",
    },
  ],
});
