const St = imports.gi.St;
const Lang = imports.lang;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;

const EverpadProgressBar = new Lang.Class({
    Name: "EverpadProgressBar",

    _init: function(params) {
        this._params = Params.parse(params, {
            box_style_class: 'everpad-progress-bar-box',
            progress_style_class: 'everpad-progress-bar',
            animation_time: 0.7,
            steps: 10,
            expand: false,
            x_fill: true,
            y_fill: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });

        this.actor = new St.BoxLayout({
            style_class: this._params.box_style_class,
        });

        this.visible = true;
        this._progress_bar = new St.BoxLayout({
            style_class: this._params.progress_style_class
        });

        this.actor.add(this._progress_bar, {
            expand: this._params.expand,
            x_fill: this._params.x_fill,
            y_fill: this._params.y_fill,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
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

    reset: function() {
        this._progress_bar.width = 0;
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
