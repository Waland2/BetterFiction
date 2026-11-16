// BetterFiction on Archive of Our Own (archiveofourown.org).
// Uses the same settings and the same bookmarks list as FanFiction.net. AO3 works are stored under
// "ao3-<work id>" so they never clash with FanFiction.net story ids, with site: 'ao3' and the chapter's address.
(() => {
    const STATUSES = ['Automatic', 'Planned', 'Reading', 'Completed', 'Dropped'];
    const AO3 = 'https://archiveofourown.org';

    const sendMsg = (payload) => chrome.runtime.sendMessage(payload).catch(() => ({}));
    const key = (workId) => `ao3-${workId}`;

    /**
     * The work id in an AO3 address, also for works opened inside a collection (/collections/<name>/works/<id>).
     * @param {string} href
     * @returns {string|undefined}
     */
    const workIdFrom = (href) => href?.match(/^(?:https:\/\/archiveofourown\.org)?(?:\/collections\/[^/]+)?\/works\/(\d+)/)?.[1];

    /** A saved chapter address, only when it really is an AO3 address. */
    const savedUrl = (entry) => (entry?.url?.startsWith(`${AO3}/`) ? entry.url : '');

    /** "3/10" or "3/?" -> the number of chapters published so far. */
    const publishedChapters = (text) => Number(String(text || '').split('/')[0].replace(/\D/g, '')) || 1;

    const mkEl = (tag, props = {}) => Object.assign(document.createElement(tag), props);

    // ---------- bookmark icons and colours (the same as on FanFiction.net) ----------
    const bookmarkIcon = (color) => 'data:image/svg+xml;base64,'
        + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m6 4v16l6-2 6 2V4z" fill="${color}" stroke="#333298" stroke-width="2"/></svg>`);

    /**
     * The colour of a bookmark, from its reading status (blue when Reading status is off).
     * @param {Object} info - Settings.
     * @param {Object} [entry] - The saved bookmark.
     * @param {number} chapters - Chapters published so far.
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
     * Adds "Last read: N" to a work's stats (which already show the chapter count), as a link to that chapter.
     * @param {Element} stats - The work's dl.stats.
     * @param {Object} entry - The saved bookmark.
     * @param {string} workId
     */
    const showLastRead = (stats, entry, workId) => {
        if (!stats) return;
        stats.querySelectorAll('.bf-lastread').forEach((node) => node.remove());
        if (!entry?.chapter) return;
        const dd = mkEl('dd', { className: 'bf-lastread' });
        dd.appendChild(mkEl('a', {
            href: savedUrl(entry) || `/works/${workId}`,
            textContent: String(entry.chapter),
            title: `Go to chapter ${entry.chapter}`,
        }));
        stats.append(mkEl('dt', { className: 'bf-lastread', textContent: 'Last read:' }), dd);
    };

    // ---------- work lists (search results, tags, bookmarks, series, ...) ----------
    /**
     * Marks the works you've bookmarked, and adds Last read to their stats.
     * @param {Object} info
     * @param {Object} dir - Bookmarks of the works on this page, by key.
     */
    const markBlurbs = (info, dir) => {
        document.querySelectorAll('li.blurb').forEach((blurb) => {
            const link = blurb.querySelector('h4.heading a[href*="/works/"]');
            const workId = workIdFrom(link?.getAttribute('href'));
            const entry = workId && dir[key(workId)];
            if (!entry?.chapter) return;
            const chapters = publishedChapters(blurb.querySelector('dd.chapters')?.textContent);
            if (info.lastRead) showLastRead(blurb.querySelector('dl.stats'), entry, workId);
            if (!info.markBookmarks) return;
            blurb.classList.add('bf-marked');
            link.before(mkEl('img', {
                className: 'bf-mark',
                src: bookmarkIcon(bookmarkColor(info, entry, chapters)),
                width: 18,
                height: 18,
                alt: '',
                title: `Bookmarked at chapter ${entry.chapter}`,
            }));
            // Keep the chapter count up to date, as on FanFiction.net
            if (entry.chapters !== chapters) {
                entry.chapters = chapters;
                sendMsg({ ...entry, message: 'set-bookmark' });
            }
        });
    };

    // ---------- work pages ----------
    /** The chapter on screen, from the chapter menu, the chapter heading, or 1. */
    const currentChapter = () => {
        const select = document.querySelector('#selected_id');
        const fromSelect = select?.options[select.selectedIndex]?.textContent.match(/^\s*(\d+)\./)?.[1];
        if (fromSelect) return Number(fromSelect);
        const fromHeading = document.querySelector('#chapters .chapter h3.title a')?.textContent.match(/Chapter\s+(\d+)/i)?.[1];
        return Number(fromHeading || 1);
    };

    /**
     * Work pages: bookmark button, Go to bookmark, Status menu and Last read, in AO3's own menu of actions.
     * @param {Object} info
     * @param {Object} dir
     * @param {string} workId
     */
    const workPage = (info, dir, workId) => {
        const nav = document.querySelector('ul.work.navigation.actions');
        const storyName = document.querySelector('h2.title.heading')?.textContent.trim();
        if (!nav || !storyName) return; // e.g. the adult content notice
        // Every chapter on one page (Entire Work, or AO3's "show the whole work" preference):
        // there's no single chapter to bookmark
        if (document.querySelectorAll('#chapters .chapter[id^="chapter-"]').length > 1) return;

        const k = key(workId);
        const chapter = currentChapter();
        const chapters = Math.max(publishedChapters(document.querySelector('dl.work.meta dd.chapters')?.textContent), chapter);
        const author = Array.from(document.querySelectorAll('h3.byline.heading a[rel="author"]'))
            .map((a) => a.textContent.trim()).join(', ') || 'Anonymous';
        const fandom = document.querySelector('dd.fandom.tags a.tag')?.textContent.trim() || '';
        const url = AO3 + location.pathname;

        const bookmarkButton = mkEl('button', { type: 'button', className: 'bf-bookmark' });
        const goButton = mkEl('button', { type: 'button', className: 'bf-go', textContent: 'Go to bookmark' });
        goButton.addEventListener('click', () => {
            const target = savedUrl(dir[k]) || `${AO3}/works/${workId}`;
            if (target !== url) location.href = target;
        });

        let statusSelect = null;
        const statusLi = mkEl('li', { className: 'bf-status' });
        if (info.organizer) {
            statusSelect = mkEl('select');
            statusSelect.setAttribute('aria-label', 'Change reading status');
            STATUSES.forEach((status) => statusSelect.append(new Option(status, status)));
            statusSelect.addEventListener('change', () => {
                if (!dir[k]) return;
                dir[k].status = statusSelect.value;
                sendMsg({ message: 'set-status', id: k, status: statusSelect.value });
                render();
            });
            statusLi.append(mkEl('span', { textContent: 'Status:' }), statusSelect);
        }

        const render = () => {
            const entry = dir[k];
            const here = entry?.chapter === chapter;
            bookmarkButton.replaceChildren(mkEl('img', {
                src: bookmarkIcon(here ? bookmarkColor(info, entry, chapters) : 'none'), width: 22, height: 22, alt: '',
            }));
            bookmarkButton.title = here ? 'Remove the bookmark' : `Bookmark chapter ${chapter}`;
            bookmarkButton.setAttribute('aria-label', bookmarkButton.title);
            bookmarkButton.setAttribute('aria-pressed', String(here));
            goButton.parentElement.style.display = entry?.chapter ? '' : 'none';
            statusLi.style.display = entry?.chapter && statusSelect ? '' : 'none';
            if (statusSelect) statusSelect.value = STATUSES.includes(entry?.status) ? entry.status : 'Automatic';
            if (info.lastRead) showLastRead(document.querySelector('dl.work.meta dl.stats'), entry, workId);
        };

        const save = () => {
            const status = dir[k]?.status || 'Automatic';
            dir[k] = {
                id: k, chapter, chapters, fandom, author, storyName, addTime: new Date().toISOString(), status, site: 'ao3', url,
            };
            sendMsg({ ...dir[k], message: 'set-bookmark' });
            render();
        };

        bookmarkButton.addEventListener('click', () => {
            if (dir[k]?.chapter === chapter) {
                delete dir[k];
                sendMsg({ message: 'del-bookmark', id: k });
                render();
            } else {
                save();
            }
        });

        const bookmarkLi = mkEl('li', { className: 'bf-bookmark-item' });
        bookmarkLi.appendChild(bookmarkButton);
        const goLi = mkEl('li');
        goLi.appendChild(goButton);
        nav.append(bookmarkLi, goLi, statusLi);
        render();

        // "Bookmark new stories automatically": a work without a bookmark is bookmarked here.
        // "Bookmark follows your reading": a bookmark you have moves forward one chapter at a time (2 -> 3, never 1 -> 40).
        const savedChapter = dir[k]?.chapter || 0;
        const bookmarkNew = info.autoBookmarkNew && savedChapter === 0;
        const followReading = info.autoSave && savedChapter && chapter === savedChapter + 1;
        if (bookmarkNew || followReading) save();
    };

    const STYLE = `
.bf-bookmark { padding: 1px 6px; line-height: 1; vertical-align: middle; }
.bf-bookmark img { display: block; }
ul.actions li.bf-status { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; }
ul.actions li.bf-status select { width: auto; min-width: 0; }
li.blurb.bf-marked { background-color: #e1edff; }
.bf-mark { margin-right: 4px; vertical-align: -3px; }
`;

    const main = async () => {
        const keys = new Set();
        const current = workIdFrom(location.pathname);
        if (current) keys.add(key(current));
        document.querySelectorAll('li.blurb h4.heading a[href*="/works/"]').forEach((a) => {
            const workId = workIdFrom(a.getAttribute('href'));
            if (workId) keys.add(key(workId));
        });
        const [info, dir] = await Promise.all([
            chrome.storage.sync.get('settings').then((r) => r.settings || {}).catch(() => ({})),
            keys.size ? chrome.storage.local.get([...keys]).catch(() => ({})) : Promise.resolve({}),
        ]);
        if (info.ao3Enabled === false || !info.bookmarks) return;
        try {
            document.head.append(mkEl('style', { textContent: STYLE }));
            markBlurbs(info, dir);
            if (current) workPage(info, dir, current);
        } catch (error) {
            console.log('ao3.js did not run correctly, ', error);
        }
    };

    main();
})();
