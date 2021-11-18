Ext.define("Amps.view.main.DetailsScreen", {
  extend: "Ext.panel.Panel",
  xtype: "detailsscreen",
  layout: "fit",
  height: "100%",
  width: "100%",
  requires: ["Amps.controller.PageController"],
  controller: "page",
  tbar: [
    {
      xtype: "button",
      text: "Back",
      itemId: "detailsbackbtn",
      iconCls: "fa fa-arrow-circle-left",
      handler: function (btn) {
        const route = Ext.util.History.getToken();
        var tokens = route.split("/");

        if (tokens[0] == "accounts") {
          if (tokens.length >= 2) {
            amfutil.redirect(tokens[0]);
          }
        }
        if (tokens.length > 3) {
          amfutil.redirect(tokens[0] + "/" + tokens[1]);
        } else if (tokens.length >= 2) {
          amfutil.redirect(tokens[0]);
          // amfutil.hideAllButtons();
          // amfutil.showItemButtons(tokens[0]);
        } else {
          // amfutil.redirect(tokens[0]);
          // var count = amfutil.getElementByID("edit_container").items.length;
          // console.log(count);
          // if (count > 0) {
          //   amfutil.getElementByID("edit_container").items.items[0].destroy();
          // }
          // amfutil.getElementByID("page-panel-id").setActiveItem(0);
          // amfutil.hideAllButtons();
          // amfutil.showActionIcons(route);
        }

        // amfutil.getElementByID("actionbar").show();
      },
    },
  ],

  items: [
    {
      xtype: "container",
      itemId: "edit_container",
      layout: "fit",
      items: [],
    },
  ],
});
