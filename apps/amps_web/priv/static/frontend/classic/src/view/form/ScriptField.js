Ext.define("Amps.container.Script", {
  extend: "Ext.container.Container",
  xtype: "scriptfield",
  editor: null,
  layout: "fit",
  constructor(args) {
    this.callParent([args]);
    this.initField();
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
  setReadOnly: function (readOnly) {
    this.editor.updateOptions({ readOnly: readOnly });
  },
  setValue: function (val) {
    if (this.editor) {
      this.editor.getModel().setValue(val);
    }
  },
  getValue: function () {
    if (this.editor) {
      return this.editor.getModel().getValue();
    } else {
      return this.value;
    }
  },
  mixins: {
    field: "Ext.form.field.Field",
  },
  listeners: {
    show: function (el) {
      scope.editor.layout();
    },
    resize: {
      fn: function (el) {
        this.editor.layout();
      },
    },
    afterrender: function () {
      console.log(this.getEl());
      console.log(this.getEl().dom);

      var editor = window.monaco.editor.create(this.getEl().dom, {
        model: window.monaco.editor.createModel(
          this.value,
          "python",
          window.monaco.Uri.parse(`inmemory://${amfutil.uuid()}${this.name}.py`)
        ),
        glyphMargin: true,
        lightbulb: {
          enabled: true,
        },
        readOnly: this.readOnly,
        fixedOverflowWidgets: true,
        padding: {
          top: 15,
        },
      });

      console.log(editor);
      this.editor = editor;
      var scope = this;
      setTimeout(function () {
        console.log("Resizing");
        scope.editor.layout();
      }, 250);
    },
    destroy: function () {
      console.log("dest");
      if (this.editor) {
        this.editor.getModel().dispose();
      }
    },
  },
  items: [],
});
