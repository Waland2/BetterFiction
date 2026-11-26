// BetterFiction dark mode for Archive of Our Own, with the same Dark mode setting as FanFiction.net.
// Only used with AO3's Default skin: if you've picked another skin (a public one like Reversi, or your
// own), the page is left alone. Runs at document_start; the last result is kept in the page's own
// storage so Default-skin pages don't flash white first.
(() => {
    const KEY = 'betterfiction-ao3-dark';
    const H = 'html.bf-ao3-dark';
    const BG = '#333333';
    const PANEL = '#2b2b2b';
    const RAISED = '#3d3d3d';
    const TEXT = '#e6e6e6';
    const MUTED = '#bdbdbd';
    const LINK = '#9fc3ff';
    const VISITED = '#c9a8ff';
    const LINE = '#555555';

    const CSS = `
${H}, ${H} body, ${H} #outer, ${H} #inner, ${H} #main,
${H} .toggled form, ${H} .dynamic form, ${H} .secondary, ${H} th, ${H} tr:hover, ${H} col.name,
${H} fieldset fieldset, ${H} fieldset dl dl, ${H} form blockquote.userstuff, ${H} .listbox .index,
${H} dl.index dd, ${H} #modal, ${H} #modal .content {
    background-color: ${BG} !important;
    color: ${TEXT} !important;
    color-scheme: dark;
}
${H} #header { background-color: ${BG} !important; }

/* Grey panels in the default skin */
${H} table, ${H} thead td, ${H} fieldset, ${H} form dl, ${H} .listbox, ${H} fieldset fieldset.listbox,
${H} #header .menu, ${H} #small_login, ${H} .autocomplete div.dropdown ul, ${H} .own, ${H} .draft,
${H} .unread, ${H} .child, ${H} .unwrangled, ${H} .unreviewed, ${H} .splash .favorite li:nth-of-type(odd) a {
    background: ${PANEL} !important;
    color: ${TEXT} !important;
    box-shadow: none !important;
}
${H} #header .dropdown .menu a, ${H} #header .menu a { color: ${TEXT} !important; background: transparent !important; }
${H} #header .dropdown .menu a:hover, ${H} #header .dropdown .menu a:focus { background: ${RAISED} !important; }

/* Information boxes (light blue, yellow) */
${H} .notice, ${H} .comment_notice, ${H} .kudos_notice, ${H} ul.notes, ${H} .error, ${H} .comment_error,
${H} .kudos_error, ${H} .alert.flash, ${H} .flash.notice, ${H} .announcement .userstuff, ${H} .qtip-content,
${H} span.question {
    background: #263445 !important;
    color: ${TEXT} !important;
    border-color: #4a6a8a !important;
}
${H} .caution, ${H} .alert .userstuff { background: #4a3d10 !important; color: ${TEXT} !important; border-color: #8a6d1a !important; }

/* Lines and boxes */
${H} li.blurb, ${H} fieldset, ${H} form dl, ${H} dl.meta, ${H} div.comment, ${H} li.comment, ${H} .bookmark .user,
${H} .listbox, ${H} .toggled form, ${H} .dynamic form, ${H} hr, ${H} blockquote, ${H} .wrapper, ${H} #dashboard,
${H} #dashboard ul, ${H} .splash .module div.account, ${H} .annotation, ${H} th, ${H} td {
    border-color: ${LINE} !important;
}
${H} .wrapper, ${H} li.blurb, ${H} .blurb .blurb, ${H} .listbox, ${H} dl.meta { box-shadow: none !important; }
${H} dl.meta { background: ${PANEL} !important; }

/* Text */
${H} #main .heading, ${H} .userstuff h2, ${H} legend { color: ${TEXT} !important; }
${H} .datetime, ${H} .landmark, ${H} .byline, ${H} dl.stats dt, ${H} form dd.required { color: ${MUTED} !important; }

/* Links (the red menu bar and footer keep their white links) */
${H} #inner a, ${H} #inner a:link, ${H} #modal a, ${H} #header .user a, ${H} #header .heading a,
${H} #dashboard a, ${H} #dashboard span { color: ${LINK} !important; }
${H} #inner a:visited, ${H} #modal a:visited { color: ${VISITED} !important; }
${H} #inner a.tag:hover, ${H} .listbox .heading a.tag:visited:hover { background: #4a5f80 !important; color: #fff !important; }
${H} #dashboard .current, ${H} #dashboard span.current { background: ${RAISED} !important; color: ${TEXT} !important; }

/* Buttons (in the page and pop-ups; the header keeps its own look) */
${H} :is(#inner, #modal) :is(.actions a, .actions a:link, .action, .action:link, .actions button, .actions input,
    input[type="submit"], button, .actions label) {
    background: #4a4a4a !important;
    background-image: none !important;
    color: #f0f0f0 !important;
    border-color: #666666 !important;
    box-shadow: none !important;
    text-shadow: none !important;
}
${H} :is(#inner, #modal) :is(.actions a:hover, .actions input:hover, button:hover, input[type="submit"]:hover) { background: #5a5a5a !important; color: #fff !important; }
${H} #header .user .actions a:hover, ${H} #header .user .actions a:focus, ${H} #header .user .dropdown:hover > a { background: ${RAISED} !important; }
${H} :is(#inner, #modal) :is(.actions a:active, .current, a.current, .current a:visited, span.unread, .replied,
    span.claimed, .actions span.defaulted, .actions label.disabled) {
    background: #222222 !important;
    color: ${TEXT} !important;
    border-color: #777777 !important;
}

/* Form fields */
${H} input, ${H} select, ${H} textarea, ${H} #header #search input {
    background: ${PANEL} !important;
    color: ${TEXT} !important;
    border-color: #666666 !important;
    box-shadow: none !important;
}
${H} input:focus, ${H} select:focus, ${H} textarea:focus { background: #1f1f1f !important; }
${H} input[type="checkbox"], ${H} input[type="radio"] { accent-color: ${LINK}; }

/* Relationship tags have their own light background in story lists */
${H} li.relationships a { background: #3a4252 !important; }

/* Search box in the red menu bar */
${H} #header fieldset, ${H} #header form, ${H} #header .search, ${H} #header .search p {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
}
${H} #header #search .text {
    background: #2b2b2b !important;
    color: ${TEXT} !important;
    border: 1px solid #777777 !important;
}
${H} #header #search .button {
    background: #4a4a4a !important;
    background-image: none !important;
    color: #f0f0f0 !important;
    border: 1px solid #777777 !important;
    border-radius: 0.25em;
    padding: 0.15em 0.6em;
}

/* The AO3 logo is dark red; give it a light backing so it stays readable */
${H} #header .heading a img.logo { background: #f2f2f2; border-radius: 6px; padding: 2px; }

`;

    let style = null;
    const setDark = (on) => {
        const root = document.documentElement;
        if (!root) return;
        if (on && !style) {
            style = document.createElement('style');
            style.id = 'bf-ao3-dark-style';
            style.textContent = CSS;
            (document.head || root).appendChild(style);
        }
        if (style && on && !style.isConnected) (document.head || root).appendChild(style); // put it back if the page removed it
        if (style) style.disabled = !on;
        root.classList.toggle('bf-ao3-dark', on);
    };

    // A site skin is any skin stylesheet other than the default (skin 1), a skin's own user styles, or a
    // <style> in the page head that styles more than the story's own work skin (#workskin).
    const usesSiteSkin = () => {
        const skinLink = Array.from(document.querySelectorAll('head link[rel~="stylesheet"]'))
            .map((l) => l.getAttribute('href') || '')
            // a skin other than Default (skin 1), or a skin's own styles (<n>_user_screen*.css)
            .some((href) => (/\/skins\/skin_(\d+)/.test(href) && !/\/skins\/skin_1_/.test(href)) || /_user_screen/.test(href));
        if (skinLink) return true;
        return Array.from(document.querySelectorAll('head style'))
            .filter((s) => s !== style)
            .some((s) => {
                const css = s.textContent.replace(/\/\*[\s\S]*?\*\//g, '');
                return css.split('}')
                    .map((rule) => rule.split('{')[0])
                    .flatMap((prelude) => prelude.split(','))
                    .map((sel) => sel.trim())
                    .some((sel) => sel && !sel.startsWith('@') && !sel.startsWith('#workskin'));
            });
    };

    const whenReady = (fn) => {
        if (document.documentElement) return fn();
        const watcher = new MutationObserver(() => {
            if (!document.documentElement) return;
            watcher.disconnect();
            fn();
        });
        watcher.observe(document, { childList: true });
    };

    let wanted = null; // the Dark mode setting, once loaded
    let skinKnown = false;
    let siteSkin = false;
    const update = () => {
        if (wanted === null || !skinKnown) return;
        const on = wanted && !siteSkin;
        setDark(on);
        try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* storage blocked */ }
    };

    // Early guess from last time, so default-skin pages don't flash white
    let cached = null;
    try { cached = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
    if (cached === '1') whenReady(() => setDark(true));

    const checkSkin = () => {
        siteSkin = usesSiteSkin();
        skinKnown = true;
        update();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', checkSkin, { once: true });
    else checkSkin();

    // The same Dark mode switch as FanFiction.net, and only while AO3 support is on
    const wantsDark = (s) => Boolean(s.darkMode) && s.ao3Enabled !== false;
    chrome.storage.sync.get('settings')
        .then(({ settings }) => {
            wanted = wantsDark(settings || {});
            update();
        })
        .catch((error) => console.error('Failed to load the dark mode setting:', error));
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync' || !changes.settings) return;
        const s = changes.settings.newValue || {};
        wanted = wantsDark(s);
        update();
    });
})();
