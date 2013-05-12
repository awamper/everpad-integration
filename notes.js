const St = imports.gi.St;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const EverpadNotesView = Me.imports.notes_view;

const LABELS = {
    latest: "Latest notes",
    search: "Search results",
    searching: "Searching..."
};

const EverpadNotes = new Lang.Class({
    Name: "EverpadNotes",
    Extends: EverpadNotesView.EverpadNotesView,

    _init: function() {
        this.parent();
    }
});
