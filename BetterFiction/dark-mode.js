// BetterFiction dark mode for www.fanfiction.net: a dark grey (#333333) background on every page.
// Runs at document_start so the page doesn't flash white first. The last choice is also kept in the
// site's own localStorage, so it can be applied before the extension settings have been read.
(() => {
    const STORAGE_KEY = 'betterfiction-dark';
    const DARK = 'html.bf-dark';
    const CSS = `
${DARK}, ${DARK} body {
    background: #333333 !important;
    color: #e6e6e6 !important;
    color-scheme: dark;
}
${DARK} body * {
    background-color: transparent !important;
    color: #e6e6e6 !important;
    border-color: #555555 !important;
    box-shadow: none !important;
    text-shadow: none !important;
}
${DARK} body a, ${DARK} body a * { color: #9fc3ff !important; }
${DARK} body a:visited, ${DARK} body a:visited * { color: #c9a8ff !important; }
${DARK} body hr { border-color: #555555 !important; background-color: #555555 !important; }

/* Secondary text */
${DARK} body .xgray, ${DARK} body .gray,
${DARK} body .xgray *:not(a):not([style*="color"]), ${DARK} body .gray *:not(a):not([style*="color"]) {
    color: #bdbdbd !important;
}

/* Alternating rows, and stories you've bookmarked */
${DARK} body .alto { background-color: #3b3b3b !important; }
${DARK} body .z-list:nth-child(even) { background-color: #383838 !important; }
${DARK} body .bf-marked, ${DARK} body .z-list.bf-marked:nth-child(even) { background-color: #3a4560 !important; }

/* Header bars that use a background picture */
${DARK} body #top, ${DARK} body .zmenu, ${DARK} body #zmenu { background-image: none !important; }
${DARK} body #top { background-color: #262626 !important; }

/* Text that sits on a dividing line needs a solid background to hide the line behind it */
${DARK} body #pre_story_links, ${DARK} body #pre_story_links span, ${DARK} body #pre_story_links .lc-left,
${DARK} body .lc-left, ${DARK} body .lc {
    background-color: #333333 !important;
}

/* Things that float over the page need a solid background */
${DARK} body .modal, ${DARK} body .modal-content, ${DARK} body .modal-body, ${DARK} body .modal-header,
${DARK} body .modal-footer, ${DARK} body .dropdown-menu, ${DARK} body .popover, ${DARK} body .tooltip-inner,
${DARK} body [class*="popup"] {
    background-color: #3d3d3d !important;
}

/* Form controls and buttons (the site's buttons use a white gradient picture) */
${DARK} body input, ${DARK} body select, ${DARK} body textarea, ${DARK} body button, ${DARK} body .btn,
${DARK} body input:hover, ${DARK} body button:hover, ${DARK} body .btn:hover, ${DARK} body .btn:active,
${DARK} body .btn.active {
    background-image: none !important;
    background-color: #444444 !important;
    color: #f0f0f0 !important;
    border: 1px solid #666666 !important;
}
${DARK} body input[type="checkbox"], ${DARK} body input[type="radio"] { accent-color: #9fc3ff; }

/* Small arrows (like the one next to Browse) are drawn with borders: keep only the pointing side */
${DARK} body .caret {
    border-top-color: #e6e6e6 !important;
    border-left-color: transparent !important;
    border-right-color: transparent !important;
    border-bottom-color: transparent !important;
}
${DARK} body .dropup .caret {
    border-top-color: transparent !important;
    border-bottom-color: #e6e6e6 !important;
}

/* The empty bookmark icon is drawn in dark blue: lighten it */
${DARK} body button.bookmark img { filter: brightness(2.2); }
`;

    let style = null;

    /**
     * Turns the dark theme on or off.
     * @param {boolean} on
     */
    const apply = (on) => {
        const root = document.documentElement;
        if (on && !style) {
            style = document.createElement('style');
            style.id = 'bf-dark-style';
            style.textContent = CSS;
        }
        if (style && on && !style.isConnected) (document.head || root).appendChild(style);
        if (style) style.disabled = !on;
        root.classList.toggle('bf-dark', on);
        try {
            localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
        } catch (error) {
            // storage blocked: the setting is still read from the extension below
        }
    };

    /**
     * Runs fn once the page's root element exists (it can be missing for a moment at document_start).
     * @param {Function} fn
     */
    const whenReady = (fn) => {
        if (document.documentElement) {
            fn();
            return;
        }
        const watcher = new MutationObserver(() => {
            if (!document.documentElement) return;
            watcher.disconnect();
            fn();
        });
        watcher.observe(document, { childList: true });
    };

    let cached = null;
    try {
        cached = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        // storage blocked
    }
    if (cached === '1') whenReady(() => apply(true));

    const fromSettings = (settings) => whenReady(() => apply(Boolean(settings?.darkMode)));
    chrome.storage.sync.get('settings')
        .then(({ settings }) => fromSettings(settings))
        .catch((error) => {
            console.error('Failed to load the dark mode setting:', error);
        });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.settings) fromSettings(changes.settings.newValue);
    });
})();
