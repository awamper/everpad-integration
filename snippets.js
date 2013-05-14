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

const DATE_ANIMATION_TIME = 0.2;
const SNIPPET_HINT_TIMEOUT = 1000;

const EVERPAD_SNIPPET_TYPES = {
    small: 0,
    medium: 1,
    big: 2
};

const EverpadNoteSnippetBase = new Lang.Class({
    Name: "EverpadNoteSnippetBase",

    _title_text_size: 13,
    _date_text_size: 9,
    _snippet_length: 0,
    _snippet_wrap: 0,
    _snippet_text_size: 0,
    _show_icon: false,
    _icon_width: 120,
    _icon_height: 120,

    _init: function(note) {
        if(!note instanceof EverpadTypes.EverpadNote) {
            throw new Error("not EverpadNote instance");
        }
        else {
            this.note = note;
        }

        this._clipboard = St.Clipboard.get_default();

        this.actor = new St.Table({
            style_class: 'everpad-snippet-box',
            homogeneous: false,
            track_hover: true,
            reactive: true
        });
        this.actor.connect("enter-event", Lang.bind(this, function() {
            if(this.actor.dont_show_message) return;

            this.actor.timeout_id = Mainloop.timeout_add(
                SNIPPET_HINT_TIMEOUT,
                Lang.bind(this, function() {
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

            Utils.get_status_bar().remove_message(this.actor.statusbar_message_id);
        }));
        this.actor.connect("button-press-event",
            Lang.bind(this, function(o, e) {
                let button = e.get_button();

                if(button === Clutter.BUTTON_PRIMARY) {
                    // this.actor.add_style_pseudo_class('active');
                    this.emit("clicked", this);
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
        // this.actor.connect("button-release-event",
        //     Lang.bind(this, function(o, e) {
        //         this.actor.remove_style_pseudo_class('active');
        //     })
        // );

        this.make_title();
        this.make_text();
        this.make_date();
        this.make_buttons();

        if(this._show_icon) {
            this.make_icon();
        }
    },

    _get_snippet: function(content, length, wrap) {
        let snippet = Utils.html2text(content);
        snippet = snippet.replace(/\s{2,}|\n{1,}/gm, ' ');
        snippet = snippet.substr(0, length);
        snippet = Utils.wordwrap(snippet, wrap, '\n');
        return snippet;
    },

    _load_resources: function(data) {
        let result = [];

        for(let i = 0; i < data[0].length; i++) {
            result.push(new EverpadTypes.EverpadResource(data[0][i]));
        }

        return result;
    },

    _get_note_resources: function(note_id, callback) {
        DBus.get_everpad_provider().get_note_resourcesRemote(note_id,
            Lang.bind(this, function(result, error) {
                if(result != null) {
                    let resources = this._parse_resources(result);
                    callback(resources);
                }
                else {
                    log(error);
                    callback(false);
                }
            })
        );
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

    _label_transition: function(label_actor, new_text, animation_time) {
        Tweener.addTween(label_actor, {
            time: animation_time,
            transition: "easeOutQuad",
            opacity: 50,
            onComplete: Lang.bind(this, function() {
                label_actor.clutter_text.set_markup(new_text);
                Tweener.addTween(label_actor, {
                    time: animation_time,
                    transition: "easeOutQuad",
                    opacity: 255
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
            this.actor.dont_show_message = true;

            let status_bar = Utils.get_status_bar();

            button.message_id = status_bar.add_message(
                'Remove the note.',
                0,
                StatusBar.MESSAGE_TYPES.info
            );
        }));
        button.connect('leave-event', Lang.bind(this, function() {
            this.actor.dont_show_message = false;

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
                button.set_checked(checked);

                if(!checked) {
                    DBus.get_everpad_provider().stop_sharing_noteRemote(
                        this.note.id
                    );
                    Utils.get_status_bar().add_message(
                        'Stop sharing the note...',
                        2000,
                        StatusBar.MESSAGE_TYPES.info
                    );
                }
                else {
                    DBus.get_everpad_provider().share_noteRemote(
                        this.note.id
                    );
                    Utils.get_status_bar().add_message(
                        'Start sharing the note...',
                        2000,
                        StatusBar.MESSAGE_TYPES.info
                    );
                }
            })
        );
        button.connect('enter-event', Lang.bind(this, function() {
            this.actor.dont_show_message = true;

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
            this.actor.dont_show_message = false;

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
            'emblem-favorite-symbolic',
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
            this.actor.dont_show_message = true;

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
            this.actor.dont_show_message = false;

            let status_bar = Utils.get_status_bar();

            if(button.message_id > 0) {
                status_bar.remove_message(button.message_id);
            }
        }));

        let checked = this.note.pinned;
        button.set_checked(checked);

        return button;
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
        this.title = new St.Label({
            style: 'font-size: %spx'.format(this._title_text_size),
        });
        this.title.clutter_text.set_markup(
            '<span weight="bold">%s</span>'.format(
                Utils.escape_html(this.note.title)
            )
        );
    },

    make_text: function(text, markup) {
        markup = markup || '';
        text = text || '';

        this.text = new St.Label({
            style: 'font-size: %spx'.format(this._snippet_text_size)
        });

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
                this._show_text(snippet);
            }));
        }
    },

    make_date: function() {
        this.date = new St.Label({
            style: 'font-size: %spx'.format(this._date_text_size),
            reactive: true
        });
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
                    this._label_transition(
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
                this._label_transition(
                    this.date,
                    this.date.default_text,
                    DATE_ANIMATION_TIME
                );
            }
        }));
    },

    make_buttons: function() {
        this.buttons_bar = new ButtonsBar.ButtonsBar();

        let share_button = this._get_share_button();
        this.buttons_bar.add_button(share_button);

        let pin_button = this._get_pin_button();
        this.buttons_bar.add_button(pin_button);

        let remove_button = this._get_remove_button();
        this.buttons_bar.add_button(remove_button);
    },

    destroy: function() {
        this.note = null;
        this.actor.destroy();
    }
});
Signals.addSignalMethods(EverpadNoteSnippetBase.prototype);

const EverpadNoteSnippetSmall = new Lang.Class({
    Name: "EverpadNoteSnippetSmall",
    Extends: EverpadNoteSnippetBase,

    _init: function(note) {
        this.parent(note);

        this.actor.add(this.title, {
            row: 0,
            col: 0,
            col_span: 2,
            x_fill: true
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
    }
});

const EverpadNoteSnippetMedium = new Lang.Class({
    Name: "EverpadNoteSnippetMedium",
    Extends: EverpadNoteSnippetBase,

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

    _init: function(snippets) {
        this.actor = new St.ScrollView();
        this._box = new St.BoxLayout({
            vertical: true,
            style_class: 'everpad-snippets-view-box',
        });
        this.actor.add_actor(this._box);

        this._snippets = snippets || [];
        this._refresh();
    },

    _refresh: function() {
        this._box.remove_all_children();

        if(this._snippets.length < 1) {
            this.show_message("No notes");
            return
        }

        for(let i = 0; i < this._snippets.length; i++) {
            let snippet = this._snippets[i];
            this._show_snippet(snippet);
        }
    },

    _show_snippet: function(snippet) {
        this._box.add(snippet.actor, {
            x_fill: true,
            x_align: St.Align.START
        });
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

    add: function(snippet) {
        if(snippet instanceof EverpadNoteSnippetBase) {
            snippet.connect("clicked", Lang.bind(this, function(snippet) {
                this.emit("snippet-clicked", snippet);
            }));

            this._snippets.push(snippet);

            if(this._snippets.length > 0) this.hide_message();
            this._show_snippet(snippet);
        }
        else {
            throw new Error('not EverpadNoteSnippetBase instance');
        }
    },

    clear: function() {
        this._snippets = [];
        this._refresh();
    },

    get snippets() {
        return this._snippets;
    },

    set snippets(snippets) {
        this.clear();

        for(let i = 0; i < snippets.length; i++) {
            this.add(snippets[i]);
        }
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
