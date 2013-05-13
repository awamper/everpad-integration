const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Everpad = Me.imports.everpad;
const EverpadMenu = Me.imports.menu;
const EverpadSyncStatus = Me.imports.sync_status;
const EverpadProgressBar = Me.imports.progress_bar;
const DBus = Me.imports.dbus;

const SYNC_STATES = Me.imports.constants.SYNC_STATES;
const SHOW_MENU_DELAY = 300;

const SIGNAL_IDS = {
    sync_state: 0,
    owner_changed: 0
};

function show_button() {
    everpad_button = new EverpadPanelButton();

    Everpad.TRIGGERS.refresh_latest = true;
    Everpad.TRIGGERS.refresh_pinned = true;
}

function hide_button() {
    if(everpad_button !== null) {
        everpad_button.destroy();
        everpad_button = null;
    }
}

function check_dbus(callback) {
    DBus.get_dbus_control().ListNamesRemote(
        Lang.bind(this, function(result, error) {
            if(result != null) {
                for(let i = 0; i < result[0].length; i++) {
                    if(result[0][i] == 'com.everpad.App') {
                        callback(true);
                        return;
                    }

                    callback(false);
                }
            }
            else {
                callback(false)
                log(error);
            }
        })
    );
}

const EverpadPanelButton = Lang.Class({
    Name: 'EverpadPanelButton',
    Extends: PanelMenu.Button,

    _init: function() {
        this.parent(0.0, 'everpad');
        this.actor.reactive = false;
        Main.panel.addToStatusArea('everpad', this);

        this._label = new St.Label({
            text: 'E',
            style_class: 'everpad-panel-button',
            reactive: true,
            track_hover: true
        });
        this._button_box = new St.BoxLayout({
            reactive: true,
            track_hover: true
        });
        this._button_box.connect('button-press-event', Lang.bind(this,
            this._on_button_press
        ));
        this._button_box.connect("enter-event", Lang.bind(this, function() {
            this._button_box.timeout_id = Mainloop.timeout_add(SHOW_MENU_DELAY,
                Lang.bind(this, function() {
                    this._sync_status.check_status();
                    this._menu.show();
                    this._panel_progress_bar.hide()
                })
            );
        }));
        this._button_box.connect("leave-event", Lang.bind(this, function() {
            if(this._button_box.timeout_id > 0) {
                Mainloop.source_remove(this._button_box.timeout_id);

                if(this._syncing_in_progress) {
                    this._panel_progress_bar.show()
                }
            }
        }));
        this._button_box.add(this._label);
        this.actor.add_actor(this._button_box);

        this._menu = new EverpadMenu.EverpadMenu();
        this._add_menu_items();

        this._everpad = new Everpad.Everpad();
        this._sync_status = new EverpadSyncStatus.EverpadSyncStatus();
        this._menu.add_actor(this._sync_status.actor);
        this._menu.set_position(this.actor);

        this._panel_progress_bar = new EverpadProgressBar.EverpadProgressBar({
            box_style_class: 'everpad-progress-bar-panel-box',
            progress_style_class: 'everpad-progress-bar-panel',
            x_fill: false,
            y_fill: false,
            expand: false
        });
        this._panel_progress_bar.actor.connect('show',
            Lang.bind(this, function() {
                this._reposition_progress_bar();
            })
        );
        this._panel_progress_bar.hide();
        Main.layoutManager.panelBox.add_actor(this._panel_progress_bar.actor);

        this._syncing_in_progress = false;
        SIGNAL_IDS.sync_state =
            DBus.get_everpad_provider_signals().connectSignal(
                'sync_state_changed',
                Lang.bind(this, function(proxy, sender, [state]) {
                    if(state != SYNC_STATES.FINISH) {
                        this._syncing_in_progress = true;

                        this._sync_status.check_status();

                        this._sync_status.progress_bar.show();
                        this._sync_status.progress_bar.set_progress(state + 1);

                        this._panel_progress_bar.show();
                        this._panel_progress_bar.set_progress(state + 1);
                        // this._show_spinner();
                    }
                    else {
                        // this._hide_spinner();
                        this._syncing_in_progress = false;

                        this._panel_progress_bar.hide();
                        this._panel_progress_bar.reset();
                        this._sync_status.progress_bar.hide();
                        this._sync_status.progress_bar.reset();
                    }
                })
            );
    },

    _reposition_progress_bar: function() {
        let source_allocation = Shell.util_get_transformed_allocation(
            this.actor
        );
        let source_center_x = this.actor.width / 2;
        let progress_center_x = this._panel_progress_bar.actor.width / 2;
        let progress_x =
            source_allocation.x1 + source_center_x - progress_center_x;

        this._panel_progress_bar.actor.x = progress_x;
        this._panel_progress_bar.actor.y = this._button_box.height / 2;
    },

    _add_menu_items: function() {
        this._menu.add_menu_item("Create note", Lang.bind(this, function() {
            DBus.get_everpad_app().createRemote();
            this._menu.hide();
            this._everpad.hide();
        }));
        this._menu.add_menu_item("All notes", Lang.bind(this, function() {
            DBus.get_everpad_app().all_notesRemote();
            this._menu.hide();
            this._everpad.hide();
        }));
        this._menu.add_menu_item("Settings", Lang.bind(this, function() {
            DBus.get_everpad_app().settingsRemote();
            this._menu.hide();
            this._everpad.hide();
        }));
        this._menu.add_menu_item("Exit", Lang.bind(this, function() {
            DBus.get_everpad_app().killRemote();
            this._menu.hide();
            this._everpad.hide();
        }));
    },

    _show_spinner: function() {
        if(this._spinner != null) return;

        this._spinner = new Panel.AnimatedIcon('process-working.svg', 24)
        this._spinner.actor.show();
        this._button_box.remove_all_children();
        this._button_box.add_actor(this._spinner.actor);
    },

    _hide_spinner: function() {
        this._spinner.actor.destroy();
        this._button_box.remove_all_children();
        this._button_box.add_actor(this._label);
    },

    _on_button_press: function(o, e) {
        let button = e.get_button();

        if(this._button_box.timeout_id > 0) {
            Mainloop.source_remove(this._button_box.timeout_id);
        }

        switch(button) {
            case Clutter.BUTTON_SECONDARY:
                this._everpad.toggle();
                this._menu.hide();
                break;
            case Clutter.BUTTON_MIDDLE:
                DBus.get_everpad_provider().syncRemote();
                break;
            default:
                DBus.get_everpad_app().all_notesRemote();
                this._everpad.hide();
                break;
        }
    },

    destroy: function() {
        if(SIGNAL_IDS.sync_state > 0) {
            DBus.get_everpad_provider_signals().disconnectSignal(
                SIGNAL_IDS.sync_state
            );
        }

        this._sync_status.destroy();
        this._everpad.destroy();
        DBus.destroy_dbus_proxies();
        this.parent();
    }
});

let everpad_button = null;

function init() {
    //
}

function enable() {
    check_dbus(Lang.bind(this, function(result) {
        if(result) {
            show_button();
        }
        else {
            hide_button();
        }
    }));
    SIGNAL_IDS.owner_changed = DBus.get_dbus_control().connectSignal(
        'NameOwnerChanged',
        Lang.bind(this, function(proxy, sender, [name, old_owner, new_owner]) {
            if(name == 'com.everpad.App') {
                if(old_owner && !new_owner) {
                    hide_button();
                }
                else {
                    show_button();
                }
            }
        })
    );
}

function disable() {
    if(SIGNAL_IDS.owner_changed > 0) {
        DBus.get_dbus_control().disconnectSignal(SIGNAL_IDS.owner_changed);
    }

    hide_button();
}
