const tableBody = document.querySelector('tbody');
const bookmarkLinks = [];
const bookmarkForRow = new WeakMap();

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_OPTIONS_HTML =
    '<option value="Automatic">Automatic</option>' +
    '<option value="Planned">Planned</option>' +
    '<option value="Reading">Reading</option>' +
    '<option value="Completed">Completed</option>' +
    '<option value="Dropped">Dropped</option>';

const SELECT_TEMPLATE = (() => {
    const s = document.createElement('select');
    s.className = 'status-select';
    s.innerHTML = STATUS_OPTIONS_HTML;
    return s;
})();

const formatDate = (date, dateFormat = "MM/DD/YY") => {
    if (!date) return '-';

    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();

    if (dateFormat === "MM/DD/YY") return `${m}/${d}/${y}`;
    if (dateFormat === "DD.MM.YYYY") return `${d}.${m}.${y}`;
    if (dateFormat === "DD Mon YYYY") return `${Number(d)} ${MONTH_NAMES[date.getMonth()]} ${y}`;
};


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
        '<td class="status-cell"></td>' +
        '<td></td>' +
        '<td class="options-cell">' +
        '<a href="#" class="change-link">Change status</a>' +
        '<span class="sep"> | </span>' +
        '<a href="#" class="delete-link">Delete</a>' +
        '</td>';
    return tr;
})();

const STATUS_BADGE_TEMPLATE = (() => {
    const s = document.createElement('span');
    s.className = 'status-badge';
    return s;
})();

function makeStatusBadge(statusValue) {
    const badge = STATUS_BADGE_TEMPLATE.cloneNode(false);
    badge.classList.add(statusValue);
    badge.textContent = statusValue;
    return badge;
}

function createBookmarkRow(bookmark) {
    const tableRow = ROW_TEMPLATE.cloneNode(true);
    bookmarkForRow.set(tableRow, bookmark);
    const statusValue = findStatus(bookmark);
    const tds = tableRow.children;
    tds[0].textContent = bookmark.id;
    const a = tds[1].firstChild;
    a.href = `https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}`;
    a.textContent = bookmark.storyName;
    tds[2].textContent = `${bookmark.chapter}/${bookmark.chapters || '?'}`;
    tds[3].textContent = bookmark.fandom;
    tds[4].textContent = bookmark.author;
    tds[5].appendChild(makeStatusBadge(statusValue));
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
            const statusValue = findStatus(bookmark);
            statusCell.replaceChildren(makeStatusBadge(statusValue));
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
        let needToUpdate = false;

        for (const bookmark of Object.values(bookmarks)) {
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
                bookmark.displayDate = formatDate(dateObj, settings.dateFormat);
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
document.querySelector('#export').addEventListener('click', () => {
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
document.querySelector('#import').addEventListener('click', () => {
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
sortHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const sortType = header.getAttribute('data-sort-type');
        const sortDirection = header.classList.toggle('descending') ? -1 : 1;

        const prevActive = document.querySelector('th.active');
        if (prevActive && prevActive !== header) prevActive.classList.remove('active');
        header.classList.add('active');

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


const filterButtons = document.querySelectorAll('.filters .filter-btn');
let activeFilterBtn = null;
function setFilterActive(id) {
    if (activeFilterBtn) activeFilterBtn.classList.remove('filter-active');
    activeFilterBtn = document.getElementById(id);
    if (activeFilterBtn) activeFilterBtn.classList.add('filter-active');
}

const FILTER_MAP = {
    'filter-all': 'All',
    'filter-automatic': 'Automatic',
    'filter-planned': 'Planned',
    'filter-reading': 'Reading',
    'filter-completed': 'Completed',
    'filter-dropped': 'Dropped',
};

filterButtons.forEach(btn => {
    const status = FILTER_MAP[btn.id];
    if (!status) return;
    btn.addEventListener('click', () => {
        setFilterActive(btn.id);
        filterBookmarks(status);
    });
});

setFilterActive('filter-all');


function hideOrganizerUI() {
    if (document.getElementById('bf-organizer-off')) return;
    const style = Object.assign(document.createElement('style'), {
        id: 'bf-organizer-off',
        textContent: '.filters,th[data-sort-type="status"],.status-cell,.options-cell .change-link,.options-cell .sep{display:none!important;}'
    });
    document.head.appendChild(style);
}
