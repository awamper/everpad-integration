const St = imports.gi.St;
const Lang = imports.lang;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const EverpadProgressBar = new Lang.Class({
    Name: "EverpadProgressBar",

    _init: function(params) {
        this._params = Params.parse(params, {
            box_style_class: 'everpad-progress-bar-box',
            progress_style_class: 'everpad-progress-bar',
            animation_time: 0.7,
            steps: 10,
            expand: false,
            x_fill: false,
            y_fill: true,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        this.actor = new St.Table({
            style_class: this._params.box_style_class,
            homogeneous: false
        });

        this.visible = true;
        this._progress_bar = new St.BoxLayout({
            style_class: this._params.progress_style_class
        });

        this.actor.add(this._progress_bar, {
            row: 0,
            col: 0,
            expand: this._params.expand,
            x_fill: this._params.x_fill,
            y_fill: this._params.y_fill,
            x_align: this._params.x_align,
            y_align: this._params.y_align
        });

        this.reset();
    },

    set_progress: function(progress) {
        let box_border = this.actor.get_theme_node().get_length('border');
        let progress_border = this.actor.get_theme_node().get_length('border');

        progress = Math.ceil(this.actor.width / this._params.steps * progress);
        progress = progress - (box_border + progress_border);

        Tweener.removeTweens(this._progress_bar);
        Tweener.addTween(this._progress_bar, {
            time: this._params.animation_time,
            transition: "easeOutQuad",
            width: progress
        });
    },

    set_progress_label: function(text) {
        if(!this._progress_label) {
            this._progress_label = new St.Label({
                style_class: 'everpad-progress-bar-label'
            });
            this.actor.add(this._progress_label, {
                row: 0,
                col: 0,
                expand: false,
                y_fill: false,
                x_fill: false,
                x_align: St.Align.MIDDLE,
                y_align: St.Align.MIDDLE
            });
        }
        this._progress_label.show();
        Utils.label_transition(this._progress_label, text, 0.3);
    },

    reset: function() {
        this._progress_bar.width = 0;

        if(this._progress_label) {
            this._progress_label.hide();
        }
    },

    destroy: function() {
        this.actor.destroy();
        this._params = null;
    },

    show: function() {
        if(this.visible) return;

        this.visible = true;
        this.actor.opacity = 0;
        this.actor.show();

        Tweener.removeTweens(this.actor);
        Tweener.addTween(this.actor, {
            time: 0.3,
            transition: 'easeOutQuad',
            opacity: 255
        });
    },

    hide: function() {
        if(!this.visible) return;

        this.visible = false;

        Tweener.removeTweens(this.actor);
        Tweener.addTween(this.actor, {
            time: 0.3,
            transition: 'easeOutQuad',
            opacity: 0,
            onComplete: Lang.bind(this, function() {
                this.actor.hide();
            })
        });
    }
});
