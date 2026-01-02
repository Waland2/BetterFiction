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
const META_GROUPS = [['fandom'], ['genre', 'language'], ['words', 'posts', 'followers'], ['follows', 'favs', 'reviews'], ['published'], ['status', 'characters']];
const METATYPES_KEYS = Object.keys(METATYPES);
const METATYPES_ENTRIES = Object.entries(METATYPES);
const wordSuffix = / - Words: \d+$/;

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const toNum = (v, d = 0) => Number(String(v).replaceAll(',', '')) || d;
const mkEl = (tag, props) => Object.assign(document.createElement(tag), props);
const sendMsg = p => chrome.runtime.sendMessage(p).then(r => r.result).catch(() => ({}));
const icon = (d, f, s) => 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="${f}" stroke="${s}" stroke-width="2"/></svg>`);
const bookmarkIcon = c => icon('m6 4v16l6-2 6 2V4z', c, '#333298');
const storyContrast = qs('[title=\'Story Contrast\']');
const repaint = () => { storyContrast?.click?.(); storyContrast?.click?.(); };

const betterDescription = (info, el) => {
    const desc = qs('.xgray', el);
    if (!desc) return;
    const ph = '{[@p]}';
    const [fandom, ...rest] = desc.innerHTML.split(' - Rated: ');
    if (rest.length) {
        desc.innerHTML = (fandom.startsWith('Crossover - ') ? fandom.slice(11) : fandom).replaceAll(' - ', ph).replace(/^/, 'Fandom: ') + ' - Rated: ' + rest.join(' - Rated: ');
    }
    desc.innerHTML = desc.innerHTML.split(' - ').map(item => `<span>${item}</span>`).join(' - ').replaceAll(ph, ' - ');
    let notDone = ['language', 'genre', 'characters'];
    qsa('span', desc).forEach(span => {
        let meta = span.innerText.toLowerCase().split(': ')[0];
        if (span.innerText === 'Complete') meta = 'status';
        if (METATYPES_KEYS.includes(meta)) {
            span.classList.add(meta + 'meta');
            const start = meta + ': ';
            if (span.innerHTML.toLowerCase().startsWith(start)) {
                span.innerHTML = `${span.innerHTML.substring(0, start.length)}<span class='${meta}value'>${span.innerHTML.substring(start.length)}</span>`;
            }
        } else {
            if (notDone[0] === 'genre' && !span.innerText.split('/').every(g => GENRES.includes(g))) notDone.shift();
            span.className = (notDone.shift() || 'characters') + 'meta';
        }
    });
    el.style.height = 'auto';
    el.style.minHeight = '120px';

    if (info.groupDescriptions) {
        desc.style.display = 'flow-root';
        desc.style.paddingLeft = '0';
        const getMetaKey = el => el.className.substring(0, el.className.indexOf('meta'));
        desc.innerHTML = Array.from(desc.children)
            .sort((a, b) => (METATYPES[getMetaKey(a)]?.[0] || 0) - (METATYPES[getMetaKey(b)]?.[0] || 0))
            .map(s => s.outerHTML)
            .join(' - ');
        META_GROUPS.forEach(item => {
            const meta = item.find(m => qs(`:scope > .${m}meta`, desc));
            if (meta) {
                const metaEl = qs(`:scope > .${meta}meta`, desc);
                metaEl?.after(document.createElement('br'));
            }
        });
        desc.innerHTML = desc.innerHTML.replace(/<br> - /g, '<br>');
        qs('.idmeta', desc)?.style.setProperty('display', 'none');
        const status = qs('.statusmeta', desc);
        if (status) {
            status.innerHTML = status.innerHTML.replace('Status: ', '');
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
        const applyColors = () => {
            const dark = storyContrast?.parentElement?.style.backgroundColor === 'rgb(51, 51, 51)';
            METATYPES_ENTRIES.forEach(([meta, [, weight, color]]) => {
                const metaSpan = qs(`.${meta}meta`, desc);
                const valueSpan = metaSpan ? qs(`.${meta}value`, metaSpan) || metaSpan : metaSpan;
                const spans = valueSpan ? [valueSpan, ...qsa('*', valueSpan)] : [];
                spans.forEach(span => {
                    if (weight) span.style.fontWeight = weight;
                    let c = color?.[span.innerText] || color;
                    if (c && dark) {
                        const [r, g, b] = (c.match(/\d+/g) || []).map(Number);
                        c = `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
                    }
                    if (c) span.style.color = c;
                });
            });
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

