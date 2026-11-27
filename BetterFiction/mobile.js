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
        + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/></svg>`);
    // In dark mode: a white outline and brighter fills, the same as the desktop site's dark mode
    const DARK_FILLS = { '#096dd9': '#4ea4ff', '#d48806': '#ffc04d', '#389e0d': '#73d13d', '#cf1322': '#ff7875' };
    const bookmarkIcon = (color) => (document.documentElement.classList.contains('bf-dark')
        ? icon('m6 4v16l6-2 6 2V4z', DARK_FILLS[color] || color, '#ffffff')
        : icon('m6 4v16l6-2 6 2V4z', color, '#333298'));

    /**
     * The colour of a bookmark, from its reading status (blue when Reading status is off).
     * @param {Object} info - Settings.
     * @param {Object} [entry] - The saved bookmark.
     * @param {number} chapters - Number of chapters in the story.
     * @returns {string}
     */
    const bookmarkColor = (info, entry, chapters) => {
        if (info.colorBookmarks === false) return '#389e0d';
        if (!info.organizer) return '#096dd9';
        const status = bookmarkStatus(info, entry?.status);
        if (status === 'Completed' || (status === 'Automatic' && entry.chapter === chapters)) return '#389e0d';
        if (status === 'Planned' || (status === 'Automatic' && entry.chapter === 1)) return '#d48806';
        if (status === 'Dropped') return '#cf1322';
        return '#096dd9';
    };

    const bookmarkStatus = (info, status) => {
        if (status && status !== 'Automatic' && STATUSES.includes(status)) return status;
        return info.bookmarks && info.autoStatus ? 'Automatic' : 'Reading';
    };

    /**
     * A colour that reads on the dark theme: the same hue, mixed with white until it has 4.5:1 contrast
     * against the darkest background it can sit on (a bookmarked story, #3a4560). Inverting the colour
     * instead would change its hue (teal ratings turning red) and leave some too dark.
     * @param {string} color - "rgb(r, g, b)"
     * @returns {string}
     */
    const readableOnDark = (color) => {
        const lum = (c) => {
            const v = c.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
            return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
        };
        const bg = lum([58, 69, 96]);
        const base = color.match(/\d+/g).slice(0, 3).map(Number);
        let mixed = base;
        for (let w = 0; w <= 1; w += 0.05) {
            mixed = base.map((x) => Math.round(x + (255 - x) * w));
            if ((lum(mixed) + 0.05) / (bg + 0.05) >= 4.5) break;
        }
        return `rgb(${mixed.join(', ')})`;
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
                    span.style.setProperty('color', dark ? readableOnDark(color) : color, 'important');
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
     * "Last read: 5 of 20" when they don't (the mobile story page).
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
            textContent: showsChapters ? `Last read: ${chapter}` : `Last read: ${chapter}${chapters > 1 ? ` of ${chapters}` : ''}`,
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
                    sendMsg({ message: 'set-bookmark', id: storyId, chapters, existingOnly: true });
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

    /** The "Chapter 1 - 10" text, the last bit of text in the page header (or null). */
    const chapterTitleNode = (doc) => {
        const content = doc.querySelector('#content');
        if (!content) return null;
        const texts = Array.from(content.childNodes).filter((n) => n.nodeType === 3 && n.textContent.trim());
        const node = texts[texts.length - 1];
        const text = node?.textContent.trim() || '';
        return /^chapter\b/i.test(text) && text.length < 200 ? node : null;
    };
    const chapterTitleFrom = (doc) => chapterTitleNode(doc)?.textContent.trim() || '';

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

        // Also follow / Also favourite: with the site's own Follow/Favorite form at the bottom of the page,
        // ticking only Follow and/or Favorite for the story (the author's are left as they are)
        const followAndFavourite = async () => {
            const form = document.querySelector('form[action="/m/subs.php"]');
            if (!form) return 'no-form';
            if (!document.querySelector('a[href*="/m/logout.php"]')) return 'signed-out';
            const params = new URLSearchParams();
            form.querySelectorAll('input[type="hidden"]').forEach((input) => params.set(input.name, input.value));
            if (info.ffnAutoFollow) params.set('salert', '1');
            if (info.ffnAutoFavorite) params.set('favs', '1');
            const response = await fetch(`${SITE}/m/subs.php?${params}`, { credentials: 'include' });
            if (!response.ok) throw new Error(`FanFiction.net answered ${response.status}`);
            return 'done';
        };
        const note = mkEl('span', { className: 'bf-note' });
        note.setAttribute('role', 'status');
        const showNote = (text) => {
            note.textContent = text;
            setTimeout(() => { if (note.textContent === text) note.textContent = ''; }, 6000);
        };
        let followedThisVisit = false;

        // manual: you tapped the bookmark button (automatic bookmarking never follows or favourites)
        const save = (ch, manual = false) => {
            const isNew = !dir[storyId]?.chapter;
            const status = bookmarkStatus(info, dir[storyId]?.status);
            const addTime = dir[storyId]?.addTime || new Date().toISOString();
            dir[storyId] = { id: storyId, chapter: ch, chapters, fandom, author, storyName, addTime, status };
            sendMsg({ ...dir[storyId], message: 'set-bookmark' });
            refresh();
            if (manual && isNew && !followedThisVisit && (info.ffnAutoFollow || info.ffnAutoFavorite)) {
                followedThisVisit = true;
                const what = [info.ffnAutoFollow && 'followed', info.ffnAutoFavorite && 'favourited'].filter(Boolean).join(' and ');
                followAndFavourite()
                    .then((result) => {
                        if (result === 'done') showNote(`Story ${what}.`);
                        else if (result === 'signed-out') showNote('Sign in to FanFiction.net to follow or favourite stories automatically.');
                    })
                    .catch((error) => {
                        console.error('BetterFiction: follow/favourite failed', error);
                        showNote("Couldn't follow or favourite. Use the site's Follow/Favorite form instead.");
                    });
            }
        };
        const remove = async (ch) => {
            const entry = dir[storyId];
            const { result } = await sendMsg({ message: 'del-bookmark', id: storyId, chapter: ch });
            if (!result?.ok || dir[storyId] !== entry) return;
            if (result.bookmark) dir[storyId] = result.bookmark;
            else delete dir[storyId];
            refresh();
        };

        const bookmarkButton = (ch) => {
            const button = mkEl('button', { type: 'button', className: 'btn bf-bookmark bookmark' });
            button.dataset.chapter = String(ch);
            button.addEventListener('click', () => (dir[storyId]?.chapter === ch ? remove(ch) : save(ch, true)));
            bookmarkButtons.push(button);
            return button;
        };

        const goButton = mkEl('button', { type: 'button', className: 'btn bf-go', textContent: 'Go to bookmark' });
        goButton.addEventListener('click', () => {
            const saved = dir[storyId]?.chapter;
            const loaded = saved && document.querySelector(`#bf-chapter-${saved}`);
            if (loaded) loaded.scrollIntoView({ behavior: 'smooth' });
            else if (saved) location.href = `${SITE}/s/${storyId}/${saved}/`;
        });
        let statusSelect = null;
        let statusWrap = null;

        const refresh = () => {
            const entry = dir[storyId];
            const saved = entry?.chapter;
            bookmarkButtons.forEach((button) => {
                const ch = Number(button.dataset.chapter);
                const here = saved === ch;
                // Only the icon, like the desktop site: filled in the status colour when this chapter is bookmarked
                button.replaceChildren(mkEl('img', {
                    src: bookmarkIcon(here ? bookmarkColor(info, entry, chapters) : 'none'), width: 24, height: 24, alt: '',
                }));
                button.title = here ? 'Remove the bookmark' : `Bookmark chapter ${ch}`;
                button.setAttribute('aria-pressed', String(here));
            });
            goButton.style.display = saved ? '' : 'none';
            if (statusWrap) {
                statusWrap.style.display = saved ? '' : 'none';
                statusSelect.value = bookmarkStatus(info, entry?.status);
            }
            if (detailsBox) showLastRead(info, detailsBox, storyId, saved, chapters);
        };

        if (info.bookmarks) {
            bar.append(bookmarkButton(chapter), goButton);
            if (info.organizer) {
                statusSelect = mkEl('select');
                statusSelect.setAttribute('aria-label', 'Change reading status');
                STATUSES.filter(status => status !== 'Automatic' || info.autoStatus)
                    .forEach(status => statusSelect.append(new Option(status, status)));
                statusSelect.addEventListener('change', () => {
                    if (!dir[storyId]) return;
                    dir[storyId].status = statusSelect.value;
                    sendMsg({ message: 'set-status', id: storyId, status: statusSelect.value });
                    refresh();
                });
                statusWrap = mkEl('span', { className: 'bf-status' }, [mkEl('span', { textContent: 'Status:' }), statusSelect]);
                bar.append(statusWrap);
            }
        }

        // "Chapter 1 - 10 - 10,906 words": the word count right of the chapter title
        let wordsLabel = null;
        if (info.wordCounter) {
            wordsLabel = mkEl('span', { className: 'bf-words-count', textContent: ` - ${plural(countWords(story), 'word')}` });
            const titleNode = chapterTitleNode(document);
            if (titleNode) titleNode.after(wordsLabel);
            else bar.append(wordsLabel);
        }

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
            const h3 = mkEl('h3', { textContent: title || `Chapter ${n}` });
            if (info.wordCounter) h3.append(mkEl('span', { className: 'bf-words-count', textContent: ` - ${plural(countWords(body), 'word')}` }));
            heading.append(h3);
            if (info.bookmarks) heading.append(bookmarkButton(n));
            return [heading, body];
        };

        const loadEntireWork = () => {
            const holder = mkEl('div', { id: 'bf-entire-work' });
            const status = mkEl('p', { className: 'bf-entire-status' });
            const retry = mkEl('button', { type: 'button', className: 'btn', textContent: 'Load more chapters', hidden: true });
            const pages = new Map([[chapter, { title: chapterTitleFrom(document), body: story }]]);
            document.querySelector('#bf-chapter-nav')?.remove();
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

        if (info.bookmarks && (info.ffnAutoFollow || info.ffnAutoFavorite)) bar.append(note);
        if (bar.childNodes.length) storyBox.before(bar);

        // The site's chapter links from the bottom of the page (« First « Prev Ch 3 of 10 Next »), copied above
        // the story so you don't have to scroll to the end to move on. A copy of the site's own line, so it looks the same.
        if (info.mobileChapterNav && chapters > 1) {
            const bottom = Array.from(document.querySelectorAll('div[align="center"]')).find((div) =>
                (story.compareDocumentPosition(div) & Node.DOCUMENT_POSITION_FOLLOWING) && /\bCh \d+ of\b/.test(div.textContent));
            if (bottom) {
                const nav = mkEl('div', { id: 'bf-chapter-nav' });
                nav.setAttribute('align', 'center');
                nav.setAttribute('role', 'navigation');
                nav.setAttribute('aria-label', 'Chapters');
                for (const node of bottom.childNodes) {
                    if (node.nodeName === 'BR') break; // the Review button comes after
                    nav.append(node.cloneNode(true));
                }
                (bar.isConnected ? bar : storyBox).before(nav);
            }
        }
        refresh();

        // "Bookmark new stories automatically": a story without a bookmark is bookmarked here.
        // "Bookmark follows your reading": a bookmark you have moves forward one chapter at a time (2 -> 3, never 1 -> 40).
        const savedChapter = dir[storyId]?.chapter || 0;
        const bookmarkNew = info.autoBookmarkNew && savedChapter === 0;
        const followReading = info.autoSave && savedChapter && chapter === savedChapter + 1;
        if (info.bookmarks && (bookmarkNew || followReading)) save(chapter);
    };

    const STYLE = `
#bf-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 10px; }
#bf-bar .btn, .bf-chapter-heading .btn { font-size: 14px; padding: 4px 10px; height: 34px; }
.bf-bookmark.btn { padding: 2px 8px; }
.bf-bookmark img { vertical-align: middle; }
.bf-status { display: inline-flex; align-items: center; gap: 6px; }
.bf-status span { font-size: 13px; }
.bf-status select { height: 34px; padding: 2px 6px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; }
.bf-words-count { font-weight: normal; }
.bf-chapter-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 14px 10px 4px; border-top: 1px solid #969696; }
.bf-chapter-heading h3 { margin: 0; font-size: 1.05em; flex: 1; min-width: 150px; }
.bf-entire-footer { text-align: center; padding: 10px; }
.bf-separate { border: 1px solid #969696; border-radius: 6px; margin: 0 4px 10px; padding: 6px 8px; }
.bf-marked { background-color: #e1edff !important; }
.bf-mark { margin-right: 4px; vertical-align: middle; }
.bf-note { font-size: 14px; opacity: 0.85; }
#bf-chapter-nav { margin: 8px 0; }
#bf-menu { width: 100%; text-align: center; }
#bf-menu img { vertical-align: middle; margin-right: 6px; border-radius: 3px; }
.bf-more { font-size: 18px !important; font-weight: 600; padding: 8px 16px !important; margin: 4px 6px;
    border: 1px solid #999; border-radius: 8px; cursor: pointer; line-height: 1.2; }
#bf-filters { text-align: center; margin: 6px 0 10px; }
#bf-filters > summary { display: inline-block; font-size: 16px; padding: 8px 18px; cursor: pointer; }
#bf-filters #d_menu { margin-top: 8px; }
`;

    // ---------- navigation: the More menu, a bigger More button, filters at the top ----------
    // Pages the mobile site keeps at a different address: [mobile, desktop] (the reverse of content-script.js)
    const DESKTOP_PAGES = [
        ['/m/acct.php', '/account/settings.php'],
        ['/m/f_story.php', '/favorites/story.php'],
        ['/m/f_author.php', '/favorites/author.php'],
        ['/m/a_story.php', '/alert/story.php'],
        ['/m/a_author.php', '/alert/author.php'],
        ['/m/pm2/inbox.php', '/pm2/inbox.php'],
        ['/m/login.php', '/login.php'],
    ];
    const PROFILE_URL_RE = /^https:\/\/www\.fanfiction\.net\/u\/\d+/;

    /**
     * The address of this page on the desktop site. Stories, lists and profiles keep their address;
     * account pages under /m/ open their desktop page (other /m/ pages: the desktop home page).
     * @returns {string}
     */
    const desktopUrl = () => {
        const page = DESKTOP_PAGES.find(([mobile]) => mobile === location.pathname);
        if (page) return `https://www.fanfiction.net${page[1]}`;
        if (location.pathname.startsWith('/m/')) return 'https://www.fanfiction.net/';
        return `https://www.fanfiction.net${location.pathname}${location.search}${location.hash}`;
    };

    /**
     * The links the desktop site puts in its top bar, added to the site's "More" menu as a row of the site's
     * own buttons: My Profile, Bookmarks and Desktop site (each with its own setting).
     * Favorites and Follows need an account: when you're logged in the site's menu already has them
     * (Fav Stories, Followed Stories), and when you're not they'd only lead to the login page. So they're
     * added only if you're logged in and the site's menu doesn't have them.
     * @param {Object} info
     * @param {string} [profileUrl]
     */
    const moreMenu = (info, profileUrl) => {
        const drop = document.querySelector('#t_drop');
        if (!drop || drop.querySelector('#bf-menu')) return;
        const loggedIn = !drop.querySelector('a[href*="/m/signup.php"]'); // logged out, the site shows Login | Sign Up
        const missing = (path) => loggedIn && !drop.querySelector(`a[href*="${path}"]`);
        const items = [
            info.favoritesLink && missing('/m/f_story.php') && ['Fav Stories', `${SITE}/m/f_story.php`],
            info.followsLink && missing('/m/a_story.php') && ['Followed Stories', `${SITE}/m/a_story.php`],
            info.profileLink && PROFILE_URL_RE.test(profileUrl || '')
                && ['My Profile', profileUrl.replace('https://www.fanfiction.net', SITE)],
            info.bookmarks && ['Bookmarks', chrome.runtime.getURL('tabs/bookmarks/bookmarks.html'), chrome.runtime.getURL('icons/bookmarks.svg')],
            info.siteSwitch && ['Desktop site', desktopUrl()],
        ].filter(Boolean);
        if (!items.length) return;
        const row = mkEl('div', { id: 'bf-menu' });
        items.forEach(([text, href, image], i) => {
            const link = mkEl('a', { className: 'btn', href });
            if (image) link.append(mkEl('img', { src: image, width: 18, height: 18, alt: '' }));
            link.append(text);
            row.append(...(i ? [' ', link] : [link]));
        });
        (drop.firstElementChild || drop).append(mkEl('hr'), row);
    };

    /** Makes the site's small "More" button bigger and easier to tap. */
    const biggerMoreButton = () => {
        const more = document.querySelector('[onclick*="t_drop"]');
        if (!more) return;
        more.classList.add('bf-more');
        more.setAttribute('role', 'button');
        more.setAttribute('aria-controls', 't_drop');
    };

    /** Moves the filters from the bottom of story lists to the top, behind a "Filters" button. */
    const filtersToTop = () => {
        const filters = document.querySelector('#d_menu');
        const firstStory = document.querySelector('#content div.bs');
        if (!filters?.querySelector('form') || !firstStory) return;
        const box = mkEl('details', { id: 'bf-filters' }, [mkEl('summary', { className: 'btn', textContent: 'Filters' }), filters]);
        firstStory.before(box);
    };

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
        const profileUrl = info.profileLink
            ? await chrome.storage.sync.get('profileUrl').then((r) => r.profileUrl).catch(() => '')
            : '';
        try {
            document.head.append(mkEl('style', { textContent: STYLE }));
            if (info.adblock) {
                // Ad slots, and the centred box around each one
                document.querySelectorAll('ins.adsbygoogle').forEach((ad) => {
                    const box = ad.parentElement;
                    (box && box !== document.body && box.children.length === 1 ? box : ad).remove();
                });
            }
            moreMenu(info, profileUrl);
            if (info.mobileBigMore) biggerMoreButton();
            if (info.mobileFiltersTop) filtersToTop();
            storyLists(info, dir);
            if (current) storyPage(info, dir, current);
        } catch (error) {
            console.log('mobile.js did not run correctly, ', error);
        }
    };

    main();
})();
