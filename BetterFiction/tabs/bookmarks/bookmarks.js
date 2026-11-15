const STATUSES = ['Automatic', 'Planned', 'Reading', 'Completed', 'Dropped'];

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const countEl = document.getElementById('count');
const searchEl = document.getElementById('search');
const sortEl = document.getElementById('sort');
const filterButtons = document.querySelectorAll('#filters .filter');
const noticeEl = document.getElementById('notice');
const noticeTextEl = document.getElementById('notice-text');
const undoEl = document.getElementById('undo');

/** All bookmarks shown on the page. */
let bookmarks = [];
let showStatus = true;
let activeStatus = 'All';
const addTimeMs = new WeakMap();
const searchText = new WeakMap();
/** The last removed bookmark, kept so it can be restored with Undo. */
let lastRemoved = null;

/**
 * The status to show: "Automatic" is worked out from the reading progress.
 * @param {Object} bookmark
 * @returns {string}
 */
const findStatus = (bookmark) => {
    if (bookmark.status === 'Automatic') {
        if (bookmark.chapter === bookmark.chapters) return 'Completed';
        if (bookmark.chapter === 1) return 'Planned';
        return 'Reading';
    }
    return bookmark.status;
};

/**
 * Whether a bookmark belongs under a status filter ("Automatic" means the setting itself).
 * @param {Object} bookmark
 * @param {string} status
 * @returns {boolean}
 */
const matchesStatus = (bookmark, status) => {
    if (status === 'All') return true;
    if (status === 'Automatic') return bookmark.status === 'Automatic';
    return findStatus(bookmark) === status;
};

/**
 * The bookmark as it is stored (without the values only used on this page).
 * @param {Object} bookmark
 * @returns {Object}
 */
const stored = (bookmark) => {
    const { displayDate, ...rest } = bookmark;
    return rest;
};

const SORTS = {
    newest: (a, b) => (addTimeMs.get(b) ?? -Infinity) - (addTimeMs.get(a) ?? -Infinity),
    oldest: (a, b) => (addTimeMs.get(a) ?? Infinity) - (addTimeMs.get(b) ?? Infinity),
    storyName: (a, b) => String(a.storyName || '').localeCompare(String(b.storyName || '')),
    author: (a, b) => String(a.author || '').localeCompare(String(b.author || '')),
    fandom: (a, b) => String(a.fandom || '').localeCompare(String(b.fandom || '')),
    progress: (a, b) => (b.chapter / (b.chapters || b.chapter)) - (a.chapter / (a.chapters || a.chapter)),
};

const CARD_TEMPLATE = (() => {
    const li = document.createElement('li');
    li.className = 'entry';
    const top = Object.assign(document.createElement('div'), { className: 'entry-top' });
    const title = Object.assign(document.createElement('a'), { className: 'title' });
    const badge = Object.assign(document.createElement('span'), { className: 'status-badge' });
    top.append(title, badge);
    const meta = Object.assign(document.createElement('p'), { className: 'meta' });
    const progress = Object.assign(document.createElement('div'), { className: 'progress' });
    const bar = Object.assign(document.createElement('div'), { className: 'bar' });
    bar.appendChild(document.createElement('span'));
    const progressText = Object.assign(document.createElement('span'), { className: 'progress-text' });
    progress.append(bar, progressText);
    const actions = Object.assign(document.createElement('div'), { className: 'actions' });
    const cont = Object.assign(document.createElement('a'), { className: 'button continue' });
    const statusLabel = Object.assign(document.createElement('label'), { className: 'status-label' });
    const select = Object.assign(document.createElement('select'), { className: 'status-select' });
    select.setAttribute('aria-label', 'Status');
    STATUSES.forEach((status) => select.append(new Option(status, status)));
    statusLabel.append('Status ', select);
    const added = Object.assign(document.createElement('span'), { className: 'added' });
    const remove = Object.assign(document.createElement('button'), {
        type: 'button', className: 'link-button remove', textContent: 'Delete',
    });
    actions.append(cont, statusLabel, added, remove);
    li.append(top, meta, progress, actions);
    return li;
})();

/**
 * Builds the card for one bookmark.
 * @param {Object} bookmark
 * @returns {HTMLLIElement}
 */
