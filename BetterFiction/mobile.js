// BetterFiction on the mobile site (m.fanfiction.net).
// Uses the same settings and the same bookmarks as the desktop site (bookmarks are stored by story id),
// so a story bookmarked on one site shows up on the other.
(() => {
    const SITE = 'https://m.fanfiction.net';
    const STATUSES = ['Automatic', 'Planned', 'Reading', 'Completed', 'Dropped'];
    const GENRES = ['Adventure', 'Angst', 'Crime', 'Drama', 'Family', 'Fantasy', 'Friendship', 'General', 'Horror', 'Humor',
        'Hurt/Comfort', 'Mystery', 'Parody', 'Poetry', 'Romance', 'Sci-Fi', 'Spiritual', 'Supernatural', 'Suspense', 'Tragedy', 'Western'];
    // The same colours as the desktop story details
    const COLORS = {
        rated: 'rgb(8, 131, 131)',
        language: { English: 'rgb(151, 0, 0)', Spanish: 'rgb(171, 143, 0)', default: 'rgb(0, 0, 255)' },
        genre: 'rgb(144, 48, 0)',
        status: 'rgb(0, 99, 31)',
    };

    const sendMsg = (payload) => chrome.runtime.sendMessage(payload).catch(() => ({}));
    const storyIdFrom = (href) => href?.match(/\/s\/(\d+)/)?.[1];
    const toNum = (value, fallback = 0) => Number(String(value ?? '').replace(/,/g, '')) || fallback;

    /**
     * Creates an element with properties and children.
     * @param {string} tag
     * @param {Object} [props]
     * @param {Array<Node|string>} [children]
     * @returns {HTMLElement}
     */
    const mkEl = (tag, props = {}, children = []) => {
        const node = Object.assign(document.createElement(tag), props);
        children.forEach((child) => child !== null && child !== undefined && node.append(child));
        return node;
    };

    const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

    // ---------- bookmark icons and colours (the same as on the desktop site) ----------
    const icon = (d, fill, stroke) => 'data:image/svg+xml;base64,'
        + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="2"/></svg>`);
    const bookmarkIcon = (color) => icon('m6 4v16l6-2 6 2V4z', color, '#333298');

    /**
     * The colour of a bookmark, from its reading status (blue when Reading status is off).
     * @param {Object} info - Settings.
     * @param {Object} [entry] - The saved bookmark.
     * @param {number} chapters - Number of chapters in the story.
     * @returns {string}
     */
    const bookmarkColor = (info, entry, chapters) => {
        if (!info.organizer) return '#096dd9';
        const status = entry?.status;
        if (status === 'Completed' || (status === 'Automatic' && entry.chapter === chapters)) return '#237804';
        if (status === 'Planned' || (status === 'Automatic' && entry.chapter === 1)) return '#d48806';
        if (status === 'Dropped') return '#a8071a';
        return '#096dd9';
    };

    /**
     * Inverts a colour, for pages with a dark background (the same as the desktop site).
     * @param {string} color - "rgb(r, g, b)"
     * @returns {string}
     */
    const invertColor = (color) => {
        const [r, g, b] = color.match(/\d+/g).map(Number);
        return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
    };

    // ---------- story details ("T, English, Drama & Humor, chapters: 97, ...") ----------
    const LABELS = {
        rated: 'Rated', chapters: 'Chapters', words: 'Words', reviews: 'Reviews', favs: 'Favs',
        follows: 'Follows', updated: 'Updated', published: 'Published', id: 'id',
    };
    // Lines when "Group story details" is on, like the desktop site
    const LINES = [['rated', 'language', 'genre'], ['chapters', 'words'], ['reviews', 'favs', 'follows'],
        ['updated', 'published'], ['characters'], ['status']];

    /**
     * Splits the details on ", ", keeping pairings like "[Naruto U., Hinata H.]" together.
     * @param {string} text
     * @returns {string[]}
     */
    const splitTokens = (text) => {
        const out = [];
        let depth = 0;
        let current = '';
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (c === '[') depth++;
            if (c === ']') depth = Math.max(0, depth - 1);
            if (c === ',' && depth === 0 && /\s/.test(text[i + 1] || ' ')) {
                out.push(current);
                current = '';
                continue;
            }
            current += c;
        }
        out.push(current);
        // "updated: 3h ago published: Jan 10" has no comma between the two dates
        return out.flatMap((t) => t.split(/\s+(?=(?:updated|published):)/i)).map((t) => t.trim()).filter(Boolean);
    };

    /**
     * Reads the details into named fields. Dates stay the site's own elements (they update themselves).
     * @param {Element} container
     * @returns {{fields: Object, dates: Element[]}}
     */
    const parseDetails = (container) => {
        const clone = container.cloneNode(true);
        const dates = Array.from(container.querySelectorAll('[data-xutime]'));
        clone.querySelectorAll('[data-xutime]').forEach((span, i) => { span.textContent = `@@D${i}@@`; });
        clone.querySelectorAll('.bf-lastread').forEach((node) => node.remove());
        const tokens = splitTokens(clone.textContent.replace(/\s+/g, ' ').trim());

        const fields = {};
        const characters = [];
        let expect = 'rated';
        tokens.forEach((token) => {
            const labelled = token.match(/^([A-Za-z]+):\s*(.*)$/);
            const key = labelled?.[1].toLowerCase();
            if (key && key in LABELS) {
                fields[key] = labelled[2];
                if (key === 'rated') expect = 'language';
                return;
            }
            if (/^complete$/i.test(token)) {
                fields.status = 'Complete';
                return;
            }
            if (expect === 'rated' && /^(K\+?|T|M|MA)$/.test(token)) {
                fields.rated = token;
                expect = 'language';
                return;
            }
            if (expect === 'language') {
                fields.language = token;
                expect = 'genre';
                return;
            }
            if (expect === 'genre') {
                expect = 'characters';
                if (token.split(/\s*[&/]\s*/).every((genre) => GENRES.includes(genre))) {
                    fields.genre = token;
                    return;
                }
            }
            characters.push(token);
        });
        if (characters.length) fields.characters = characters.join(', ');
        return { fields, dates };
    };

    /** Turns the "@@D0@@" placeholders back into the site's own date elements. */
    const valueNodes = (text, dates) => text.split(/(@@D\d+@@)/).filter(Boolean).map((part) => {
        const m = part.match(/^@@D(\d+)@@$/);
        return m && dates[m[1]] ? dates[m[1]].cloneNode(true) : document.createTextNode(part);
    });

    /**
     * Groups the details on lines and/or colours them, as set in "Group story details" and "Colour story details".
     * @param {Object} info
     * @param {Element} container
     */
    const betterDescription = (info, container) => {
        if (!info.groupDescriptions && !info.styleDescriptions) return;
        const { fields, dates } = parseDetails(container);
        if (!fields.rated && !fields.chapters && !fields.words) return; // not a details line we understand

        const lines = LINES.map((keys) => keys.filter((k) => fields[k])).filter((keys) => keys.length);
        const order = info.groupDescriptions ? lines : [lines.flat()];
        const out = document.createDocumentFragment();
        order.forEach((keys) => {
            const line = mkEl('div');
            keys.forEach((k, i) => {
                if (i) line.append(info.groupDescriptions ? ' - ' : ', ');
                if (LABELS[k] && k !== 'id') line.append(`${LABELS[k]}: `);
                line.append(mkEl('span', { className: `bf-${k}` }, valueNodes(fields[k], dates)));
            });
            out.append(line);
        });
        container.replaceChildren(out);
        container.classList.add('bf-details');

        if (info.styleDescriptions) {
            const applyColors = () => {
                const dark = document.documentElement.classList.contains('bf-dark');
                ['rated', 'language', 'genre', 'status'].forEach((k) => {
                    const span = container.querySelector(`.bf-${k}`);
                    if (!span) return;
                    let color = COLORS[k];
                    if (typeof color === 'object') color = color[span.textContent.trim()] || color.default;
                    span.style.setProperty('color', dark ? invertColor(color) : color, 'important');
                    if (k === 'status') span.style.fontWeight = '600';
                });
            };
            applyColors();
            // Recolour when BetterFiction's dark mode is switched on or off
            new MutationObserver(applyColors).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        }
    };

    /**
     * Shows "Last read" right after the word count, as one link to that chapter:
     * "Last read: 5" when the details show the chapter count (story lists),
     * "Last read: chapter 5 of 20" when they don't (the mobile story page).
     * @param {Object} info
     * @param {Element} container
     * @param {string} storyId
     * @param {number} [chapter] - The bookmarked chapter.
     * @param {number} chapters
     */
    const showLastRead = (info, container, storyId, chapter, chapters) => {
        container.querySelectorAll('.bf-lastread').forEach((node) => node.remove());
        container.normalize();
        if (!info.lastRead || !chapter) return;
        const showsChapters = container.querySelector('.bf-chapters') || /\bchapters:/i.test(container.textContent);
        const link = mkEl('a', {
            href: `${SITE}/s/${storyId}/${chapter}/`,
            textContent: showsChapters ? `Last read: ${chapter}` : `Last read: chapter ${chapter}${chapters > 1 ? ` of ${chapters}` : ''}`,
        });
        link.style.fontWeight = '600';
        const words = container.querySelector('.bf-words');
        if (words) {
            words.after(mkEl('span', { className: 'bf-lastread' }, [info.groupDescriptions ? ' - ' : ', ', link]));
            return;
        }
        // The site's own text: "..., words: 213k+, favs: 713, ..."
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const m = node.textContent.match(/words:\s*[^,]*[^,\s]/i);
            if (!m) continue;
            node.splitText(m.index + m[0].length);
            node.after(mkEl('span', { className: 'bf-lastread' }, [', ', link]));
            return;
        }
        container.append(mkEl('span', { className: 'bf-lastread' }, [', ', link]));
    };

    // ---------- story lists ----------
    /**
     * Story lists: separated stories, marked bookmarks, better details, last read chapter.
     * @param {Object} info
     * @param {Object} dir - Bookmarks of the stories on this page, by story id.
     */
    const storyLists = (info, dir) => {
        document.querySelectorAll('#content div.bs').forEach((entry) => {
            const title = Array.from(entry.querySelectorAll('a[href*="/s/"]')).find((a) => a.textContent.trim() !== '»');
            const storyId = storyIdFrom(title?.getAttribute('href'));
            const details = entry.querySelector('div.gray');
            if (!storyId) return;
            const chapters = toNum(details?.textContent.match(/chapters:\s*([\d,]+)/i)?.[1], 1);
            const saved = dir[storyId];

            if (info.separateFics) entry.classList.add('bf-separate');
            if (saved?.chapter && info.bookmarks && info.markBookmarks) {
                entry.classList.add('bf-marked');
                title.before(mkEl('img', {
                    className: 'bf-mark', src: bookmarkIcon(bookmarkColor(info, saved, chapters)), width: 18, height: 18, alt: '',
                }));
                // Keep the chapter count up to date, as the desktop site does
                if (saved.chapters !== chapters) {
                    saved.chapters = chapters;
                    sendMsg({ ...saved, message: 'set-bookmark' });
                }
            }
            if (details) {
                betterDescription(info, details);
                showLastRead(info, details, storyId, info.bookmarks ? saved?.chapter : 0, chapters);
            }
        });
    };

    // ---------- chapter pages ----------
    const countWords = (root) => Array.from(root.querySelectorAll('p'))
        .reduce((n, p) => n + (p.textContent.trim() ? p.textContent.trim().split(/\s+/).length : 0), 0);

    /** "Chapter 1 - 10" is the last bit of text in the page header. */
    const chapterTitleFrom = (doc) => {
        const content = doc.querySelector('#content');
        if (!content) return '';
        const texts = Array.from(content.childNodes).filter((n) => n.nodeType === 3 && n.textContent.trim());
        const text = texts[texts.length - 1]?.textContent.trim() || '';
        return /^chapter\b/i.test(text) && text.length < 200 ? text : '';
    };

    /**
     * The story page: bookmark bar, status, words, Entire Work, details and copying.
     * @param {Object} info
     * @param {Object} dir
     * @param {string} storyId
     */
    const storyPage = (info, dir, storyId) => {
        const story = document.querySelector('#storycontent');
        const content = document.querySelector('#content');
        if (!story || !content) return;
        const storyBox = story.parentElement;

        const chapter = Number(location.pathname.match(/^\/s\/\d+\/(\d+)/)?.[1]) || 1;
        const jump = document.querySelector('select#jump');
        const chapters = Math.max(jump ? jump.options.length - 1 : 1, chapter);
        const header = content.querySelector(':scope > div[align="center"]');
        const storyName = header?.querySelector('b')?.textContent.trim() || document.title;
        const author = header?.querySelector('a[href*="/u/"]')?.textContent.trim() || '';

        // The details are loose text in the header, from "Rated:" to the next line: put them in a box
        const ratedNode = Array.from(content.childNodes).find((n) => n.nodeType === 3 && n.textContent.includes('Rated:'));
        let fandom = '';
        let detailsBox = null;
        if (ratedNode) {
            const start = ratedNode.textContent.indexOf('Rated:');
            const node = start > 0 ? ratedNode.splitText(start) : ratedNode;
            let prev = node.previousSibling;
            while (prev && !(prev.nodeType === 1 && prev.tagName === 'A')) prev = prev.previousSibling;
            fandom = prev?.textContent.trim() || '';
            detailsBox = mkEl('div', { className: 'bf-details-src' });
            node.before(detailsBox);
            let next = node;
            while (next && !(next.nodeType === 1 && next.tagName === 'HR')) {
                const after = next.nextSibling;
                detailsBox.append(next);
                next = after;
            }
            betterDescription(info, detailsBox);
        }

        if (info.copy) {
            story.classList.remove('nocopy');
            document.head.append(mkEl('style', {
                textContent: '.storycontent,.storycontent *{user-select:text !important;-webkit-user-select:text !important}',
            }));
            ['copy', 'selectstart', 'contextmenu'].forEach((type) => document.addEventListener(type, (e) => e.stopPropagation(), true));
        }

        // ----- the bar above the story -----
        const bar = mkEl('div', { id: 'bf-bar' });
        const bookmarkButtons = [];

        const save = (ch) => {
            const status = dir[storyId]?.status || 'Automatic';
            dir[storyId] = { id: storyId, chapter: ch, chapters, fandom, author, storyName, addTime: new Date().toISOString(), status };
            sendMsg({ ...dir[storyId], message: 'set-bookmark' });
            refresh();
        };
        const remove = () => {
            delete dir[storyId];
            sendMsg({ message: 'del-bookmark', id: storyId });
            refresh();
        };

        const bookmarkButton = (ch) => {
            const button = mkEl('button', { type: 'button', className: 'btn bf-bookmark' });
            button.dataset.chapter = String(ch);
            button.addEventListener('click', () => (dir[storyId]?.chapter === ch ? remove() : save(ch)));
            bookmarkButtons.push(button);
            return button;
        };

        const goLink = mkEl('a', { className: 'btn bf-go', textContent: 'Go to bookmark' });
        let statusSelect = null;

        const refresh = () => {
            const entry = dir[storyId];
            const saved = entry?.chapter;
            bookmarkButtons.forEach((button) => {
                const ch = Number(button.dataset.chapter);
                const here = saved === ch;
                button.replaceChildren(
                    mkEl('img', { src: bookmarkIcon(here ? bookmarkColor(info, entry, chapters) : 'none'), width: 18, height: 18, alt: '' }),
                    here ? 'Bookmarked' : 'Bookmark',
                );
                button.title = here ? 'Remove the bookmark' : `Bookmark chapter ${ch}`;
            });
            const loaded = saved && document.querySelector(`#bf-chapter-${saved}`);
            goLink.style.display = saved && saved !== chapter ? '' : 'none';
            goLink.href = loaded ? `#bf-chapter-${saved}` : `${SITE}/s/${storyId}/${saved || 1}/`;
            if (statusSelect) {
                statusSelect.style.display = saved ? '' : 'none';
                statusSelect.value = STATUSES.includes(entry?.status) ? entry.status : 'Automatic';
            }
            if (detailsBox) showLastRead(info, detailsBox, storyId, saved, chapters);
        };

        if (info.bookmarks) {
            bar.append(bookmarkButton(chapter), goLink);
            if (info.organizer) {
                statusSelect = mkEl('select', { title: 'Reading status' });
                statusSelect.setAttribute('aria-label', 'Reading status');
                STATUSES.forEach((status) => statusSelect.append(new Option(status, status)));
                statusSelect.addEventListener('change', () => {
                    if (!dir[storyId]) return;
                    dir[storyId].status = statusSelect.value;
                    sendMsg({ message: 'set-status', id: storyId, status: statusSelect.value });
                    refresh();
                });
                bar.append(statusSelect);
            }
        }

        const wordsLabel = info.wordCounter ? mkEl('span', { className: 'bf-words-count', textContent: plural(countWords(story), 'word') }) : null;
        if (wordsLabel) bar.append(wordsLabel);

        // ----- Entire Work: every chapter on one page -----
        if (info.entireWork && chapters > 1) {
            const entire = mkEl('button', { type: 'button', className: 'btn', textContent: 'Entire Work' });
            entire.addEventListener('click', () => {
                entire.remove();
                wordsLabel?.remove();
                loadEntireWork();
            });
            bar.append(entire);
        }

        const chapterBlock = (n, title, body) => {
            const heading = mkEl('div', { id: `bf-chapter-${n}`, className: 'bf-chapter-heading' });
            heading.append(mkEl('h3', { textContent: title || `Chapter ${n}` }));
            if (info.wordCounter) heading.append(mkEl('span', { className: 'bf-words-count', textContent: plural(countWords(body), 'word') }));
            if (info.bookmarks) heading.append(bookmarkButton(n));
            return [heading, body];
        };

        const loadEntireWork = () => {
            const holder = mkEl('div', { id: 'bf-entire-work' });
            const status = mkEl('p', { className: 'bf-entire-status' });
            const retry = mkEl('button', { type: 'button', className: 'btn', textContent: 'Load more chapters', hidden: true });
            const pages = new Map([[chapter, { title: chapterTitleFrom(document), body: story }]]);
            storyBox.replaceChildren(holder, mkEl('div', { className: 'bf-entire-footer' }, [status, retry]));

            let next = 1;
            const BATCH = 3;
            const fetchChapter = async (n) => {
                const response = await fetch(`${SITE}/s/${storyId}/${n}/`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
                const body = doc.querySelector('#storycontent');
                if (!body) throw new Error('No story text in the page');
                body.removeAttribute('id');
                if (info.copy) body.classList.remove('nocopy');
                return { title: chapterTitleFrom(doc), body: document.importNode(body, true) };
            };

            const run = async () => {
                retry.hidden = true;
                while (next <= chapters) {
                    status.textContent = `Loading chapter ${next} of ${chapters}…`;
                    const numbers = [];
                    for (let n = next; n <= chapters && numbers.length < BATCH; n++) numbers.push(n);
                    const results = await Promise.allSettled(numbers.map((n) => (pages.has(n) ? pages.get(n) : fetchChapter(n))));
                    for (let i = 0; i < results.length; i++) {
                        if (results[i].status === 'rejected') {
                            console.error(`BetterFiction: couldn't load chapter ${numbers[i]}`, results[i].reason);
                            status.textContent = `Chapter ${numbers[i]} didn't load.`;
                            retry.hidden = false;
                            refresh();
                            return;
                        }
                        holder.append(...chapterBlock(numbers[i], results[i].value.title, results[i].value.body));
                        next = numbers[i] + 1;
                    }
                }
                status.textContent = 'End of the story.';
                refresh();
                const current = document.querySelector(`#bf-chapter-${chapter}`);
                if (chapter > 1 && current) current.scrollIntoView();
            };
            retry.addEventListener('click', run);
            run();
        };

        if (bar.childNodes.length) storyBox.before(bar);
        refresh();

        // Auto-save: a new story is bookmarked; a bookmarked one moves forward one chapter at a time
        const savedChapter = dir[storyId]?.chapter || 0;
        if (info.bookmarks && info.autoSave && (savedChapter === 0 || chapter === savedChapter + 1)) save(chapter);
    };

    const STYLE = `
#bf-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 10px; }
#bf-bar .btn, #bf-bar select, .bf-chapter-heading .btn { font-size: 14px; padding: 6px 10px; border-radius: 6px; }
#bf-bar .btn img, .bf-chapter-heading .btn img { vertical-align: middle; margin-right: 4px; }
.bf-words-count { font-size: 14px; opacity: .8; }
.bf-chapter-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 14px 10px 4px; border-top: 1px solid #969696; }
.bf-chapter-heading h3 { margin: 0; font-size: 1.05em; flex: 1; min-width: 150px; }
.bf-entire-footer { text-align: center; padding: 10px; }
.bf-separate { border: 1px solid #969696; border-radius: 6px; margin: 0 4px 10px; padding: 6px 8px; }
.bf-marked { background-color: #e1edff; }
.bf-mark { margin-right: 4px; vertical-align: middle; }
`;

    const main = async () => {
        const ids = new Set();
        const current = location.pathname.match(/^\/s\/(\d+)/)?.[1];
        if (current) ids.add(current);
        document.querySelectorAll('#content div.bs a[href*="/s/"]').forEach((a) => {
            const id = storyIdFrom(a.getAttribute('href'));
            if (id) ids.add(id);
        });
        const [info, dir] = await Promise.all([
            chrome.storage.sync.get('settings').then((r) => r.settings || {}).catch(() => ({})),
            ids.size ? chrome.storage.local.get([...ids]).catch(() => ({})) : Promise.resolve({}),
        ]);
        try {
            document.head.append(mkEl('style', { textContent: STYLE }));
            if (info.adblock) {
                // Ad slots, and the centred box around each one
                document.querySelectorAll('ins.adsbygoogle').forEach((ad) => {
                    const box = ad.parentElement;
                    (box && box !== document.body && box.children.length === 1 ? box : ad).remove();
                });
            }
            storyLists(info, dir);
            if (current) storyPage(info, dir, current);
        } catch (error) {
            console.log('mobile.js did not run correctly, ', error);
        }
    };

    main();
})();
