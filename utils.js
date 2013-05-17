/*
 * Part of this file comes from gnome-shell-extensions:
 * http://git.gnome.org/browse/gnome-shell-extensions/
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;

const Me = ExtensionUtils.getCurrentExtension();
const StatusBar = Me.imports.status_bar;

let STATUS_BAR = null;

function get_status_bar() {
    if(!STATUS_BAR) {
        STATUS_BAR = new StatusBar.StatusBar()
    }

    return STATUS_BAR;
}

function destroy_status_bar() {
    if(STATUS_BAR) {
        STATUS_BAR.destroy();
        STATUS_BAR = null;
    }
}

function label_transition(label_actor, new_text, animation_time) {
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
}

function hash_code(string){
    let result = string.split("").reduce(
        function(a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a&a
        },
        0
    );

    return result;
}

function array_object_index_of(my_array, search_term, property) {
    for(let i = 0; i < my_array.length; i++) {
        if(my_array[i][property] === search_term) return i;
    }

    return -1;
}

function is_blank(str) {
    return (!str || /^\s*$/.test(str));
}

function starts_with(str1, str2) {
    return str1.slice(0, str2.length) == str2;
}

function ends_with(str1, str2) {
  return str1.slice(-str2.length) == str2;
}

function escape_html(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function html2text(html) {
    let result = html.replace(/<.*?>/gm, '');
    return result;
}

function wordwrap(str, width, brk, cut) {
    brk = brk || '\n';
    width = width || 75;
    cut = cut || false;

    if (!str) { return str; }

    let regex =
        '.{1,' + width + '}(\\s|$)' + (cut ? '|.{' + width +
        '}|.+$' : '|\\S+?(\\s|$)');

    return str.match( RegExp(regex, 'g') ).join( brk );
}

/**
 * getSettings:
 * @schema: (optional): the GSettings schema id
 *
 * Builds and return a GSettings schema for @schema, using schema files
 * in extensionsdir/schemas. If @schema is not provided, it is taken from
 * metadata['settings-schema'].
 */
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;

    if(schemaDir.query_exists(null)) {
        schemaSource = GioSSS.new_from_directory(
            schemaDir.get_path(),
            GioSSS.get_default(),
            false
        );
    }
    else {
        schemaSource = GioSSS.get_default();
    }

    let schemaObj = schemaSource.lookup(schema, true);

    if(!schemaObj)
        throw new Error(
            'Schema '+schema+' could not be found for extension '
            +extension.metadata.uuid+'. Please check your installation.'
        );

    return new Gio.Settings({ settings_schema: schemaObj });
}

function get_unichar(keyval) {
    let ch = Clutter.keysym_to_unicode(keyval);

    if(ch) {
        return String.fromCharCode(ch);
    }
    else {
        return false;
    }
}
