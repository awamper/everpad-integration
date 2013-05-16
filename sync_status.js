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

        this._spinner = new Panel.AnimatedIcon(
            Constants.SPINNER_ICON,
            Constants.SPINNER_ICON_SIZE
        );
        this._spinner.actor.hide();
        this.actor.add(this._spinner.actor, {
            row: 0,
            col: 1,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        this._sync_button = new St.Button({
            style_class: 'everpad-sync-icon-button-box'
        })
        this._sync_button_icon = new St.Icon({
            icon_name: "emblem-synchronizing-symbolic",
            style_class: 'everpad-sync-icon-button'
        });
        this._sync_button.add_actor(this._sync_button_icon);
        this._sync_button.connect("clicked", Lang.bind(this,
            this._on_button_clicked
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

    _on_button_clicked: function() {
        DBus.get_everpad_provider().syncRemote();
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
            this._spinner.play();
        }
        else {
            this._spinner.actor.hide();
            this._spinner.stop();
        }

        if(show_sync_button) {
            this._sync_button.show();
        }
        else {
            this._sync_button.hide();
        }
    },

    destroy: function() {
        this.progress_bar.destroy();
        this._spinner = null;
        this.actor.destroy();
    }
});
