Ext.define('AmpsDasboard.store.MessageActivity', {
    extend: 'Ext.data.Store',

    alias: 'store.messages',

    model: 'AmpsDasboard.model.MessageActivity',

    proxy:{
        url:'/api/messages',
        type:'rest',
        reader:{
            type:'json',
            rootProperty:'data',
            totalProperty:'length'
        },
        pageParam:'pageNumber',
        limitParam:'pageSize'
    },
    autoLoad: false
});
