Ext.define('MyDesktop.App', {
    extend: 'Ext.ux.desktop.App',
    requires: [
        //消息弹出框
        'Ext.window.MessageBox',
        //手工输入 module,这个是左面图标对象
        'Ext.ux.desktop.Module',
        //图标Model
        'Ext.ux.desktop.ShortcutModel',
        'MyDesktop.Settings'
    ],
    init: function() {
        this.callParent();
    },
    getModules : function(){
    	//没有模块 
        return [];
    },
    getDesktopConfig: function () {
        var me = this, ret = me.callParent();
        return Ext.apply(ret, {
        	//右键菜单
        	contextMenuItems: [{ 
        		text: '修改背景', 
        		handler: me.onSettings, 
        		scope: me 
        	}],
      
            //桌面图标快捷方式
            shortcuts: Ext.create('Ext.data.Store', {
                model: 'Ext.ux.desktop.ShortcutModel',
                data: [{ 
                	name: '用户管理',  //显示的名称
                	iconCls: 'customers', //桌面显示的图标
                	viewIconCls:"icon_customers", //任务栏和界面显示的图标
                	//xtype:"userpanel", //类型
                	//controller:"apps.user.controller.UserController", //控制对象
                	module:"test" //模型
                }]
            }),
      //设定桌面的背景
            wallpaper: 'web/desktop/wallpapers/Wood-Sencha.jpg',
            wallpaperStretch: false
            
        });
    },
    // 设定开始菜单
    getStartConfig : function() {
        var me = this, ret = me.callParent();
        return Ext.apply(ret, {
            title: '桌面系统',
            iconCls: 'settings',
            height: 300,
            toolConfig: {
                width: 100,
                items: [{
                	text:'系统设定',
                    iconCls:'settings',
                    handler: me.onSettings,
                    scope: me
                },'-',{
                    text:'退出系统',
                    iconCls:'logout',
                    handler: me.onLogout,
                    scope: me
                }]
            }
        });
    },
    //任务栏快捷方式
    getTaskbarConfig: function () {
        var ret = this.callParent();
        return Ext.apply(ret, {
            quickStart: [{ 
            	name: '折叠窗口', 
            	iconCls: 'accordion', 
            	module: 'acc-win' 
            },{ 
            	name: '平铺窗口', 
            	iconCls: 'icon-grid', 
            	module: 'grid-win' 
            }],
            trayItems: [{ 
            	xtype: 'trayclock', 
            	flex: 1 
            }]
        });
    },
    //点击退出系统事件
    onLogout: function () {
        Ext.Msg.confirm('系统提示', '你真的要退出?');
    },
    //点击设置事件
    onSettings: function () {
        var dlg = new MyDesktop.Settings({
            desktop: this.desktop
        });
        dlg.show();
    }
});