const createCard = (bookmark) => {
    const card = CARD_TEMPLATE.cloneNode(true);
    const link = `https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}`;
    const title = card.querySelector('.title');
    title.href = link;
    title.textContent = bookmark.storyName;

    const badge = card.querySelector('.status-badge');
    const status = findStatus(bookmark);
    badge.className = `status-badge ${status}`;
    badge.textContent = status;

    card.querySelector('.meta').textContent = [bookmark.author && `by ${bookmark.author}`, bookmark.fandom]
        .filter(Boolean).join(' · ');

    const chapters = Number(bookmark.chapters) || 0;
    const percent = chapters ? Math.min(100, Math.round((bookmark.chapter / chapters) * 100)) : 0;
    card.querySelector('.bar span').style.width = `${percent}%`;
    card.querySelector('.progress-text').textContent = `Chapter ${bookmark.chapter} of ${chapters || '?'}`;

    const cont = card.querySelector('.continue');
    cont.href = link;
    cont.textContent = `Continue at chapter ${bookmark.chapter}`;

    const select = card.querySelector('.status-select');
    select.value = STATUSES.includes(bookmark.status) ? bookmark.status : 'Automatic';
    select.addEventListener('change', () => {
        bookmark.status = select.value;
        chrome.storage.local.set({ [bookmark.id]: stored(bookmark) })
            .catch((error) => {
                console.error(`Failed to update status for story ${bookmark.id}:`, error);
            });
        render();
    });

    card.querySelector('.added').textContent = bookmark.displayDate === '-' ? '' : `Added ${bookmark.displayDate}`;
    card.querySelector('.remove').addEventListener('click', () => removeBookmark(bookmark));
    return card;
};

/**
 * Shows the bookmarks that match the search and the status filter, in the chosen order.
 */
const render = () => {
    const query = searchEl.value.trim().toLowerCase();
    const counts = Object.fromEntries(['All', ...STATUSES].map((status) => [status, 0]));
    const shown = [];
    for (const bookmark of bookmarks) {
        if (query && !searchText.get(bookmark).includes(query)) continue;
        counts.All++;
        counts[findStatus(bookmark)]++;
        if (bookmark.status === 'Automatic') counts.Automatic++;
        if (matchesStatus(bookmark, activeStatus)) shown.push(bookmark);
    }
    shown.sort(SORTS[sortEl.value] || SORTS.newest);

    const fragment = document.createDocumentFragment();
    shown.forEach((bookmark) => fragment.appendChild(createCard(bookmark)));
    listEl.replaceChildren(fragment);

    filterButtons.forEach((button) => {
        button.querySelector('span').textContent = counts[button.dataset.status];
    });
    const total = bookmarks.length;
    countEl.textContent = `${total} ${total === 1 ? 'story' : 'stories'} bookmarked`;
    emptyEl.hidden = shown.length > 0;
    if (!total) emptyEl.textContent = 'No bookmarks yet. Use the bookmark button on any chapter to save your place.';
    else if (query) emptyEl.textContent = `Nothing matches "${searchEl.value.trim()}".`;
    else emptyEl.textContent = `No ${activeStatus.toLowerCase()} stories.`;
};

/**
 * Deletes a bookmark, with a notice that offers Undo.
 * @param {Object} bookmark
 */
const removeBookmark = (bookmark) => {
    bookmarks = bookmarks.filter((b) => b !== bookmark);
    lastRemoved = bookmark;
    chrome.storage.local.remove(bookmark.id)
        .catch((error) => {
            console.error(`Failed to delete bookmark for story ${bookmark.id}:`, error);
        });
    noticeTextEl.textContent = `Deleted "${bookmark.storyName}".`;
    undoEl.hidden = false;
    noticeEl.hidden = false;
    render();
};

undoEl.addEventListener('click', () => {
    if (!lastRemoved) return;
    const bookmark = lastRemoved;
    lastRemoved = null;
    bookmarks.push(bookmark);
    chrome.storage.local.set({ [bookmark.id]: stored(bookmark) })
        .catch((error) => {
            console.error(`Failed to restore bookmark for story ${bookmark.id}:`, error);
        });
    noticeEl.hidden = true;
    render();
});

