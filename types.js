const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const NOTE_ORDER_TITLE = 0;
const NOTE_ORDER_UPDATED = 1;
const NOTE_ORDER_TITLE_DESC = 2;
const NOTE_ORDER_UPDATED_DESC = 3;

const EverpadNote = new Lang.Class({
    Name: 'EverpadNote',

    _init: function(data) {
        this.id = data[0];
        this.title = data[1];
        this.content = data[2];
        this.created = data[3];
        this.updated = data[4];
        this.notebook = data[5];
        this.tags = data[6];
        this.place = data[7];
        this.pinned = data[8];
        this.conflict_parent = data[9];
        this.conflict_items = data[10];
        this.share_date = data[11];
        this.share_url = data[12];
    },

    is_equal_to: function(note) {
        if(
            this.id === note.id &&
            this.title === note.title &&
            this.content === note.content &&
            this.created === note.created &&
            this.updated === note.updated &&
            this.notebook === note.notebook &&
            this.tags.toJson === note.toJson &&
            this.place === note.place &&
            this.pinned === note.pinned &&
            this.conflict_parent === note.conflict_parent &&
            this.conflict_items.toJson === note.conflict_items.toJson &&
            this.share_date === note.share_date &&
            this.share_url === note.share_url
        ) {
            return true;
        }
        else {
            return false;
        }
    },

    get for_dbus() {
        let result = [
            this.id,
            this.title,
            this.content,
            this.created,
            this.updated,
            this.notebook,
            this.tags,
            this.place,
            this.pinned,
            this.conflict_parent,
            this.conflict_items,
            this.share_date,
            this.share_url
        ];

        return result;
    }
});

const EverpadNotebook = new Lang.Class({
    Name: "EverpadNotebook",

    _init: function(data) {
        this.id = data[0];
        this.name = data[1];
        this.default = data[2];
        this.stack = data[3];
    }
});

const EverpadResource = new Lang.Class({
    Name: "EverpadResource",

    _init: function(data) {
        this.id = data[0];
        this.file_name = data[1];
        this.file_path = data[2];
        this.mime = data[3];
        this.hash = data[4];
    }
});
