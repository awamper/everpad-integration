const St = imports.gi.St;
const Lang = imports.lang;
const Panel = imports.ui.panel;
const Clutter = imports.gi.Clutter;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const DBus = Me.imports.dbus;
const EverpadProgressBar = Me.imports.progress_bar;
const Constants = Me.imports.constants;

const EverpadSyncStatus = new Lang.Class({
    Name: "EverpadSyncStatus",

    _init: function() {
        this.actor = new St.Table({
            homogeneous: false
        });

        this._spinner = new Panel.AnimatedIcon('process-working.svg', 24);
        this.actor.add(this._spinner.actor, {
            row: 0,
            col: 1,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        this._sync_button = new St.Icon({
            icon_name: "emblem-synchronizing-symbolic",
            style_class: 'everpad-sync-icon-button',
            reactive: true
        });
        this._sync_button.connect("button-press-event", Lang.bind(this,
            this._on_button_press
        ));
        this.actor.add(this._sync_button, {
            row: 0,
            col: 1,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        this._label = new St.Label({
            style_class: "everpad-sync-status-label"
        });
        this.actor.add(this._label, {
            row: 0,
            col: 0,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });
        this.show_message(
            "<span color='white' font='12' weight='bold'>" +
            "Last sync: no data</span>",
            false,
            true
        )

        this.progress_bar = new EverpadProgressBar.EverpadProgressBar();
        this.progress_bar.hide();

        this.actor.add(this.progress_bar.actor, {
            row: 1,
            col: 0,
            col_span: 2,
            expand: true,
            x_fill: true,
            y_fill: false,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });
    },

    _on_button_press: function(o, e) {
        let button = e.get_button();

        if(button === Clutter.BUTTON_PRIMARY) {
            DBus.get_everpad_provider().syncRemote();
        }
    },

    check_status: function() {
        DBus.get_everpad_provider().is_first_syncedRemote(
            Lang.bind(this, function([result], error) {
                if(result != null) {
                    let is_first_synced = result;

                    DBus.get_everpad_provider().get_statusRemote(
                        Lang.bind(this, function([result], error) {
                            if(result != null) {
                                let status = result;

                                if(is_first_synced) {
                                    if(status === Constants.STATUS_SYNC) {
                                        this.show_message(
                                            "<span color='white' font='10' font-style='italic'>" +
                                            "Sync in progress...</span>",
                                            true,
                                            false
                                        );
                                    }
                                    else {
                                        DBus.get_everpad_provider().get_last_syncRemote(
                                            Lang.bind(this, function([result], error) {
                                                if(result !== null) {
                                                    this.show_message(
                                                        "<span color='white' font='12' weight='bold'>" +
                                                        "Last sync: %s</span>".format(result),
                                                        false,
                                                        true
                                                    );
                                                }
                                                else {
                                                    log(error);
                                                }
                                            })
                                        );
                                    }
                                }
                                else {
                                    if(status === Constants.STATUS_SYNC) {
                                        this.show_message(
                                            "<span color='white' font='10'>Wait, first sync in " +
                                            "progress...</span>",
                                            true,
                                            false
                                        );
                                    }
                                    else {
                                        let msg =
                                            "<span color='red' font-style='italic' font='10'>" +
                                            "Please perform first sync.</span>"
                                        this.show_message(msg, false, true);
                                    }
                                }
                            }
                            else {
                                log(error);
                            }
                        })
                    );
                }
                else {
                    log(error);
                }
            })
        );
    },

    show_message: function(text, show_spinner, show_sync_button) {
        show_spinner = show_spinner || false;
        show_sync_button = show_sync_button || false;
        this._label.clutter_text.set_markup(text);

        if(show_spinner) {
            this._spinner.actor.show();
        }
        else {
            this._spinner.actor.hide();
        }

        if(show_sync_button) {
            this._sync_button.show();
        }
        else {
            this._sync_button.hide();
        }
    },

    destroy: function() {
        this.actor.destroy();
        this.progress_bar.destroy();
        this._spinner = null;
    }
});
