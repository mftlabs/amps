/**
 * This view is an example list of people.
 */
Ext.define("Amps.view.main.List", {
  extend: "Ext.grid.Panel",
  xtype: "mainlist",
  alias: "page.grid",
  config: {
    cls: "ufa-grid",
  },

  stateful: true,

  selModel: {
    selType: "checkboxmodel",
  },

  model: "main",
  plugins: ["gridfilters"],

  columns: [
    {
      xtype: "gridcolumn",
      flex: 1,
      dataIndex: "sender",
      text: "Sender",
    },
    {
      xtype: "gridcolumn",
      flex: 1,
      dataIndex: "receiver",
      text: "Receiver",
    },
  ],
  bbar: {
    xtype: "pagingtoolbar",
    displayInfo: true,
  },
});
