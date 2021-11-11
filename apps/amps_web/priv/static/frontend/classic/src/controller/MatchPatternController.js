Ext.define("AmpsDasboard.controller.MatchPatternController", {
  extend: "Ext.app.ViewController",

  alias: "controller.matchpattern",

  require: ["AmpsDasboard.view.main.Main"],
  init: function () {},

  onRegexChange: function (scope, val, old, opts) {
    var pattern = this.getView().down("#pattern");
    if (val) {
      Ext.apply(pattern, { vtype: "regex" });
      pattern.validate();
    } else {
      Ext.apply(pattern, { vtype: null });
      pattern.validate();
    }
    this.onChange();
  },

  onTestChange: async function (scope, val, old, opts) {
    var regex = this.getView().down("#regex").value;
    var pattern = this.getView().down("#pattern");
    var msgView = this.getView().down("#message_view");
    var matched;
    if (regex) {
      matched = amfutil.checkReg(pattern.value, val, "add");
    } else {
      matched = await amfutil.checkGlob(pattern.value, val);
    }

    msgView.setVisible(true);
    msgView.setHtml(
      ` <p style="text-align: right;font-weight: 600;color: ${
        matched ? "green" : "red"
      }; margin-top: -1rem;margin-left: 81px;"> <i  style="color: ${
        matched ? "green" : "red"
      };" class="fa fa-check" aria-hidden="true"></i> File Name ${
        matched ? "" : "Not"
      } Matched</p>`
    );

    this.onChange();
  },

  onChange: function () {
    var matchpattern = this.getView();
    var field = matchpattern.down("#field").value;
    var regex = matchpattern.down("#regex").value;
    var pattern = matchpattern.down("#pattern").value;
    var test = matchpattern.down("#test").value;
    var patternData = {
      field: field,
      regex: regex,
      pattern: pattern,
    };
    matchpattern.down("#patternvalue").setValue(JSON.stringify(patternData));
  },

  onDefaultChange: function () {
    if (this.getView()) {
      var defaultvalue = this.getView().down("#defaultvalue");
      var field = this.getView().down("#field").value;
      var value = this.getView().down("#value").value;
      defaultvalue.setValue(
        JSON.stringify({
          field: field,
          value: value,
        })
      );
    }
  },
});
