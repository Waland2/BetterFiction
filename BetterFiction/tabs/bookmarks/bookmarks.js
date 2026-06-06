const tableBody = document.querySelector('tbody');
const bookmarkLinks = [];
const bookmarkForRow = new WeakMap();

const SELECT_TEMPLATE = (() => {
    const s = document.createElement('select');
    s.className = 'status-select';
    s.innerHTML =
        '<option value="Automatic">Automatic</option>' +
        '<option value="Planned">Planned</option>' +
        '<option value="Reading">Reading</option>' +
        '<option value="Completed">Completed</option>' +
        '<option value="Dropped">Dropped</option>';
    return s;
})();

const addTimeMs = new WeakMap();

function sortBookmarks(bookmarks, type, dir) {
    const getKey = type === 'addTime'
        ? (b => addTimeMs.get(b) ?? Infinity)
        : type === 'chapter'
            ? (b => +b.chapter)
            : (b => b[type]);

    const n = bookmarks.length;
    const keyed = new Array(n);
    for (let i = 0; i < n; i++) keyed[i] = { b: bookmarks[i], k: getKey(bookmarks[i]) };
    keyed.sort((a, b) => ((a.k > b.k) - (a.k < b.k)) * dir);
    for (let i = 0; i < n; i++) bookmarks[i] = keyed[i].b;
}

const clearRange = document.createRange();
function renderBookmarks(bookmarks) {
    const first = tableBody.firstChild;
    if (first && tableBody.lastChild !== first) {
        clearRange.setStartAfter(first);
        clearRange.setEndAfter(tableBody.lastChild);
        clearRange.deleteContents();
    }
    const fragment = document.createDocumentFragment();
    const n = bookmarks.length;
    for (let i = 0; i < n; i++) fragment.appendChild(createBookmarkRow(bookmarks[i]));
    tableBody.appendChild(fragment);
}

function findStatus(bookmark) {
    if (bookmark.status === 'Automatic') {
        if (bookmark.chapter === bookmark.chapters) return 'Completed';
        if (bookmark.chapter === 1) return 'Planned';
        return 'Reading';
    }
    return bookmark.status;
}

const ROW_TEMPLATE = (() => {
    const tr = document.createElement('tr');
    tr.className = 'table-row';
    tr.innerHTML =
        '<td></td>' +
        '<td><a></a></td>' +
        '<td></td>' +
        '<td></td>' +
        '<td></td>' +
        '<td class="status-cell"><span class="status-badge"></span></td>' +
        '<td></td>' +
        '<td class="options-cell">' +
        '<a href="#" class="change-link">Change status</a>' +
        '<span class="sep"> | </span>' +
        '<a href="#" class="delete-link">Delete</a>' +
        '</td>';
    return tr;
})();

function applyStatusBadge(badge, statusValue) {
    badge.className = `status-badge ${statusValue}`;
    badge.textContent = statusValue;
}

function createBookmarkRow(bookmark) {
    const tableRow = ROW_TEMPLATE.cloneNode(true);
    bookmarkForRow.set(tableRow, bookmark);
    const tds = tableRow.children;
    tds[0].textContent = bookmark.id;
    const a = tds[1].firstChild;
    a.href = `https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}`;
    a.textContent = bookmark.storyName;
    tds[2].textContent = `${bookmark.chapter}/${bookmark.chapters || '?'}`;
    tds[3].textContent = bookmark.fandom;
    tds[4].textContent = bookmark.author;
    applyStatusBadge(tds[5].firstChild, findStatus(bookmark));
    tds[6].textContent = bookmark.displayDate;
    return tableRow;
}

tableBody.addEventListener('click', (e) => {
    const target = e.target;
    const row = target.closest('tr');
    if (!row) return;
    const bookmark = bookmarkForRow.get(row);
    if (!bookmark) return;
    const id = bookmark.id;

    if (target.classList.contains('delete-link')) {
        e.preventDefault();
        chrome.storage.local.remove(id).catch(err =>
            console.error(`Failed to delete bookmark for story ${id}:`, err)
        );
        bookmarkForRow.delete(row);
        row.remove();
    } else if (target.classList.contains('change-link')) {
        e.preventDefault();
        target.style.display = 'none';
        const optionsCell = target.parentElement;
        const sep = optionsCell.children[1];
        const statusCell = row.children[5];

        const select = SELECT_TEMPLATE.cloneNode(true);
        select.value = bookmark.status;
        optionsCell.insertBefore(select, sep);

        select.addEventListener('change', () => {
            bookmark.status = select.value;
            applyStatusBadge(statusCell.firstChild, findStatus(bookmark));
            chrome.storage.local.set({ [id]: bookmark }).catch(err =>
                console.error(`Failed to update status for story ${id}:`, err)
            );
            select.remove();
            target.style.display = '';
        });
    }
});

