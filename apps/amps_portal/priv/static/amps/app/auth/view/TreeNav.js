Ext.define("Amps.Authorized.TreeNav", {
  extend: "Ext.list.Tree",
  xtype: "treenav",
  itemId: "treenav",
  height: "auto",
  ui: "navigation",
  expanderOnly: false,
  store: Ext.create("Ext.data.TreeStore", {
    root: {
      children: [
        {
          iconCls: "x-fa fa-envelope",
          leaf: true,
          rowCls: "inbox",
          text: "Inbox",
          tooltip: "Inbox",
          cls: "inbox",
        },
        {
          iconCls: "x-fa fa-download",
          leaf: true,
          rowCls: "ufa",
          text: "UFA",
        },
        {
          iconCls: "x-fa fa-user",
          leaf: true,
          rowCls: "user",
          text: "Account",
          tooltip: "Account",
          // cls: "messages",
        },
      ],
      expanded: true,
    },
    type: "tree",
  }),
  scrollable: true,
  width: "auto",
  listeners: {
    itemclick: "treeNodeSelect",
  },
});
