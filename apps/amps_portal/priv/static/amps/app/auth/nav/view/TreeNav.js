Ext.define("Amps.Authorized.TreeNav", {
  extend: "Ext.list.Tree",
  xtype: "treenav",
  itemId: "treenav",
  height: "auto",
  ui: "nav",
  store: {
    root: {
      expanded: true,
      children: [
        {
          text: "Inbox",
          rowCls: "inbox",
          leaf: true,
          iconCls: "x-fa fa-inbox",
        },
        {
          text: "Profiles",
          rowCls: "profiles",
          leaf: true,
          iconCls: "x-fa fa-id-card",
        },
        {
          text: "Account",
          rowCls: "user",
          leaf: true,
          iconCls: "x-fa fa-user-circle",
        },
      ],
    },
  },
  scrollable: true,
  width: "auto",
  listeners: {
    itemclick: "treeNodeSelect",
  },
});
