Ext.define("Amps.panel.Script", {
  extend: "Ext.panel.Panel",
  xtype: "script",
  itemId: "script",
  editor: null,
  data: null,
  editing: false,
  layout: "border",
  currScript: null,
  prevScript: null,
  closing: false,
  constructor(args) {
    this.scripts = {};

    this.callParent([args]);
    amfutil.getElementByID("env").on("updateenv", () => {
      this.closeAll();
    });
  },
  listeners: {
    resize: {
      fn: function (el) {
        this.editor.layout();
      },
    },

    dirtychange: function (e) {
      this.scripts[e.name].isDirty = e.dirty;
    },
    togglescript: function (e) {
      this.toggleScript(e);
    },
    tryclosescript: function (name) {
      var dirty = this.scripts[name].isDirty;

      if (dirty) {
        Ext.MessageBox.confirm(
          "Confirm Close Script",
          `You have unsaved changes to script ${name}, do you want to save these changes before closing?`,
          async (e) => {
            switch (e) {
              case "yes":
                await this.save(name);
                this.fireEvent("closescript", name);
                break;
              case "no":
                this.fireEvent("closescript", name);
                break;
              default:
                break;
            }
          }
        );
      } else {
        this.fireEvent("closescript", name);
      }
    },
    closescript: function (e) {
      if (this.prevScript == e) {
        this.prevScript = null;
      }
      console.log(e);
      console.log(this.scripts[e]);
      this.scripts[e].model.dispose();
      delete this.scripts[e];

      if (e == this.currScript) {
        this.currScript = null;

        if (this.prevScript) {
          this.fireEvent("togglescript", this.prevScript);
        } else {
          var keys = Object.keys(this.scripts);
          if (keys.length > 0) {
            this.fireEvent("togglescript", keys[0]);
          } else {
            this.editor.setModel(null);
          }
        }
      }
    },
    afterrender: function () {
      var scope = this;
      var cmp = {
        xtype: "component",
        itemId: "scriptcont",
        title: "Script",
        region: "center",
        // disabled: true,
        listeners: {
          afterrender: function () {
            console.log(this.getEl());
            console.log(this.getEl().dom);

            var editor = window.monaco.editor.create(this.getEl().dom, {
              model: null,
              glyphMargin: true,
              lightbulb: {
                enabled: true,
              },
              fixedOverflowWidgets: true,
              padding: {
                top: 15,
              },
            });
            editor.addAction({
              id: "save",
              label: "Save",
              keybindings: [
                window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS,
              ],
              run: function () {
                scope.save();
              },
            });

            console.log(editor);
            scope.editor = editor;

            setTimeout(function () {
              console.log("Resizing");
              scope.editor.layout();
            }, 250);
          },
        },
      };
      this.insert(cmp);
    },
    beforedestroy: async function () {
      console.log("Destroy Script");
      var tbar = amfutil.getElementByID("scripttabs");
      for (var key in tbar.tabs) {
        Ext.destroy(tbar.tabs[key]);
        delete this.scripts[key];
      }

      console.log(this.scripts);
      for (var key in this.scripts) {
        this.scripts[key].model.dispose();
        delete this.scripts[key];
      }
      window.monaco.editor.getModels().forEach((model) => model.dispose());
    },
  },

  closeAll: function () {
    if (this.scripts) {
      var keys = Object.keys(this.scripts);
      console.log(keys);
      var i = 0;

      const del = () => {
        setTimeout(() => {
          this.fireEvent("closescript", keys[i]);

          i++;
          if (i < keys.length) {
            del();
          } else {
            console.log(this.scripts);

            this.setLoading(false);
          }
        }, 150);
      };
      if (keys.length > 0) {
        del();
      }
    }
  },

  flushScripts: function (store) {
    console.log("Flushing");
    this.setLoading(true);
    console.log(this.scripts);
    var keys = Object.keys(this.scripts);

    var i = 0;

    const del = () => {
      setTimeout(() => {
        if (store.findRecord("name", keys[i])) {
        } else {
          this.fireEvent("closescript", keys[i]);
        }

        i++;
        if (i < keys.length) {
          del();
        } else {
          console.log(this.scripts);

          this.setLoading(false);
        }
      }, 150);
    };
    if (keys.length > 0) {
      del();
    }
  },
  currentScript: function () {
    return this.scripts[this.currScript];
  },
  toggleScript: function (name) {
    if (this.currScript) {
      this.currentScript().state = this.editor.saveViewState();
    }
    this.prevScript = this.currScript;

    this.currScript = name;

    this.editor.setModel(this.currentScript().model);
    this.editor.restoreViewState(this.currentScript().state);
    this.editor.focus();
  },
  save: async function (name) {
    var toSave;

    if (name) {
      toSave = this.scripts[name];
    } else {
      toSave = this.currentScript();
    }

    var script = this;
    script.setLoading(true);
    await amfutil.ajaxRequest({
      method: "put",
      url: `/api/scripts/${toSave.name}`,
      jsonData: {
        data: toSave.model.getValue(),
      },
      success: () => {
        Ext.toast(`Saved ${toSave.name}`);
        this.fireEvent("saved");
        this.setLoading(false);
        toSave.lastSavedVersionId = toSave.model.getAlternativeVersionId();
        this.fireEvent("dirtychange", {
          name: toSave.name,
          dirty: false,
        });
      },
      failure: function () {
        Ext.toast("Failed to save script");
      },
    });
  },
  tbar: {
    xtype: "tabbar",
    itemId: "scripttabs",
    defaultFocus: "script",
    tabs: {},
    listeners: {
      beforerender: function () {
        this.tabs = {};
      },
      render: function () {
        console.log(this.tabs);
        var script = amfutil.getElementByID("script");
        script.on("dirtychange", (e) => {
          this.tabs[e.name].setIconCls(e.dirty ? "x-fa fa-circle" : "");
        });
        script.on("togglescript", (e) => {
          console.log(this.tabs[e]);
          if (this.tabs[e]) {
            this.setActiveTab(this.tabs[e]);
          } else {
            var tab = Ext.create("Ext.tab.Tab", {
              focusable: false,
              text: e,
              listeners: {
                beforeclose: async function () {
                  console.log("before");
                  console.log(this.up("tabbar").activeTab.text);
                  script.fireEvent("tryclosescript", this.text);
                  return false;
                },
                click: function (scope, e) {
                  if (e.target.dataset.ref != "closeEl") {
                    script.fireEvent("togglescript", this.text);
                  }
                },
              },
            });
            this.tabs[e] = tab;
            this.insert(tab);
            this.setActiveTab(tab);
          }
        });
        script.on("closescript", (e) => {
          this.remove(this.tabs[e]);
          delete this.tabs[e];
        });
      },
    },
  },
  loadScript: function (name) {
    this.setLoading(true);
    console.log(name);
    amfutil
      .ajaxRequest({
        url: `api/scripts/${name}`,
      })
      .then((resp) => {
        console.log(resp);
        if (resp.status == 200) {
          if (this.scripts[name]) {
            this.fireEvent("togglescript", name);
          } else {
            var data = Ext.decode(resp.responseText);
            console.log(data);
            var model = window.monaco.editor.createModel(
              data.data,
              "python",
              window.monaco.Uri.parse(`inmemory://${data.name}.py`)
            );

            var script = Object.assign(data, {
              model: model,
              state: null,
              isDirty: false,
              lastSavedVersionId: model.getAlternativeVersionId(),
            });
            model.onDidChangeContent((content) => {
              var dirty =
                script.lastSavedVersionId !== model.getAlternativeVersionId();
              if (dirty != this.scripts[data.name].isDirty) {
                this.fireEvent("dirtychange", {
                  name: data.name,
                  dirty: dirty,
                });
              }
            });
            this.scripts[name] = script;
            this.fireEvent("loadscript", script);
            this.fireEvent("togglescript", data.name);
            this.editor.layout();
          }
        } else if (resp.status == 400) {
          console.log(resp);
          if (this.scripts[name]) {
            this.fireEvent("closescript", name);
          }
          amfutil.getElementByID("scriptgrid").getStore().reload();
        }
        this.setLoading(false);
      });
  },
  items: [],
});
