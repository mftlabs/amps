Ext.define("Override.route.Route", {
  override: "Ext.route.Route",

  compatibility: "6.6.0",

  execute: function (token, argConfig) {
    var promise = this.callParent([token, argConfig]);

    return promise["catch"](Ext.bind(this.onRouteReject, this));
  },

  onRouteReject: function () {
    Ext.fireEvent("routereject", this);
  },
});

// Ext.define("AmpsDasboard.form.field.Number", {
//   override: "Ext.form.field.Number",

//   parseValue: function (val) {
//     console.log(val);
//     return parseInt(val);
//   },
// });

Ext.override(Ext.data.Store, {
  constructor: function (config) {
    this.callParent([config]);
    this.proxy.on("exception", this.onProxyException, this);
  },
  onProxyException: async function (proxy, response, options, eOpts) {
    var store = this;
    if (response.status == 401) {
      await amfutil.renew_session();
      proxy.setHeaders({
        Authorization: localStorage.getItem("access_token"),
      });
      store.reload();
    }
  },
});

Ext.define("AmpsDasboard.override.form.field.VTypes", {
  override: "Ext.form.field.VTypes",

  alphnumlowercaseVtype: function (value) {
    var specialcharregex = /^[a-z0-9]*$/;
    if (specialcharregex.test(value) === true) {
      return true;
    }
    return false;
  },
  alphnumlowercaseVtypeText:
    "Username must use lowercase letters and numbers only",

  bucketUsernameVtype: function (value) {
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
  bucketUsernameVtypeText:
    "Username must be lowercase and contain only letters, numbers, hyphens, and periods.",

  regex: function (value) {
    console.log(value);
    try {
      new RegExp(value);
      console.log("ok");
      return true;
    } catch (e) {
      console.log("fail");
      return false;
    }
  },
  regexText: "Enter Valid File Name Pattern",
  passwordCheckUserUpdate: function (val) {
    if (val !== "********") {
      var reg =
        /^.*(?=.{8,32})(?=.*\d)(?=.*[!@#$%^&*{}:;.])(?=.*[a-z])(?=.*[A-Z])/;
      return reg.test(val);
    } else {
      return true;
    }
  },
  passwordCheckUserUpdateText:
    "Password must contain a combination of one or more upper case letters, one more lower case letters, one or more digits and one or more special characters consists of @#!$[]{};:.,Password must have a minimum of 8 characters and a maximum of 32 characters",
  textbox: function (v) {
    //console.log('v',v);
    if (v.length == v.trim().length) {
      return true;
    } else {
      return false;
    }
  },
  // textboxText: 'Please enter a valid input',
  name: function (v) {
    if (v.length == v.trim().length) {
      if (v.length != v.replace(" ", "").length) {
        return false;
      }
      return true;
    } else {
      return false;
    }
  },
  filenamecheck: function (val) {
    if (val.length == val.trim().length) {
      var rg1 = /^[^\\/:\*\?"'<>\!%|]+$/; // forbidden characters \ / : * ? " < > |
      return rg1.test(val);
    } else {
      return false;
    }
  },
  filenamecheckText: "Please enter valid filename format",

  phone: function (v) {
    if (v.length == v.trim().length) {
      return /^[+0-9-() ]*$/.test(v);
    } else {
      return false;
    }
  },
  phoneText: "Please enter a valid Phone number",
  phoneMask: /[+0-9-() ]/i,
  ipandhost: function (value) {
    if (value.length === 0 || value.length > 511) {
      return false;
    }

    var regExpIp =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    var regExpHostname = /^\w+\.\w+\.[a-zA-z]{1,3}$/;
    var regResultHostname = regExpHostname.exec(value);
    if (regExpIp.test(value) === true || regExpHostname.test(value) === true) {
      return true;
    }
    return false;
  },
  ipandhostText: "Please enter a valid IP or Hostname",

  ipandhostname: function (value) {
    var rg1 =
      /^(((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])))+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])))$/;
    if (value == "127.0. 0.1") {
      return true;
    }
    return rg1.test(value);
  },
  ipandhostnameText: "Please enter a valid IP or Hostname",
  portVtype: function (value) {
    var regExpPort =
      /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;
    if (regExpPort.test(value) === true) {
      return true;
    }
    return false;
  },
  portVtypeText: "Please enter a valid Port",

  cdportVtype: function (value) {
    var regExpPort =
      /^([1-9]|[1-8][0-9]|9[0-9]|[1-8][0-9]{2}|9[0-8][0-9]|99[0-9]|[1-8][0-9]{3}|9[0-8][0-9]{2}|99[0-8][0-9]|999[0-9]|[12][0-9]{4}|3[01][0-9]{3}|32[0-6][0-9]{2}|327[0-5][0-9]|3276[0-7])$/;
    if (regExpPort.test(value) === true) {
      return true;
    }
    return false;
  },
  cdportVtypeText: "Please enter a valid Port",

  alphnumVtype: function (value) {
    var specialcharregex = /^[a-zA-Z0-9._-]*$/;
    if (specialcharregex.test(value) === true) {
      return true;
    }
    return false;
  },

  altipsvtype: function (value) {
    // var rg1=/^(((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])))+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9]))):[0-9]+(,(((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])))+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9]))):[0-9]+)*$/
    var rg1 =
      /^(((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])))+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9]))):[0-9]+(,(((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))|(((([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)|(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])))+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9]))):[0-9]+)*$/;
    return rg1.test(value);
  },
  altipsvtypeText: "Please enter a valid Alternate IP's",

  multipleipvtype: function (value) {
    var ipv =
      /^(((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)))(,(((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))))*$/;
    return ipv.test(value);
  },

  multiplednsvtype: function (value) {
    var ipv = /[a-zA-Z0-9\-,\.]+(?<!,)$/;
    return ipv.test(value);
  },
  multipleemailvtype: function (value) {
    var emailv = /(([a-zA-Z\-0-9\.]+@)([a-zA-Z\-0-9\.]+)[;]*)+/g;
    return emailv.test(value);
  },

  passwordCheck: function (val) {
    var reg =
      /^.*(?=.{8,32})(?=.*\d)(?=.*[!@#$%^&*{}:;.])(?=.*[a-z])(?=.*[A-Z])/;
    return reg.test(val);
  },
  passwordCheckText:
    "Password must contain a combination of one or more upper case letters, one more lower case letters, one or more digits and one or more special characters consists of @#!$[]{};:.,Password must have a minimum of 8 characters and a maximum of 32 characters",

  passwordMatch: function (value, field) {
    var password = field.up("form").down("#" + "password");
    if (password.getValue() === value) {
      if (
        amfutil.getElementByID("username").isValid() === true &&
        amfutil.getElementByID("given_name").isValid() === true &&
        amfutil.getElementByID("surname").isValid() === true &&
        amfutil.getElementByID("email").isValid() === true &&
        amfutil.getElementByID("phone_number").isValid() === true
      ) {
        amfutil.getElementByID("addaccount").setDisabled(false);
      } else {
        amfutil.getElementByID("addaccount").setDisabled(true);
      }
    }
    return value == password.getValue();
  },
});

Ext.define("AmpsDasboard.overrides.form.field.Base", {
  override: "Ext.form.field.Base",

  getLabelableRenderData: function () {
    var me = this,
      data = me.callParent(),
      labelClsExtra = me.labelClsExtra;

    if (!me.allowBlank) {
      data.labelClsExtra =
        (labelClsExtra ? labelClsExtra + " " : "") + me.requiredCls;
    }

    return data;
  },
});
