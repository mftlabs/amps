Ext.define("Amps.controller.MenuController", {
  extend: "Ext.app.ViewController",

  alias: "controller.menu",

  // routes: {
  //   user: "onUser",
  // },

  treeNodeSelect: function (sender, info, eOpts) {
    console.log(info);
    item = info.item;
    console.log(item);
    console.log(info.node.childNodes.length);
    if (info.node.childNodes.length) {
    } else {
      console.log(item._rowCls);
      this.redirectTo(item._rowCls);
      var route = Ext.util.History.getToken();
      if (this.getStore()) {
        newSelection = this.getStore().findRecord("rowCls", route);
        console.log(newSelection);
      }
    }
  },

  onUser: function () {
    console.log("User screen will be rendered here");
  },

  toggleNavType: function (btn, pressed) {
    var menu = this.getView();
    console.log(menu);
    var treenav = menu.down("treenav");
    console.log(treenav);

    var usermenu = menu.down("#usermenu");
    console.log(usermenu);
    var user = JSON.parse(localStorage.getItem("user"));

    if (treenav.getMicro()) {
      usermenu.setText(user.firstname + " " + user.lastname);
      usermenu.setIconCls("x-fa fa-user");
    } else {
      usermenu.setText("");
      usermenu.setIconCls("");
    }

    treenav.setMicro(!treenav.getMicro());
    menu.setWidth(treenav.getMicro() ? 50 : 250);
    // if (btn.iconCls == "x-fa fa-chevron-circle-left") {
    //   //treelist.setUi(null);
    //   treelist.setMicro(true);
    //   ct.setWidth(50);
    //   ct.setMinWidth(50);
    //   mainmenuObj.setWidth(50);
    //   mainmenuObj.setMinWidth(50);
    //   leftnav.setWidth(50);
    //   leftnav.setMinWidth(50);
    //   //ct['removeCls']('treelist-with-nav')
    //   treelist.setExpanderFirst(false);
    //   treelist.setHighlightPath(true);
    //   btn.setIconCls("x-fa fa-chevron-circle-right");
    // } else {
    //   //treelist.setUi('nav');
    //   treelist.setMicro(false);
    //   ct.setWidth(250);
    //   leftnav.setWidth(250);
    //   leftnav.setMinWidth(50);
    //   mainmenuObj.setWidth(250);
    //   mainmenuObj.setMinWidth(50);
    //   //ct.setMinWidth(200);

    //   treelist.setExpanderFirst(true);
    //   treelist.setHighlightPath(false);
    //   //ct['addCls']('treelist-with-nav')
    //   btn.setIconCls("x-fa fa-chevron-circle-left");
    // }
  },

  onLogout: function () {
    ampsutil.logout();
  },

  showUploads: function () {
    console.log("Uploads");
    amfuploads.show();
  },
});
