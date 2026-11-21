const STATUSES = ['Automatic', 'Planned', 'Reading', 'Completed', 'Dropped'];

const listEl = document.getElementById('list');
const tableWrapEl = document.getElementById('table-wrap');
const rowsEl = document.getElementById('rows');
const sortHeaders = document.querySelectorAll('th[data-sort-type]');
const viewButtons = document.querySelectorAll('.view-switch .view');
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
let autoStatus = false;
let activeStatus = 'All';
const addTimeMs = new WeakMap();
const searchText = new WeakMap();
/** The last removed bookmark, kept so it can be restored with Undo. */
let lastRemoved = null;
/** Current order: what to sort by, and 1 (ascending) or -1 (descending). Oldest first, as before. */
let sortType = 'addTime';
let sortDir = 1;

const VIEW_KEY = 'betterfiction-bookmarks-view';
/**
 * The layout to use: the one chosen on this device, or cards on small screens and the table elsewhere.
 * @returns {'table'|'cards'}
 */
const savedView = () => {
    try {
        const view = localStorage.getItem(VIEW_KEY);
        if (view === 'table' || view === 'cards') return view;
    } catch (error) {
        // storage blocked: use the default
    }
    return window.matchMedia('(max-width: 700px)').matches ? 'cards' : 'table';
};
let view = savedView();

/**
 * The status to show: "Automatic" is worked out from the reading progress.
 * @param {Object} bookmark
 * @returns {string}
 */
