const St = imports.gi.St;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const PointerWatcher = imports.ui.pointerWatcher;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const EverpadPinnedNotes = Me.imports.pinned_notes;
const DBus = Me.imports.dbus;

const MOUSE_POLL_FREQUENCY = 50;
const MENU_ANIMATION_TIME = 0.3;

const EverpadMenu = new Lang.Class({
    Name: "EverpadMenu",

    _init: function() {
        this.actor = new St.BoxLayout({
            style_class: 'everpad-menu-box',
            reactive: true
        });
        this._menu_box = new St.Table({
            homogeneous: false
        });
        this.actor.add(this._menu_box, {
            expand: true
        });

        this._authorise_label = new St.Button({
            style_class: 'everpad-text-button',
            label: "Authorise",
            visible: false
        });
        this._authorise_label.connect("clicked", Lang.bind(this, function() {
            this.hide();
            DBus.get_everpad_app().settingsRemote();
        }));
        this.actor.add(this._authorise_label, {
            expand: true,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });

        Main.layoutManager.panelBox.add_actor(this.actor);
        this.actor.lower_bottom();

        this._logo_box = new St.BoxLayout();
        this._menu_box.add(this._logo_box, {
            row: 0,
            col: 0,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        })

        let logo = new St.Label({
            text: "Menu"
        });
        this.set_logo(logo);

        this._open = false;
        this._is_hover = false;

        this._resize();
    },

    _resize: function() {
        let primary = Main.layoutManager.primaryMonitor;
        let my_width = primary.width * 0.15;
        let available_height =
            primary.height - Main.layoutManager.keyboardBox.height;
        let my_height = Math.min(primary.height * 0.30, available_height * 0.9);

        this.actor.x = 0;
        this._hidden_y = this.actor.get_parent().height - my_height - 2;
        this._target_y = this._hidden_y + my_height;

        this.actor.y = this._hidden_y;
        this.actor.width = my_width;
        this.actor.height = my_height;
    },

    _check_authorise: function() {
        DBus.get_everpad_provider().is_authenticatedRemote(
            Lang.bind(this, function([result], error) {
                if(error !== null) {
                    log('Error: %s'.format(error));
                    return;
                }

                if(result !== true) {
                    this._menu_box.hide();
                    this._authorise_label.show();
                }
                else {
                    this._menu_box.show();
                    this._authorise_label.hide();
                }
            })
        );
    },

    _start_tracking_mouse: function() {
        if(!this._pointer_watch) {
            this._pointer_watch = PointerWatcher.getPointerWatcher().addWatch(
                MOUSE_POLL_FREQUENCY,
                Lang.bind(this, function() {
                    let [x_mouse, y_mouse, mask] = global.get_pointer();
                    let allocation_box = this.actor.get_allocation_box();

                    if(
                        x_mouse >= allocation_box.x1 &&
                        x_mouse <= allocation_box.x2 &&
                        y_mouse >= allocation_box.y1 - 15 &&
                        y_mouse <= allocation_box.y2
                    ) {
                        this._is_hover = true;
                    }
                    else {
                        this.hide();
                        this._is_hover = false;
                    }
                })
            );
        }
    },

    _stop_tracking_mouse: function() {
        if(this._pointer_watch) {
            this._pointer_watch.remove();
        }

        this._pointer_watch = null;
    },

    set_logo: function(actor) {
        this._logo_box.destroy_all_children();
        this._logo_box.add(actor, {
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });
    },
 
    set_position: function(source_actor) {
        let source_allocation = Shell.util_get_transformed_allocation(
            source_actor
        );
        this.actor.x = source_allocation.x1 - 50;
    },

    destroy: function() {
        this._stop_tracking_mouse();
        this.actor.destroy();
    },

    add_menu_item: function(text, icon_name, on_clicked) {
        if(Utils.is_blank(text)) return false;

        let button = new St.Button({
            style_class: 'everpad-text-button',
            label: text
        });
        button.connect("clicked", Lang.bind(this, function() {
            on_clicked(button);
        }));

        let button_box = new St.BoxLayout();

        if(!Utils.is_blank(icon_name)) {
            let icon = new St.Icon({
                icon_name: icon_name,
                style_class: 'everpad-menu-icon'
            });
            button_box.add(icon, {
                expand: false,
                x_fill: false,
                y_fill: false,
                x_align: St.Align.START,
                y_align: St.Align.MIDDLE
            });
        }

        button_box.add(button, {
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        this._menu_box.add(button_box, {
            row: this._menu_box.row_count + 1,
            col: 0,
            x_fill: false,
            y_fill: false,
            x_expand: false,
            y_expand: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        return button;
    },

    add_actor: function(actor, params) {
        params = Params.parse(params, {
            row: this._menu_box.row_count + 1,
            col: 0,
            col_span: this._menu_box.column_count,
            expand: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE,
            x_fill: false,
            y_fill: false
        });

        this._menu_box.add(actor, params);
    },

    show: function() {
        if(this._open) return;

        this._check_authorise();

        if(!Main.pushModal(this.actor)) return;

        this.actor.show();
        this._open = true;

        Tweener.removeTweens(this.actor);
        Tweener.addTween(this.actor, {
            time: MENU_ANIMATION_TIME / St.get_slow_down_factor(),
            transition: 'easeOutQuad',
            y: this._target_y,
            onComplete: Lang.bind(this, function() {
                this._start_tracking_mouse();
            })
        });
    },

    hide: function() {
        if(!this._open) return;

        Main.popModal(this.actor);
        this._open = false;

        Tweener.removeTweens(this.actor);
        Tweener.addTween(this.actor, {
            time: MENU_ANIMATION_TIME / St.get_slow_down_factor(),
            transition: 'easeOutQuad',
            y: this._hidden_y,
            onComplete: Lang.bind(this, function () {
                this.actor.hide();
            })
        });

        this._stop_tracking_mouse();
    },

    get is_open() {
        return this._open;
    },

    get is_hover() {
        return this._is_hover;
    }
});
