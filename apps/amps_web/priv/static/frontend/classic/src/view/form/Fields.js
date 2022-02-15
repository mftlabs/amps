Ext.define("Amps.form.DateTime", {
  extend: "Ext.form.FieldContainer",
  mixins: {
    field: "Ext.form.field.Field",
  },
  xtype: "datetime",
  collapsible: true,
  // fields: [],
  // arrayfields: [],
  layout: "hbox",
  fieldLabel: "Start Time",

  constructor: function (args) {
    this.callParent([args]);
    this.itemId = args["itemId"];
    console.log(args);

    // this.arrayfields = args["arrayfields"];
    // this.fieldTitle = args["fieldTitle"];

    var date = this.down("#date");
    var time = this.down("#time");

    // this.arrayfields = args["arrayfields"];
    // this.fieldTitle = args["fieldTitle"];

    if (args["fieldLabel"]) {
      this.setFieldLabel(args["fieldLabel"]);
    } else {
      this.setTitle("Time");
    }

    console.log(this);

    this.name = args["name"];

    // this.buildField();
    // this.callParent();

    this.initField();
    var scope = this;

    if (args["value"]) {
      var value = args["value"];
      var d = new Date(value);

      date.setValue(d);
      var t =
        (d.getHours() < 10 ? "0" : "") +
        d.getHours() +
        ":" +
        (d.getMinutes() < 10 ? "0" : "") +
        d.getMinutes() +
        ":" +
        (d.getSeconds() < 10 ? "0" : "") +
        d.getSeconds();
      time.setValue(t);
    }

    this.setReadOnly(args["readOnly"]);

    if (args["listeners"]) {
      date.setListeners(args["listeners"]);
      time.setListeners(args["listeners"]);
    }
  },

  getErrors: function (val) {
    console.log(val);
  },

  getValue: function () {
    var val = new Date();
    var date = this.down("#date");
    var time = this.down("#time");

    var d = new Date(date.getValue());
    var year = d.getFullYear();
    var month = d.getMonth();
    var date = d.getDate();

    val.setFullYear(year);
    val.setMonth(month);
    val.setDate(date);

    var t = new Date(time.getValue());
    val.setHours(t.getHours());
    val.setMinutes(t.getMinutes());
    val.setSeconds(t.getSeconds());

    var iso = val.toISOString();
    return iso;
  },

  // register: function (name) {
  //   console.log(this);
  //   this.fields.push(name);
  //   console.log(this.fields);
  // },
  // deregister: function (name) {
  //   var index = this.fields.indexOf(name);
  //   if (index > -1) {
  //     this.fields.splice(index, 1);
  //   }
  //   console.log(this.fields);
  // },

  setReadOnly: function (readOnly) {
    // var fi = Ext.ComponentQuery.query("fields");
    var comps = ["date", "time"];
    comps.forEach((comp) => {
      this.down("#" + comp).setReadOnly(readOnly);
    });
  },

  // loadParms: function (data, readOnly) {
  //   var scope = this;
  //   if (data) {
  //     var parms = Object.entries(data).map((entry) => {
  //       return { field: entry[0], value: entry[1] };
  //     });

  //     console.log(parms);

  //     parms.forEach(function (p) {
  //       var length = scope.items.length;
  //       var d;
  //       if (typeof p.value === "boolean") {
  //         d = Ext.create("Amps.form.Parm.Bool", {
  //           name: scope.name,
  //         });

  //         scope.insert(length - 1, d);
  //       } else {
  //         d = Ext.create("Amps.form.Parm.String", {
  //           name: scope.name,
  //         });
  //       }
  //       var f = d.down("#field");
  //       var v = d.down("#value");
  //       f.setValue(p.field);
  //       v.setValue(p.value);
  //       f.setReadOnly(readOnly);
  //       v.setReadOnly(readOnly);
  //       scope.insert(length - 1, d);
  //     });
  //   }
  // },
  items: [
    {
      xtype: "datefield",
      anchor: "100%",
      name: "date",
      itemId: "date",
      emptyText: "Select Date",
      isFormField: false,
      allowBlank: false,
      maxValue: new Date(),
      flex: 1,
      value: new Date(),
      // listeners: {
      //   render: function (datefield) {
      //     var ydate_date = Ext.Date.add(
      //       new Date(),
      //       Ext.Date.DAY,
      //       -1
      //     );
      //     var formattedDate = ydate_date
      //       .toLocaleDateString("en-GB", {
      //         day: "2-digit",
      //         month: "short",
      //         year: "numeric",
      //         timeZone: server_time_zone,
      //       })
      //       .replace(/ /g, "-");
      //     //console.log(formattedDate);
      //     //console.log(typeof(formattedDate));
      //     datefield.setValue(formattedDate);
      //     datefield.setMaxValue(
      //       Ext.util.Format.date(new Date(), "m/d/Y")
      //     );
      //   },
      //   specialkey: function (field, e) {
      //     if (e.getKey() == e.ENTER) {
      //       btn = amfutil.getElementByID(
      //         "filter_message_activity"
      //       );
      //       amfactionhelper.OnEnterKey(btn);
      //     }
      //   },

      //   change: function (field) {
      //     var date = new Date(field.getValue());
      //     var year = date.getFullYear();
      //     var month = date.getMonth();
      //     var day = date.getDate();
      //     console.log(year, month, day);
      //     if (
      //       field.getValue() != "" ||
      //       field.getValue() != null
      //     ) {
      //       var fromTime = amfutil.getElementByID("fromTime");
      //       if (
      //         fromTime.value == null ||
      //         fromTime.value == ""
      //       ) {
      //         fromTime.setValue("00:00:00");
      //       }
      //     } else {
      //       console.log("going to set allow blank true");
      //       amfutil.getElementByID(
      //         "fromTime"
      //       ).allowBlank = true;
      //     }
      //     var fieldset = this.up("fieldset");
      //     console.log(fieldset);
      //     var hidden =
      //       amfutil.getElementByID("datefiltervalue");
      //     console.log(hidden.value);
      //     var curr = hidden.value;
      //     if (curr != "" && curr != null) {
      //       curr = JSON.parse(curr);
      //     } else {
      //       curr = {};
      //     }

      //     if (curr["$gt"]) {
      //       var date = new Date(curr["$gt"]);
      //       date.setFullYear(year);
      //       date.setMonth(month);
      //       date.setDate(day);

      //       curr["$gt"] = date;
      //     } else {
      //       curr["$gt"] = new Date(date);
      //     }

      //     console.log(curr);
      //     hidden.setValue(JSON.stringify(curr));
      //   },
      // },
    },
    {
      xtype: "timefield",
      name: "time",
      fieldLabel: "",
      increment: 15,
      itemId: "time",
      emptyText: "Select Time",
      isFormField: false,
      value: "00:00:00",
      padding: { left: 4, top: 0, bottom: 0 },
      format: "H:i:s",
      anchor: "100%",
      flex: 1,
      allowBlank: false,
      // listeners: {
      //   render: function (timefield) {
      //     var ydate_date = Ext.Date.add(
      //       new Date(),
      //       Ext.Date.DAY,
      //       -1
      //     );
      //     var time = ydate_date.toLocaleTimeString("en-GB", {
      //       hour: "2-digit",
      //       minute: "2-digit",
      //       second: "2-digit",
      //       timeZone: server_time_zone,
      //     });
      //     //console.log('time',time);
      //     //console.log('time',typeof(time));
      //   },
      //   specialkey: function (field, e) {
      //     if (e.getKey() == e.ENTER) {
      //       btn = amfutil.getElementByID(
      //         "filter_message_activity"
      //       );
      //       amfactionhelper.OnEnterKey(btn);
      //     }
      //   },
      //   change: function (field) {
      //     var date = new Date(field.getValue());
      //     var hours = date.getHours();
      //     var minutes = date.getMinutes();
      //     var seconds = date.getSeconds();
      //     console.log(hours, minutes, seconds);
      //     if (!isNaN(hours)) {
      //       var hidden =
      //         amfutil.getElementByID("datefiltervalue");
      //       console.log(hidden.value);
      //       var curr = hidden.value;
      //       if (curr != "" && curr != null) {
      //         curr = JSON.parse(curr);
      //       } else {
      //         curr = {};
      //       }

      //       if (curr["$gt"]) {
      //         var date = new Date(curr["$gt"]);
      //         date.setHours(hours);
      //         date.setMinutes(minutes);
      //         date.setSeconds(seconds);

      //         curr["$gt"] = date;
      //       }
      //       console.log(curr);
      //       hidden.setValue(JSON.stringify(curr));
      //     }
      //   },
      // },
    },
  ],
});

