const St = imports.gi.St;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const Pango = imports.gi.Pango;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const EverpadTypes = Me.imports.types;
const EverpadNotes = Me.imports.notes;
const EverpadPinnedNotes = Me.imports.pinned_notes;
const EverpadNoteSnippet = Me.imports.snippets;
const DBus = Me.imports.dbus;
const StatusBar = Me.imports.status_bar;

const MAX_PINNED_NOTES = Me.imports.constants.MAX_PINNED_NOTES
const MAX_LATEST_NOTES = Me.imports.constants.MAX_LATEST_NOTES
const MAX_SEARCH_RESULTS = Me.imports.constants.MAX_SEARCH_RESULTS
const TIMEOUT_IDS = Me.imports.constants.TIMEOUT_IDS;
const SEARCH_DELAY = Me.imports.constants.SEARCH_DELAY;

const TRIGGERS = {
    refresh_pinned: true,
    refresh_latest: true
};

const SIGNAL_IDS = {
    data_changed: 0
};

const EVERPAD_ANIMATION_TIME = 0.5;
const MENU_ANIMATION_TIME = 0.4;

const Everpad = new Lang.Class({
    Name: 'Everpad',

    _init: function() {
        this.actor = new St.BoxLayout({
            style_class: 'everpad-box',
            reactive: true,
            track_hover:true,
            can_focus: true
        });
        Main.layoutManager.panelBox.add_actor(this.actor);
        this.actor.lower_bottom();
        this.actor.connect('key-press-event',
            Lang.bind(this, this._on_key_press_event)
        );

        this._table = new St.Table({
            homogeneous: false
        });
        this.actor.add_actor(this._table);

        this._search_entry = new St.Entry({
            style_class: "everpad-search-entry",
            hint_text: "Type to search",
            track_hover: true,
            can_focus: true
        });
        this._search_entry.connect('key-press-event',
            Lang.bind(this, this._on_search_key_press_event)
        );
        this._search_entry.clutter_text.connect('text-changed',
            Lang.bind(this, this._on_search_text_changed)
        );

        this.notes_view = new EverpadNotes.EverpadNotes();
        this.notes_view.snippets.connect("snippet-clicked", Lang.bind(this,
            this._on_snipped_clicked
        ));

        this.pinned_view = new EverpadPinnedNotes.EverpadPinnedNotes();
        this.pinned_view.actor.connect("enter-event", Lang.bind(this, function() {
            this._show_pinned_box();
        }));
        this.pinned_view.actor.connect("leave-event", Lang.bind(this, function() {
            this._hide_pinned_box();
        }));
        this.pinned_view.snippets.connect("snippet-clicked",
            Lang.bind(this, this._on_snipped_clicked)
        );

        this.actor.add_actor(this.pinned_view.actor);

        this._table.add(this._search_entry, {
            row: 0,
            col: 0,
            x_fill: true,
            x_expand: true,
            y_fill: false,
            y_expand: false,
            y_align: St.Align.START,
            x_align: St.Align.START
        });
        this._table.add(this.notes_view.actor, {
            row: 1,
            col: 0,
            x_fill: true,
            y_fill: true,
            x_align: St.Align.START,
        });
        this._table.add(Utils.get_status_bar().actor, {
            row: 2,
            col: 0,
            x_fill: false,
            y_fill: false,
            y_expand: false,
            x_expand: false,
            x_align: St.Align.START
        });

        this._open = false;
        this._resize();
        this._hide_pinned_box();

        SIGNAL_IDS.data_changed = DBus.get_everpad_provider_signals().connectSignal(
            'data_changed',
            Lang.bind(this, function(proxy, sender) {
                TRIGGERS.refresh_pinned = true;
                TRIGGERS.refresh_latest = true;

                if(this.is_open) {
                    this.refresh_pinned_notes();
                    this.refresh_latest_notes();
                }
            })
        );
    },

    _resize: function() {
        let primary = Main.layoutManager.primaryMonitor;
        let my_width = primary.width * 0.5;
        let available_height =
            primary.height - Main.layoutManager.keyboardBox.height;
        let my_height = Math.min(primary.height * 0.6, available_height * 0.9);

        this.actor.x = (primary.width - my_width + 2);
        this._hidden_y = this.actor.get_parent().height - my_height - 2;
        this._target_y = this._hidden_y + my_height;

        this.actor.y = this._hidden_y;
        this.actor.width = my_width;
        this.actor.height = my_height;

        this._table.width = my_width * 0.95;
        this._table.height = my_height * 0.95;

        this.pinned_view.actor.width = my_width * 0.60;
        this.pinned_view.actor.height = my_height * 0.98;
    },

    _hide_pinned_box: function() {
        let x = this.actor.width - 20;

        Tweener.removeTweens(this.pinned_view.actor);
        Tweener.addTween(this.pinned_view.actor, {
            time: MENU_ANIMATION_TIME / St.get_slow_down_factor(),
            transition: 'easeOutQuad',
            x: x,
            onStart: Lang.bind(this, function() {
                Tweener.addTween(this._table, {
                    time: MENU_ANIMATION_TIME,
                    transition: 'easeOutQuad',
                    opacity: 255
                })
            }),
            onComplete: Lang.bind(this, function () {
                this.pinned_view.actor.opacity = 150;
            })
        })
    },

    _show_pinned_box: function() {
        let x = this.actor.width - this.pinned_view.actor.width;

        this.pinned_view.actor.opacity = 255;
        this.pinned_view.actor.show();

        Tweener.removeTweens(this.pinned_view.actor);
        Tweener.addTween(this.pinned_view.actor, {
            time: MENU_ANIMATION_TIME / St.get_slow_down_factor(),
            transition: 'easeOutQuad',
            x: x,
            onStart: Lang.bind(this, function() {
                Tweener.addTween(this._table, {
                    time: MENU_ANIMATION_TIME,
                    transition: "easeOutQuad",
                    opacity: 100
                })
            })
        })
    },

    _remove_timeouts: function(timeout_key) {
        if(!Utils.is_blank(timeout_key)) {
            if(TIMEOUT_IDS[timeout_key] > 0) {
                Mainloop.source_remove(TIMEOUT_IDS[timeout_key]);
            }
        }
        else {
            for(let key in TIMEOUT_IDS) {
                if(TIMEOUT_IDS[key] > 0) {
                    Mainloop.source_remove(TIMEOUT_IDS[key]);
                }
            }
        }
    },

    _on_snipped_clicked: function(snippets_view, snippet) {
        let term = this._search_entry.text;

        if(!Utils.is_blank(term) && term != this._search_entry.hint_text) {
            DBus.get_everpad_app().open_with_search_termRemote(
                snippet.note.id,
                term
            );
        }
        else {
            DBus.get_everpad_app().openRemote(snippet.note.id);
        }

        this.hide();
    },

    _on_key_press_event: function(o, e) {
        let symbol = e.get_key_symbol()
        let ch = Utils.get_unichar(symbol);

        if(symbol === Clutter.Escape) {
            this.hide();
        }
        else if(ch) {
            // log(ch);
            this._search_entry.set_text(ch);
            this._search_entry.grab_key_focus();
        }
    },

    _on_search_key_press_event: function(o, e) {
        let symbol = e.get_key_symbol();

        if(symbol === Clutter.Escape) {
            this._search_entry.set_text('');
            this.actor.grab_key_focus();
            TRIGGERS.refresh_latest = true;
            this.refresh_latest_notes();
            return true;
        }

        return false;
    },

    _on_search_text_changed: function() {
        let term = this._search_entry.text.trim();
        let hint_text = this._search_entry.hint_text;

        if(!Utils.is_blank(term) && term != hint_text) {
            this._remove_timeouts('search');
            TIMEOUT_IDS.search = Mainloop.timeout_add(SEARCH_DELAY,
                Lang.bind(this, function() {
                    this.notes_view.snippets.show_message(
                        "Searching...",
                        true
                    );
                    // this.notes_view.set_label(
                    //     EverpadNotes.LABELS.searching,
                    //     true
                    // );
                    this._search_notes(term);
                })
            );
        }
        else {
            this.notes_view.snippets.clear();
        }
    },

    _search_notes: function(term) {
        DBus.get_everpad_provider().find_notesRemote(term, [], [], 0, MAX_SEARCH_RESULTS, 0, -1,
            Lang.bind(this, function(result, error) {
                if(result != null) {
                    this.notes_view.set_label(EverpadNotes.LABELS.search);
                    let notes = this._load_notes(result);

                    if(notes.length < 1) {
                        this.notes_view.snippets.show_message(
                            "Nothing found",
                            false
                        );
                    }
                    else {
                        this.notes_view.set_notes(
                            notes,
                            EverpadNoteSnippet.EVERPAD_SNIPPET_TYPES.medium
                        );
                    }
                }
                else {
                    this.notes_view.snippets.show_message(
                        "Error: "+error,
                        false
                    );
                    log(error);
                }
            })
        );
    },

    _load_notes: function(data) {
        let result = [];

        for(let i = 0; i < data[0].length; i++) {
            result.push(new EverpadTypes.EverpadNote(data[0][i]));
        }

        return result;
    },

    refresh_pinned_notes: function() {
        if(!TRIGGERS.refresh_pinned) return;

        TRIGGERS.refresh_pinned = false;

        this.pinned_view.snippets.show_message(
            "Loading...",
            true
        );

        DBus.get_everpad_provider().find_notesRemote('p', [], [], 0, MAX_PINNED_NOTES, EverpadTypes.NOTE_ORDER_TITLE, -1,
            Lang.bind(this, function(result, error) {
                if(result != null) {
                    let notes = this._load_notes(result);
                    this.pinned_view.set_notes(
                        notes,
                        EverpadNoteSnippet.EVERPAD_SNIPPET_TYPES.small
                    );
                    this.pinned_view.set_label("Pinned notes");
                }
                else {
                    this.pinned_view.snippets.show_message("Error", false);
                    log("show_pinned_notes(): " + error);
                }
            })
        );
    },

    refresh_latest_notes: function() {
        if(!TRIGGERS.refresh_latest) return;

        TRIGGERS.refresh_latest = false;

        this.notes_view.set_label(EverpadNotes.LABELS.latest, false);
        this.notes_view.snippets.show_message("Loading...", true);

        DBus.get_everpad_provider().find_notesRemote('', [], [], 0, MAX_LATEST_NOTES, EverpadTypes.NOTE_ORDER_UPDATED_DESC, -1,
            Lang.bind(this, function(result, error) {
                if(result != null) {
                    this.notes_view.set_label(EverpadNotes.LABELS.latest);
                    let notes = this._load_notes(result);

                    if(notes.length < 1) {
                        this.notes_view.snippets.show_message(
                            "Nothing found",
                            false
                        );
                    }
                    else {
                        this.notes_view.set_notes(
                            notes,
                            EverpadNoteSnippet.EVERPAD_SNIPPET_TYPES.medium
                        );
                    }
                }
                else {
                    this.notes_view.snippets.show_message(
                        "Error: " + error,
                        false
                    );
                    log("show_latest_notes(): " + error);
                }
            })
        );
    },

    show: function() {
        if(this._open) return;

        if(!Main.pushModal(this.actor))
            return;

        this.actor.show();
        this._open = true;

        Tweener.removeTweens(this.actor);
        Tweener.addTween(this.actor, {
            time: EVERPAD_ANIMATION_TIME / St.get_slow_down_factor(),
            transition: 'easeOutQuad',
            y: this._target_y
        });
    },

    hide: function() {
        if(!this._open) return;

        Main.popModal(this.actor);
        this._open = false;

        Tweener.removeTweens(this.actor);
        Tweener.addTween(this.actor, {
            time: EVERPAD_ANIMATION_TIME / St.get_slow_down_factor(),
            transition: 'easeOutQuad',
            y: this._hidden_y,
            onComplete: Lang.bind(this, function () {
                this.actor.hide();
            })
        });
    },

    toggle: function() {
        if(this._open) {
            this.hide();
        }
        else {
            this.show();

            this.refresh_pinned_notes();
            this.refresh_latest_notes();
        }
    },

    destroy: function() {
        if(SIGNAL_IDS.data_changed > 0) {
            DBus.get_everpad_provider_signals().disconnectSignal(
                SIGNAL_IDS.data_changed
            );
        }

        Utils.destroy_status_bar();
        this.actor.destroy();
        this.notes_view.destroy();
        this.pinned_view.destroy();
    },

    get is_open() {
        return this._open;
    }
});
