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
        r = icon('m6 4v16l6-2 6 2V4z', c, '#333298');
        bookmarkIconCache.set(c, r);
    }
    return r;
};
const storyContrast = qs('[title=\'Story Contrast\']');
const repaint = () => { storyContrast?.click?.(); storyContrast?.click?.(); };
const STORY_URL_RE = /fanfiction\.net\/s\/(\d+)/;
const UNMARKED_ICON = bookmarkIcon('none');
const UNMARKED_HTML = `<img src="${UNMARKED_ICON}" width="24" height="24">`;

const _invertCache = new Map();
const invertColor = (c) => {
    let r = _invertCache.get(c);
    if (r === undefined) {
        const m = c.match(DIGITS_RE);
        r = m ? `rgb(${255 - +m[0]}, ${255 - +m[1]}, ${255 - +m[2]})` : c;
        _invertCache.set(c, r);
    }
    return r;
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
            const dark = storyContrast?.parentElement?.style.backgroundColor === 'rgb(51, 51, 51)';
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
                if (!colorIsObj) {
                    const c = dark ? invertColor(color) : color;
                    for (let j = 0; j < tlen; j++) targets[j].style.color = c;
                    continue;
                }
                for (let j = 0; j < tlen; j++) {
                    const span = targets[j];
                    const c = color[span.textContent] || color;
                    if (typeof c !== 'string') continue;
                    span.style.color = dark ? invertColor(c) : c;
                }
            }
        };
        applyColors();
        if (storyContrast) storyContrast.onclick = applyColors;
    }
};

