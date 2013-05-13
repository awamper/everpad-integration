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
