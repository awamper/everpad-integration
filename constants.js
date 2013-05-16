const TIMEOUT_IDS = {
    search: 0
};

const SEARCH_DELAY = 700;
const MAX_PINNED_NOTES = 30;
const MAX_LATEST_NOTES = 20;
const MAX_SEARCH_RESULTS = 20;

const STATUS_NONE = 0
const STATUS_SYNC = 1

const SYNC_STATES = {
    START: 0,
    NOTEBOOKS_LOCAL: 1,
    TAGS_LOCAL: 2,
    NOTES_LOCAL: 3,
    NOTEBOOKS_REMOTE: 4,
    TAGS_REMOTE: 5,
    NOTES_REMOTE: 6,
    SHARE: 7,
    STOP_SHARE: 8,
    FINISH: 9
};

const SYNC_STATES_TEXT = {
    0: "Starting synchronization...",
    1: "Sending notebooks to server...",
    2: "Sending tags to server...",
    3: "Sending notes to server...",
    4: "Receiving notebooks from server...",
    5: "Receiving tags from server...",
    6: "Receiving notes from server...",
    7: "Sharing notes...",
    8: "Stop sharing notes...",
    9: "Finishing..."
};

const ICON_NAMES = {
    create_note: 'text-editor-symbolic',
    all_notes: 'emblem-documents-symbolic',
    settings: 'preferences-other-symbolic',
    exit: 'system-shutdown-symbolic',
    notebook: 'folder-documents-symbolic'
};

const SPINNER_ICON = global.datadir + '/theme/process-working.svg';
const SPINNER_ICON_SIZE = 24;