const createStory = (info, dir, id, chapters, selects, texts, follow, entire = false) => {
    if (!id) return;
    info.copy && qsa('p').forEach(e => { e.style.userSelect = 'text'; e.style.webkitUserSelect = 'text'; });
    
    if (info.wordCounter && selects[0]) {
        texts.forEach(el => {
            const ch = toNum(el.id.replace('storytext', ''), 0);
            if (!ch || wordSuffix.test(selects[0].options[ch - 1]?.textContent || '')) return;
            const wc = qsa('p', el).reduce((sum, p) => sum + p.innerText.trim().split(/\s+/).length, 0);
            selects.forEach(select => { select.options[ch - 1].textContent += ` - Words: ${wc}`; });
        });
    }

    const lastText = texts[texts.length - 1];
    const baseClass = lastText.className;
    let orgAdded = false;

    const preLinks = info.bookmarks ? qsa('#pre_story_links a') : [];
    const fandom = preLinks[1]?.innerText || preLinks[0]?.innerText || '';
    const author = info.bookmarks ? qs('#profile_top a')?.innerText || '' : '';
    const name = info.bookmarks ? qsa('b')[5]?.innerText || '' : '';
    const unmarked = info.bookmarks ? `<img src="${bookmarkIcon('none')}" width="24" height="24">` : '';

    const makeSeparator = (ch) => {
        const sep = mkEl('span', {
            className: baseClass, id: `separator${ch}`,
            innerHTML: entire ? `<br><h4 style='user-select: text'>${selects[0]?.options[ch - 1]?.innerText || ''}</h4><hr size="1" noshade style="background: #e2e2e2; height: 1px;">` : "<br><h4 style='user-select: text; height: 15px'> </h4><hr size=\"1\" noshade style=\"background: #e2e2e2; height: 1px;\">"
        });
        if (ch <= chapters && info.bookmarks) {
            let go = qs('#gobutton');
            if (!go) {
                go = mkEl('button', {
                    id: 'gobutton', type: 'button', className: 'btn pull-right',
                    textContent: 'Go to bookmark',
                    style: `margin-right: 5px; display: ${dir[id]?.chapter ? '' : 'none'}`,
                    onclick: () => {
                        const mc = qs(`#storytext${dir[id].chapter}`);
                        mc ? mc.scrollIntoView({ behavior: 'smooth' }) : window.open(`https://www.fanfiction.net/s/${id}/${dir[id].chapter}`, '_self');
                    }
                });
                follow.after(go);
            }

            const btn = mkEl('button', {
                type: 'button', className: 'btn pull-right bookmark', title: 'bookmark',
                innerHTML: dir[id]?.chapter === ch ? `<img src="${bookmarkIcon(getBookmarkColor(info, dir, id, chapters, ch))}" width="24" height="24">` : unmarked,
                id: `bookmark${ch}`, style: 'height: 30px;',
                onclick: function() {
                    const dirEntry = dir[id];
                    const orgSelector = qs('#organizer-status-selecter');
                    if (dirEntry?.chapter === ch) {
                        this.innerHTML = info.bookmarks ? `<img src="${bookmarkIcon('none')}" width="24" height="24">` : '';
                        go.style.display = 'none';
                        if (orgSelector) orgSelector.style.display = 'none';
                        delete dir[id];
                        sendMsg({ message: 'del-bookmark', id });
                        return;
                    }
                    qs(`#bookmark${dirEntry?.chapter || 0}`)?.click();
                    const bm = { chapter: ch, chapters, id, fandom, author, storyName: name, addTime: new Date().toISOString(), status: dirEntry?.status || 'Automatic' };
                    dir[id] = bm;
                    this.innerHTML = `<img src="${bookmarkIcon(getBookmarkColor(info, dir, id, chapters, ch))}" width="24" height="24">`;
                    go.style.display = '';
                    if (orgSelector) orgSelector.style.display = '';
                    bm.message = 'set-bookmark';
                    sendMsg(bm);
                }
            });
            qs('h4', sep)?.after(btn);
        }
        if (!orgAdded && selects[0]) {
            if (info.organizer && id) {
                if (!dir[id]) dir[id] = { id };
                const current = STATUSES.includes(dir[id].status) ? dir[id].status : 'Automatic';
                const wrap = mkEl('span', {
                    style: 'display:' + (dir[id]?.status ? 'inline-flex' : 'none') + ';align-items:center;gap:6px;margin-inline:8px;',
                    id: 'organizer-status-selecter', className: 'pull-right',
                    innerHTML: info.bookmarks ? `<span class="xcontrast_txt" style="font-size:12px;color:#4b5563;">Status:</span><select aria-label="Change reading status" style="height:30px;padding:2px 6px;font-size:12px;line-height:20px;border:1px solid #d1d5db;border-radius:6px;background:#fff;">${STATUSES.map(s => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`).join('')}</select>` : '',
                });
                qs('select', wrap).addEventListener('change', e => {
                    dir[id].status = e.target.value;
                    sendMsg({ message: 'set-status', id, status: e.target.value });
                });
                selects[0].after(wrap);
            }
            orgAdded = true;
        }
        return sep;
    };

    if (!qs(`#separator${chapters + 1}`)) {
        lastText.after(makeSeparator(chapters + 1));
    }

    texts.forEach(el => {
        const ch = toNum(el?.id?.replace('storytext', ''), 0);
        if (ch && !qs(`#separator${ch}`)) el.before(makeSeparator(ch));
    });
};

const main = async () => {
    const [info, dir] = await Promise.all([sendMsg({ message: 'get-info' }), sendMsg({ message: 'get-dir' })]);
    try {
        info.adblock && qsa('.adsbygoogle').forEach(e => e.remove());
        
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
                const placeElem = qs(`#${place}`);
                const reviewsSort = qs(
                    `[onclick="stories_init(${place}_array,'.${type}');${place}_array.sort(sortByReviews); storylist_draw('${place}_inside', ${place}_array, 1, 1, ${sortType});"]`
                ) || qs(`#${place} [onclick*="sortByReviews"]`);
                if (!reviewsSort || !placeElem) return;
                const container = qs(`#${place}_inside`);
                ['Follows', 'Favs'].forEach(meta => {
                    const metaClass = `.${meta.toLowerCase()}value`;
                    const el = mkEl('span', {
                        innerHTML: meta,
                        className: 'gray',
                        onclick: () => {
                            const all = qsa(`.${type}`, placeElem);
                            const indexed = all.map((el, i) => [el, toNum(qs(metaClass, el)?.innerText)]);
                            const sorted = indexed.slice().sort((a, b) => b[1] - a[1]).map(x => x[0]);
                            all.forEach(e => e.remove());
                            sorted.forEach(e => container.appendChild(e));
                        }
                    });
                    reviewsSort.after(document.createTextNode(' . '), el);
                });
            });
        }

        let id;
        let parents = qsa('.z-list');
        if (!parents.length) parents = qsa('#profile_top');

        parents.forEach(el => {
            if (info.bigCovers) {
                el.style.height = '115px';
                const img = qs('.cimage', el);
                if (img) {
                    img.style.width = '75px';
                    img.style.height = '100px';
                }
            }
            betterDescription(info, el);
            id = qs('.idvalue', el)?.innerText.trim() || '';
            if (!id && info.separateFics) el.style.cssText = 'margin-bottom: 10px; border: 1px solid #969696; border-left: none;';
            
            if (info.markBookmarks) {
                const storyId = qs('a', el)?.href.match(/fanfiction\.net\/s\/(\d+)/)?.[1];
                const storyEntry = dir[storyId];
                const ch = toNum(qs('.chaptersvalue', el)?.innerText, 1);
                if (storyId && storyEntry?.chapter) {
                    if (storyEntry.chapters !== ch) {
                        storyEntry.chapters = ch;
                        storyEntry.message = 'set-bookmark';
                        sendMsg(storyEntry);
                    }
                    el.style.backgroundColor = '#e1edff';
                    qs('div', el)?.before(mkEl('img', {
                        src: bookmarkIcon(getBookmarkColor(info, dir, storyId, ch, storyEntry.chapter)),
                        width: 24, height: 24
                    }));
                }
            }
        });

        if (id) {
            const chapters = toNum(qs('.chaptersvalue')?.innerText, 1);
            const selects = qsa('#chap_select');
            let chapter = 1;
            if (selects[0]) {
                selects[0].parentElement.style.marginTop = '20px';
                chapter = toNum(selects[0].options[selects[0].selectedIndex].innerText.split('.')[0], 1);
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
                    qs(`#separator${texts[0].id.replace('storytext', '')}`).remove();
                    texts.shift().remove();
                    const finalSep = qs(`#separator${chapters + 1}`);
                    let start = 1;

                    const loadMore = mkEl('button', {
                        type: 'button', className: 'btn pull-right',
                        textContent: 'Load more chapters',
                    });

                    loadMore.onclick = async () => {
                        loadMore.style.display = 'none';
                        for (let ch = start; ch <= chapters; ch++) {
                            try {
                                const response = await fetch(`https://www.fanfiction.net/s/${id}/${ch}`);
                                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
                                const chEl = qs('#storytext', parsed);
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
                    qs('hr', finalSep)?.after(loadMore);
                    loadMore.click();
                };

                follow.after(btn);
            }

            if (info.bookmarks && info.autoSave && (dirEntry?.chapter || 0) < chapter) {
                qs(`#bookmark${chapter}`)?.click();
            }

            repaint();
        }
    } catch (e) {
        console.log("content-script.js did not run correctly, ", e);
    }
};

main();