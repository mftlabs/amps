Ext.define("Amps.store.Key", {
  extend: "Ext.data.Store",

  alias: "store.key",

  proxy: {
    url: "/api/keys",
    headers: {
      Authorization: localStorage.getItem("access_token"),
    },
    type: "rest",
    reader: {
      type: "json",
      rootProperty: "rows",
      totalProperty: "count",
    },
  },
  autoLoad: false,
});
