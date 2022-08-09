Ext.define("Amps.view.main.DetailsScreen", {
  extend: "Ext.panel.Panel",
  xtype: "detailsscreen",
  layout: "fit",
  height: "100%",
  width: "100%",
  controller: "page",
  tbar: [
    {
      xtype: "button",
      text: "Back",
      itemId: "detailsbackbtn",
      iconCls: "fa fa-arrow-circle-left",
      handler: async function (btn) {
        var vp = this.up("viewport");
        vp.setLoading(true);
        const route = Ext.util.History.getToken();
        var tokens = route.split("/");

        console.log(tokens);

        if (tokens.length > 3) {
          amfutil.redirect(tokens[0] + "/" + tokens[1]);
        } else if (tokens.length >= 2) {
          var coll = tokens[0];
          var id = tokens[1];
          console.log(coll);
          console.log(id);
          var stored = amfutil.getStoredColl(coll);
          console.log(stored);
          var resp = await amfutil.ajaxRequest({
            url: `api/${coll}/page/${id}`,
            params: stored,
            method: "GET",
          });

          var data = Ext.decode(resp.responseText);

          console.log(
            amfutil.getElementByID("main-grid").getStore() || "false"
          );

          //
          if (data["success"]) {
            if (amfutil.getElementByID("main-grid").getStore().isEmptyStore) {
              amfutil
                .createPageStore(coll, JSON.parse(stored.filters))
                .loadPage(data["page"]);
            }
          }

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
        console.log("REDIRECTED");
        vp.setLoading(false);

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
