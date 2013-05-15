const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Panel = imports.ui.panel;
const Params = imports.misc.params;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const EverpadSnippets = Me.imports.snippets;

const EverpadNotesView = new Lang.Class({
    Name: "EverpadNotesView",

    _init: function(params) {
        this._params = Params.parse(params, {
            box_style_class: "everpad-notes-box",
            label_style_class: "everpad-notes-label",
            width: 0,
            height: 0,
            default_label: "Notes",
            reactive: true
        });
        this.actor = new St.Table({
            style_class: this._params.box_style_class,
            width: this._params.width,
            height: this._params.height,
            homogeneous: false,
            reactive: this._params.reactive
        });
        this._label = new St.Label({
            text: this._params.default_label,
            style_class: this._params.label_style_class
        });
        this._spinner = new Panel.AnimatedIcon('process-working.svg', 24);
        this.snippets_view = new EverpadSnippets.EverpadSnippetsView();

        this.actor.add(this._label, {
            row: 0,
            col: 0,
            y_fill: false,
            y_expand: false,
            y_align: St.Align.MIDDLE,
            x_fill: false,
            x_expand: false,
            x_align: St.Align.START
        });
        this.actor.add(this._spinner.actor, {
            row: 0,
            col: 1,
            y_fill: false,
            y_expand: false,
            y_align: St.Align.MIDDLE,
            x_fill: true,
            x_expand: false,
            x_align: St.Align.START
        });
        this.actor.add(this.snippets_view.actor, {
            row: 1,
            col: 0,
            col_span: 2,
            y_expand: true,
            y_fill: true,
            y_align: St.Align.START,
            x_expand: true,
            x_fill: true,
            x_align: St.Align.START
        });
    },

    _notes_to_remove: function(new_notes) {
        let exists_notes = this.snippets_view.notes;

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
        let exists_notes = this.snippets_view.notes;

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
        let exists_notes = this.snippets_view.notes;
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

    set_label: function(text, show_spinner) {
        if(Utils.is_blank(text)) return;

        this._label.text = text;
        show_spinner = show_spinner || false;

        if(show_spinner) {
            this._spinner.actor.show();
        }
        else {
            this._spinner.actor.hide();
        }
    },

    set_notes: function(notes, snippet_type) {
        let remove_notes = this._notes_to_remove(notes);
        let new_notes = this._notes_to_add(notes);
        let update_notes = this._notes_to_update(notes);

        this.add_notes(new_notes, snippet_type);
        this.remove_notes(remove_notes);
        this.update_notes(update_notes);
    },

    add_notes: function(notes, snippet_type) {
        for(let i = 0; i < notes.length; i++) {
            let note = notes[i];
            let snippet = EverpadSnippets.everpad_note_snippet(
                note,
                snippet_type
            );
            this.snippets_view.add_snippet(snippet);
            this.snippets_view.update_view();
        }
    },

    update_notes: function(notes) {
        for(let i = 0; i < notes.length; i++) {
            let note = notes[i];
            this.snippets_view.update_snippet(note);
            this.snippets_view.update_view();
        }
    },

    remove_notes: function(notes) {
        for(let i = 0; i < notes.length; i++) {
            let note = notes[i];
            this.snippets_view.remove_snippet(note);
            this.snippets_view.update_view();
        }
    },

    destroy: function() {
        this.actor.destroy();
        this.snippets_view.destroy();
    }
});
