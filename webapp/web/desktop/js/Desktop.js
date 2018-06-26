Ext.define('Ext.ux.desktop.Desktop', {
	extend : 'Ext.panel.Panel',
	alias : 'widget.desktop',
	uses : [ 'Ext.util.MixedCollection', 'Ext.menu.Menu', 'Ext.view.View', 'Ext.window.Window', 'Ext.ux.desktop.TaskBar', 'Ext.ux.desktop.Wallpaper' ],
	activeWindowCls : 'ux-desktop-active-win',
	inactiveWindowCls : 'ux-desktop-inactive-win',
	lastActiveWindow : null,
	border : false,
	html : '&#160;',
	layout : 'fit',
	xTickSize : 1,
	yTickSize : 1,
	app : null,
	/**
	 * @cfg {Array|Store} shortcuts The items to add to the DataView. This can
	 *      be a {@link Ext.data.Store Store} or a simple array. Items should
	 *      minimally provide the fields in the
	 *      {@link Ext.ux.desktop.ShorcutModel ShortcutModel}.
	 */
	shortcuts : null,
	/**
	 * @cfg {String} shortcutItemSelector This property is passed to the
	 *      DataView for the desktop to select shortcut items. If the
	 *      {@link #shortcutTpl} is modified, this will probably need to be
	 *      modified as well.
	 */
	shortcutItemSelector : 'div.ux-desktop-shortcut',
	/**
	 * @cfg {String} shortcutTpl This XTemplate is used to render items in the
	 *      DataView. If this is changed, the {@link shortcutItemSelect} will
	 *      probably also need to changed.
	 */
	shortcutTpl : [ '<tpl for=".">', '<div class="ux-desktop-shortcut" id="{name}-shortcut">', '<div class="ux-desktop-shortcut-icon {iconCls}">', '<img src="', Ext.BLANK_IMAGE_URL,
			'" title="{name}">', '</div>', '<span class="ux-desktop-shortcut-text">{name}</span>', '</div>', '</tpl>', '<div class="x-clear"></div>' ],
	/**
	 * @cfg {Object} taskbarConfig The config object for the TaskBar.
	 */
	taskbarConfig : null,
	windowMenu : null,
	initComponent : function() {
		var me = this;
		me.windowMenu = new Ext.menu.Menu(me.createWindowMenu());
		me.bbar = me.taskbar = new Ext.ux.desktop.TaskBar(me.taskbarConfig);
		me.taskbar.windowMenu = me.windowMenu;
		me.windows = new Ext.util.MixedCollection();
		me.contextMenu = new Ext.menu.Menu(me.createDesktopMenu());
		me.items = [ {
			xtype : 'wallpaper',
			id : me.id + '_wallpaper'
		}, me.createDataView() ];
		me.callParent();
		me.shortcutsView = me.items.getAt(1);
		me.shortcutsView.on('itemclick', me.onShortcutItemClick, me);
		var wallpaper = me.wallpaper;
		me.wallpaper = me.items.getAt(0);
		if (wallpaper) {
			me.setWallpaper(wallpaper, me.wallpaperStretch);
		}
	},
	afterRender : function() {
		var me = this;
		me.callParent();
		me.el.on('contextmenu', me.onDesktopMenu, me);
	},
	createDataView : function() {
		var me = this;
		return {
			xtype : 'dataview',
			overItemCls : 'x-view-over',
			trackOver : true,
			itemSelector : me.shortcutItemSelector,
			store : me.shortcuts,
			style : {
				position : 'absolute'
			},
			x : 0,
			y : 0,
			tpl : new Ext.XTemplate(me.shortcutTpl)
		};
	},
	createDesktopMenu : function() {
		var me = this, ret = {
			items : me.contextMenuItems || []
		};
		if (ret.items.length) {
			ret.items.push('-');
		}
		ret.items.push({
			text : '平铺窗口',
			handler : me.tileWindows,
			scope : me,
			minWindows : 1
		}, {
			text : '折叠窗口',
			handler : me.cascadeWindows,
			scope : me,
			minWindows : 1
		});
		return ret;
	},
	createWindowMenu : function() {
		var me = this;
		return {
			defaultAlign : 'br-tr',
			items : [ {
				text : '显示',
				handler : me.onWindowMenuRestore,
				scope : me
			}, {
				text : '最小化',
				handler : me.onWindowMenuMinimize,
				scope : me
			}, {
				text : '最大化',
				handler : me.onWindowMenuMaximize,
				scope : me
			}, '-', {
				text : '关闭',
				handler : me.onWindowMenuClose,
				scope : me
			} ],
			listeners : {
				beforeshow : me.onWindowMenuBeforeShow,
				hide : me.onWindowMenuHide,
				scope : me
			}
		};
	},
	onDesktopMenu : function(e) {
		var me = this, menu = me.contextMenu;
		e.stopEvent();
		if (!menu.rendered) {
			menu.on('beforeshow', me.onDesktopMenuBeforeShow, me);
		}
		menu.showAt(e.getXY());
		menu.doConstrain();
	},
	onDesktopMenuBeforeShow : function(menu) {
		var me = this, count = me.windows.getCount();
		menu.items.each(function(item) {
			var min = item.minWindows || 0;
			item.setDisabled(count < min);
		});
	},

	// 动态添加图标点击事件
	onShortcutItemClick : function(dataView, record) {
		var me = this;
		var win = null;
		win = Ext.getCmp(record.data.module);
		if (!win) {
			// 互获取属性里面的控制器
			/*
			 * var controller = coreApp.getController(record.data.controller); //
			 * 实例化控制器 if (!controller.inited) { controller.init();
			 * controller.inited = true; }
			 */
			win = me.createWindow({
				// 窗口的名称和桌面图标名一样
				title : record.data.name,
				// 获取静态变量
				width : comm.get("resolutionWidth") * 0.6,
				height : comm.get("resolutionHeight") * 0.6,
				// 窗口图标
				iconCls : record.data.viewIconCls,
				// 窗口的id 就是我们的模块名称
				id : record.data.module,
				border : false,
				hideMode : 'offsets',
				// 可以关闭
				closable : true,
				// 隐藏
				closeAction : "hide",
				layout : "fit",
				items : {
					xtype : record.data.module + '-main-view'
				}
			});
		}
		// 如果是窗口， 直接显示
		// 就是最小化后直接显示数据
		if (win) {
			me.restoreWindow(win);
		}
	},
	onWindowClose : function(win) {
		var me = this;
		me.windows.remove(win);
		me.taskbar.removeTaskButton(win.taskButton);
		me.updateActiveWindow();
	},
	onWindowMenuBeforeShow : function(menu) {
		var items = menu.items.items, win = menu.theWin;
		items[0].setDisabled(win.maximized !== true && win.hidden !== true); // Restore
		items[1].setDisabled(win.minimized === true); // Minimize
		items[2].setDisabled(win.maximized === true || win.hidden === true); // Maximize
	},
	onWindowMenuClose : function() {
		var me = this, win = me.windowMenu.theWin;
		win.close();
	},
	onWindowMenuHide : function(menu) {
		Ext.defer(function() {
			menu.theWin = null;
		}, 1);
	},
	onWindowMenuMaximize : function() {
		var me = this, win = me.windowMenu.theWin;
		win.maximize();
		win.toFront();
	},
	onWindowMenuMinimize : function() {
		var me = this, win = me.windowMenu.theWin;
		win.minimize();
	},
	onWindowMenuRestore : function() {
		var me = this, win = me.windowMenu.theWin;
		me.restoreWindow(win);
	},
	getWallpaper : function() {
		return this.wallpaper.wallpaper;
	},
	setTickSize : function(xTickSize, yTickSize) {
		var me = this, xt = me.xTickSize = xTickSize, yt = me.yTickSize = (arguments.length > 1) ? yTickSize : xt;
		me.windows.each(function(win) {
			var dd = win.dd, resizer = win.resizer;
			dd.xTickSize = xt;
			dd.yTickSize = yt;
			resizer.widthIncrement = xt;
			resizer.heightIncrement = yt;
		});
	},
	setWallpaper : function(wallpaper, stretch) {
		this.wallpaper.setWallpaper(wallpaper, stretch);
		return this;
	},
	cascadeWindows : function() {
		var x = 0, y = 0, zmgr = this.getDesktopZIndexManager();
		zmgr.eachBottomUp(function(win) {
			if (win.isWindow && win.isVisible() && !win.maximized) {
				win.setPosition(x, y);
				x += 20;
				y += 20;
			}
		});
	},
	createWindow : function(config, cls) {
		var me = this, win, cfg = Ext.applyIf(config || {}, {
			stateful : false,
			isWindow : true,
			constrainHeader : true,
			minimizable : true,
			maximizable : true
		});
		cls = cls || Ext.window.Window;
		win = me.add(new cls(cfg));
		me.windows.add(win);
		win.taskButton = me.taskbar.addTaskButton(win);
		win.animateTarget = win.taskButton.el;
		win.on({
			activate : me.updateActiveWindow,
			beforeshow : me.updateActiveWindow,
			deactivate : me.updateActiveWindow,
			minimize : me.minimizeWindow,
			destroy : me.onWindowClose,
			scope : me
		});
		win.on({
			boxready : function() {
				win.dd.xTickSize = me.xTickSize;
				win.dd.yTickSize = me.yTickSize;
				if (win.resizer) {
					win.resizer.widthIncrement = me.xTickSize;
					win.resizer.heightIncrement = me.yTickSize;
				}
			},
			single : true
		});
		win.doClose = function() {
			win.doClose = Ext.emptyFn;
			win.el.disableShadow();
			win.el.fadeOut({
				listeners : {
					afteranimate : function() {
						win.destroy();
					}
				}
			});
		};
		return win;
	},
	getActiveWindow : function() {
		var win = null, zmgr = this.getDesktopZIndexManager();
		if (zmgr) {
			zmgr.eachTopDown(function(comp) {
				if (comp.isWindow && !comp.hidden) {
					win = comp;
					return false;
				}
				return true;
			});
		}
		return win;
	},
	getDesktopZIndexManager : function() {
		var windows = this.windows;
		return (windows.getCount() && windows.getAt(0).zIndexManager) || null;
	},
	getWindow : function(id) {
		return this.windows.get(id);
	},
	minimizeWindow : function(win) {
		win.minimized = true;
		win.hide();
	},
	restoreWindow : function(win) {
		if (win.isVisible()) {
			win.restore();
			win.toFront();
		} else {
			win.show();
		}
		return win;
	},
	tileWindows : function() {
		var me = this, availWidth = me.body.getWidth(true);
		var x = me.xTickSize, y = me.yTickSize, nextY = y;
		me.windows.each(function(win) {
			if (win.isVisible() && !win.maximized) {
				var w = win.el.getWidth();
				// Wrap to next row if we are not at the line
				// start and this Window will
				// go off the end
				if (x > me.xTickSize && x + w > availWidth) {
					x = me.xTickSize;
					y = nextY;
				}
				win.setPosition(x, y);
				x += w + me.xTickSize;
				nextY = Math.max(nextY, y + win.el.getHeight() + me.yTickSize);
			}
		});
	},
	updateActiveWindow : function() {
		var me = this, activeWindow = me.getActiveWindow(), last = me.lastActiveWindow;
		if (activeWindow === last) {
			return;
		}
		if (last) {
			if (last.el.dom) {
				last.addCls(me.inactiveWindowCls);
				last.removeCls(me.activeWindowCls);
			}
			last.active = false;
		}
		me.lastActiveWindow = activeWindow;
		if (activeWindow) {
			activeWindow.addCls(me.activeWindowCls);
			activeWindow.removeCls(me.inactiveWindowCls);
			activeWindow.minimized = false;
			activeWindow.active = true;
		}
		me.taskbar.setActiveButton(activeWindow && activeWindow.taskButton);
	}
});
