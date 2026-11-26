const METATYPES = {
    fandom: [0, '600', null], rated: [1, null, 'rgb(8, 131, 131)'],
    language: [2, null, { English: 'rgb(151, 0, 0)', Spanish: 'rgb(171, 143, 0)', default: 'rgb(0, 0, 255)' }],
    genre: [3, null, 'rgb(144, 48, 0)'], chapters: [4, null, 'rgb(0, 0, 0)'], words: [5, null, 'rgb(0, 0, 0)'],
    staff: [3, null, 'rgb(0, 0, 0)'], archive: [4, null, 'rgb(0, 0, 0)'], followers: [5, null, 'rgb(0, 0, 0)'],
    topics: [4, null, 'rgb(0, 0, 0)'], posts: [5, null, 'rgb(0, 0, 0)'],
    reviews: [6, null, 'rgb(0, 0, 0)'], favs: [7, null, 'rgb(0, 0, 0)'], follows: [8, null, 'rgb(0, 0, 0)'],
    updated: [9, null, null], published: [10, null, null],
    since: [9, null, null], founder: [10, null, null], admin: [10, null, null],
    characters: [12, null, null], status: [13, '600', 'rgb(0, 99, 31)'], id: [14, null, null],
};

const GENRES = 'AdventureAngstCrimeDramaFamilyFantasyFriendshipGeneralHorrorHumorHurt/ComfortMysteryParodyPoetryRomanceSci-FiSpiritualSupernaturalSuspenseTragedyWestern';
const STATUSES = ['Automatic', 'Planned', 'Reading', 'Completed', 'Dropped'];
const STORY_PAIRS = [['st', 'mystories', 0], ['fs', 'favstories', 1]];
const SORT_METAS = [['Follows', '.followsvalue'], ['Favs', '.favsvalue']];
const META_GROUPS = [['fandom'], ['genre', 'language'], ['words', 'posts', 'followers'], ['follows', 'favs', 'reviews'], ['published'], ['status', 'characters']];
const NOT_DONE_DEFAULT = ['language', 'genre', 'characters'];
const PH = '{[@p]}';
const WS_RE = /\s+/;
const DIGITS_RE = /\d+/g;
const isGenre = g => GENRES.includes(g);
const METATYPES_KEYS_SET = new Set(Object.keys(METATYPES));
const META_INFO = {};
const APPLY_COLOR_ENTRIES = [];
for (const k in METATYPES) {
    const attrs = METATYPES[k];
    META_INFO[k] = { cls: k + 'meta', val: k + 'value', sel: '.' + k + 'meta', valSel: '.' + k + 'value', prefix: k + ': ' };
    if (attrs[1] || attrs[2]) {
        APPLY_COLOR_ENTRIES.push({
            weight: attrs[1],
            color: attrs[2],
            colorIsObj: !!attrs[2] && typeof attrs[2] === 'object',
            sel: META_INFO[k].sel,
            valSel: META_INFO[k].valSel,
        });
    }
}
const CHARACTERS_CLASS = META_INFO.characters.cls;
const wordSuffix = / - Words: \d+$/;
const SEP_HTML_DEFAULT = "<br><h4 style='user-select: text; height: 15px'> </h4><hr size=\"1\" noshade style=\"background: #e2e2e2; height: 1px;\">";

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const toNum = (v, d = 0) => {
    const s = String(v);
    return Number(s.indexOf(',') >= 0 ? s.replaceAll(',', '') : s) || d;
};
const mkEl = (tag, props) => Object.assign(document.createElement(tag), props);
const sendMsg = p => chrome.runtime.sendMessage(p).then(r => r.result).catch(() => ({}));
const icon = (d, f, s) => 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="${f}" stroke="${s}" stroke-width="2"/></svg>`);
const bookmarkIconCache = new Map();
const bookmarkIcon = c => {
    let r = bookmarkIconCache.get(c);
    if (r === undefined) {
        r = `<svg xmlns="http://www.w3.org/2000/svg" class="bf-bookmark-icon" width="24" height="24" viewBox="0 0 24 24" style="vertical-align: middle;"><path d="m6 4v16l6-2 6 2V4z" fill="${c}" stroke="#000000" stroke-width="1.5"/></svg>`;
        bookmarkIconCache.set(c, r);
    }
    return r;
};
const storyContrast = qs('[title=\'Story Contrast\']');
const repaint = () => { storyContrast?.click?.(); storyContrast?.click?.(); };
const STORY_URL_RE = /fanfiction\.net\/s\/(\d+)/;
const PROFILE_URL_RE = /^https:\/\/www\.fanfiction\.net\/u\/\d+/;
const PROFILE_ICON = 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10m-9 10c0-5 4-8 9-8s9 3 9 8z';

// Pages the mobile site keeps at a different address: [desktop, mobile]
const MOBILE_PAGES = [
    ['/account/settings.php', '/m/acct.php'],
    ['/favorites/story.php', '/m/f_story.php'],
    ['/favorites/author.php', '/m/f_author.php'],
    ['/alert/story.php', '/m/a_story.php'],
    ['/alert/author.php', '/m/a_author.php'],
    ['/pm2/inbox.php', '/m/pm2/inbox.php'],
    ['/login.php', '/m/login.php'],
];
// Any other page in these sections opens the section's main page on the mobile site
const MOBILE_SECTIONS = [
    ['/account/', '/m/acct.php'],
    ['/favorites/', '/m/f_story.php'],
    ['/alert/', '/m/a_story.php'],
    ['/pm2/', '/m/pm2/inbox.php'],
];

/**
 * The address of the same page on the mobile site (m.fanfiction.net).
 * Stories, lists and profiles keep their address; account pages live under /m/ there.
 * @param {string} address - A www.fanfiction.net address.
 * @returns {string}
 */
const mobileUrl = (address) => {
    const url = new URL(address);
    const page = MOBILE_PAGES.find(([desktop]) => desktop === url.pathname)
        || MOBILE_SECTIONS.find(([start]) => url.pathname.startsWith(start));
    if (page) return `https://m.fanfiction.net${page[1]}`;
    return `https://m.fanfiction.net${url.pathname}${url.search}${url.hash}`;
};
const UNMARKED_HTML = bookmarkIcon('none');

