const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Panel = imports.ui.panel;
const Params = imports.misc.params;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const EverpadSnippets = Me.imports.snippets;

const SPINNER_ICON = Me.imports.constants.SPINNER_ICON;
const SPINNER_ICON_SIZE = Me.imports.constants.SPINNER_ICON_SIZE;

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
        this._spinner = new Panel.AnimatedIcon(SPINNER_ICON, SPINNER_ICON_SIZE);
        this._spinner.actor.hide();

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

    set_label: function(text, show_spinner) {
        if(Utils.is_blank(text)) return;

        this._label.text = text;
        show_spinner = show_spinner || false;

        if(show_spinner) {
            this._spinner.actor.show();
            this._spinner.play();
        }
        else {
            this._spinner.actor.hide();
            this._spinner.stop();
        }
    },

    destroy: function() {
        this.actor.destroy();
        this.snippets_view.destroy();
    }
});
