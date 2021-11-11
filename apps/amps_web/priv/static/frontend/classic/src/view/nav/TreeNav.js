Ext.define("AmpsDasboard.view.nav.TreeNav", {
  extend: "Ext.list.Tree",
  xtype: "treenav",
  reference: "treelist",
  itemId: "treenavigation",
  height: "auto",
  ui: "nav",
  expanderOnly: false,
  store: Ext.create("Ext.data.TreeStore", {
    root: {
      children: [
        {
          iconCls: "x-fa fa-envelope",
          leaf: true,
          rowCls: "messages",
          text: "Message Activity",
          tooltip: "Message Activity",
          cls: "messages",
        },
        {
          iconCls: "x-fa fa-id-card-o",
          leaf: true,
          rowCls: "accounts",
          text: "Accounts",
          tooltip: "Accounts",
          cls: "accounts",
        },
        {
          iconCls: "x-fa fa-users",
          leaf: true,
          rowCls: "users",
          text: "Users",
        },

        {
          iconCls: "x-fa fa-television",
          leaf: true,
          rowCls: "monitoring",
          text: "Monitoring",
        },

        {
          iconCls: "x-fa fa-cogs",
          rowCls: "configuration",
          text: "Configuration",
          expanded: true,
          children: [
            {
              iconCls: "x-fa fa-columns",
              leaf: true,
              rowCls: "wizard",
              text: "Wizard",
              tooltip: "Wizard",
            },
            {
              iconCls: "x-fa fa-cog",
              leaf: true,
              rowCls: "services",
              text: "Services",
              tooltip: "Services",
            },
            {
              iconCls: "x-fa fa-key",
              leaf: true,
              rowCls: "keys",
              text: "Keys",
              tooltip: "Keys",
            },
            {
              iconCls: "x-fa fa-edit",
              leaf: true,
              rowCls: "topics",
              text: "Topics",
            },
            {
              iconCls: "x-fa fa-tasks",
              leaf: true,
              rowCls: "actions",
              text: "Actions",
            },
            // {
            //   iconCls: "x-fa fa-arrow-down",
            //   leaf: true,
            //   rowCls: "subscribers",
            //   text: "Subscribers",
            // },

            {
              iconCls: "x-fa fa-pencil",
              leaf: true,
              rowCls: "defaults",
              text: "Defaults",
            },
          ],
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