const getBookmarkColor = (info, dir, id, ch, c) => {
    const entry = dir[id];
    if (!info.organizer) return '#096dd9';
    const status = entry?.status;
    if (status === 'Completed' || (status === 'Automatic' && c === ch)) return '#237804';
    if (status === 'Planned' || (status === 'Automatic' && c === 1)) return '#d48806';
    if (status === 'Dropped') return '#a8071a';
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
    let orgAdded = false;

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
                innerHTML: entry?.chapter === ch ? `<img src="${bookmarkIcon(getBookmarkColor(info, dir, id, chapters, ch))}" width="24" height="24">` : unmarked,
                id: `bookmark${ch}`, style: 'height: 30px;',
                onclick: function() {
                    const dirEntry = dir[id];
                    const orgSelector = document.getElementById('organizer-status-selecter');
                    if (dirEntry?.chapter === ch) {
                        this.innerHTML = info.bookmarks ? UNMARKED_HTML : '';
                        go.style.display = 'none';
                        if (orgSelector) orgSelector.style.display = 'none';
                        delete dir[id];
                        sendMsg({ message: 'del-bookmark', id });
                        return;
                    }
                    document.getElementById(`bookmark${dirEntry?.chapter || 0}`)?.click();
                    const bm = { chapter: ch, chapters, id, fandom, author, storyName: name, addTime: new Date().toISOString(), status: dirEntry?.status || 'Automatic' };
                    dir[id] = bm;
                    this.innerHTML = `<img src="${bookmarkIcon(getBookmarkColor(info, dir, id, chapters, ch))}" width="24" height="24">`;
                    go.style.display = '';
                    if (orgSelector) orgSelector.style.display = '';
                    bm.message = 'set-bookmark';
                    sendMsg(bm);
                }
            });
            sep.children[1]?.after(btn);
        }
        if (!orgAdded && selects[0]) {
            if (info.organizer && id) {
                if (!dir[id]) dir[id] = { id };
                const orgEntry = dir[id];
                const current = STATUSES.includes(orgEntry.status) ? orgEntry.status : 'Automatic';
                const wrap = mkEl('span', {
                    style: 'display:' + (orgEntry.status ? 'inline-flex' : 'none') + ';align-items:center;gap:6px;margin-inline:8px;',
                    id: 'organizer-status-selecter', className: 'pull-right',
                    innerHTML: info.bookmarks ? `<span class="xcontrast_txt" style="font-size:12px;color:#4b5563;">Status:</span><select aria-label="Change reading status" style="height:30px;padding:2px 6px;font-size:12px;line-height:20px;border:1px solid #d1d5db;border-radius:6px;background:#fff;">${STATUSES.map(s => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`).join('')}</select>` : '',
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
};

const main = async () => {
    const [info, dir] = await Promise.all([sendMsg({ message: 'get-info' }), sendMsg({ message: 'get-dir' })]);
    try {
        info.adblock && document.querySelectorAll('.adsbygoogle').forEach(e => e.remove());

        const baseCss = '.bf-bigcovers{height:115px}.bf-bigcovers .cimage{width:75px;height:100px}.bf-marked{background-color:#e1edff}.bf-desc-parent{height:auto;min-height:120px}.bf-grouped{display:flow-root;padding-left:0}.bf-grouped .idmeta{display:none}';
        document.head.appendChild(mkEl('style', {
            textContent: info.copy
                ? baseCss + 'p{user-select:text!important;-webkit-user-select:text!important;}'
                : baseCss
        }));

        if (info.bookmarks || info.shortcuts) {
            const topMenu = qs('div div');
            if (topMenu) {
                const frag = document.createDocumentFragment();
                const add = (name, ico, link, style = '') => frag.appendChild(mkEl('span', {
                    innerHTML: `<a href='${link}' target="_blank" style='position: relative; cursor: default; display: inline-block; margin-left: 10px;'><img src="${ico}" style="vertical-align: middle; ${style}" width="24" height="24" title="${name}" alt="${name}"></a>`
                }));
                if (info.bookmarks) add('Bookmarks', bookmarkIcon('#fff'), chrome.runtime.getURL('tabs/bookmarks/bookmarks.html'), 'filter: drop-shadow(2px -1px 0px rgba(255,255,255,1));');
                if (info.shortcuts) {
                    add('Favorites', icon('m12 21-7-7C-6 4 10 0 12 6c2-6 18-1 7 8z', '#fff', '#333298'), 'https://www.fanfiction.net/favorites/story.php');
                    add('Alerts', icon('M7 4h2l3 1 10-1 1 1v14H1V5zM3 6v11h8V7C9 6 5 6 3 7m10-1v11h8V6zm7-6q1 8-1 11s-3 4-5 5q-1-9 1-11', '#fff', 'none'), 'https://www.fanfiction.net/alert/story.php');
                }
                topMenu.appendChild(frag);
            }
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
                    const ch = toNum(qs('.chaptersvalue', el)?.textContent, 1);
                    if (storyEntry.chapters !== ch) {
                        storyEntry.chapters = ch;
                        storyEntry.message = 'set-bookmark';
                        sendMsg(storyEntry);
                    }
                    el.classList.add('bf-marked');
                    qs('div', el)?.before(mkEl('img', {
                        src: bookmarkIcon(getBookmarkColor(info, dir, storyId, ch, storyEntry.chapter)),
                        width: 24, height: 24
                    }));
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
                dirEntry.message = 'set-bookmark';
                sendMsg(dirEntry);
            }

            createStory(info, dir, id, chapters, selects, texts, follow);
            
            if (info.entireWork && selects[0]) {
                const btn = mkEl('button', {
                    type: 'button', className: 'btn pull-right',
                    textContent: 'Entire Work', style: 'margin-right: 5px;'
                });

                btn.onclick = async () => {
                    btn.style.display = 'none';
                    btn.disabled = true;
                    selects.forEach(el => { el.parentElement.style.display = 'none'; });
                    document.getElementById(`separator${texts[0].id.substring(9)}`).remove();
                    texts.shift().remove();
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
                                const response = await fetch(`https://www.fanfiction.net/s/${id}/${ch}`);
                                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                const parsed = parser.parseFromString(await response.text(), 'text/html');
                                const chEl = parsed.getElementById('storytext');
                                if (!chEl) break;
                                chEl.id = `storytext${ch}`;
                                finalSep.before(chEl);
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
                    };
                    finalSep.children[2]?.after(loadMore);
                    loadMore.click();
                };

                follow.after(btn);
            }

            if (info.bookmarks && info.autoSave && (dirEntry?.chapter || 0) < chapter) {
                document.getElementById(`bookmark${chapter}`)?.click();
            }

            repaint();
        }
    } catch (e) {
        console.log("content-script.js did not run correctly, ", e);
    }
};

main();