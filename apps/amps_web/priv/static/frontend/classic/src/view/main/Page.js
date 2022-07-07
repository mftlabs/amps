Ext.define("Amps.view.main.Page", {
  xtype: "page-panel",
  extend: "Ext.panel.Panel",
  requires: [
    "Amps.view.main.List",
    "Amps.view.main.PageNumbers",
    "Amps.controller.PageController",
  ],
  controller: "page",
  layout: "card",
  items: [
    {
      region: "center",
      xtype: "container",
      layout: "card",
      itemId: "page-panel-id",
      items: [
        {
          xtype: "container",
          layout: "card",
          itemId: "page-handler",

          items: [
            {
              xtype: "container",
              itemId: "grid-wrapper",
              layout: "fit",
              items: [
                {
                  xtype: "mainlist",
                  itemId: "main-grid",
                  flex: 1,
                },
              ],
            },

            {
              xtype: "container",
              itemId: "main-page",
              autoDestroy: true,
              flex: 1,
              layout: "fit",
            },
          ],
        },

        {
          scrollable: true,
          xtype: "detailsscreen",
        },
      ],
    },
    {
      region: "center",
      xtype: "container",
      items: [
        {
          html: "Test",
        },
      ],
    },
    {
      xtype: "searchwindow",
      itemId: "searchwindow",
      // renderTo: "page-panel-id",
    },
  ],
});
