const Gio = imports.gi.Gio;

const DBusIface =
    <interface name="org.freedesktop.DBus">
        <method name="GetNameOwner">
            <arg type="s" direction="in" />
            <arg type="s" direction="out" />
        </method>

        <method name="ListNames">
            <arg type="as" direction="out" />
        </method>

        <signal name="NameOwnerChanged">
            <arg type="s" direction="out" />
            <arg type="s" direction="out" />
            <arg type="s" direction="out" />
        </signal>
    </interface>;
const DBusProxy = Gio.DBusProxy.makeProxyWrapper(DBusIface);

const EverpadProviderDBusIface =
    <interface name="com.everpad.Provider">
        <method name="list_tags">
            <arg type="a" direction="out" />
        </method>

        <method name="list_notebooks">
            <arg type="a" direction="out" />
        </method>

        <method name="find_notes">
            <arg type="s" direction="in" />
            <arg type="ai" direction="in" />
            <arg type="ai" direction="in" />
            <arg type="i" direction="in" />
            <arg type="i" direction="in" />
            <arg type="i" direction="in" />
            <arg type="i" direction="in" />
            <arg type="a(issxxiassbiaixs)" direction="out" />
        </method>

        <method name="update_note">
            <arg type="(issxxiassbiaixs)" direction="in" />
            <arg type="(issxxiassbiaixs)" direction="out" />
        </method>

        <method name="share_note">
            <arg type="i" direction="in" />
        </method>

        <method name="stop_sharing_note">
            <arg type="i" direction="in" />
        </method>

        <method name="delete_note">
            <arg type="i" direction="in" />
            <arg type="b" direction="out" />
        </method>

        <method name="get_note_resources">
            <arg type="i" direction="in" />
            <arg type="a(issss)" direction="out" />
        </method>

        <method name="get_status">
            <arg type="i" direction="out" />
        </method>

        <method name="get_last_sync">
            <arg type="s" direction="out" />
        </method>

        <method name="is_first_synced">
            <arg type="b" direction="out" />
        </method>

        <method name="is_authenticated">
            <arg type="b" direction="out" />
        </method>

        <method name="sync" />

        <method name="kill" />
    </interface>;
const EverpadProviderProxy = Gio.DBusProxy.makeProxyWrapper(
    EverpadProviderDBusIface
);

const EverpadProviderSignalsDBusIface =
    <interface name="com.everpad.provider">
        <signal name="sync_state_changed">
            <arg type="i" direction="out" />
        </signal>

        <signal name="data_changed" />
    </interface>;
const EverpadProviderSignalsProxy = Gio.DBusProxy.makeProxyWrapper(
    EverpadProviderSignalsDBusIface
);

const EverpadAppDBusIface =
    <interface name="com.everpad.App">
        <method name="all_notes" />
        <method name="kill" />
        <method name="settings" />
        <method name="create" />

        <method name="open">
            <arg type="i" direction="in" />
        </method>

        <method name="open_with_search_term">
            <arg type="i" direction="in" />
            <arg type="s" direction="in" />
        </method>
    </interface>;
const EverpadAppProxy = Gio.DBusProxy.makeProxyWrapper(
    EverpadAppDBusIface
);

function dbus_control() {
    let r = new DBusProxy(
            Gio.DBus.session,
            'org.freedesktop.DBus',
            '/org/freedesktop/DBus'
        );
    return r;
}

function everpad_provider_control() {
    let r = new EverpadProviderProxy(
            Gio.DBus.session,
            'com.everpad.Provider',
            '/EverpadProvider'
        );
    return r;
}

function everpad_provider_signals() {
    let r = new EverpadProviderSignalsProxy(
            Gio.DBus.session,
            'com.everpad.Provider',
            '/EverpadProvider'
        );
    return r;
}

function everpad_app_control() {
    let r = new EverpadAppProxy(
            Gio.DBus.session,
            'com.everpad.App',
            '/EverpadService'
        );
    return r;
}

function get_dbus_control() {
    if(DBUS_CONTROL === null) {
        DBUS_CONTROL = dbus_control();
    }

    return DBUS_CONTROL;
}

function get_everpad_provider() {
    if(EVERPAD_PROVIDER === null) {
        EVERPAD_PROVIDER = everpad_provider_control();
    }

    return EVERPAD_PROVIDER;
}

function get_everpad_provider_signals() {
    if(EVERPAD_PROVIDER_SIGNALS === null) {
        EVERPAD_PROVIDER_SIGNALS = everpad_provider_signals();
    }

    return EVERPAD_PROVIDER_SIGNALS;
}

function get_everpad_app() {
    if(EVERPAD_APP === null) {
        EVERPAD_APP = everpad_app_control();
    }

    return EVERPAD_APP;
}

function destroy_dbus_proxies() {
    if(DBUS_CONTROL != null) {
        DBUS_CONTROL.run_dispose();
        DBUS_CONTROL = null;
    }
    if(EVERPAD_APP != null) {
        EVERPAD_APP.run_dispose();
        EVERPAD_APP = null;
    }
    if(EVERPAD_PROVIDER != null) {
        EVERPAD_PROVIDER.run_dispose();
        EVERPAD_PROVIDER = null;
    }
    if(EVERPAD_PROVIDER_SIGNALS != null) {
        EVERPAD_PROVIDER_SIGNALS.run_dispose();
        EVERPAD_PROVIDER_SIGNALS = null;
    }
}

let EVERPAD_PROVIDER = null;
let EVERPAD_APP = null;
let EVERPAD_PROVIDER_SIGNALS = null;
let DBUS_CONTROL = null;//dbus_control();
