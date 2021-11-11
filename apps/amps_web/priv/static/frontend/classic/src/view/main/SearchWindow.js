Ext.define("AmpsDasboard.view.main.SearchWindow", {
  extend: "Ext.window.Window",
  xtype: "searchwindow",
  itemId: "searchwindow",
  title: "Search Records",
  modal: false,
  closeAction: "hide",
  draggable: true,
  cls: "search-window",
  layout: "fit",
  floating: true,
  minWidth: 646,
  maxWidth: 646,
  minHeight: 400,
  left: -1000,
  top: -1000,
  shadow: true,
  style: "border-top:1px solid gray",
  listeners: {
    "hide": {
      fn: function (panel, eOpts) {
        var btns = Ext.ComponentQuery.query("#searchpanelbtn");
        btns.forEach((btn) => {
          btn.setIconCls("x-fa fa-search");
        });
        amfutil.getElementByID("searchpanelbtn");
      },
      // scope: this,
    },
  },

  loadForm: function (page, field, grid) {
    var route = Ext.util.History.currentToken;
    var formPanel;
    console.log(route);
    if (page) {
      formPanel = amfutil.createFieldSearch(page, field, grid);
    } else {
      formPanel = amfutil.createFormFilter();
      console.log("inserting");
    }

    if (this.items.length == 0) {
      this.insert(formPanel);
    }
  },
  clearForm: function () {
    this.removeAll();
  },
});
