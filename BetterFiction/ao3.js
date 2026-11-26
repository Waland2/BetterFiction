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
    // On a dark page (BetterFiction's dark mode, or a dark skin like Reversi): a white outline and brighter
    // fills, the same as on FanFiction.net
    const DARK_FILLS = { '#096dd9': '#4ea4ff', '#d48806': '#ffc04d', '#389e0d': '#73d13d', '#cf1322': '#ff7875' };
    const darkPage = () => ['bf-ao3-dark', 'bf-dark-skin'].some((c) => document.documentElement.classList.contains(c));
    const bookmarkIcon = (color) => {
        const dark = darkPage();
        return 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
            + `<path d="m6 4v16l6-2 6 2V4z" fill="${dark ? DARK_FILLS[color] || color : color}" stroke="${dark ? '#ffffff' : '#333298'}" stroke-width="2"/></svg>`);
    };
    /** A bookmark icon that repaints itself when dark mode is switched on or off. */
    const bookmarkImg = (color, props) => {
        const img = mkEl('img', { ...props, src: bookmarkIcon(color) });
        img.dataset.bfColor = color;
        return img;
    };
    const repaintIcons = () => document.querySelectorAll('img[data-bf-color]').forEach((img) => {
        img.src = bookmarkIcon(img.dataset.bfColor);
    });

    /**
     * The colour of a bookmark, from its reading status (blue when Reading status is off).
     * @param {Object} info - Settings.
     * @param {Object} [entry] - The saved bookmark.
     * @param {number} chapters - Chapters published so far.
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

    // The same as FanFiction.net: "Automatic" only when automatic status is on
    const bookmarkStatus = (info, status) => {
        if (status && status !== 'Automatic' && STATUSES.includes(status)) return status;
        return info.bookmarks && info.autoStatus ? 'Automatic' : 'Reading';
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
            link.before(bookmarkImg(bookmarkColor(info, entry, chapters), {
                className: 'bf-mark',
                width: 18,
                height: 18,
                alt: '',
                title: `Bookmarked at chapter ${entry.chapter}`,
            }));
            // Keep the chapter count up to date, as on FanFiction.net
            if (entry.chapters !== chapters) {
                entry.chapters = chapters;
                sendMsg({ message: 'set-bookmark', id: key(workId), chapters, existingOnly: true });
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
     * Adds the work to your AO3 bookmarks with empty notes, using the bookmark form AO3 puts on every work page
     * (it carries your session's security token). Does nothing if the work is already bookmarked on AO3:
     * the form then edits your existing bookmark, which is left as it is.
     * @param {boolean} makePrivate
     * @returns {Promise<'added'|'already'>}
     */
    const addAo3Bookmark = async (makePrivate) => {
        const form = document.querySelector('#bookmark-form form');
        const action = form?.getAttribute('action') || '';
        if (!form || !/\/works\/\d+\/bookmarks\/?$/.test(action) || form.dataset.bfAdded) return 'already';
        const data = new FormData(form);
        data.set('bookmark[bookmarker_notes]', '');
        // AO3's checkboxes send a hidden "0" then "1" when ticked; it reads the last value
        data.delete('bookmark[private]');
        data.append('bookmark[private]', '0');
        if (makePrivate) data.append('bookmark[private]', '1');
        data.delete('bookmark[rec]');
        data.append('bookmark[rec]', '0');
        const init = {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: new URLSearchParams(data).toString(),
        };
        const url = new URL(action, location.origin).href;
        // Firefox: sent as the page itself (content.fetch), like AO3's own form; Chrome's content-script fetch already is
        const pageFetch = typeof content !== 'undefined' && typeof content?.fetch === 'function' && typeof cloneInto === 'function';
        const response = pageFetch ? await content.fetch(url, cloneInto(init, content)) : await fetch(url, init);
        if (!response.ok) throw new Error(`AO3 answered ${response.status}`);
        form.dataset.bfAdded = '1';
        const link = document.querySelector('li.bookmark a.bookmark_form_placement_open');
        if (link) link.textContent = 'Edit Bookmark';
        return 'added';
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
            STATUSES.filter((status) => status !== 'Automatic' || info.autoStatus)
                .forEach((status) => statusSelect.append(new Option(status, status)));
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
            bookmarkButton.replaceChildren(bookmarkImg(here ? bookmarkColor(info, entry, chapters) : 'none', {
                width: 22, height: 22, alt: '',
            }));
            bookmarkButton.title = here ? 'Remove the bookmark' : `Bookmark chapter ${chapter}`;
            bookmarkButton.setAttribute('aria-label', bookmarkButton.title);
            bookmarkButton.setAttribute('aria-pressed', String(here));
            goButton.parentElement.style.display = entry?.chapter ? '' : 'none';
            statusLi.style.display = entry?.chapter && statusSelect ? '' : 'none';
            if (statusSelect) statusSelect.value = bookmarkStatus(info, entry?.status);
            if (info.lastRead) showLastRead(document.querySelector('dl.work.meta dl.stats'), entry, workId);
        };

        const noteLi = mkEl('li', { className: 'bf-note' });
        noteLi.setAttribute('role', 'status');
        noteLi.hidden = true;
        const showNote = (text) => {
            noteLi.textContent = text;
            noteLi.hidden = false;
            setTimeout(() => { noteLi.hidden = true; }, 6000);
        };

        // manual: you tapped the bookmark button (automatic bookmarking never adds AO3 bookmarks)
        const save = (manual = false) => {
            const status = bookmarkStatus(info, dir[k]?.status);
            const addTime = dir[k]?.addTime || new Date().toISOString();
            dir[k] = {
                id: k, chapter, chapters, fandom, author, storyName, addTime, status, site: 'ao3', url,
            };
            sendMsg({ ...dir[k], message: 'set-bookmark' });
            render();
            if (manual && info.ao3AutoBookmark) {
                addAo3Bookmark(Boolean(info.ao3BookmarkPrivate))
                    .then((result) => {
                        if (result === 'added') showNote(info.ao3BookmarkPrivate ? 'Added to your AO3 bookmarks (private)' : 'Added to your AO3 bookmarks');
                    })
                    .catch((error) => {
                        console.error('BetterFiction: the AO3 bookmark could not be added', error);
                        showNote("Couldn't add the AO3 bookmark. Use AO3's Bookmark button instead.");
                    });
            }
        };

        bookmarkButton.addEventListener('click', async () => {
            if (dir[k]?.chapter === chapter) {
                // Removed only if it's still at this chapter (another tab may have moved it)
                const entry = dir[k];
                const { result } = await sendMsg({ message: 'del-bookmark', id: k, chapter });
                if (!result?.ok || dir[k] !== entry) return;
                if (result.bookmark) dir[k] = result.bookmark;
                else delete dir[k];
                render();
            } else {
                save(true);
            }
        });

        const bookmarkLi = mkEl('li', { className: 'bf-bookmark-item' });
        bookmarkLi.appendChild(bookmarkButton);
        const goLi = mkEl('li');
        goLi.appendChild(goButton);
        nav.append(bookmarkLi, goLi, statusLi, noteLi);
        render();

        // "Bookmark new stories automatically": a work without a bookmark is bookmarked here.
        // "Bookmark follows your reading": a bookmark you have moves forward one chapter at a time (2 -> 3, never 1 -> 40).
        const savedChapter = dir[k]?.chapter || 0;
        const bookmarkNew = info.autoBookmarkNew && savedChapter === 0;
        const followReading = info.autoSave && savedChapter && chapter === savedChapter + 1;
        if (bookmarkNew || followReading) save();
    };

    /** "BetterFiction Bookmarks" in AO3's red menu bar, and in your "Hi, name!" menu after My Bookmarks. */
    const bookmarksLinks = () => {
        const item = () => {
            const link = mkEl('a', { href: chrome.runtime.getURL('tabs/bookmarks/bookmarks.html'), textContent: 'BetterFiction Bookmarks' });
            link.prepend(mkEl('img', { src: chrome.runtime.getURL('icons/bookmarks.svg'), width: 16, height: 16, alt: '', className: 'bf-menu-icon' }));
            const li = mkEl('li', { className: 'bf-bookmarks-link' });
            li.append(link);
            return li;
        };
        const menu = document.querySelector('#header ul.primary.navigation.actions');
        if (menu && !menu.querySelector('.bf-bookmarks-link')) menu.append(item());
        const userMenu = document.querySelector('#greeting ul.user .dropdown .menu');
        if (userMenu && !userMenu.querySelector('.bf-bookmarks-link')) {
            const mine = Array.from(userMenu.children).find((li) => /\/bookmarks$/.test(li.querySelector('a')?.getAttribute('href') || ''));
            if (mine) mine.after(item());
            else userMenu.append(item());
        }
    };

    const STYLE = `
.bf-bookmark { padding: 1px 6px; line-height: 1; vertical-align: middle; }
.bf-bookmark img { display: block; }
ul.actions li.bf-status { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; }
ul.actions li.bf-status select { width: auto; min-width: 0; }
li.blurb.bf-marked { background-color: rgba(24, 144, 255, 0.13) !important; }
.bf-dark-skin li.blurb.bf-marked, .bf-ao3-dark li.blurb.bf-marked { background-color: rgba(0, 40, 90, 0.35) !important; }
.bf-menu-icon { display: inline; vertical-align: -3px; margin-right: 5px; border-radius: 3px; }
ul.actions li.bf-note { vertical-align: middle; font-style: italic; }
.bf-mark { margin-right: 4px; vertical-align: -3px; }
`;

    /**
     * Whether the works are shown on a dark background (a dark AO3 skin, like Reversi). Marked works then get a
     * darker tint instead of a lighter one, so AO3's light text and links stay readable.
     * @returns {boolean}
     */
    const darkSkin = () => {
        if (document.documentElement.classList.contains('bf-ao3-dark')) return false; // BetterFiction's own dark mode, not a skin
        const sample = [document.querySelector('li.blurb'), document.body, document.documentElement]
            .map((node) => node && getComputedStyle(node).backgroundColor)
            .find((color) => color && !/^rgba\(\d+, \d+, \d+, 0\)$|^transparent$/.test(color));
        const [r, g, b] = (sample?.match(/\d+/g) || [255, 255, 255]).map(Number);
        return 0.299 * r + 0.587 * g + 0.114 * b < 128;
    };

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
            if (darkSkin()) document.documentElement.classList.add('bf-dark-skin');
            // Dark mode can be switched on or off while the page is open
            new MutationObserver(repaintIcons).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            bookmarksLinks();
            markBlurbs(info, dir);
            if (current) workPage(info, dir, current);
        } catch (error) {
            console.log('ao3.js did not run correctly, ', error);
        }
    };

    main();
})();
