Ext.define("Amps.store.MessageActivity", {
  extend: "Ext.data.Store",

  alias: "store.messages",

  model: "Amps.model.MessageActivity",

  proxy: {
    url: "/api/messages",
    type: "rest",
    reader: {
      type: "json",
      rootProperty: "data",
      totalProperty: "length",
    },
    pageParam: "pageNumber",
    limitParam: "pageSize",
  },
  autoLoad: false,
});