/**
 * Hides the status filters, badges and menus when the reading status setting is off.
 */
const hideOrganizerUI = () => {
    showStatus = false;
    document.body.classList.add('hide-status');
};

// Load settings and bookmarks together
const settingsPromise = chrome.storage.sync.get('settings').catch((error) => {
    console.error('Failed to load settings from sync storage:', error);
    return {};
});

Promise.all([settingsPromise, chrome.storage.local.get()])
    .then(([syncResult, saved]) => {
        const settings = syncResult.settings || {};
        const validFmt = window.validateDateFormat(settings.dateFormat) === null
            ? settings.dateFormat
            : window.DEFAULT_DATE_FORMAT;
        let needToUpdate = false;
        const loaded = [];

        for (const key in saved) {
            const bookmark = saved[key];
            if (bookmark.fandomName) {
                bookmark.fandom = bookmark.fandomName;
                delete bookmark.fandomName;
                needToUpdate = true;
            }

            if (bookmark.storyId) {
                bookmark.id = bookmark.storyId;
                delete bookmark.storyId;
                needToUpdate = true;
            }

            if (bookmark.addTime?.includes('/')) {
                const [day, month, year] = bookmark.addTime.split('/');
                bookmark.addTime = new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
                needToUpdate = true;
            }

            if (!('status' in bookmark)) {
                bookmark.status = 'Automatic';
                needToUpdate = true;
            }

            if (bookmark.storyName) {
                const dateObj = bookmark.addTime && bookmark.addTime !== '-' ? new Date(bookmark.addTime) : null;
                bookmark.displayDate = dateObj ? window.formatDate(dateObj, validFmt) : '-';
                addTimeMs.set(bookmark, dateObj ? dateObj.getTime() : undefined);
                searchText.set(bookmark, [bookmark.storyName, bookmark.author, bookmark.fandom]
                    .join(' ').toLowerCase());
                loaded.push(bookmark);
            }
        }

        if (needToUpdate) {
            chrome.storage.local.clear()
                .then(() => chrome.storage.local.set(saved))
                .then(() => location.reload())
                .catch(console.error);
            return;
        }

        bookmarks = loaded;
        // Hide organizer UI if it's off
        if (!settings.organizer) hideOrganizerUI();
        render();
    })
    .catch((error) => {
        console.error('Failed to load bookmarks from local storage:', error);
    });

searchEl.addEventListener('input', render);
sortEl.addEventListener('change', render);

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        activeStatus = button.dataset.status;
        filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        render();
    });
});

// Export bookmarks
document.getElementById('export').addEventListener('click', () => {
    chrome.storage.local.get()
        .then((result) => {
            const blob = new Blob([JSON.stringify(result)], { type: 'application/json;charset=utf-8' });
            const link = Object.assign(document.createElement('a'), {
                href: URL.createObjectURL(blob),
                download: 'bookmarks.json',
            });
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        })
        .catch((error) => {
            console.error('Failed to export bookmarks to JSON file:', error);
        });
});

// Import bookmarks (replaces the current ones, so it asks first)
document.getElementById('import').addEventListener('click', () => {
    const fileInput = Object.assign(document.createElement('input'), {
        type: 'file',
        accept: '.json,application/json',
        hidden: true,
    });
    // Kept in the page while the file picker is open, so the browser can't discard it before a file is chosen
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        fileInput.remove();
        if (!file) return;
        try {
            const jsonData = JSON.parse(await file.text());
            if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) {
                throw new Error('The file is not a bookmarks file.');
            }
            const count = Object.values(jsonData).filter((b) => b && b.storyName).length;
            const ok = window.confirm(`Replace your ${bookmarks.length} bookmarks with the ${count} in this file?`);
            if (!ok) return;
            await chrome.storage.local.clear();
            await chrome.storage.local.set(jsonData);
            location.reload();
        } catch (error) {
            console.error('Failed to import bookmarks from JSON file:', error);
            noticeTextEl.textContent = 'That file could not be imported. Choose a file saved with Export.';
            undoEl.hidden = true;
            noticeEl.hidden = false;
        }
    });

    fileInput.addEventListener('cancel', () => fileInput.remove());
    fileInput.click();
});
