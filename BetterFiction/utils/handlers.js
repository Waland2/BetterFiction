/**
 * Shared utilities for BetterFiction extension pages (popup, options, bookmarks).
 * Loaded via <script> in each page; exports globals on `window`.
 */

let _settingsPromise = null;
const _getSettings = () => {
    if (!_settingsPromise) {
        _settingsPromise = chrome.storage.sync.get('settings')
            .then(result => result.settings || {})
            .catch((error) => {
                console.error('Failed to load settings:', error);
                return {};
            });
    }
    return _settingsPromise;
};

window.getSettings = _getSettings;

const _bindSettingControls = (selector, prop, eventName, label) => {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;
    _getSettings().then((settings) => {
        elements.forEach(el => {
            if (settings[el.id] !== undefined) el[prop] = settings[el.id];
            el.addEventListener(eventName, () => {
                settings[el.id] = el[prop];
                chrome.storage.sync.set({ settings })
                    .catch((error) => {
                        console.error(`Failed to save ${label} state for ${el.id}:`, error);
                    });
            });
        });
    });
};

window.setupCheckboxes = () => _bindSettingControls('[type="checkbox"]', 'checked', 'click', 'checkbox');
window.setupSelects = () => _bindSettingControls('select', 'value', 'change', 'select');

/* Shared date formatting (used by bookmarks and options pages) */
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATE_TOKEN_RE = /Month|Mon|MM|YYYY|YY|DD|D/g;
const TOKEN_CATEGORY = {
    Month: 'month', Mon: 'month', MM: 'month',
    DD: 'day', D: 'day',
    YYYY: 'year', YY: 'year',
};
const ALNUM_RE = /[a-zA-Z0-9]/;

window.DEFAULT_DATE_FORMAT = "MM/DD/YY";

window.validateDateFormat = (fmt) => {
    if (!fmt) return 'Format cannot be empty.';
    const matches = [...fmt.matchAll(DATE_TOKEN_RE)];
    if (matches.length === 0) {
        return 'No date tokens found. Use Month, Mon, or MM; DD or D; YYYY or YY.';
    }
    const counts = { month: 0, day: 0, year: 0 };
    for (const m of matches) counts[TOKEN_CATEGORY[m[0]]]++;
    if (counts.month === 0) return 'Format must include a month token: Month, Mon, or MM.';
    if (counts.month > 1) return 'Use exactly one month token (Month, Mon, or MM).';
    if (counts.day === 0) return 'Format must include a day token: DD or D.';
    if (counts.day > 1) return 'Use exactly one day token (DD or D).';
    if (counts.year === 0) return 'Format must include a year token: YYYY or YY.';
    if (counts.year > 1) return 'Use exactly one year token (YYYY or YY).';
    if (matches[0].index !== 0) {
        return 'Format cannot start with text — it must begin with a token.';
    }
    const last = matches[matches.length - 1];
    if (last.index + last[0].length !== fmt.length) {
        return 'Format cannot end with text — it must end with a token.';
    }
    for (let i = 1; i < matches.length; i++) {
        const prevEnd = matches[i - 1].index + matches[i - 1][0].length;
        const sep = fmt.slice(prevEnd, matches[i].index);
        if (sep && ALNUM_RE.test(sep)) {
            return 'Separators must be empty or contain no letters or digits.';
        }
    }
    return null;
};

window.formatDate = (date, fmt) => {
    const day = date.getDate();
    const monthIdx = date.getMonth();
    const yearFull = date.getFullYear();
    const tokens = {
        Month: MONTH_NAMES_FULL[monthIdx],
        Mon: MONTH_NAMES[monthIdx],
        MM: String(monthIdx + 1).padStart(2, '0'),
        YYYY: String(yearFull),
        YY: String(yearFull).slice(-2),
        DD: String(day).padStart(2, '0'),
        D: String(day),
    };
    return fmt.replace(DATE_TOKEN_RE, m => tokens[m]);
};
