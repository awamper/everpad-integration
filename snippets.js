const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const Pango = imports.gi.Pango;
const Params = imports.misc.params;
const Panel = imports.ui.panel;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const EverpadTypes = Me.imports.types;
const DBus = Me.imports.dbus;
const StatusBar = Me.imports.status_bar;
const ButtonsBar = Me.imports.buttons_bar;

const ICON_NAMES = Me.imports.constants.ICON_NAMES;
const DATE_ANIMATION_TIME = 0.2;
const SNIPPET_HINT_TIMEOUT = 1000;

const EVERPAD_SNIPPET_TYPES = {
    small: 0,
    medium: 1,
    big: 2
};
const ANIMATION_TIMES = {
    add_snippet: 0.5,
    remove_snippet: 0.3
};

const EverpadNoteSnippetBase = new Lang.Class({
    Name: "EverpadNoteSnippetBase",

    type: EVERPAD_SNIPPET_TYPES.medium,
    _title_text_size: 13,
    _date_text_size: 9,
    _notebook_text_size: 9,
    _snippet_length: 0,
    _snippet_wrap: 0,
    _snippet_text_size: 0,
    _show_icon: false,
    _icon_width: 120,
    _icon_height: 120,

    _init: function(note) {
        this.set_note(note);
        this._clipboard = St.Clipboard.get_default();

        this.actor = new St.Table({
            style_class: 'everpad-snippet-box',
            homogeneous: false,
            track_hover: true,
            reactive: true
        });
        this.actor.connect("destroy", Lang.bind(this, this._on_actor_destroy));
        this.actor.connect("enter-event", Lang.bind(this, function() {
            this.actor.timeout_id = Mainloop.timeout_add(
                SNIPPET_HINT_TIMEOUT,
                Lang.bind(this, function() {
                    if(!Utils.get_status_bar().is_empty()) return;

                    let msg = "Left-click to open the note";

                    if(!Utils.is_blank(this.note.share_url)) {
                        msg +=
                            ', right-click to copy the sharing ' +
                            'url to the clipboard.'
                    }

                    this.actor.statusbar_message_id =
                        Utils.get_status_bar().add_message(
                            msg,
                            0,
                            StatusBar.MESSAGE_TYPES.info
                        );
                }));
        }));
        this.actor.connect("leave-event", Lang.bind(this, function() {
            if(this.actor.timeout_id != 0) {
                Mainloop.source_remove(this.actor.timeout_id);
            }
            this.actor.remove_style_pseudo_class('updated');
            Utils.get_status_bar().remove_message(this.actor.statusbar_message_id);
        }));
        this.actor.connect("button-press-event",
            Lang.bind(this, function(o, e) {
                let button = e.get_button();
                this.actor.add_style_pseudo_class('active');

                if(button === Clutter.BUTTON_PRIMARY) {
                    // this.actor.add_style_pseudo_class('active');
                }
                else if(button === Clutter.BUTTON_SECONDARY) {
                    log(this.note.share_url);
                    if(!Utils.is_blank(this.note.share_url)) {
                        this._clipboard.set_text(this.note.share_url);
                        Utils.get_status_bar().add_message(
                            'The sharing url copied to the clipboard.',
                            2000,
                            StatusBar.MESSAGE_TYPES.success
                        );
                    }
                }
            })
        );
        this.actor.connect("button-release-event",
            Lang.bind(this, function(o, e) {
                let button = e.get_button();
                this.actor.remove_style_pseudo_class('active');

                if(button === Clutter.BUTTON_PRIMARY) {
                    this.emit("clicked", this);
                }
            })
        );

        this.connect("note-changed", Lang.bind(this, function(object, new_note) {
            this._share_button.set_checked(!Utils.is_blank(new_note.share_url));
            this._pin_button.set_checked(new_note.pinned);
        }));
    },

    _get_snippet: function(content, length, wrap) {
        let snippet = Utils.html2text(content);
        snippet = snippet.replace(/\s{2,}|\n{1,}/gm, ' ');
        snippet = snippet.substr(0, length);
        snippet = Utils.wordwrap(snippet, wrap, '\n');
        return snippet;
    },

    _get_icon: function(icon_info) {
        let info = Params.parse(icon_info, {
            url: false,
            width: 120,
            height: 100
        });

        if(!info.url) {
            return false;
        }

        let textureCache = St.TextureCache.get_default();
        let icon = textureCache.load_uri_async(
            info.url,
            info.width,
            info.height
        );

        let icon_box = new St.BoxLayout({
            style_class: 'everpad-snippet-icon-box',
            opacity: 0
        });

        icon_box.add(icon);
        icon_box.connect('notify::allocation', Lang.bind(this, function() {
            let natural_width = icon_box.get_preferred_width(-1)[1];

            if(natural_width > 10) {
                Tweener.addTween(icon_box, {
                    transition: 'easeOutQuad',
                    time: 1,
                    opacity: 255
                });
            }
        }));

        return icon_box;
    },

    _show_text: function(text) {
        if(Utils.is_blank(text)) return;

        Tweener.addTween(this.text.clutter_text, {
            opacity: 0,
            transition: 'linear',
            time: 0.3,
            onComplete: Lang.bind(this, function() {
                this.text.set_text(text);
                Tweener.addTween(this.text.clutter_text, {
                    opacity: 255,
                    transition: 'linear',
                    time: 0.3
                });
            })
        });
    },

    _get_remove_button: function() {
        let button_params = {
            style_class: 'everpad-snippet-buttons-bar-button'
        };

        let button = this.buttons_bar.new_button(
            'edit-delete-symbolic',
            '',
            button_params,
            Lang.bind(this, Lang.bind(this, function() {
                DBus.get_everpad_provider().delete_noteRemote(this.note.id,
                    Lang.bind(this, function([result], error) {
                        if(result !== null) {
                            if(!result) {
                                Utils.get_status_bar().add_message(
                                    'Erorr',
                                    3000,
                                    StatusBar.MESSAGE_TYPES.error
                                );
                            }
                        }
                        else {
                            log('delete_noteRemote(): '+error);
                        }
                    })
                );
            })));
        button.connect('enter-event', Lang.bind(this, function() {
            let status_bar = Utils.get_status_bar();

            button.message_id = status_bar.add_message(
                'Remove the note.',
                0,
                StatusBar.MESSAGE_TYPES.info
            );
        }));
        button.connect('leave-event', Lang.bind(this, function() {
            let status_bar = Utils.get_status_bar();

            if(button.message_id > 0) {
                status_bar.remove_message(button.message_id);
            }
        }));

        return button;
    },

    _get_share_button: function() {
        let button_params = {
            style_class: 'everpad-snippet-buttons-bar-toggle-button',
            toggle_mode: true
        };

        let button = this.buttons_bar.new_button(
            'emblem-shared-symbolic',
            '',
            button_params,
            Lang.bind(this, function() {
                let checked = button.get_checked();

                if(!checked) {
                    DBus.get_everpad_provider().stop_sharing_noteRemote(
                        this.note.id
                    );
                    Utils.get_status_bar().add_message(
                        'Stop sharing the note...',
                        4000,
                        StatusBar.MESSAGE_TYPES.info
                    );
                }
                else {
                    DBus.get_everpad_provider().share_noteRemote(
                        this.note.id
                    );
                    Utils.get_status_bar().add_message(
                        'Start sharing the note...',
                        4000,
                        StatusBar.MESSAGE_TYPES.info
                    );
                }
            })
        );
        button.connect('enter-event', Lang.bind(this, function() {
            let checked = button.get_checked();
            let status_bar = Utils.get_status_bar();

            if(checked) {
                button.message_id = status_bar.add_message(
                    'Left-click to stop sharing.',
                    0,
                    StatusBar.MESSAGE_TYPES.info
                );
            }
            else {
                button.message_id = status_bar.add_message(
                    'Share the note.',
                    0,
                    StatusBar.MESSAGE_TYPES.info
                );
            }
        }));
        button.connect('leave-event', Lang.bind(this, function() {
            let status_bar = Utils.get_status_bar();

            if(button.message_id > 0) {
                status_bar.remove_message(button.message_id);
            }
        }));

        let checked = !Utils.is_blank(this.note.share_url);
        button.set_checked(checked);

        return button;
    },

    _get_pin_button: function() {
        let button_params = {
            style_class: 'everpad-snippet-buttons-bar-toggle-button',
            toggle_mode: true
        };

        let button = this.buttons_bar.new_button(
            'bookmark-new-symbolic',
            '',
            button_params,
            Lang.bind(this, function() {
                let checked = button.get_checked();
                button.set_checked(checked);

                this.note.pinned = checked;
                DBus.get_everpad_provider().update_noteRemote(
                    this.note.for_dbus
                );
            })
        );
        button.connect('enter-event', Lang.bind(this, function() {
            let checked = button.get_checked();
            let status_bar = Utils.get_status_bar();

            if(checked) {
                button.message_id = status_bar.add_message(
                    'Unpin the note.',
                    0,
                    StatusBar.MESSAGE_TYPES.info
                );
            }
            else {
                button.message_id = status_bar.add_message(
                    'Pin the note.',
                    0,
                    StatusBar.MESSAGE_TYPES.info
                );
            }
        }));
        button.connect('leave-event', Lang.bind(this, function() {
            let status_bar = Utils.get_status_bar();

            if(button.message_id > 0) {
                status_bar.remove_message(button.message_id);
            }
        }));

        let checked = this.note.pinned;
        button.set_checked(checked);

        return button;
    },

    _on_actor_destroy: function() {
        this.destroy();
    },

    make_icon: function() {
        this._get_note_resources(this.note.id,
            Lang.bind(this, function(resources) {
                if(resources) {
                    for(let i = 0; i < resources.length; i++) {
                        let resource = resources[i];

                        if(resource.mime.indexOf('image') !== -1) {
                            let params = {
                                url: 'file://%s'.format(resource.file_path),
                                width: this._icon_width,
                                height: this._icon_height
                            };
                            this.icon = this._get_icon(params);
                            this.add_icon(this.icon);
                            break;
                        }
                    }
                }
            }));
    },

    add_icon: function(icon_box) {
        //
    },

    make_title: function() {
        if(!this.title) {
            this.title = new St.Label({
                style: 'font-size: %spx'.format(this._title_text_size),
            });
        }

        this.title.clutter_text.set_markup(
            '<span weight="bold">%s</span>'.format(
                Utils.escape_html(this.note.title)
            )
        );
    },

    make_text: function(text, markup) {
        markup = markup || '';
        text = text || '';

        if(!this.text) {
            this.text = new St.Label({
                style: 'font-size: %spx'.format(this._snippet_text_size)
            });
        }

        if(!Utils.is_blank(markup)) {
            this.text.clutter_text.set_markup(markup);
        }
        else {
            this.text.set_text(text);
        }

        if(this._snippet_length > 0) {
            Mainloop.idle_add(Lang.bind(this, function() {
                let snippet = this._get_snippet(
                    this.note.content,
                    this._snippet_length,
                    this._snippet_wrap
                );
                if(Utils.is_blank(snippet)) {
                    this._show_text('No text');
                }
                else {
                    this._show_text(snippet);
                }
            }));
        }
    },

    make_notebook: function() {
        if(!this.notebook) {
            this._notebook_icon = new St.Icon({
                icon_name: ICON_NAMES.notebook,
                icon_size: this._notebook_text_size
            });
            this._notebook_name = new St.Label({
                style: 'font-size: %spx'.format(this._notebook_text_size),
                text: '...'
            });

            this.notebook = new St.BoxLayout();
            this.notebook.add(this._notebook_icon, {
                y_fill: false,
                x_fill: false,
                expand: false,
                y_align: St.Align.START
            });
            this.notebook.add(this._notebook_name, {
                y_fill: false,
                x_fill: false,
                expand: false,
                y_align: St.Align.MIDDLE
            });
        }

        DBus.get_everpad_provider().get_notebookRemote(this.note.notebook,
            Lang.bind(this, function([result], error) {
                if(result !== null) {
                    let notebook = new EverpadTypes.EverpadNotebook(result);
                    this._notebook_name.text = notebook.name;
                }
                else {
                    this.notebook.hide();
                    log('make_notebook(): %s'.format(error));
                }
            })
        );
    },

    make_date: function() {
        if(!this.date) {
            this.date = new St.Label({
                style: 'font-size: %spx'.format(this._date_text_size),
                reactive: true
            });
        }

        this.date.default_text =
            '<i><span weight="bold">%s</span></i>'.format(
                new Date(this.note.created).toLocaleString()
            )
        this.date.hover_text =
            '<i>Modified: <span weight="bold">%s</span></i>'.format(
                new Date(this.note.updated).toLocaleString()
            );
        this.date.clutter_text.set_markup(this.date.default_text);
        this.date.connect("enter-event", Lang.bind(this, function() {
            this.date.timeout_id = Mainloop.timeout_add(300,
                Lang.bind(this, function() {
                    this.date.hovered = true;
                    Utils.label_transition(
                        this.date,
                        this.date.hover_text,
                        DATE_ANIMATION_TIME
                    );
                })
            );
        }));
        this.date.connect("leave-event", Lang.bind(this, function() {
            if(this.date.timeout_id > 0) {
                Mainloop.source_remove(this.date.timeout_id);
            }

            if(this.date.hovered) {
                this.date.hovered = false;
                Utils.label_transition(
                    this.date,
                    this.date.default_text,
                    DATE_ANIMATION_TIME
                );
            }
        }));
    },

    make_buttons: function() {
        if(!this.buttons_bar) {
            this.buttons_bar = new ButtonsBar.ButtonsBar();

            this._share_button = this._get_share_button();
            this.buttons_bar.add_button(this._share_button);

            this._pin_button = this._get_pin_button();
            this.buttons_bar.add_button(this._pin_button);

            this._remove_button = this._get_remove_button();
            this.buttons_bar.add_button(this._remove_button);
        }
    },

    destroy: function() {
        this.note = null;

        if(this.actor !== null) {
            this.actor.destroy();
            this.actor = null;
        }
    },

    set_note: function(note) {
        if(!note instanceof EverpadTypes.EverpadNote) {
            throw new Error("not EverpadNote instance");
        }
        else {
            this.note = note;
        }

        this.make_title();
        this.make_text();
        this.make_notebook();
        this.make_date();
        this.make_buttons();

        if(this._show_icon) {
            this.make_icon();
        }

        this.emit("note-changed", this.note);
    }
});
Signals.addSignalMethods(EverpadNoteSnippetBase.prototype);

