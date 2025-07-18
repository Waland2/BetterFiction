const tableBody = document.querySelector('tbody');
const bookmarkLinks = [];

const formatDate = (addTime) => {
    if (!addTime) return '-';
    if (addTime.includes('/')) {
        // Legacy format: DD/MM/YYYY
        const [day, month, year] = addTime.split('/');
        return `${month}.${day}.${year}`;
    } else {
        // New ISO format
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
            if (a.formattedDate === '-') return 1;
            if (b.formattedDate === '-') return -1;
            const aDate = a.formattedDate.replaceAll('.', '/');
            const bDate = b.formattedDate.replaceAll('.', '/');
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
    tableRow.innerHTML = `<tr>
        <td>${bookmark.id}</td>
        <td><a href="https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}/${bookmark.storyName.replaceAll(' ', '-')}">${bookmark.storyName}</a></td>
        <td>${bookmark.chapter}</td>
        <td>${bookmark.fandom}</td>
        <td>${bookmark.author}</td>
        <td>${formatDate(bookmark.formattedDate)}</td>
        <td><a href="">Delete</a></td>
    </tr>`;
    tableRow.querySelectorAll('a')[1].addEventListener('click', () => {
        chrome.storage.local.remove(bookmark.id).catch(e => console.error(`Failed to delete bookmark for story ${bookmark.id}:`, e));
        tableRow.remove();
    });
    tableRow.classList.toggle('table-row');
    return tableRow;
}

// Compatibility for bookmarks created before format change
chrome.storage.local.get().then((result) => {
    console.log(result)
    let bookmarks = result;
    let updated = false;
    for (const key in bookmarks) {
        const bookmark = result[key];
        if (bookmark.hasOwnProperty("fandomName")) {
            bookmarks[key].fandom = bookmark.fandomName;
            delete bookmarks[key].fandomName;
            updated = true;
        }

        if (bookmark.hasOwnProperty("storyId")) {
            bookmarks[key].id = bookmark.storyId;
            delete bookmarks[key].storyId;
            updated = true;
        }

        if (bookmark.addTime.search("/") !== -1) {
            const [day, month, year] = bookmark.addTime.split("/");
            bookmarks[key].addTime = new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
            updated = true;
        }
    }

    if (updated) {
        chrome.storage.local.clear()
            .then(() => chrome.storage.local.set(bookmarks))
            .then(() => location.reload())
            .catch(console.error);
    }
})
.catch((error) => {
    console.error('Failed to load bookmarks from local storage:', error);
});

chrome.storage.local.get()
    .then((result) => {
        for (const key in result) {
            const bookmark = result[key];
            if (bookmark.storyName) {
                bookmark.formattedDate = formatDate(bookmark.addTime);
                bookmarkLinks.push(bookmark);
            }
        }
        sortBookmarks(bookmarkLinks, 'addTime', 0);
        renderBookmarks(bookmarkLinks);
    })
    .catch((error) => {
        console.error('Failed to load bookmarks from local storage:', error);
    });

document.querySelector('#export').addEventListener('click', () => {
    chrome.storage.local.get().then(result => {
        const exportBlob = new Blob([JSON.stringify(result)], { type: 'application/json;charset=utf-8' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(exportBlob);
        downloadLink.download = 'bookmarks.json';
        downloadLink.click();
    }).catch(e => console.error('Failed to export bookmarks to JSON file:', e));
});

document.querySelector('#import').addEventListener('click', () => {
    const fileInput = Object.assign(document.createElement('input'), { type: 'file' });
    fileInput.onchange = e => {
        const file = e.target.files[0];
        const fileReader = new FileReader();
        fileReader.onload = e => {
            try {
                const jsonData = JSON.parse(e.target.result);
                chrome.storage.local.clear().then(() => {
                    Object.entries(jsonData).forEach(([key, value]) => {
                        chrome.storage.local.set({ [key]: value });
                    });
                }).catch(err => console.error('Failed to import bookmarks from JSON file:', err));
            } catch (err) {
                console.error('Failed to parse imported JSON file:', err);
            }
        };
        fileReader.readAsText(file);
        location.reload();
    };
    fileInput.click();
});

document.querySelectorAll('th[data-sort-type]').forEach(element => {
    element.addEventListener('click', () => {
        const sortType = element.getAttribute('data-sort-type');
        const sortDirection = element.classList.contains('active') ? 1 : 0;
        document.querySelectorAll('th').forEach(header => header.classList.remove('active'));
        element.classList.add('active');
        try {
            sortBookmarks(bookmarkLinks, sortType, sortDirection);
            renderBookmarks(bookmarkLinks);
        } catch (e) {
            console.error('Failed to update bookmark table sorting:', e);
        }
    });
});