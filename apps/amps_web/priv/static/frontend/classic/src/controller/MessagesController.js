Ext.define("Amps.controller.MessagesController", {
  extend: "Ext.app.ViewController",
  alias: "controller.messages",
  requires: [
    "Amps.view.messages.MessageDetails",
    // "MftDashboard.view.trackntrace.SessionLogs",
  ],

  onRefreshButtonClicked: async function () {
    var tokens = Ext.util.History.getToken().split("/");
    var route = tokens[0];
    var id = tokens[1];

    let record = await amfutil.getCurrentItem();

    amfutil.getElementByID("messagecontainer").loadMessageActivity(record);
  },

  onReprocessButtonClicked: async function (btn) {
    console.log(btn);
    var mask = new Ext.LoadMask({
      msg: "Reprocessing...",
      target: amfutil.getElementByID("messagecontainer"),
    });
    mask.show();
    var message = await amfutil.getCurrentItem();

    delete message.id;
    console.log(message);
    var scope = this;

    amfutil.ajaxRequest({
      url: `api/msg/reprocess/${message["_id"]}`,
      method: "POST",
      timeout: 60000,
      success: function (response) {
        scope.onRefreshButtonClicked();
        mask.destroy();
        console.log(response);
      },
      failure: function (response) {},
    });

    console.log("reprocess");
  },
});