// ---------- dark pages: BetterFiction's dark mode, FanFiction.net's Story Contrast, Dark Reader ----------
const luminance = (rgb) => {
    const v = rgb.map((x) => { const c = x / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const contrastRatio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const MARKED_DARK = [58, 69, 96]; // a bookmarked story's background in dark mode (dark-mode.js)

/**
 * The background behind a node when it's dark, whatever made it dark: the first solid background going up
 * the page (Dark Reader and the site's Story Contrast set those), or Dark Reader's own dark marker.
 * @param {Element} node
 * @returns {?number[]} [r, g, b] when dark, otherwise null
 */
const darkBackground = (node) => {
    for (let el = node; el && el.nodeType === 1; el = el.parentElement) {
        const v = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number);
        if (v && v.length >= 3 && (v.length < 4 || v[3] > 0.5)) {
            return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255 < 0.45 ? v.slice(0, 3) : null;
        }
    }
    return document.documentElement.getAttribute('data-darkreader-scheme') === 'dark' ? [24, 26, 27] : null;
};

const _readableCache = new Map();
/**
 * A colour that reads on a dark background: the same hue, mixed with white until it has 4.5:1 contrast
 * against that background and against a bookmarked story's (inverting it instead would change its hue,
 * teal ratings turning red, and leave some too dark).
 * @param {string} color - "rgb(r, g, b)"
 * @param {number[]} bg - [r, g, b]
 * @returns {string}
 */
const readableOnDark = (color, bg) => {
    const cacheKey = color + bg;
    let out = _readableCache.get(cacheKey);
    if (out !== undefined) return out;
    const base = color.match(DIGITS_RE)?.slice(0, 3).map(Number);
    if (!base) return color;
    let mixed = base;
    for (let w = 0; w <= 1; w += 0.05) {
        mixed = base.map((x) => Math.round(x + (255 - x) * w));
        if (contrastRatio(mixed, bg) >= 4.5 && contrastRatio(mixed, MARKED_DARK) >= 4.5) break;
    }
    out = `rgb(${mixed.join(', ')})`;
    _readableCache.set(cacheKey, out);
    return out;
};

// Things that can make the page dark or light while it's open: BetterFiction's dark mode (a class on <html>),
// Dark Reader (attributes on <html>, styles in <head>) and the Story Contrast button
const darkChangeListeners = [];
let darkChangeTimer;
const onDarkChange = (fn) => {
    if (!darkChangeListeners.length) {
        const changed = () => {
            clearTimeout(darkChangeTimer);
            darkChangeTimer = setTimeout(() => darkChangeListeners.forEach((f) => f()), 150);
        };
        new MutationObserver(changed).observe(document.documentElement, {
            attributes: true, attributeFilter: ['class', 'data-darkreader-mode', 'data-darkreader-scheme'],
        });
        if (document.head) new MutationObserver(changed).observe(document.head, { childList: true });
        storyContrast?.addEventListener('click', changed);
    }
    darkChangeListeners.push(fn);
};

const betterDescription = (info, el) => {
    const desc = qs('.xgray', el);
    if (!desc) return;
    let html = desc.innerHTML;
    const ratedIdx = html.indexOf(' - Rated: ');
    if (ratedIdx >= 0) {
        const fandom = html.substring(0, ratedIdx);
        const after = html.substring(ratedIdx + 10);
        html = 'Fandom: ' + (fandom.startsWith('Crossover - ') ? fandom.slice(11) : fandom).replaceAll(' - ', PH) + ' - Rated: ' + after;
    }
    desc.innerHTML = html.split(' - ').map(item => `<span>${item}</span>`).join(' - ').replaceAll(PH, ' - ');

    let notDoneIdx = 0;
    const spans = desc.children;
    const spanCount = spans.length;
    for (let i = 0; i < spanCount; i++) {
        const span = spans[i];
        const text = span.textContent;
        const colonIdx = text.indexOf(': ');
        let meta = (colonIdx >= 0 ? text.substring(0, colonIdx) : text).toLowerCase();
        if (text === 'Complete') meta = 'status';
        if (METATYPES_KEYS_SET.has(meta)) {
            const mi = META_INFO[meta];
            span.classList.add(mi.cls);
            const start = mi.prefix;
            const inner = span.innerHTML;
            if (inner.substring(0, start.length).toLowerCase() === start) {
                span.innerHTML = `${inner.substring(0, start.length)}<span class='${mi.val}'>${inner.substring(start.length)}</span>`;
            }
        } else {
            if (NOT_DONE_DEFAULT[notDoneIdx] === 'genre' && !text.split('/').every(isGenre)) notDoneIdx++;
            const next = NOT_DONE_DEFAULT[notDoneIdx++];
            span.className = next ? META_INFO[next].cls : CHARACTERS_CLASS;
        }
    }
    el.classList.add('bf-desc-parent');

    if (info.groupDescriptions) {
        desc.classList.add('bf-grouped');
        const children = desc.children;
        const klen = children.length;
        const keyed = new Array(klen);
        const presentKeys = new Set();
        for (let i = 0; i < klen; i++) {
            const c = children[i];
            const cls = c.className;
            const k = cls.substring(0, cls.indexOf('meta'));
            keyed[i] = [c, k, METATYPES[k]?.[0] || 0];
            presentKeys.add(k);
        }
        keyed.sort((a, b) => a[2] - b[2]);
        const groupEnders = new Set();
        const mglen = META_GROUPS.length;
        for (let i = 0; i < mglen; i++) {
            const group = META_GROUPS[i];
            const glen = group.length;
            for (let j = 0; j < glen; j++) {
                const m = group[j];
                if (presentKeys.has(m)) { groupEnders.add(m); break; }
            }
        }
        const items = [];
        const lastIdx = klen - 1;
        for (let i = 0; i < klen; i++) {
            const k = keyed[i];
            items.push(k[0]);
            if (groupEnders.has(k[1])) items.push(document.createElement('br'));
            else if (i < lastIdx) items.push(' - ');
        }
        desc.replaceChildren(...items);
        const status = qs('.statusmeta', desc);
        if (status) {
            const oldStatusHtml = status.innerHTML;
            const newStatusHtml = oldStatusHtml.replace('Status: ', '');
            if (newStatusHtml !== oldStatusHtml) status.innerHTML = newStatusHtml;
        }
        const rated = qs('.ratedmeta', desc);
        if (rated) {
            rated.innerHTML = rated.innerHTML.replace('Rated: ', '');
            const ratedValue = qs('.ratedvalue', desc);
            if (ratedValue) {
                ratedValue.innerHTML = 'Rated: ' + ratedValue.innerHTML.replace('Fiction ', '');
            }
        }
    }

    if (info.styleDescriptions) {
        let resolved = null;
        const applyColors = () => {
            const bg = darkBackground(desc);
            if (!resolved) {
                resolved = [];
                const aceLen = APPLY_COLOR_ENTRIES.length;
                for (let i = 0; i < aceLen; i++) {
                    const e = APPLY_COLOR_ENTRIES[i];
                    const metaSpan = qs(e.sel, desc);
                    if (!metaSpan) continue;
                    const valueSpan = qs(e.valSel, metaSpan) || metaSpan;
                    const children = valueSpan.querySelectorAll('*');
                    const targets = children.length ? [valueSpan, ...children] : [valueSpan];
                    if (e.weight) {
                        const tlen = targets.length;
                        for (let j = 0; j < tlen; j++) targets[j].style.fontWeight = e.weight;
                    }
                    if (e.color) resolved.push([targets, e.color, e.colorIsObj]);
                }
            }
            const rlen = resolved.length;
            for (let i = 0; i < rlen; i++) {
                const [targets, color, colorIsObj] = resolved[i];
                const tlen = targets.length;
                // "important" on dark pages, so BetterFiction's dark mode and Dark Reader (which set text light) keep these colours
                const priority = bg ? 'important' : '';
                if (!colorIsObj) {
                    const c = bg ? readableOnDark(color, bg) : color;
                    for (let j = 0; j < tlen; j++) targets[j].style.setProperty('color', c, priority);
                    continue;
                }
                for (let j = 0; j < tlen; j++) {
                    const span = targets[j];
                    const c = color[span.textContent] || color;
                    if (typeof c !== 'string') continue;
                    span.style.setProperty('color', bg ? readableOnDark(c, bg) : c, priority);
                }
            }
        };
        applyColors();
        // Recolour when the page turns dark or light
        onDarkChange(applyColors);
    }
};

/**
 * Shows "Last read: N" in a story's details, right after the word count, as a link to that chapter.
 * Called again whenever the bookmark moves; an old link is replaced and no chapter removes it.
 * @param {Object} info - Extension settings.
 * @param {Element} el - The story's container (#profile_top or a .z-list item).
 * @param {string} storyId - FanFiction.net story id.
 * @param {number} [chapter] - The bookmarked chapter.
 */
const showLastRead = (info, el, storyId, chapter) => {
    const desc = qs('.xgray', el);
    if (!desc) return;
    qs('.bf-lastread', desc)?.remove();
    if (!info.lastRead || !chapter) return;
    const link = mkEl('a', {
        href: `https://www.fanfiction.net/s/${storyId}/${chapter}/`,
        textContent: `Last read: ${chapter}`,
        title: `Go to chapter ${chapter}`,
    });
    link.style.fontWeight = '600';
    const item = mkEl('span', { className: 'bf-lastread' });
    item.append(' - ', link);
    const words = qs('.wordsmeta', desc) || qs('.chaptersmeta', desc);
    if (words) words.after(item);
    else desc.append(item);
};

const getBookmarkStatus = (info, status) => {
    const automatic = info.bookmarks && info.autoStatus;
    if (!STATUSES.includes(status)) return automatic ? 'Automatic' : 'Reading';
    return status === 'Automatic' && !automatic ? 'Reading' : status;
};

const getBookmarkColor = (info, dir, id, ch, c) => {
    const entry = dir[id];
    if (info.colorBookmarks === false) return '#389e0d';
    if (!info.organizer) return '#096dd9';
    const status = getBookmarkStatus(info, entry?.status);
    if (status === 'Completed' || (status === 'Automatic' && c === ch)) return '#389e0d';
    if (status === 'Planned' || (status === 'Automatic' && c === 1)) return '#d48806';
    if (status === 'Dropped') return '#cf1322';
    return '#096dd9';
};

let _storyMeta = null;
const getStoryMeta = (info) => {
    if (_storyMeta) return _storyMeta;
    if (!info.bookmarks) {
        _storyMeta = { fandom: '', author: '', name: '', unmarked: '' };
        return _storyMeta;
    }
    const preLinks = document.querySelectorAll('#pre_story_links a');
    _storyMeta = {
        fandom: preLinks[1]?.textContent || preLinks[0]?.textContent || '',
        author: qs('#profile_top a')?.textContent || '',
        name: document.getElementsByTagName('b')[5]?.textContent || '',
        unmarked: UNMARKED_HTML,
    };
    return _storyMeta;
};

const createStory = (info, dir, id, chapters, selects, texts, follow, entire = false) => {
    if (!id) return;

    if (info.wordCounter && selects[0]) {
        const sel0Options = selects[0].options;
        const textsLen = texts.length;
        const selectsLen = selects.length;
        for (let t = 0; t < textsLen; t++) {
            const el = texts[t];
            const ch = toNum(el.id.substring(9), 0);
            if (!ch) continue;
            const opt = sel0Options[ch - 1];
            if (!opt || wordSuffix.test(opt.textContent)) continue;
            let wc = 0;
            const paras = el.querySelectorAll('p');
            const plen = paras.length;
            for (let i = 0; i < plen; i++) {
                wc += paras[i].textContent.trim().split(WS_RE).length;
            }
            const suffix = ` - Words: ${wc}`;
            for (let s = 0; s < selectsLen; s++) {
                selects[s].options[ch - 1].textContent += suffix;
            }
        }
    }

    const lastText = texts[texts.length - 1];
    const baseClass = lastText.className;
    let orgAdded = !!document.getElementById('organizer-status-selecter');

    const { fandom, author, name, unmarked } = getStoryMeta(info);

    const makeSeparator = (ch) => {
        const sep = mkEl('span', {
            className: baseClass, id: `separator${ch}`,
            innerHTML: entire ? `<br><h4 style='user-select: text'>${selects[0]?.options[ch - 1]?.textContent || ''}</h4><hr size="1" noshade style="background: #e2e2e2; height: 1px;">` : SEP_HTML_DEFAULT
        });
        if (ch <= chapters && info.bookmarks) {
            const entry = dir[id];
            let go = document.getElementById('gobutton');
            if (!go) {
                go = mkEl('button', {
                    id: 'gobutton', type: 'button', className: 'btn pull-right',
                    textContent: 'Go to bookmark',
                    style: `margin-right: 5px; display: ${entry?.chapter ? '' : 'none'}`,
                    onclick: () => {
                        const mc = document.getElementById(`storytext${dir[id].chapter}`);
                        mc ? mc.scrollIntoView({ behavior: 'smooth' }) : window.open(`https://www.fanfiction.net/s/${id}/${dir[id].chapter}`, '_self');
                    }
                });
                follow.after(go);
            }

            const btn = mkEl('button', {
                type: 'button', className: 'btn pull-right bookmark', title: 'bookmark',
                innerHTML: entry?.chapter === ch ? bookmarkIcon(getBookmarkColor(info, dir, id, chapters, ch)) : unmarked,
                id: `bookmark${ch}`, style: 'height: 30px;',
                onclick: async function() {
                    const dirEntry = dir[id];
                    const orgSelector = document.getElementById('organizer-status-selecter');
                    if (dirEntry?.chapter === ch) {
                        const result = await sendMsg({ message: 'del-bookmark', id, chapter: ch });
                        if (!result.ok || dir[id] !== dirEntry) return;
                        const saved = result.bookmark;
                        if (saved) dir[id] = saved;
                        else delete dir[id];
                        this.innerHTML = unmarked;
                        const marked = document.getElementById(`bookmark${saved?.chapter}`);
                        if (marked) marked.innerHTML = bookmarkIcon(getBookmarkColor(info, dir, id, chapters, saved.chapter));
                        go.style.display = saved?.chapter ? '' : 'none';
                        if (orgSelector) {
                            orgSelector.style.display = saved?.status ? 'inline-flex' : 'none';
                            const select = qs('select', orgSelector);
                            if (select) select.value = getBookmarkStatus(info, saved?.status);
                        }
                        showLastRead(info, qs('#profile_top'), id, saved?.chapter);
                        return;
                    }
                    const previousButton = document.getElementById(`bookmark${dirEntry?.chapter || 0}`);
                    if (previousButton) previousButton.innerHTML = unmarked;
                    const bm = { chapter: ch, chapters, id, fandom, author, storyName: name, addTime: dirEntry?.addTime || new Date().toISOString(), status: getBookmarkStatus(info, dirEntry?.status) };
                    dir[id] = bm;
                    this.innerHTML = bookmarkIcon(getBookmarkColor(info, dir, id, chapters, ch));
                    go.style.display = '';
                    if (orgSelector) orgSelector.style.display = '';
                    bm.message = 'set-bookmark';
                    sendMsg(bm);
                    showLastRead(info, qs('#profile_top'), id, ch);
                }
            });
            sep.children[1]?.after(btn);
        }
        if (!orgAdded && selects[0]) {
            if (info.organizer && id) {
                if (!dir[id]) dir[id] = { id };
                const orgEntry = dir[id];
                const current = getBookmarkStatus(info, orgEntry.status);
                const statuses = STATUSES.filter(s => s !== 'Automatic' || (info.bookmarks && info.autoStatus));
                const wrap = mkEl('span', {
                    style: 'display:' + (orgEntry.status ? 'inline-flex' : 'none') + ';align-items:center;gap:6px;margin-inline:8px;',
                    id: 'organizer-status-selecter', className: 'pull-right',
                    innerHTML: info.bookmarks ? `<span class="xcontrast_txt" style="font-size:12px;color:#4b5563;">Status:</span><select aria-label="Change reading status" style="height:30px;padding:2px 6px;font-size:12px;line-height:20px;border:1px solid #d1d5db;border-radius:6px;background:#fff;">${statuses.map(s => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`).join('')}</select>` : '',
                });
                qs('select', wrap)?.addEventListener('change', e => {
                    dir[id].status = e.target.value;
                    sendMsg({ message: 'set-status', id, status: e.target.value });
                });
                selects[0].after(wrap);
            }
            orgAdded = true;
        }
        return sep;
    };

    if (!document.getElementById(`separator${chapters + 1}`)) {
        lastText.after(makeSeparator(chapters + 1));
    }

    const tlen = texts.length;
    for (let i = 0; i < tlen; i++) {
        const el = texts[i];
        const ch = toNum(el.id.substring(9), 0);
        if (ch && !document.getElementById(`separator${ch}`)) el.before(makeSeparator(ch));
    }

    // The status menu goes just left of "Go to bookmark" (both float right, so it's placed after it)
    const statusWrap = document.getElementById('organizer-status-selecter');
    const goButton = document.getElementById('gobutton');
    if (statusWrap && goButton && goButton.nextElementSibling !== statusWrap) goButton.after(statusWrap);
};

/**
 * Ids of the stories shown on this page: the story being read, or every story in a list.
 * @returns {string[]}
 */
const pageStoryIds = () => {
    const ids = new Set();
    const current = STORY_URL_RE.exec(location.href)?.[1];
    if (current) ids.add(current);
    const lists = document.querySelectorAll('.z-list');
    for (let i = 0; i < lists.length; i++) {
        const anchor = qs('a', lists[i]);
        const storyId = anchor && STORY_URL_RE.exec(anchor.href)?.[1];
        if (storyId) ids.add(storyId);
    }
    return [...ids];
};

/**
 * Reads the settings and the bookmarks of the stories on this page straight from storage.
 * This skips waking the background script (it sleeps after ~30 s) and copying the whole
 * library into every page, which gets slow on phones and tablets with a big library.
 * @returns {Promise<[Object, Object]>} The settings and the bookmarks, by story id.
 */
const loadInfoAndDir = () => {
    const ids = pageStoryIds();
    return Promise.all([
        chrome.storage.sync.get('settings')
            .then((result) => result.settings || {})
            .catch((error) => {
                console.error('Failed to load settings:', error);
                return {};
            }),
        (ids.length ? chrome.storage.local.get(ids) : Promise.resolve({}))
            .then((saved) => {
                const dir = {};
                for (const [id, bookmark] of Object.entries(saved)) {
                    if (!bookmark || typeof bookmark !== 'object' || Array.isArray(bookmark)) continue;
                    dir[id] = { ...bookmark, id, fandom: bookmark.fandom ?? bookmark.fandomName };
                }
                return dir;
            })
            .catch((error) => {
                console.error('Failed to load bookmarks for this page:', error);
                return null;
            }),
    ]);
};

const main = async () => {
    const [info, dir] = await loadInfoAndDir();
    if (!dir) return;
    try {
        info.adblock && document.querySelectorAll('.adsbygoogle').forEach(e => e.remove());

        const baseCss = '.bf-bigcovers{height:115px}.bf-bigcovers .cimage{width:75px;height:100px}.bf-marked{background-color:#e1edff!important}.bf-desc-parent{height:auto;min-height:120px}.bf-grouped{display:flow-root;padding-left:0}.bf-grouped .idmeta{display:none}';
        document.head.appendChild(mkEl('style', {
            textContent: info.copy
                ? baseCss + 'p{user-select:text!important;-webkit-user-select:text!important;}'
                : baseCss
        }));

        const topMenu = qs('div div');
        if (topMenu && (info.bookmarks || info.favoritesLink || info.followsLink || info.profileLink)) {
            const frag = document.createDocumentFragment();
            const add = (name, ico, link, style = '', newTab = true) => {
                const anchor = mkEl('a', {
                    href: link,
                    style: 'position: relative; cursor: default; display: inline-block; margin-left: 10px;',
                });
                if (newTab) anchor.target = '_blank';
                anchor.appendChild(mkEl('img', {
                    src: ico, width: 24, height: 24, title: name, alt: name,
                    style: `vertical-align: middle; transform: scale(0.8); ${style}`,
                }));
                const span = mkEl('span');
                span.appendChild(anchor);
                return frag.appendChild(span);
            };
            if (info.bookmarks) add('Bookmarks', chrome.runtime.getURL('icons/bookmarks.svg'), chrome.runtime.getURL('tabs/bookmarks/bookmarks.html'));
            if (info.favoritesLink) add('Favorites', icon('m12 21-7-7C-6 4 10 0 12 6c2-6 18-1 7 8z', '#fff', 'none'), 'https://www.fanfiction.net/favorites/story.php');
            if (info.followsLink) add('Alerts', icon('M7 4h2l3 1 10-1 1 1v14H1V5zM3 6v11h8V7C9 6 5 6 3 7m10-1v11h8V6zm7-6q1 8-1 11s-3 4-5 5q-1-9 1-11', '#fff', 'none'), 'https://www.fanfiction.net/alert/story.php');
            if (info.profileLink) {
                // Your profile address is set on the settings page; the icon is added once it's read
                const slot = frag.appendChild(mkEl('span'));
                chrome.storage.sync.get('profileUrl')
                    .then(({ profileUrl }) => {
                        if (!PROFILE_URL_RE.test(profileUrl || '')) return;
                        const holder = add('My profile', icon(PROFILE_ICON, '#fff', 'none'), profileUrl, '', false);
                        slot.replaceWith(holder);
                    })
                    .catch((error) => {
                        console.error('Failed to load the profile address:', error);
                    });
            }
            topMenu.appendChild(frag);
        }

        // The site's "Mobile Edition" button opens this same page on the mobile site
        // instead of the mobile home page
        const mobileButton = qs('.icon-kub-mobile');
        if (info.siteSwitch && mobileButton) {
            mobileButton.title = 'Mobile Edition (this page)';
            mobileButton.style.cursor = 'pointer';
            // Caught on the way down, before it reaches the button, so the site's own
            // onclick (which goes to the mobile home page) never runs
            document.addEventListener('click', (event) => {
                if (!event.target.closest?.('.icon-kub-mobile')) return;
                event.stopPropagation();
                event.preventDefault();
                location.href = mobileUrl(location.href);
            }, true);
        }

        if (info.profileSorts) {
            STORY_PAIRS.forEach(([place, type, sortType]) => {
                const placeElem = document.getElementById(place);
                if (!placeElem) return;
                const reviewsSort = qs(
                    `[onclick="stories_init(${place}_array,'.${type}');${place}_array.sort(sortByReviews); storylist_draw('${place}_inside', ${place}_array, 1, 1, ${sortType});"]`
                ) || qs(`[onclick*="sortByReviews"]`, placeElem);
                if (!reviewsSort) return;
                const container = document.getElementById(`${place}_inside`);
                SORT_METAS.forEach(([meta, metaClass]) => {
                    const el = mkEl('span', {
                        innerHTML: meta,
                        className: 'gray',
                        onclick: () => {
                            const items = placeElem.querySelectorAll(`.${type}`);
                            const n = items.length;
                            const indexed = new Array(n);
                            for (let i = 0; i < n; i++) {
                                const it = items[i];
                                indexed[i] = [it, toNum(qs(metaClass, it)?.textContent)];
                            }
                            indexed.sort((a, b) => b[1] - a[1]);
                            const frag = document.createDocumentFragment();
                            for (let i = 0; i < n; i++) frag.appendChild(indexed[i][0]);
                            container.appendChild(frag);
                        }
                    });
                    reviewsSort.after(document.createTextNode(' . '), el);
                });
            });
        }

        let id;
        let parents = document.querySelectorAll('.z-list');
        if (!parents.length) {
            const pt = document.getElementById('profile_top');
            parents = pt ? [pt] : [];
        }
        let dirHasEntries = false;
        for (const k in dir) { dirHasEntries = true; break; }
        const markBookmarksActive = info.bookmarks && info.markBookmarks && dirHasEntries;

        const bigCovers = info.bigCovers;
        const separateFics = info.separateFics;
        const parentsLen = parents.length;
        for (let p = 0; p < parentsLen; p++) {
            const el = parents[p];
            if (bigCovers) el.classList.add('bf-bigcovers');
            betterDescription(info, el);
            id = qs('.idvalue', el)?.textContent.trim() || '';
            if (!id && separateFics) el.style.cssText = 'margin-bottom: 10px; border: 1px solid #969696; border-left: none;';

            if (markBookmarksActive) {
                const anchor = qs('a', el);
                const hrefMatch = anchor && STORY_URL_RE.exec(anchor.href);
                const storyId = hrefMatch && hrefMatch[1];
                const storyEntry = storyId ? dir[storyId] : undefined;
                if (storyEntry?.chapter) {
                    showLastRead(info, el, storyId, storyEntry.chapter);
                    const ch = toNum(qs('.chaptersvalue', el)?.textContent, 1);
                    if (storyEntry.chapters !== ch) {
                        storyEntry.chapters = ch;
                        sendMsg({ message: 'set-bookmark', id: storyId, chapters: ch, existingOnly: true });
                    }
                    el.classList.add('bf-marked');
                    qs('div', el)?.insertAdjacentHTML('beforebegin',
                        bookmarkIcon(getBookmarkColor(info, dir, storyId, ch, storyEntry.chapter)));
                }
            }
        }

        if (id) {
            const chapters = toNum(qs('.chaptersvalue')?.textContent, 1);
            const selects = document.querySelectorAll('#chap_select');
            let chapter = 1;
            if (selects[0]) {
                selects[0].parentElement.style.marginTop = '20px';
                chapter = toNum(selects[0].options[selects[0].selectedIndex].textContent.split('.')[0], 1);
            }
            const texts = qsa('#storytext');
            texts[0].id = `storytext${chapter}`;
            texts[0].parentElement.id = 'storytext';
            const follow = qs('.icon-heart');

            const dirEntry = dir[id];
            if (dirEntry && dirEntry.chapters !== chapters) {
                dirEntry.chapters = chapters;
                sendMsg({ message: 'set-bookmark', id, chapters, existingOnly: true });
            }

            createStory(info, dir, id, chapters, selects, texts, follow);
            showLastRead(info, qs('#profile_top'), id, dir[id]?.chapter);
            
            if (info.entireWork && selects[0]) {
                const btn = mkEl('button', {
                    type: 'button', className: 'btn pull-right',
                    textContent: 'Entire Work', style: 'margin-right: 5px;'
                });

                btn.onclick = async () => {
                    btn.style.display = 'none';
                    btn.disabled = true;
                    const currentText = texts.shift();
                    const currentSep = document.getElementById(`separator${chapter}`);
                    const finalSep = document.getElementById(`separator${chapters + 1}`);
                    let start = 1;

                    const loadMore = mkEl('button', {
                        type: 'button', className: 'btn pull-right',
                        textContent: 'Load more chapters',
                    });

                    const parser = new DOMParser();
                    loadMore.onclick = async () => {
                        loadMore.style.display = 'none';
                        for (let ch = start; ch <= chapters; ch++) {
                            try {
                                let chEl = currentText;
                                if (ch === chapter) {
                                    currentSep.remove();
                                } else {
                                    const response = await fetch(`https://www.fanfiction.net/s/${id}/${ch}`);
                                    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                    const parsed = parser.parseFromString(await response.text(), 'text/html');
                                    chEl = parsed.getElementById('storytext');
                                    if (!chEl) throw new Error('No story text in the page');
                                    chEl.id = `storytext${ch}`;
                                    (ch < chapter ? currentSep : finalSep).before(chEl);
                                }
                                texts.push(chEl);
                            } catch (e) {
                                console.error(`Failed to fetch chapter ${ch}`, e);
                                start = ch;
                                loadMore.style.display = '';
                                break;
                            }
                            createStory(info, dir, id, chapters, selects, texts, follow, true);
                            repaint();
                        }
                        if (texts.length === chapters) {
                            selects.forEach(el => { el.parentElement.style.display = 'none'; });
                        }
                    };
                    finalSep.append(loadMore);
                    loadMore.click();
                };

                follow.after(btn);
            }

            // "Bookmark new stories automatically": a story without a bookmark is bookmarked here.
            // "Bookmark follows your reading": a bookmark you have moves forward one chapter at a time
            // (2 -> 3, never 1 -> 40), so opening a later chapter to look ahead doesn't lose your place.
            const savedChapter = dirEntry?.chapter || 0;
            const bookmarkNew = info.autoBookmarkNew && savedChapter === 0;
            const followReading = info.autoSave && savedChapter && chapter === savedChapter + 1;
            if (info.bookmarks && (bookmarkNew || followReading)) {
                document.getElementById(`bookmark${chapter}`)?.click();
            }

            repaint();
        }
    } catch (e) {
        console.log("content-script.js did not run correctly, ", e);
    }
};