const findStatus = (bookmark) => {
    if (bookmark.status === 'Automatic') {
        if (!autoStatus) return 'Reading';
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
    if (status === 'Automatic') return autoStatus && bookmark.status === 'Automatic';
    return findStatus(bookmark) === status;
};

/**
 * The address to open a bookmark: the saved AO3 chapter, or the FanFiction.net chapter.
 * @param {Object} bookmark
 * @returns {string}
 */
const linkOf = (bookmark) => {
    if (bookmark.site === 'ao3') {
        return bookmark.url?.startsWith('https://archiveofourown.org/')
            ? bookmark.url
            : `https://archiveofourown.org/works/${String(bookmark.id).replace(/^ao3-/, '')}`;
    }
    return `https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}`;
};

/** A small "AO3" tag shown next to the title of AO3 works. */
const siteTag = (bookmark) => (bookmark.site === 'ao3'
    ? Object.assign(document.createElement('span'), { className: 'site-tag', textContent: 'AO3' })
    : null);

/**
 * The bookmark as it is stored (without the values only used on this page).
 * @param {Object} bookmark
 * @returns {Object}
 */
const stored = (bookmark) => {
    const { displayDate, ...rest } = bookmark;
    return rest;
};

/** Sort menu choices, as [what to sort by, direction]. */
const SORT_CHOICES = {
    newest: ['addTime', -1],
    oldest: ['addTime', 1],
    storyName: ['storyName', 1],
    author: ['author', 1],
    fandom: ['fandom', 1],
    progress: ['progress', -1],
};

/** The value each bookmark is sorted by. */
const SORT_KEYS = {
    addTime: (b) => addTimeMs.get(b) ?? Infinity,
    id: (b) => Number(b.id) || 0,
    chapter: (b) => Number(b.chapter) || 0,
    progress: (b) => (Number(b.chapter) || 0) / (Number(b.chapters) || Number(b.chapter) || 1),
    status: (b) => findStatus(b),
};

/**
 * Sorts bookmarks by the current order.
 * @param {Object[]} list
 */
const sortList = (list) => {
    const getKey = SORT_KEYS[sortType] || ((b) => String(b[sortType] || '').toLowerCase());
    const keyed = list.map((b) => ({ b, k: getKey(b) }));
    keyed.sort((x, y) => ((x.k > y.k) - (x.k < y.k)) * sortDir);
    keyed.forEach((item, i) => { list[i] = item.b; });
};

/**
 * Shows the current order in the table headers and the sort menu.
 */
const showSortState = () => {
    sortHeaders.forEach((header) => {
        const on = header.dataset.sortType === sortType;
        header.classList.toggle('active', on);
        header.classList.toggle('descending', on && sortDir === -1);
        header.setAttribute('aria-sort', on ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
    });
    const choice = Object.keys(SORT_CHOICES)
        .find((key) => SORT_CHOICES[key][0] === sortType && SORT_CHOICES[key][1] === sortDir);
    sortEl.value = choice || '';
};

const ROW_TEMPLATE = (() => {
    const tr = document.createElement('tr');
    tr.className = 'table-row';
    for (let i = 0; i < 8; i++) tr.appendChild(document.createElement('td'));
    tr.children[1].appendChild(document.createElement('a'));
    tr.children[5].className = 'status-cell';
    tr.children[5].appendChild(Object.assign(document.createElement('span'), { className: 'status-badge' }));
    tr.children[6].className = 'date-cell';
    const options = tr.children[7];
    options.className = 'options-cell';
    options.append(
        Object.assign(document.createElement('button'), { type: 'button', className: 'link-button change-link', textContent: 'Change status' }),
        Object.assign(document.createElement('span'), { className: 'sep', textContent: ' | ' }),
        Object.assign(document.createElement('button'), { type: 'button', className: 'link-button delete-link', textContent: 'Delete' }),
    );
    return tr;
})();

/**
 * Builds the table row for one bookmark (the same columns as before).
 * @param {Object} bookmark
 * @returns {HTMLTableRowElement}
 */
const createRow = (bookmark) => {
    const row = ROW_TEMPLATE.cloneNode(true);
    const cells = row.children;
    cells[0].textContent = bookmark.id;
    const link = cells[1].firstChild;
    link.href = linkOf(bookmark);
    link.textContent = bookmark.storyName;
    const tag = siteTag(bookmark);
    if (tag) link.after(' ', tag);
    cells[2].textContent = `${bookmark.chapter}/${bookmark.chapters || '?'}`;
    cells[3].textContent = bookmark.fandom || '';
    cells[4].textContent = bookmark.author || '';
    const badge = cells[5].firstChild;
    const status = findStatus(bookmark);
    badge.className = `status-badge ${status}`;
    badge.textContent = status;
    cells[6].textContent = bookmark.displayDate;

    const change = row.querySelector('.change-link');
    change.addEventListener('click', () => {
        change.hidden = true;
        const select = Object.assign(document.createElement('select'), { className: 'status-select' });
        select.setAttribute('aria-label', 'Status');
        STATUSES.forEach((value) => select.append(new Option(value, value)));
        select.value = STATUSES.includes(bookmark.status) ? bookmark.status : 'Reading';
        change.after(select);
        select.focus();
        select.addEventListener('change', () => changeStatus(bookmark, select.value));
    });
    row.querySelector('.delete-link').addEventListener('click', () => removeBookmark(bookmark));
    return row;
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
    const link = linkOf(bookmark);
    const title = card.querySelector('.title');
    title.href = link;
    title.textContent = bookmark.storyName;
    const tag = siteTag(bookmark);
    if (tag) title.after(tag);

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
    select.value = STATUSES.includes(bookmark.status) ? bookmark.status : 'Reading';
    select.addEventListener('change', () => changeStatus(bookmark, select.value));

    card.querySelector('.added').textContent = bookmark.displayDate === '-' ? '' : `Added ${bookmark.displayDate}`;
    card.querySelector('.remove').addEventListener('click', () => removeBookmark(bookmark));
    return card;
};

const changeStatus = async (bookmark, status) => {
    try {
        const { result } = await chrome.runtime.sendMessage({
            message: 'set-status', id: bookmark.id, status, existingOnly: true,
        });
        if (!result.ok) throw new Error('Status could not be saved');
        Object.assign(bookmark, result.bookmark);
    } catch (error) {
        console.error(`Failed to update status for story ${bookmark.id}:`, error);
        noticeTextEl.textContent = 'Could not change the status. Reload bookmarks and try again.';
        undoEl.hidden = true;
        noticeEl.hidden = false;
    }
    render();
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
        if (autoStatus && bookmark.status === 'Automatic') counts.Automatic++;
        if (matchesStatus(bookmark, activeStatus)) shown.push(bookmark);
    }
    sortList(shown);

    const fragment = document.createDocumentFragment();
    const create = view === 'table' ? createRow : createCard;
    shown.forEach((bookmark) => fragment.appendChild(create(bookmark)));
    (view === 'table' ? rowsEl : listEl).replaceChildren(fragment);
    (view === 'table' ? listEl : rowsEl).replaceChildren();
    tableWrapEl.hidden = view !== 'table' || shown.length === 0;
    listEl.hidden = view !== 'cards';
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    showSortState();

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
        autoStatus = !!(settings.bookmarks && settings.autoStatus);
        if (!autoStatus) {
            STATUSES.splice(STATUSES.indexOf('Automatic'), 1);
            CARD_TEMPLATE.querySelector('option[value="Automatic"]').remove();
            document.querySelector('[data-status="Automatic"]').hidden = true;
        }
        const validFmt = window.validateDateFormat(settings.dateFormat) === null
            ? settings.dateFormat
            : window.DEFAULT_DATE_FORMAT;
        const loaded = [];

        for (const key in saved) {
            const value = saved[key];
            if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
            // Normalize a copy for display; simply opening this page must never rewrite storage.
            const bookmark = { ...value };
            if (!bookmark.fandom && bookmark.fandomName) {
                bookmark.fandom = bookmark.fandomName;
            }

            if (!bookmark.id) bookmark.id = bookmark.storyId || key;

            if (typeof bookmark.addTime === 'string' && bookmark.addTime.includes('/')) {
                const [day, month, year] = bookmark.addTime.split('/');
                const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
                if (!Number.isNaN(date.getTime())) bookmark.addTime = date.toISOString();
            }

            if (!('status' in bookmark)) {
                bookmark.status = autoStatus ? 'Automatic' : 'Reading';
            }

            if (bookmark.storyName) {
                const dateObj = bookmark.addTime && bookmark.addTime !== '-' ? new Date(bookmark.addTime) : null;
                const validDate = dateObj && !Number.isNaN(dateObj.getTime());
                bookmark.displayDate = validDate ? window.formatDate(dateObj, validFmt) : '-';
                addTimeMs.set(bookmark, validDate ? dateObj.getTime() : undefined);
                searchText.set(bookmark, [bookmark.storyName, bookmark.author, bookmark.fandom, bookmark.site === 'ao3' ? 'ao3' : '']
                    .join(' ').toLowerCase());
                loaded.push(bookmark);
            }
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
sortEl.addEventListener('change', () => {
    [sortType, sortDir] = SORT_CHOICES[sortEl.value] || SORT_CHOICES.oldest;
    render();
});

// Clicking a table header sorts by that column; clicking it again reverses the order
sortHeaders.forEach((header) => {
    header.addEventListener('click', () => {
        const type = header.dataset.sortType;
        sortDir = type === sortType ? -sortDir : 1;
        sortType = type;
        render();
    });
});

// Table or cards; the choice is remembered on this device
viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
        view = button.dataset.view;
        try {
            localStorage.setItem(VIEW_KEY, view);
        } catch (error) {
            // storage blocked: the choice lasts until the page is closed
        }
        render();
    });
});

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
            for (const [key, bookmark] of Object.entries(jsonData)) {
                if (!/^\d+$/.test(key) || !bookmark || typeof bookmark !== 'object' || Array.isArray(bookmark)
                    || String(bookmark.id ?? bookmark.storyId) !== key
                    || (bookmark.chapter !== undefined && (!Number.isInteger(Number(bookmark.chapter)) || Number(bookmark.chapter) < 1))
                    || (bookmark.storyName !== undefined && typeof bookmark.storyName !== 'string')
                    || (bookmark.chapter === undefined && typeof bookmark.status !== 'string')) {
                    throw new Error('The file contains an invalid bookmark.');
                }
            }
            const count = Object.values(jsonData).filter((b) => b && b.storyName).length;
            const ok = window.confirm(`Replace your ${bookmarks.length} bookmarks with the ${count} in this file?`);
            if (!ok) return;
            const previous = await chrome.storage.local.get();
            await chrome.storage.local.set(jsonData);
            const removedKeys = Object.keys(previous).filter((key) => /^\d+$/.test(key) && !Object.hasOwn(jsonData, key));
            if (removedKeys.length) await chrome.storage.local.remove(removedKeys);
            location.reload();
        } catch (error) {
            console.error('Failed to import bookmarks from JSON file:', error);
            noticeTextEl.textContent = 'Import did not finish. Export your current bookmarks before retrying, and check that the file was saved with Export.';
            undoEl.hidden = true;
            noticeEl.hidden = false;
        }
    });

    fileInput.addEventListener('cancel', () => fileInput.remove());
    fileInput.click();
});