const EverpadNoteSnippetSmall = new Lang.Class({
    Name: "EverpadNoteSnippetSmall",
    Extends: EverpadNoteSnippetBase,

    type: EVERPAD_SNIPPET_TYPES.small,

    _init: function(note) {
        this.parent(note);

        this.actor.add(this.title, {
            row: 0,
            col: 0,
            col_span: 2,
            x_fill: true
        });
        this.actor.add(this.date, {
            row: 1,
            col: 0,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.END
        });
        this.actor.add(this.buttons_bar.actor, {
            row: 1,
            col: 1,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.END,
            y_align: St.Align.END
        });
    }
});

const EverpadNoteSnippetMedium = new Lang.Class({
    Name: "EverpadNoteSnippetMedium",
    Extends: EverpadNoteSnippetBase,

    type: EVERPAD_SNIPPET_TYPES.medium,
    _snippet_length: 350,
    _snippet_wrap: 105,
    _title_text_size: 14,
    _snippet_text_size: 10,

    _init: function(note) {
        this.parent(note);

        this.actor.add(this.title, {
            row: 0,
            col: 0,
            col_span: 2,
            x_fill: true
        });
        this.actor.add(this.text, {
            row: 1,
            col: 0,
            col_span: 2,
            x_fill: true,
            x_expand: true
        });
        this.actor.add(this.date, {
            row: 2,
            col: 0,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.END
        });
        this.actor.add(this.buttons_bar.actor, {
            row: 2,
            col: 1,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.END,
            y_align: St.Align.END
        });
    },

    make_text: function() {
        this.parent('', "<i>Loading...</i>");
    }
});