Ext.define("Amps.form.Defaults", {
  extend: "Ext.form.FieldSet",
  xtype: "defaults",
  title: "Default Metadata",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  layout: "anchor",
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Field",
          name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "field",
        },
        {
          xtype: "splitter",
          tabIndex: -1,
        },
        {
          xtype: "textfield",
          fieldLabel: "Value",
          flex: 1,
          name: "value",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "value",
        },
      ],
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      itemId: "parmbutton",

      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
    {
      xtype: "hidden",
      name: "defaults",
      itemId: "defaultvalue",
    },
  ],
});

Ext.define("Amps.form.Keys", {
  extend: "Ext.container.Container",
  constructor: function (config) {
    var data = {};
    (data.items = [
      {
        xtype: "fieldcontainer",
        layout: "hbox",
        items: [
          {
            xtype: "textfield",
            flex: 1,
            fieldLabel: config.label,
            name: config.name,
            itemId: "value",
          },
        ],
      },
      {
        xtype: "button",
        iconCls: "x-fa fa-trash",
        handler: function (button, event) {
          console.log(button);
          button.up("fieldset").remove(button.up("container"));
        },
      },
    ]),
      this.callParent([data]);

    // console.log(init);
  },
  xtype: "keys",
  title: "Keys",
  collapsible: true,
  defaultType: "textfield",
  controller: "matchpattern",
  defaults: { anchor: "100%" },
  style: {
    margin: 5,
  },
  layout: "anchor",
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: this.label,
          name: this.name,
          itemId: "value",
        },
      ],
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
  ],
});

Ext.define("Amps.form.FileMetaData", {
  extend: "Ext.form.FieldSet",
  xtype: "filemetadata",
  title: "File Metadata",
  collapsible: true,
  defaultType: "textfield",
  controller: "agentputcontroller",
  defaults: { anchor: "100%" },
  layout: "anchor",
  items: [
    {
      xtype: "fieldcontainer",
      layout: "hbox",
      items: [
        {
          xtype: "textfield",
          flex: 1,
          fieldLabel: "Key",
          name: "field",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "field",
        },
        {
          xtype: "splitter",
          tabIndex: -1,
        },
        {
          xtype: "textfield",
          fieldLabel: "Value",
          flex: 1,
          name: "value",
          listeners: {
            change: "onDefaultChange",
          },
          itemId: "value",
        },
      ],
    },
    {
      xtype: "button",
      iconCls: "x-fa fa-trash",
      handler: function (button, event) {
        console.log(button);
        button.up("fieldset").up("fieldset").remove(button.up("fieldset"));
      },
    },
    {
      xtype: "hidden",
      name: "fmeta",
      itemId: "filemetadatavalue",
    },
  ],
});
