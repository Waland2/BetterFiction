const tableBody = document.querySelector('tbody');
const bookmarkLinks = [];

const formatDate = (addTime) => {
    if (!addTime) return '-';
    if (addTime.includes('/')) {
        const [day, month, year] = addTime.split('/');
        return `${month}.${day}.${year}`;
    } else {
        const date = new Date(addTime);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}.${day}.${year}`;
    }
};

function sortBookmarks(bookmarks, sortType, sortDirection) {
    if (sortType === 'addTime') {
        bookmarks.sort((a, b) => {
            if (a.displayDate === '-') return 1;
            if (b.displayDate === '-') return -1;
            const aDate = a.displayDate.replaceAll('.', '/');
            const bDate = b.displayDate.replaceAll('.', '/');
            return new Date(bDate) - new Date(aDate);
        });
    } else {
        bookmarks.sort((a, b) => {
            let aValue = a[sortType];
            let bValue = b[sortType];
            if (sortType === 'chapter') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
            }
            return bValue > aValue ? 1 : -1;
        });
    }
    if (sortDirection === 1) bookmarks.reverse();
}

function renderBookmarks(bookmarks) {
    document.querySelectorAll('.table-row').forEach(e => e.remove());
    bookmarks.forEach(bookmark => tableBody.appendChild(createBookmarkRow(bookmark)));
}

function createBookmarkRow(bookmark) {
    const tableRow = document.createElement('tr');
    tableRow.innerHTML = `
        <td>${bookmark.id}</td>
        <td><a href="https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}/${bookmark.storyName.replaceAll(' ', '-')}">${bookmark.storyName}</a></td>
        <td>${bookmark.chapter}</td>
        <td>${bookmark.fandom}</td>
        <td>${bookmark.author}</td>
        <td class="status-cell">${bookmark.status}</td>
        <td>${bookmark.displayDate}</td>
        <td class="options-cell">
            <a href="#" class="change-link">Change status</a>
            <span class="sep"> | </span>
            <a href="#" class="delete-link">Delete</a>
        </td>
    `;

    const statusCell = tableRow.querySelector('.status-cell');
    statusCell.innerHTML = `<span class="status-badge ${bookmark.status}">${bookmark.status}</span>`;

    const optionsCell = tableRow.querySelector('.options-cell');
    const deleteLink = optionsCell.querySelector('.delete-link');
    const changeLink = optionsCell.querySelector('.change-link');
    const sep = optionsCell.querySelector('.sep');

    deleteLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.storage.local.remove(bookmark.id).catch(err =>
            console.error(`Failed to delete bookmark for story ${bookmark.id}:`, err)
        );
        tableRow.remove();
    });

    changeLink.addEventListener('click', (e) => {
        e.preventDefault();
        changeLink.style.display = 'none';

        const select = document.createElement('select');
        select.className = 'status-select';
        select.innerHTML = `
            <option value="Planned">Planned</option>
            <option value="Reading">Reading</option>
            <option value="Completed">Completed</option>
            <option value="Dropped">Dropped</option>
        `;
        select.value = bookmark.status;

        optionsCell.insertBefore(select, sep);

        select.addEventListener('change', () => {
            bookmark.status = select.value;
            statusCell.textContent = bookmark.status;
            statusCell.innerHTML = `<span class="status-badge ${bookmark.status}">${bookmark.status}</span>`;


            chrome.storage.local.set({ [bookmark.id]: bookmark }).catch(err =>
                console.error(`Failed to update status for story ${bookmark.id}:`, err)
            );

            select.remove();
            changeLink.style.display = '';
        });
    });

    tableRow.classList.toggle('table-row');
    return tableRow;
}

// Normalize and load bookmarks
chrome.storage.local.get().then((result) => {
    let bookmarks = result;
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
            bookmark.status = 'Reading';
            needToUpdate = true;
        }

        if (bookmark.storyName) {
            bookmark.displayDate = formatDate(bookmark.addTime);
            bookmarkLinks.push(bookmark);
        }
    }

    if (needToUpdate) {
        chrome.storage.local.clear()
            .then(() => chrome.storage.local.set(bookmarks))
            .then(() => location.reload())
            .catch(console.error);
    } else {
        sortBookmarks(bookmarkLinks, 'addTime', 0);
        renderBookmarks(bookmarkLinks);
    }
}).catch((error) => {
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

    fileInput.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = e => {
            try {
                const jsonData = JSON.parse(e.target.result);
                chrome.storage.local.clear()
                    .then(() => {
                        const sets = Object.entries(jsonData).map(([key, value]) =>
                            chrome.storage.local.set({ [key]: value })
                        );
                        return Promise.all(sets);
                    })
                    .then(() => location.reload())
                    .catch(err => console.error('Failed to import bookmarks from JSON file:', err));
            } catch (err) {
                console.error('Failed to parse imported JSON file:', err);
            }
        };

        reader.readAsText(file);
    };

    fileInput.click();
});

// Sorting
document.querySelectorAll('th[data-sort-type]').forEach(header => {
    header.addEventListener('click', () => {
        const sortType = header.getAttribute('data-sort-type');
        let sortDirection = 0;

        if (header.classList.contains('descending')) {
            header.classList.remove('descending');
            sortDirection = 0;
        } else {
            header.classList.add('descending');
            sortDirection = 1;
        }

        document.querySelectorAll('th').forEach(h => h.classList.remove('active'));
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
    } else {
        renderBookmarks(bookmarkLinks.filter(b => b.status === status));
    }
}


const filterButtons = document.querySelectorAll('.filters .filter-btn');
function setFilterActive(id) {
    filterButtons.forEach(b => b.classList.toggle('filter-active', b.id === id));
}

document.querySelector('#filter-all').addEventListener('click', () => {
    setFilterActive('filter-all');
    filterBookmarks('All');
});
document.querySelector('#filter-planned').addEventListener('click', () => {
    setFilterActive('filter-planned');
    filterBookmarks('Planned');
});
document.querySelector('#filter-reading').addEventListener('click', () => {
    setFilterActive('filter-reading');
    filterBookmarks('Reading');
});
document.querySelector('#filter-completed').addEventListener('click', () => {
    setFilterActive('filter-completed');
    filterBookmarks('Completed');
});
document.querySelector('#filter-dropped').addEventListener('click', () => {
    setFilterActive('filter-dropped');
    filterBookmarks('Dropped');
});

setFilterActive('filter-all');


const hideOrganizerUI = () => {
    const filters = document.querySelector('.filters');
    if (filters) filters.style.display = 'none';

    const statusTh = document.querySelector('th[data-sort-type="status"]');
    if (statusTh) statusTh.style.display = 'none';

    document.querySelectorAll('.status-cell').forEach(td => {
        td.style.display = 'none';
    });

    document.querySelectorAll('.options-cell .change-link, .options-cell .sep').forEach(el => {
        el.style.display = 'none';
    });
};

// Hide organizer ui if it off
chrome.storage.sync.get('settings')
    .then(({ settings = {} }) => {
        if (settings.organizer) return; 

        hideOrganizerUI();

        const tbody = document.querySelector('table tbody');
        if (tbody) {
            const mo = new MutationObserver(() => {
                requestAnimationFrame(hideOrganizerUI);
            });
            mo.observe(tbody, { childList: true, subtree: true });
        }

        document.querySelectorAll('th[data-sort-type]').forEach(th => {
            th.addEventListener('click', () => {
                setTimeout(hideOrganizerUI, 0);
            });
        });
    })
    .catch(err => console.error('Failed to apply organizer UI (status hiding):', err));