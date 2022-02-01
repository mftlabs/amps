Ext.define("Amps.view.main.MainController", {
  itemId: "maincontroller",
  extend: "Ext.app.ViewController",

  alias: "controller.main",
  requires: ["Amps.view.main.SearchWindow"],

  listen: {
    controller: {
      "*": {
        welcome: "greet",
      },
    },
  },

  routes: {
    logout: "onLogout",
  },

  // onRoute: function () {
  //   console.log("Triggering routes");
  //   console.log(this);

  //   console.log(Ext.util.History.currentToken);
  //   token = Ext.util.History.currentToken;
  // },

  onLogout: function () {
    amfutil.logout();
  },

  showUploads: function () {
    console.log("Uploads");
    amfuploads.show();
  },

  greet: function () {
    console.log("Greetings triggered");
  },

  //onItemSelected: function (sender, record) {
  //  Ext.Msg.confirm("Confirm", "Are you sure?", "onConfirm", this);
  //},

  onConfirm: function (choice) {
    console.log("Choice seleted:" + choice);
    if (choice === "yes") {
      //
      console.log("Confirmed.");
      this.redirectTo("/users", { replace: true });
    }
  },

  // Component forms

  onAddNewButtonClicked: function (btn) {
    componentname = amfutil.getElementByID("addnewbtn").componentname;
    var route = Ext.util.History.currentToken;
    var tokens = route.split("/");
    console.log(route);
    switch (route) {
      case "accounts":
        console.log("Render accounts form");
        this.addAccounts(btn);
        break;
      case "admin":
        this.addUser(btn);
        break;
      case "topics":
        this.createForm(btn, route);
        break;
      case "services":
        this.addService(btn);
        break;
      default:
        this.createForm(btn, route);
    }
  },

  createForm: function (btn, route) {
    var grid = amfutil.getElementByID("main-grid");
    // scope = btn.lookupController();

    var config = ampsgrids.grids[route]();

    var win = Ext.create("Amps.form.add", config.window);
    win.loadForm(config.object, config.fields, (form, values) => {
      if (config.add && config.add.process) {
        values = config.add.process(form, values);
      }
      return values;
    });
    win.show();
  },

  addBucket: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
        width: 400,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "name",
          fieldLabel: "Bucket Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          allowBlank: false,
          itemId: "bucket",
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            change: amfutil.uniqueBucket,
            blur: function (item) {
              //  amfutil.removeSpaces(item.itemId);
            },
          },
          width: 400,
        },
        {
          xtype: "combobox",
          fieldLabel: "Account",
          allowBlank: false,
          displayField: "username",
          valueField: "username",
          forceSelection: true,
          flex: 1,
          name: "account",
          store: Ext.create("Ext.data.Store", {
            proxy: {
              type: "rest",
              headers: {
                Authorization: localStorage.getItem("access_token"),
              },
              extraParams: { projection: "username" },
              url: `/api/accounts`,
              reader: {
                type: "json",
                rootProperty: "rows",
              },
            },
            listeners: {
              load: function (store, records, successful, operation, eOpts) {
                console.log(records);
                console.log(successful);
              },
            },
            autoLoad: true,
          }),
        },
      ],
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              var form = btn.up("form").getForm();
              var values = form.getValues();
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              var bucket = {};
              bucket.account = values.account;
              bucket.name = values.name;
              bucket.rules = [];
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/" + Ext.util.History.getToken(),
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: bucket,
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Bucket created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  amfutil.onFailure("Failed to Create User", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Bucket",
      modal: true,
      width: 500,
      height: 600,
      scrollable: true,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  addAction: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    // scope = btn.lookupController();
    var actions = ampsgrids.grids["actions"]();
    var win = Ext.create("Amps.form.add", {
      width: 650,
      defaults: {
        labelWidth: 200,
      },
    });
    win.loadForm("Action", actions.fields, actions.add.process);
    win.show();
  },

  addTopic: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    // scope = btn.lookupController();

    var win = Ext.create("Amps.form.add");
    win.loadForm("Topic", ampsgrids.grids["topics"]().fields, (values) => {
      return values;
    });
    win.show();
  },

  addService: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    var services = ampsgrids.grids["services"]().types;

    var win = new Ext.window.Window({
      title: "Add Service",
      modal: true,
      width: 800,
      height: 500,
      scrollable: true,
      resizable: false,
      layout: "card",
      bodyPadding: 15,
      defaults: {
        border: false,
        listeners: {
          activate: function (card) {
            var idx = card.id.split("-")[1];
            console.log(idx);
            if (idx > 0) {
              win.down("#card-prev").show();
              win.down("#create").show();
            } else {
              win.down("#card-prev").hide();
              win.down("#create").hide();
            }
          },
          scope: this,
        },
      },

      defaultListenerScope: true,

      items: [
        {
          itemId: "card-0",
          xtype: "container",
          layout: {
            type: "vbox",
            // The total column count must be specified here
          },
          flex: 1,
          items: [],
        },
        {
          itemId: "card-1",
          xtype: "form",
          items: [
            {
              xtype: "component",
              itemId: "servicetitle",
              html: "<h2>Adding Service </h2>",
            },
            {
              xtype: "container",
              itemId: "formbox",
              layout: { type: "vbox", align: "stretch" },
              items: [
                {
                  xtype: "container",
                  layout: {
                    type: "hbox",
                    align: "stretch",
                  },
                  defaults: {
                    margin: 5,
                  },
                  items: [
                    {
                      xtype: "textfield",
                      fieldLabel: "Test",
                      flex: 1,
                    },
                    {
                      xtype: "textfield",
                      fieldLabel: "Test2",
                      flex: 1,
                    },
                  ],
                },
              ],
            },
          ],
          bbar: [
            {
              itemId: "card-prev",
              scale: "medium",
              text: "&laquo; Previous",
              handler: function (scope) {
                scope.up("window").setActiveItem(0);
              },
            },
            "->",
            {
              xtype: "button",
              itemId: "create",
              formBind: true,
              scale: "medium",
              text: "Create",
              handler: async function (btn) {
                var form = btn.up("form").getForm();
                var data;
                if (win.service.process) {
                  data = await win.service.process(form);
                } else {
                  data = await form.getValues();
                }
                data.type = win.service.type;

                data.active = true;

                win.service.fields.forEach((field) => {
                  if (field.xtype == "numberfield") {
                    data[field.name] = parseInt(data[field.name]);
                  }
                });

                var user = amfutil.get_user();

                data.createdby = user.firstname + " " + user.lastname;
                data.created = new Date().toISOString();

                data.modifiedby = user.firstname + " " + user.lastname;
                data.modified = new Date().toISOString();

                console.log(data);
                btn.setDisabled(true);
                var mask = new Ext.LoadMask({
                  msg: "Please wait...",
                  target: grid,
                });
                amfutil.ajaxRequest({
                  headers: {
                    Authorization: localStorage.getItem("access_token"),
                  },
                  url: "api/services",
                  method: "POST",
                  jsonData: data,
                  success: function (response) {
                    btn.setDisabled(false);
                    var data = Ext.decode(response.responseText);
                    Ext.toast("Service added");
                    amfutil.broadcastEvent("update", {
                      page: Ext.util.History.getToken(),
                    });
                    grid.getStore().reload();
                    mask.hide();
                    win.close();
                  },
                  failure: function (response) {
                    mask.hide();
                    btn.setDisabled(false);
                    amfutil.onFailure("Failed to Create Service", response);
                  },
                });
                console.log(data);
              },
            },
          ],
          scrollable: true,
        },
      ],

      loadForm: function (btn, service) {
        var form = this.down("#card-1").down("container");
        var title = this.down("#servicetitle");
        title.setHtml(`<h2>Configure ${service.name} service</h2>`);
        console.log(form);
        this.service = service;
        form.removeAll();

        var hbox = {
          xtype: "container",
          layout: {
            type: "hbox",
            align: "stretch",
          },
          defaults: {
            margin: 5,
            flex: 1,
          },
        };

        var items = [];
        var fields = [];
        fields = fields.concat(ampsgrids.grids["services"]().fields);
        fields = fields.concat(service.fields);
        fields = amfutil.scanFields(fields);
        console.log(fields);

        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (field.row) {
            if (items.length) {
              var row = hbox;
              items.push({ flex: 1 });
              row.items = items;

              form.insert(row);
              items = [];
            }
            form.insert(field);
          } else {
            items.push(field);
            if (items.length == 2) {
              var row = hbox;
              row.items = items;

              form.insert(row);
              items = [];
            } else if (i == fields.length - 1) {
              var row = hbox;
              row.items = items;
              items.push({
                xtype: "displayfield",
              });
              form.insert(row);
              items = [];
            }
          }
        }

        this.getLayout().setActiveItem(1);
      },
    });
    var hbox = {
      xtype: "container",
      layout: "hbox",
      width: "100%",
      defaults: {
        height: 50,
        margin: 5,
      },
    };

    var items = [];

    var store = grid.getStore();

    Object.values(services).forEach((service, idx) => {
      console.log(idx);
      items.push({
        xtype: "button",
        text: service.name,
        height: 100,
        iconCls: service.iconCls ? service.iconCls : null,
        flex: 1,
        handler: function (btn, e) {
          btn.up("window").loadForm(btn, service);
        },
        scale: "medium",
        disabled: false,
        listeners: {
          beforerender: async function (scope) {
            if (service.singleton) {
              var rows = await amfutil.getCollectionData("services", {
                type: service.type,
              });
              if (rows.length) {
                scope.setDisabled(true);
              }
            }
          },
        },
      });
      if (items.length == 3) {
        var row = hbox;
        row.items = items;
        win.down("#card-0").insert(row);
        items = [];
      } else if (idx == Object.values(services).length - 1) {
        var num = 3 - items.length;
        for (var i = 0; i < num; i++) {
          console.log("adding");
          items.push({
            xtype: "button",
            style: {
              background: "white",
              border: "none",
              outline: "none",
            },
            disabled: true,
            height: 100,
            flex: 1,
            scale: "medium",
          });
        }
        var row = hbox;
        row.items = items;
        win.down("#card-0").insert(row);
        items = [];
      }
    });

    // scope = btn.lookupController();

    win.show();
  },

  addUser: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
      },
      scrollable: true,
      items: amfutil.scanFields([
        {
          xtype: "textfield",
          name: "username",
          fieldLabel: "User Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          vtype: "alphnumVtype",
          vtypeText: "Please enter a valid user name",
          tooltip: "The Username for this user",
          allowBlank: false,
          itemId: "username",
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            blur: function (item) {
              //  amfutil.removeSpaces(item.itemId);
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
            change: async function (cmp, value, oldValue, eOpts) {
              await amfutil.duplicateHandler(
                cmp,
                { admin: { username: value } },
                "Admin User Already Exists",
                amfutil.nameValidator
              );
            },
          },
          width: 400,
        },
        {
          xtype: "textfield",
          name: "password",
          fieldLabel: "Password",
          inputType: "password",
          tooltip: "The password for this user",
          allowBlank: false,
          maskRe: /[^\^ ]/,
          vtype: "passwordCheck",
          itemId: "password",
          enableKeyEvents: true,
          width: 400,
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "new-password",
              });
            },
            keypress: function (me, e) {
              var charCode = e.getCharCode();
              if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(false);
              } else {
                me.isValid();
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(true);
              }
            },
            change: function (me, e) {
              confPassword = amfutil.getElementByID("confirmpwd").getValue();
              password = me.value;
              if (confPassword.length != 0) {
                if (password != confPassword) {
                  amfutil.getElementByID("addaccount").setDisabled(true);
                  //amfutil.getElementByID('confpasswd').focus();
                  var m = Ext.getCmp("confpasswd_id");
                  m.setActiveError("Passwords doesn't match");
                } else {
                  if (
                    amfutil.getElementByID("username").isValid() === true &&
                    amfutil.getElementByID("given_name").isValid() === true &&
                    amfutil.getElementByID("surname").isValid() === true &&
                    amfutil.getElementByID("email").isValid() === true &&
                    amfutil.getElementByID("phone_number").isValid() === true
                  ) {
                    amfutil.getElementByID("addaccount").setDisabled(false);
                  }
                  var m = Ext.getCmp("confpasswd_id");
                  m.unsetActiveError();
                }
              }
            },
          },
        },
        {
          xtype: "textfield",
          name: "confirmpwd",
          fieldLabel: "Confirm Password",
          inputType: "password",
          tooltip: "Confirm the password for this user",

          maskRe: /[^\^ ]/,
          id: "confpasswd_id",
          allowBlank: false,
          vtype: "passwordMatch",
          itemId: "confirmpwd",
          enableKeyEvents: true,
          width: 400,
          listeners: {
            keypress: function (me, e) {
              var charCode = e.getCharCode();
              if (!e.shiftKey && charCode >= 65 && charCode <= 90) {
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(false);
              } else {
                me.isValid();
                capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
                capslock_id.setHidden(true);
              }
            },
          },
        },
        {
          html: '<p style="color:red;font-weight:600;margin-left:168px;"><i class="fa fa-exclamation-triangle" aria-hidden="true"></i>Caps lock is on</p>',
          itemId: "user_capslock_id",
          hidden: true,
        },
        {
          xtype: "textfield",
          tooltip: "The First Name of this user",

          name: "firstname",
          itemId: "given_name",
          fieldLabel: "Given Name",
          vtype: "textbox",
          vtypeText: "Please enter a valid first name",
          allowBlank: false,
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
            change: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
        {
          xtype: "textfield",
          name: "lastname",
          itemId: "surname",
          fieldLabel: "Last Name",
          tooltip: "The last name of the user",
          allowBlank: false,
          vtype: "textbox",
          vtypeText: "Please enter a valid Last Name",
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
        {
          xtype: "textfield",
          itemId: "email",
          name: "email",
          vtype: "email",
          fieldLabel: "Email",
          tooltip: "The user's email",
          allowBlank: false,
          //  minLength:MftDashboard.util.FieldValidations.EMAIL_MIN_LENTGH,
          //   maxLength:MftDashboard.util.FieldValidations.EMAIL_MAX_LENTGH,
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
        {
          xtype: "textfield",
          name: "phone",
          fieldLabel: "Phone Number",
          tooltip: "The user's phone",

          allowBlank: false,
          itemId: "phone_number",
          vtype: "phone",
          width: 400,
          listeners: {
            blur: function (field) {
              capslock_id = Ext.ComponentQuery.query("#user_capslock_id")[0];
              capslock_id.setHidden(true);
            },
          },
        },
      ]),
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              username = form.findField("username").getSubmitValue();
              password = form.findField("password").getSubmitValue();
              given_name = form.findField("given_name").getSubmitValue();
              surname = form.findField("surname").getSubmitValue();
              email = form.findField("email").getSubmitValue();
              phone_number = form.findField("phone").getSubmitValue();
              // page_size = grid.store.pageSize;
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/user/reg",
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: {
                  username: username,
                  password: password,
                  firstname: given_name,
                  lastname: surname,
                  email: email,
                  phone: phone_number,
                },
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("User created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Create User", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add User",
      modal: true,
      width: 450,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  addAccounts: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 5,
        labelWidth: 140,
        width: 400,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "username",
          fieldLabel: "User Name",
          maskRe: /[^\^ ~`!@#$%^&*()+=[\]{}\\|?/:;,<>"']/,
          // vtype: "bucketUsernameVtype",
          allowBlank: false,
          itemId: "username",
          validateOnBlur: false,
          validator: function (value) {
            console.log(value);
            var reg = new RegExp("^[0-9a-z.-]+$");
            if (value.length >= 3) {
              if (reg.test(value)) {
                return true;
              } else {
                return "Username must be lowercase and contain only letters, numbers, hyphens, and periods.";
              }
            } else {
              return "Username must be between 8 and 40 characters";
            }
          },
          listeners: {
            afterrender: function (cmp) {
              cmp.inputEl.set({
                autocomplete: "nope",
              });
            },
            change: amfutil.uniqueBucket,
            blur: function (cmp, event, eOpts) {
              console.log(event);
              //  amfutil.removeSpaces(item.itemId);
            },
          },
          width: 400,
        },
        {
          xtype: "textfield",
          name: "given_name",
          itemId: "given_name",
          fieldLabel: "Given Name",
          vtype: "textbox",
          vtypeText: "Please enter a valid given name",
          allowBlank: false,
          width: 400,
          listeners: {
            blur: function (field) {},
            change: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "surname",
          itemId: "surname",
          fieldLabel: "Surname",
          allowBlank: false,
          vtype: "textbox",
          vtypeText: "Please enter a valid surname",
          width: 400,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          itemId: "email",
          name: "email",
          vtype: "email",
          fieldLabel: "Email",
          allowBlank: false,
          //  minLength:MftDashboard.util.FieldValidations.EMAIL_MIN_LENTGH,
          //   maxLength:MftDashboard.util.FieldValidations.EMAIL_MAX_LENTGH,
          width: 400,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "phone_number",
          fieldLabel: "Phone Number",
          allowBlank: false,
          itemId: "phone_number",
          vtype: "phone",
          width: 400,
          listeners: {
            blur: function (field) {},
          },
        },
        {
          xtype: "textfield",
          name: "ufa_home_folder",
          itemId: "ufa_home_folder",
          fieldLabel: "UFA Home Folder",
          allowBlank: false,
          listeners: {
            change: function (obj) {
              log_file_path = amfutil.getElementByID("log_file_path");
              log_file_path.setValue(obj.getValue() + "/logs");
            },
          },
        },

        {
          xtype: "textfield",
          name: "config_polling_interval",
          itemId: "config_polling_interval",
          fieldLabel: "Configuration Polling Interval(Sec)",
          value: "2",
        },
        {
          xtype: "textfield",
          name: "heartbeat_polling_interval",
          itemId: "heartbeat_polling_interval",
          fieldLabel: "Hearbeat Polling Interval(Sec)",
          value: "2",
        },
        {
          xtype: "textfield",
          name: "log_file_path",
          itemId: "log_file_path",
          fieldLabel: "Log File Path",
        },
        {
          xtype: "checkboxfield",
          name: "debug_logging",
          itemId: "debug_logging",
          fieldLabel: "Debug Logging",
          value: false,
        },
        // {
        //   xtype: "textfield",
        //   name: "aws_access_key_id",
        //   itemId: "aws_access_key_id",
        //   fieldLabel: "Access Key Id",
        // },
        // {
        //   xtype: "textfield",
        //   name: "aws_secret_access_key",
        //   itemId: "aws_secret_access_key",
        //   fieldLabel: "Secret Access Key",
        //   inputType: "password",
        // },
      ],
      buttons: [
        {
          text: "Save",
          itemId: "addaccount",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              username = form.findField("username").getSubmitValue();
              given_name = form.findField("given_name").getSubmitValue();
              surname = form.findField("surname").getSubmitValue();
              email = form.findField("email").getSubmitValue();
              phone_number = form.findField("phone_number").getSubmitValue();
              // page_size = grid.store.pageSize;
              ufa_home_folder = form
                .findField("ufa_home_folder")
                .getSubmitValue();
              config_polling_interval = form
                .findField("config_polling_interval")
                .getSubmitValue();
              heartbeat_polling_interval = form
                .findField("heartbeat_polling_interval")
                .getSubmitValue();
              log_file_path = form.findField("log_file_path").getSubmitValue();
              debug_logging = form.findField("debug_logging").getValue();
              // console.log(password);
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/accounts",
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: {
                  username: username,
                  given_name: given_name,
                  surname: surname,
                  given_name: given_name,
                  email: email,
                  phone_number: phone_number,
                  ufahome: ufa_home_folder,
                  cinterval: config_polling_interval,
                  hinterval: heartbeat_polling_interval,
                  logpath: log_file_path,
                  debug: debug_logging,
                  fields: [],
                  rules: [],
                },
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Account created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure("Failed to Create Account", response);
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "accounts_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Account",
      modal: true,
      width: 500,
      height: 600,
      scrollable: true,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  onRefreshButtonClicked: function () {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    grid.getStore().reload();
  },

  onReprocessClicked: function () {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    var sel = grid.getSelection();
    sel.forEach((m) => {
      var data = m.data;
      amfutil.reprocess(grid, data.msgid);
    });
  },

  onRerouteClicked: function () {
    var grid = Ext.ComponentQuery.query("#main-grid")[0];
    var sel = grid.getSelection();

    var ids = sel.map((m) => {
      return m.data._id;
    });
    var uploadWindow = new Ext.window.Window({
      title: "Reroute Event",
      modal: true,
      width: 600,
      height: 500,
      scrollable: true,
      resizable: false,
      layout: "fit",
      padding: 10,
      items: [
        {
          xtype: "form",
          defaults: {
            padding: 5,
            labelWidth: 140,
          },
          // layout: {
          //   type: "vbox",
          //   align: "stretch",
          // },
          scrollable: true,
          items: [
            amfutil.outputTopic(),
            {
              // Fieldset in Column 1 - collapsible via toggle button
              xtype: "fieldset",
              title: "Additional Metadata",
              collapsible: true,
              onAdd: function (component, position) {
                // component.setTitle("Match Pattern" + position);
                console.log(component);
                console.log(position);
              },
              items: [
                {
                  xtype: "button",
                  text: "Add",
                  handler: function (button, event) {
                    var formpanel = button.up();

                    formpanel.insert(
                      formpanel.items.length - 1,
                      Ext.create("Amps.form.Defaults")
                    );
                  },
                },
              ],
            },
          ],

          buttons: [
            {
              text: "Send",
              formBind: true,
              handler: function (scope) {
                var form = this.up("form").getForm();
                scope.up("window").setLoading(true);
                var fields = form.getFields();
                var values = form.getValues();

                var meta = amfutil.formatArrayField(values.defaults);
                console.log(meta);
                // console.log(files);
                amfutil.ajaxRequest({
                  url: "api/msg/reroute",
                  method: "post",
                  jsonData: {
                    meta: JSON.stringify(meta),
                    topic: values.output,
                    ids: ids,
                  },
                  success: function () {
                    uploadWindow.close();
                    grid.getStore().reload();
                  },
                });
                // msgbox.anchorTo(Ext.getBody(), "br");
              },
            },
            {
              text: "Cancel",
              cls: "button_class",
              itemId: "cancel",
              listeners: {
                click: function (btn) {
                  uploadWindow.close();
                },
              },
            },
          ],
        },
      ],
    });
    uploadWindow.show();
  },

  onExportClicked: function () {
    var route = Ext.util.History.currentToken;
    var tokens = route.split("/");
    console.log('componentname',route);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "/api/data/export/"+route)
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Authorization', localStorage.getItem("access_token"));
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'application/octet-stream');
    xhr.setRequestHeader('x-requested-with', "XMLHttpRequest");
    xhr.onload = function(e) {
      if (this.status === 200) {
        var blob = this.response;
        if(window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveBlob(blob, route+'.xlsx');
        }
        else{
          var downloadLink = window.document.createElement('a');
          var contentTypeHeader = xhr.getResponseHeader("Content-Type");
          downloadLink.href = window.URL.createObjectURL(new Blob([blob], { type: contentTypeHeader }));
          downloadLink.download = route+'.xlsx';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      }
    };
    xhr.send()
  },

  onSearchPanel: function (btn) {
    var treenav = Ext.ComponentQuery.query("#treenavigation")[0];
    treenav.setSelection(0);
    console.log(btn.iconCls);
    var grid = this.getView().down("#main-grid");

    var window = this.getView().down("searchwindow");

    window.loadForm();

    console.log(this);
    // window.show();
    if (!window.isVisible()) {
      btn.setIconCls("x-fa fa-angle-double-right");
      window.show();
      var viewport = amfutil.getElementByID("main-viewport");
      window.setPosition(
        amfutil.getElementByID("center-main").getBox().width -
          window.getSize().width,
        0
      );
      console.log("showing");

      /*if(currentNode== '0'){
                  MftDashboard.util.Utilities.loadMessageActivity();
              }
              if(currentNode== '1'){
                  MftDashboard.util.Utilities.loadSessionActivity();
              }*/
    } else {
      // elem2 = Ext.ComponentQuery.query("#searchpanel")[0];
      // elem2.setHidden(true);
      btn.setIconCls("x-fa fa-search");
      window.hide();
      console.log("hiding");
    }
  },
  onClearFilter: function () {
    amfutil.clearFilter();
  },

  addAgentGet: function () {
    grid = amfutil.getElementByID("main-grid");
    var form = new Ext.form.Panel({
      defaults: {
        padding: 10,
        labelWidth: 180,
        width: 500,
        labelStyle: "white-space: nowrap;",
      },
      items: [
        {
          xtype: "textfield",
          name: "rule_name",
          itemId: "rule_name",
          fieldLabel: "Rule Name",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "rule_type",
          itemId: "rule_type",
          fieldLabel: "Rule Type",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "bpoll",
          itemId: "bpoll",
          fieldLabel: "Bucket Polling Interval(Sec)",
          allowBlank: false,
          value: "300",
        },
        {
          xtype: "textfield",
          name: "bretry",
          itemId: "bretry",
          fieldLabel: "Get Failure Retry Wait",
          value: "5",
        },
        {
          xtype: "textfield",
          name: "bucket",
          itemId: "bucket",
          fieldLabel: "Bucket Name",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "prefix",
          itemId: "prefix",
          fieldLabel: "Bucket Path Prefix",
          value: "inbox/",
        },
        {
          xtype: "textfield",
          name: "folder",
          itemId: "folder",
          fieldLabel: "Download Folder Name",
          allowBlank: false,
        },
        {
          xtype: "radiogroup",
          fieldLabel: "Acknowledgment Mode",
          itemId: "ackmode",
          allowBlank: false,
          columns: 3,
          width: 400,
          items: [
            {
              boxLabel: "None",
              inputValue: "none",
              name: "ackmode",
              checked: true,
            },
            {
              boxLabel: "Archive",
              name: "ackmode",
              inputValue: "archive",
            },
            {
              boxLabel: "Delete",
              name: "ackmode",
              inputValue: "delete",
            },
          ],
          /*listeners: {
            change: function (obj) {
              if (obj.value == "move:tofolder") {
                fname = amfutil.getElementByID("get_fname");
                fname.setHidden(false);
                fname.setValue("");
              } else {
                fname = amfutil.getElementByID("get_fname");
                fname.setHidden(true);
              }
            },
          },*/
        },
        /*{
          xtype: "textfield",
          name: "get_fname",
          itemId: "get_fname",
          hidden: true,
          fieldLabel: "Folder Name",
        },*/
      ],
      buttons: [
        {
          xtype: "button",
          text: "Save",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              rule_name = form.findField("rule_name").getSubmitValue();
              rule_type = form.findField("rule_type").getSubmitValue();
              bpoll = form.findField("bpoll").getSubmitValue();
              bretry = form.findField("bretry").getSubmitValue();
              bucket = form.findField("bucket").getSubmitValue();
              prefix = form.findField("prefix").getSubmitValue();
              folder = form.findField("folder").getSubmitValue();
              ackmode = form.findField("ackmode").getGroupValue();
              //fname = form.findField("get_fname").getSubmitValue();
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/agentget",
                method: "POST",
                jsonData: {
                  name: rule_name,
                  rtype: rule_type,
                  bpoll: bpoll,
                  bretry: bretry,
                  bucket: bucket,
                  prefix: prefix,
                  folder: folder,
                  ackmode: ackmode,
                  //"fname": fname,
                  active: true,
                },
                success: function (response) {
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Agent get added");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  grid.getStore().reload();
                  mask.hide();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  amfutil.onFailure(
                    "Failed to Create Agent Get Rule",
                    response
                  );
                },
              });
            },
          },
        },
        {
          xtype: "button",
          text: "Cancel",
          cls: "button_class",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Agent Get",
      modal: true,
      layout: "fit",
      width: 550,
      height: 550,
      items: [form],
    });
    win.show();
  },

  addAgentPut: function (btn) {
    grid = amfutil.getElementByID("main-grid");
    scope = btn.lookupController();
    var myForm = new Ext.form.Panel({
      defaults: {
        padding: 10,
        labelWidth: 160,
        width: 400,
      },
      scrollable: true,
      items: [
        {
          xtype: "textfield",
          name: "put_rule_name",
          itemId: "put_rule_name",
          fieldLabel: "Rule Name",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "put_rule_type",
          itemId: "put_rule_type",
          fieldLabel: "Rule Type",
          allowBlank: false,
        },
        {
          xtype: "textfield",
          name: "fpoll",
          fieldLabel: "File Polling Interval(Sec)",
          maskRe: /[0-9]/,
          vtype: "alphnumVtype",
          vtypeText: "Please enter a valid file polling interval",
          itemId: "fpoll",
          value: "300",
        },
        {
          xtype: "textfield",
          name: "fretry",
          fieldLabel: "Failure Retry Wait",
          maskRe: /[0-9]/,
          vtypeText: "Please enter a valid Failure Retry Wait",
          itemId: "fretry",
          value: "5",
        },
        {
          xtype: "checkboxfield",
          name: "regex",
          itemId: "regex",
          fieldLabel: "Regex Flag",
          value: false,
        },
        {
          xtype: "textfield",
          itemId: "fmatch",
          name: "fmatch",
          fieldLabel: "File Match Pattern",
          value: "*",
          width: 400,
        },
        {
          xtype: "textfield",
          name: "bucket",
          fieldLabel: "Upload Bucket Name",
          allowBlank: false,
          itemId: "bucket",
        },
        {
          xtype: "textfield",
          name: "bpath",
          fieldLabel: "Upload Bucket Path",
          itemId: "bpath",
        },
        /* {
          xtype: "textfield",
          name: "fmeta",
          fieldLabel: "File Metadata",
          itemId: "fmeta",
          width: 400,
        }, */ {
          // Fieldset in Column 1 - collapsible via toggle button
          xtype: "fieldset",
          title: "File Metadata",
          collapsible: true,
          margin: { left: 10 },
          onAdd: function (component, position) {
            // component.setTitle("Match Pattern" + position);
            console.log(component);
            console.log(position);
          },
          items: [
            {
              xtype: "button",
              text: "Add",
              handler: function (button, event) {
                var formpanel = button.up();

                formpanel.insert(
                  formpanel.items.length - 1,
                  Ext.create("Amps.form.FileMetaData")
                );
              },
            },
          ],
        },
        {
          xtype: "radiogroup",
          fieldLabel: "Acknowledgment Mode",
          itemId: "ackmode",
          allowBlank: false,
          columns: 3,
          width: 400,
          items: [
            {
              boxLabel: "None",
              inputValue: "none",
              name: "put_ackmode",
              checked: true,
            },
            {
              boxLabel: "Archive",
              name: "put_ackmode",
              inputValue: "archive",
            },
            {
              boxLabel: "Delete",
              name: "put_ackmode",
              inputValue: "delete",
            },
          ],
          /*listeners: {
            change: function (obj) {
              if (obj.value == "move:tofolder") {
                fname = amfutil.getElementByID("fname");
                fname.setHidden(false);
                fname.setValue("");
              } else {
                fname = amfutil.getElementByID("fname");
                fname.setHidden(true);
              }
            },
          },*/
        },
        /*{
          xtype: "textfield",
          name: "foldername",
          itemId: "fname",
          hidden: true,
          fieldLabel: "Folder Name",
          //value:record.fname
        },*/
      ],
      buttons: [
        {
          text: "Save",
          itemId: "addagentput",
          cls: "button_class",
          formBind: true,
          listeners: {
            click: function (btn) {
              form = btn.up("form").getForm();
              rule_name = form.findField("put_rule_name").getSubmitValue();
              rule_type = form.findField("put_rule_type").getSubmitValue();
              fpoll = form.findField("fpoll").getSubmitValue();
              fretry = form.findField("fretry").getSubmitValue();
              regex = form.findField("regex").getValue();
              fmatch = form.findField("fmatch").getSubmitValue();
              bucket = form.findField("bucket").getSubmitValue();
              bpath = form.findField("bpath").getSubmitValue();
              ackmode = form.findField("put_ackmode").getGroupValue();
              //fname = form.findField("foldername").getSubmitValue();
              values = form.getValues();
              console.log(values);
              fmeta = values.field;
              field_metadata = [];
              if (Array.isArray(values.field) && Array.isArray(values.value)) {
                lengthis = values.field.length;
                console.log(lengthis);
                for (let i = 0; i < lengthis; i++) {
                  field_metadata.push({
                    key: values.field[i],
                    value: values.value[i],
                  });
                }
              } else {
                field_metadata = [{ key: values.field, value: values.value }];
              }

              // page_size = grid.store.pageSize;
              console.log(field_metadata);
              btn.setDisabled(true);
              var mask = new Ext.LoadMask({
                msg: "Please wait...",
                target: grid,
              });
              mask.show();
              amfutil.ajaxRequest({
                headers: {
                  Authorization: localStorage.getItem("access_token"),
                },
                url: "api/agentput",
                method: "POST",
                timeout: 60000,
                params: {},
                jsonData: {
                  name: rule_name,
                  rtype: rule_type,
                  fpoll: fpoll,
                  fretry: fretry,
                  regex: regex,
                  fmatch: fmatch,
                  bucket: bucket,
                  bpath: bpath,
                  fmeta: field_metadata,
                  ackmode: ackmode,
                  //"movetofolder_name": fname,
                  active: true,
                },
                success: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  var data = Ext.decode(response.responseText);
                  Ext.toast("Agent Put created");
                  amfutil.broadcastEvent("update", {
                    page: Ext.util.History.getToken(),
                  });
                  amfutil.getElementByID("main-grid").getStore().reload();
                  win.close();
                },
                failure: function (response) {
                  mask.hide();
                  btn.setDisabled(false);
                  msg = response.responseText.replace(/['"]+/g, "");
                  amfutil.onFailure(
                    "Failed to Create Agent Put Rule",
                    response
                  );
                },
              });
            },
          },
        },
        {
          text: "Cancel",
          cls: "button_class",
          itemId: "agentput_cancel",
          listeners: {
            click: function (btn) {
              win.close();
            },
          },
        },
      ],
    });
    var win = new Ext.window.Window({
      title: "Add Agent Put",
      modal: true,
      width: 550,
      height: 600,
      scrollable: true,
      resizable: false,
      layout: "fit",
      items: [myForm],
    });
    win.show();
  },

  onResetPassword: function () {
    var user = amfutil.get_user();
    amfutil.ajaxRequest({
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      url: "/api/user/reset-password/",
      headers: {
        Authorization: localStorage.getItem("access_token"),
      },
      method: "POST",
      jsonData: {
        user: {
          email: user.email,
        },
      },
      timeout: 30000,
      params: {},
      success: function (response) {
        localStorage.clear();
        Ext.toast("Password Reset Email Sent!");
      },
      failure: function (response) {
        console.log("Could not send password reset email");
      },
    });
  },

  onLogout() {
    amfutil.logout();
  },
});
