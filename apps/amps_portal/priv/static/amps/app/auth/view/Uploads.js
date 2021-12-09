Ext.define("Amps.Authorized.Uploads", {
  extend: "Ext.MessageBox",
  singleton: true,
  modal: false,
  width: 700,
  height: 500,
  closeAction: "hide",
  closable: true,
  uploads: [],
  title: "Pending Uploads",
  update: function () {
    this.down("grid").setStore(this.uploads);
  },
  handleUpload: function (url, file, prefix, bucket, metadata) {
    var scope = this;
    var data = new FormData();
    data.append("file", file);
    let request = new XMLHttpRequest();
    request.open("PUT", url);
    metadata.forEach((meta) => {
      request.setRequestHeader(meta.field, meta.value);
      console.log(meta);
    });
    request.setRequestHeader(
      "Authorization",
      localStorage.getItem("access_token")
    );
    request.setRequestHeader("Content-Type", file.type);
    var id = Math.floor(Math.random() * Date.now());
    console.log(id);
    // upload progress event
    request.upload.addEventListener("progress", function (e) {
      // upload progress as percentage
      let progress = e.loaded / e.total;
      var idx = scope.uploads.findIndex((item) => item.id == id);
      if (progress > 0.99) {
        progress = 0.99;
      }
      scope.uploads[idx].progress = progress;
      scope.update();
    });
    // request finished event
    request.addEventListener("load", function (e) {
      console.log(request.status);
      console.log(request.response);
      scope.removeUpload(id);
    });
    scope.uploads.push({
      id: id,
      progress: 0,
      fname: file.name,
      bucket: bucket,
      prefix: prefix,
      request: request,
    });
    // send POST request to server
    request.send(data);
    scope.show();
  },
  removeUpload: function (id) {
    var removeIndex = this.uploads.map((item) => item.id).indexOf(id);
    removeIndex >= 0 && this.uploads.splice(removeIndex, 1);
    this.update();
  },
  cancelUpload: function (grid, rowIndex) {
    var rec = grid.getStore().getAt(rowIndex);
    rec.data.request.abort();
    this.removeUpload(rec.data.id);
  },
  items: [
    {
      xtype: "panel",
      items: [
        {
          //   store: [],
          //   xtype: "grid",
          //   columns: [
          //     { text: "File Name", dataIndex: "fname", flex: 1, type: "text" },
          //     { text: "Bucket", dataIndex: "bucket", flex: 1, type: "text" },
          //     { text: "Prefix", dataIndex: "prefix", flex: 1, type: "text" },
          //     {
          //       cell: {
          //         xtype: "widgetcell",
          //         widget: {
          //           xtype: "progress",
          //         },
          //       },
          //     },
          // {
          //   xtype: "actioncolumn",
          //   text: "Actions",
          //   dataIndex: "actions",
          //   width: 175,
          //   items: [
          //     {
          //       name: "cancel",
          //       iconCls: "x-fa fa-times-circle actionicon",
          //       tooltip: "Cancel File Upload",
          //       handler: function (grid, rowIndex, colIndex) {
          //         grid.up("window").cancelUpload(grid, rowIndex);
          //       },
          //     },
          //   ],
          // },
          //   ],
        },
      ],
    },
  ],
});
