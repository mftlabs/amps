Ext.define("Amps.view.form.Key", {
  extend: "Ext.form.FieldContainer",
  xtype: "keyfield",
  layout: "hbox",

  defaults: {
    margin: 5,
  },
  constructor(args) {
    this.callParent(args);
    var name = args["name"];
    console.log(args);
    this.setHeight(args.height);
    var fieldLabel = args["fieldLabel"];
    var items = [
      {
        xtype: "textarea",
        name: name,
        fieldLabel: fieldLabel,
        flex: 1,
        allowBlank: false,
        value: args["value"],
        readOnly: args["readOnly"],
      },
      {
        xtype: "filefield",
        name: name + "_file",
        isFileUpload: false,
        disabled: args["readOnly"],
        // height: 100,
        listeners: {
          change: function (scope, value) {
            var id = scope.getInputId();
            console.log(id);
            var file = document.querySelectorAll(
              `input[name=${name + "_file"}]`
            )[0].files[0];
            console.log(file);
            if (file) {
              var reader = new FileReader();
              reader.readAsText(file, "UTF-8");
              reader.onload = function (evt) {
                scope
                  .up("fieldcontainer")
                  .down("textarea")
                  .setValue(evt.target.result);
              };
              reader.onerror = function (evt) {
                console.log("error reading file");
              };
            }
          },
        },
        flex: 1,
      },
    ];
    this.insert(0, items);
  },
});
