Ext.define("Amps.controller.FieldController", {
  extend: "Ext.app.ViewController",
  alias: "controller.field",
  // requires: [
  //   "Amps.view.messages.MessageDetails",
  //   // "MftDashboard.view.trackntrace.SessionLogs",
  // ],

  onAddNewButtonClicked: function (btn) {
    var tokens = Ext.util.History.getToken().split("/");
    var config = ampsgrids.grids[tokens[0]]().subgrids[tokens[2]];
    // var win = new Ext.window.Window({
    //   title: "Yes",
    // });
    var win = Ext.create("Amps.form.add", config.window);

    win.show();

    amfutil.getById(tokens[0], tokens[1]).then(async (item) => {
      console.log(item);
      win.loadForm(
        config.object,
        config.fields,
        (form, values) => {
          if (config.add && config.add.process) {
            values = config.add.process(form, values);
          }
          return values;
        },
        false,
        item
      );
      console.log("Yes");
      win.show();
    });

    // ampsgrids.grids[tokens[0]].subgrids[tokens[2]].create(btn, record);
  },

  onSearchPanel: function (btn) {
    var tokens = Ext.util.History.getToken().split("/");
    // var treenav = Ext.ComponentQuery.query("#treenavigation")[0];
    // treenav.setSelection(0);
    console.log(btn.iconCls);

    var window = amfutil.getElementByID("searchwindow");

    window.loadForm(
      tokens[0],
      tokens[2],
      amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`)
    );

    console.log(this);
    // window.show();
    if (!window.isVisible()) {
      btn.setIconCls("x-fa fa-angle-double-right");
      window.show();
      window.setPosition(
        amfutil.getElementByID("center-main").getBox().width -
          window.getSize().width,
        0
      );
      console.log("showing");

      /*if(currentNode== '0'){
                      MftDashboard.util.Utilities.loadMessageActivity();
                  }
                  if(currentNode== '1'){
                      MftDashboard.util.Utilities.loadSessionActivity();
                  }*/
    } else {
      // elem2 = Ext.ComponentQuery.query("#searchpanel")[0];
      // elem2.setHidden(true);
      btn.setIconCls("x-fa fa-search");
      window.hide();
      console.log("hiding");
    }
  },
  onRefreshButtonClicked: async function () {
    var tokens = Ext.util.History.getToken().split("/");
    var grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
    grid.getStore().reload();
  },

  onClearFilter: async function () {
    var tokens = Ext.util.History.getToken().split("/");
    var grid = amfutil.getElementByID(`${tokens[0]}-${tokens[2]}`);
    grid.getStore().clearFilter();
  },

  onExportClicked: async function (btn) {
    var route = Ext.util.History.currentToken;
    var tokens = route.split("/");
    amfutil.download("/api/data/export-subitem/" + route);
  },
});