const showUpdateNotice = async () => {
    if (!document.body) return;
    const { version } = await sendMsg({ message: 'get-update-notice' });
    if (!version) return;
    const host = mkEl('div');
    host.style.cssText = 'position: fixed; bottom: 16px; right: 16px; width: min(360px, calc(100vw - 32px)); z-index: 2147483647;';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = mkEl('style', { textContent: `
        section { box-sizing: border-box; padding: 20px; border: 1px solid #888;
            border-radius: 12px; background: Canvas; color: CanvasText;
            box-shadow: 0 4px 24px #0003; font: 14px/1.5 Arial, sans-serif; }
        h2 { margin: 0 0 8px; font-size: 18px; }
        p { margin: 0 0 16px; }
        div { display: flex; flex-wrap: wrap; gap: 8px; }
        a, button { box-sizing: border-box; padding: 7px 12px; border: 1px solid #888;
            border-radius: 6px; background: Canvas; color: CanvasText;
            font: inherit; text-decoration: none; cursor: pointer; }
        a:hover, button:hover { text-decoration: underline; }
        a:focus-visible, button:focus-visible { outline: 2px solid Highlight; outline-offset: 2px; }
    ` });
    const panel = mkEl('section');
    panel.setAttribute('role', 'status');
    const title = mkEl('h2', { textContent: `BetterFiction ${version}` });
    const message = mkEl('p', {
        textContent: version === '1.4.0'
            ? 'BetterFiction has been updated! Discover new features and dark mode.'
            : 'BetterFiction has been updated.'
    });
    const actions = mkEl('div');
    const settings = mkEl('a', {
        textContent: 'Open settings', href: chrome.runtime.getURL('tabs/options/options.html'),
        target: '_blank', rel: 'noopener', onclick: () => host.remove()
    });
    const close = mkEl('button', {
        type: 'button', textContent: 'Close', onclick: () => host.remove()
    });
    actions.append(settings, close);
    panel.append(title, message, actions);
    shadow.append(style, panel);
    document.body.append(host);
};

showUpdateNotice().catch(error => console.error('Failed to show update notice:', error));
main();
