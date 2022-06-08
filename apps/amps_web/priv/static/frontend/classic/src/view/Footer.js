Ext.define("Amps.view.Footer", {
  extend: "Ext.container.Container",
  xtype: "appfooter",
  layout: "hbox",
  maxHeight: 35,
  align: "center",
  cls: "ufa-footer",
  defaults: {
    xtype: "container",
    flex: 1,
  },
  items: [
    {
      html: "&copy; 2022 MFT Labs, All rights reserved.",
      style: "text-align:left;font-size:14px;",
    },
    {
      html: "Designed By Agile Data Inc",
      style: "text-align:right;font-size:14px;",
    },
  ],
});
