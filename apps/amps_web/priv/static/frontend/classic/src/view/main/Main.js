/*
/****************************************************************************
 *
 * Copyright (C) Agile Data, Inc - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by TEAM <code@hub4edi.com>, November 2018
 *
 ****************************************************************************/
Ext.define("Amps.view.main.Main", {
  extend: "Ext.container.Viewport",
  xtype: "app-main",
  itemId: "main-viewport",

  requires: [
    "Ext.plugin.Viewport",
    "Ext.window.MessageBox",

    "Amps.view.main.MainController",
    "Amps.view.main.MainModel",
    "Amps.view.main.List",
    "Amps.view.nav.MainMenu",
    "Amps.view.nav.Header",
    "Amps.view.Footer",
  ],
  layout: "border",
  fullscreen: true,
  controller: "main",
  viewModel: "main",
  scrollable: true,
  defaults: {
    xtype: "container",
  },

  items: [
    {
      xtype: "appheader",
      region: "north",
      height: 100,
    },
    {
      xtype: "mainmenu",
      title: "Main Menu",
      itemId: "mainmenu",
      width: 250,
      region: "west",
      cls: "ufa-menu shadowed",
    },
    {
      xtype: "container",
      width: 5,
      region: "west",
    },
    {
      flex: 1,
      region: "center",
      xtype: "container",
      layout: "border",
      itemId: "center-main",
      // cls: "shadowed",
      items: [
        {
          region: "center",
          xtype: "page-panel",
          flex: 1,
        },
        // {
        //   xtype: "pages",
        //   itemId: "pagelist",
        //   cls: "pageslayout",
        //   width: "100%",
        //   height: "50px",
        //   minHeight: "50px",
        //   maxHeight: "50px",
        // },
      ],
    },
    {
      xtype: "container",
      width: 5,
      region: "east",
    },
    {
      xtype: "container",
      width: 50,
      cls: "rtb shadowed",
      itemId: "actionbar",
      region: "east",
      items: [
        {
          xtype: "tbfill",
          hidden: true,
          itemId: "toptbfill",
        },
        {
          xtype: "button",
          itemId: "addnewbtn",
          iconCls: "x-fa fa-plus-circle",
          tooltip: "Add New",
          hidden: true,
          handler: "onAddNewButtonClicked",
        },
        { xtype: "tbfill" },
        {
          xtype: "button",
          itemId: "searchpanelbtn",
          iconCls: "x-fa fa-search",
          handler: "onSearchPanel",
          tooltip: "Filter Records",
          hidden: true,
          style: "font-weight:bold;color:red;",
        },
        {
          xtype: "button",
          itemId: "clearfilter",
          html: '<img style="max-width:100%;" width=16 height=17 src="resources/images/clear_filter.png" />',
          handler: "onClearFilter",
          tooltip: "Clear Filter",
          hidden: true,
          style: "cursor:pointer;",
        },
        {
          xtype: "button",
          itemId: "refreshbtn",
          iconCls: "x-fa fa-refresh",
          tooltip: "Refresh",
          hidden: true,
          handler: "onRefreshButtonClicked",
        },
        {
          xtype: "button",
          itemId: "reprocess",
          iconCls: "x-fa fa-undo",
          tooltip: "Reprocess",
          hidden: true,
          handler: "onReprocessClicked",
        },
        {
          xtype: "button",
          itemId: "reroute",
          iconCls: "x-fa fa-random",
          tooltip: "Reroute",
          hidden: true,
          handler: "onRerouteClicked",
        },
        {
          xtype: "button",
          itemId: "export",
          iconCls: "x-fa fa-download",
          tooltip: "Export",
          hidden: true,
          handler: "onExportClicked",
        },
        {
          xtype: "container",
          itemId: "messages",
          hidden: true,
          controller: "messages",
          items: [
            {
              xtype: "button",
              itemId: "refreshbtn",
              iconCls: "x-fa fa-refresh",
              tooltip: "Refresh",
              handler: "onRefreshButtonClicked",
            },
            {
              xtype: "button",
              itemId: "reprocessbtn",
              iconCls: "x-fa fa-history",
              tooltip: "Reprocess",
              handler: "onReprocessButtonClicked",
              listeners: {
                show: async function (btn, eopts) {
                  // var message = await amfutil.getCurrentItem();
                  // console.log(message);
                  // if (!message.location) {
                  //   btn.disable();
                  // }
                },
              },
            },
          ],
        },
        {
          xtype: "container",
          itemId: "fieldactions",
          hidden: true,
          controller: "field",
          items: [
            {
              xtype: "button",
              itemId: "addnewbtn",
              iconCls: "x-fa fa-plus-circle",
              tooltip: "Add New",
              handler: "onAddNewButtonClicked",
            },
            { xtype: "tbfill" },
            {
              xtype: "button",
              itemId: "searchpanelbtn",
              iconCls: "x-fa fa-search",
              handler: "onSearchPanel",
              tooltip: "Filter Records",
              style: "font-weight:bold;color:red;",
            },
            {
              xtype: "button",
              itemId: "clearfilter",
              html: '<img src="resources/images/clear-filters.png" />',
              handler: "onClearFilter",
              tooltip: "Clear Filter",
              style: "cursor:pointer;",
            },
            {
              xtype: "button",
              itemId: "refreshbtn",
              iconCls: "x-fa fa-refresh",
              tooltip: "Refresh",
              handler: "onRefreshButtonClicked",
            },
            {
              xtype: "button",
              itemId: "export",
              iconCls: "x-fa fa-download",
              tooltip: "Export",
              handler: "onExportClicked",
            },
          ],
        },
        {
          xtype: "container",
          itemId: "topics",
          hidden: true,
          controller: "rules",
          items: [
            {
              xtype: "button",
              itemId: "addnewbtn",
              iconCls: "x-fa fa-plus-circle",
              tooltip: "Add New",
              handler: "onAddNewButtonClicked",
            },
            { xtype: "tbfill" },
            {
              xtype: "button",
              itemId: "searchpanelbtn",
              iconCls: "x-fa fa-search",
              handler: "onSearchPanel",
              tooltip: "Filter Records",
              style: "font-weight:bold;color:red;",
            },
            {
              xtype: "button",
              itemId: "clearfilter",
              html: '<img src="resources/images/clear-filters.png" />',
              handler: "onClearFilter",
              tooltip: "Clear Filter",
              style: "cursor:pointer;",
            },
            {
              xtype: "button",
              itemId: "refreshbtn",
              iconCls: "x-fa fa-refresh",
              tooltip: "Refresh",
              handler: "onRefreshButtonClicked",
            },
          ],
        },
        {
          xtype: "container",
          itemId: "page",
          // hidden: true,
        },
      ],
    },
    {
      xtype: "appfooter",
      region: "south",
      flex: 1,
    },
  ],
});