const EverpadNoteSnippetBig = new Lang.Class({
    Name: "EverpadNoteSnippetBig",
    Extends: EverpadNoteSnippetBase,

    type: EVERPAD_SNIPPET_TYPES.big,
    _title_text_size: 15,
    _snippet_length: 600,
    _snippet_wrap: 120,
    _snippet_text_size: 12,

    _init: function(note) {
        this.parent(note);

        this.actor.add(this.title, {
            row: 0,
            col: 0,
            col_span: 2,
            x_fill: true
        });
        this.actor.add(this.text, {
            row: 1,
            col: 0,
            col_span: 2,
            x_fill: true,
            x_expand: true
        });
        this.actor.add(this.date, {
            row: 2,
            col: 0,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.END
        });
        this.actor.add(this.buttons_bar.actor, {
            row: 2,
            col: 1,
            expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.END,
            y_align: St.Align.END
        });
    },

    make_text: function() {
        this.parent('', "<i>Loading...</i>");
    }
});

const EverpadSnippetsView = new Lang.Class({
    Name: "EverpadSnippetsView",

    _init: function() {
        this.actor = new St.ScrollView();
        this._box = new St.BoxLayout({
            vertical: true,
            style_class: 'everpad-snippets-view-box',
        });
        this.actor.add_actor(this._box);

        this._snippets = [];
    },

    _notes_to_remove: function(new_notes) {
        let exists_notes = this.get_notes();

        let result = exists_notes.filter(function(element, index, array) {
            let result_index = Utils.array_object_index_of(
                new_notes,
                element.id,
                'id'
            );
            return result_index === -1;
        });

        return result;
    },

    _notes_to_add: function(new_notes) {
        let exists_notes = this.get_notes();

        let result = new_notes.filter(function(element, index, array) {
            let result_index = Utils.array_object_index_of(
                exists_notes,
                element.id,
                'id'
            );
            return result_index === -1;
        });

        return result;
    },

    _notes_to_update: function(new_notes) {
        let exists_notes = this.get_notes();
        let result = new_notes.filter(function(element, index, array) {
            let result_index = Utils.array_object_index_of(
                exists_notes,
                element.id,
                'id'
            )
            return result_index !== -1;
        });

        return result;
    },

    _add_snippet: function(snippet) {
        if(snippet instanceof EverpadNoteSnippetBase) {
            snippet.connect("clicked", Lang.bind(this, function(snippet) {
                this.emit("snippet-clicked", snippet);
            }));
        }
        else {
            throw new Error('not EverpadNoteSnippetBase instance');
        }

        Mainloop.idle_add(Lang.bind(this, function() {
            snippet.actor.opacity = 0;
            this._box.add(snippet.actor, {
                x_fill: true,
                x_align: St.Align.START
            });

            Tweener.removeTweens(snippet.actor);
            Tweener.addTween(snippet.actor, {
                time: ANIMATION_TIMES.add_snippet,
                transition: 'easeOutQuad',
                opacity: 255
            });
        }));
    },

    _remove_snippet: function(snippet) {
        Mainloop.idle_add(Lang.bind(this, function() {
            Tweener.removeTweens(snippet.actor);
            Tweener.addTween(snippet.actor, {
                time: ANIMATION_TIMES.remove_snippet,
                transition: 'easeOutQuad',
                opacity: 0,
                height: 0,
                onComplete: Lang.bind(this, function() {
                    snippet.destroy();
                })
            });
        }));
    },

    _update_snippet: function(snippet, new_note) {
        Mainloop.idle_add(Lang.bind(this, function() {
            snippet.set_note(new_note);
            snippet.actor.add_style_pseudo_class('updated');
        }));
    },

    show_message: function(text, show_spinner) {
        show_spinner = show_spinner || false;
        this._box.remove_all_children();

        this._message_bin = new St.BoxLayout();
        this._box.add(this._message_bin, {
            x_fill: false,
            y_fill: false,
            expand: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });

        let message = new St.Label({
            text: text,
            style_class: 'everpad-snippets-view-message'
        });
        this._message_bin.add_actor(message);

        if(show_spinner) {
            let spinner = new Panel.AnimatedIcon('process-working.svg', 24);
            spinner.actor.show();
            this._message_bin.add_actor(spinner.actor);
        }
    },

    hide_message: function() {
        if(this._message_bin) {
            this._message_bin.destroy();
        }
    },

    get_snippet_by_note_id: function(note_id) {
        for(let i = 0; i < this._snippets.length; i++) {
            if(this._snippets[i].note.id === note_id) return this._snippets[i];
        }

        return -1;
    },

    get_notes: function() {
        let notes = [];

        for(let i = 0; i < this._snippets.length; i++) {
            notes.push(this._snippets[i].note);
        }

        return notes;
    },

    clear: function() {
        this._snippets = [];
        this._box.destroy_all_children();
    },

    update: function(notes, snippet_type) {
        let remove_notes = this._notes_to_remove(notes);
        let new_notes = this._notes_to_add(notes);
        let update_notes = this._notes_to_update(notes);

        for(let i = 0; i < remove_notes.length; i++) {
            let note = remove_notes[i];
            let snippet = this.get_snippet_by_note_id(note.id);

            if(snippet === -1) continue;

            this._snippets.splice(this._snippets.indexOf(snippet), 1);
            this._remove_snippet(snippet);
        }

        for(let i = 0; i < new_notes.length; i++) {
            let note = new_notes[i];
            let snippet = everpad_note_snippet(note, snippet_type);
            this._snippets.push(snippet);
            this._add_snippet(snippet);
        }

        for(let i = 0; i < update_notes.length; i++) {
            let note = update_notes[i];
            let snippet = this.get_snippet_by_note_id(note.id);

            if(snippet === -1) continue;

            if(!note.is_equal_to(snippet.note)) {
                this._update_snippet(snippet, note);
            }
        }

        if(this._snippets.length > 0) {
            this.hide_message();
        }
    },

    scroll_to: function(value) {
        let adjustment = this.actor.vscroll.adjustment;

        if(value === adjustment.value) return;

        let step_min = 5;
        let step_max = 150;
        let scroll_to_bottom = value > adjustment.value ? true : false

        Mainloop.timeout_add(30, Lang.bind(this, function() {
            let diff = Math.ceil(Math.abs(adjustment.value - value));
            let step = Math.max(Math.min(diff / 10, step_max), step_min);

            if(scroll_to_bottom) {
                adjustment.value = adjustment.value + step;
                return adjustment.value >= value ? false : true;
            }
            else {
                adjustment.value = adjustment.value - step;
                return adjustment.value <= value ? false : true;
            }
        }));
    },

    scroll_to_first_updated: function() {
        let updated_index = -1;
        let children = this._box.get_children();

        for(let i = 0; i < children.length; i++) {
            let pseudo_class = children[i].get_style_pseudo_class() || '';

            if(pseudo_class.indexOf('updated') !== -1) {
                updated_index = i;
                break;
            }
        }

        if(updated_index === -1) return false;

        let adjustment = this.actor.vscroll.adjustment;
        let position = Math.ceil(
            adjustment.page_size / children.length * updated_index
        );
        this.scroll_to(position);

        return true;
    },

    get snippets() {
        return this._snippets;
    },

    get count() {
        return this._snippets.length
    },

    destroy: function() {
        for(let i = 0; i < this.snippets.length; i++) {
            let snippet = this.snippets[i];
            snippet.destroy();
        }

        this.actor.destroy();
    }
});
Signals.addSignalMethods(EverpadSnippetsView.prototype);

function everpad_note_snippet(note, type) {
    let snippet;

    switch(type) {
        case EVERPAD_SNIPPET_TYPES.small:
            snippet = new EverpadNoteSnippetSmall(note);
            break;
        case EVERPAD_SNIPPET_TYPES.medium:
            snippet = new EverpadNoteSnippetMedium(note);
            break;
        default:
            snippet = new EverpadNoteSnippetBig(note);
            break;
    }

    return snippet;
}