// Load settings and bookmarks together
const settingsPromise = chrome.storage.sync.get('settings').catch((error) => {
    console.error('Failed to load settings from sync storage:', error);
    return {};
});

Promise.all([settingsPromise, chrome.storage.local.get()])
    .then(([syncResult, bookmarks]) => {
        const settings = syncResult.settings || {};
        const validFmt = window.validateDateFormat(settings.dateFormat) === null
            ? settings.dateFormat
            : window.DEFAULT_DATE_FORMAT;
        let needToUpdate = false;

        for (const key in bookmarks) {
            const bookmark = bookmarks[key];
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
                addTimeMs.set(bookmark, dateObj ? dateObj.getTime() : Infinity);
                bookmarkLinks.push(bookmark);
            }
        }

        if (needToUpdate) {
            chrome.storage.local.clear()
                .then(() => chrome.storage.local.set(bookmarks))
                .then(() => location.reload())
                .catch(console.error);
            return;
        }

        sortBookmarks(bookmarkLinks, 'addTime', 1);
        renderBookmarks(bookmarkLinks);

        // Hide organizer UI if it's off
        if (!settings.organizer) hideOrganizerUI();
    })
    .catch((error) => {
        console.error('Failed to load bookmarks from local storage:', error);
    });

// Export bookmarks
document.getElementById('export').addEventListener('click', () => {
    chrome.storage.local.get().then(result => {
        const blob = new Blob([JSON.stringify(result)], { type: 'application/json;charset=utf-8' });
        const link = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: 'bookmarks.json'
        });
        link.click();
    }).catch(e => console.error('Failed to export bookmarks to JSON file:', e));
});

// Import bookmarks
document.getElementById('import').addEventListener('click', () => {
    const fileInput = Object.assign(document.createElement('input'), { type: 'file' });

    fileInput.onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const jsonData = JSON.parse(await file.text());
            await chrome.storage.local.clear();
            await chrome.storage.local.set(jsonData);
            location.reload();
        } catch (err) {
            console.error('Failed to import bookmarks from JSON file:', err);
        }
    };

    fileInput.click();
});

// Sorting
const sortHeaders = document.querySelectorAll('th[data-sort-type]');
let activeSortHeader = document.querySelector('th.active');
sortHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const sortType = header.getAttribute('data-sort-type');
        const sortDirection = header.classList.toggle('descending') ? -1 : 1;

        if (activeSortHeader && activeSortHeader !== header) activeSortHeader.classList.remove('active');
        header.classList.add('active');
        activeSortHeader = header;

        try {
            sortBookmarks(bookmarkLinks, sortType, sortDirection);
            renderBookmarks(bookmarkLinks);
        } catch (e) {
            console.error('Failed to update bookmark table sorting:', e);
        }
    });
});

function filterBookmarks(status) {
    if (status === 'All') {
        renderBookmarks(bookmarkLinks);
    } else if (status === 'Automatic') {
        renderBookmarks(bookmarkLinks.filter(b => b.status === 'Automatic'));
    } else {
        renderBookmarks(bookmarkLinks.filter(b => findStatus(b) === status));
    }
}


const FILTER_MAP = {
    'filter-all': 'All',
    'filter-automatic': 'Automatic',
    'filter-planned': 'Planned',
    'filter-reading': 'Reading',
    'filter-completed': 'Completed',
    'filter-dropped': 'Dropped',
};

let activeFilterBtn = null;
function setFilterActive(btn) {
    if (activeFilterBtn) activeFilterBtn.classList.remove('filter-active');
    activeFilterBtn = btn;
    if (btn) btn.classList.add('filter-active');
}

document.querySelectorAll('.filters .filter-btn').forEach(btn => {
    const status = FILTER_MAP[btn.id];
    if (!status) return;
    btn.addEventListener('click', () => {
        setFilterActive(btn);
        filterBookmarks(status);
    });
    if (btn.id === 'filter-all') setFilterActive(btn);
});


function hideOrganizerUI() {
    if (document.getElementById('bf-organizer-off')) return;
    const style = Object.assign(document.createElement('style'), {
        id: 'bf-organizer-off',
        textContent: '.filters,th[data-sort-type="status"],.status-cell,.options-cell .change-link,.options-cell .sep{display:none!important;}'
    });
    document.head.appendChild(style);
}
