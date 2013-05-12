const St = imports.gi.St;
const Lang = imports.lang;
const Panel = imports.ui.panel;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const EverpadNotesView = Me.imports.notes_view;

const EverpadPinnedNotes = new Lang.Class({
    Name: "EverpadPinnedNotes",
    Extends: EverpadNotesView.EverpadNotesView,

    _init: function() {
        this.parent({
            default_label: "Pinned notes"
        });
    }
});
