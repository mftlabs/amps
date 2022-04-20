Ext.define("Amps.form.Object", {
  // Fieldset in Column 1 - collapsible via toggle button
  extend: "Ext.form.FieldSet",
  xtype: "objfield",
  itemId: "obj",
  flex: 1,
  collapsible: true,

  constructor: function (args) {
    this.callParent([args]);
    this.initField();
    console.log(args["fields"]);
    this.insert(0, args["fields"]);
    var fields = this.query("field");
    fields.forEach((field) => {
      field.setConfig("isFormField", false);
    });
    console.log(fields);

    console.log("init");
    // var cmp = {
    //   xtype: "component",
    //   itemId: "scriptcont",
    //   title: "Script",
    //   region: "center",
    //   // disabled: true,

    // };
    // this.insert(cmp);
    console.log("inserted");
  },
  //   setReadOnly: function (readOnly) {

  //   },
  setValue: function (val) {
    var vals;
    try {
      vals = JSON.parse(val);
    } catch {
      vals = {};
    }
    var fields = this.query("field");
    fields.forEach((field) => {
      field.setValue(vals[field.name]);
    });
  },
  getValue: function () {
    var obj = {};
    var fields = this.query("field");
    fields.forEach((field) => {
      obj[field.name] = field.getValue();
    });
    console.log(obj);

    return JSON.stringify(obj);
    // if (this.editor) {
    //   return this.editor.getModel().getValue();
    // } else {
    //   return this.value;
    // }
  },
  mixins: {
    field: "Ext.form.field.Field",
  },
});
