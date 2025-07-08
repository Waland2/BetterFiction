const tableBody = document.querySelector('tbody');
const bookmarkData = [];

chrome.storage.local.get()
    .then((result) => {
        for (const key in result) {
            const bookmark = result[key];
            if (bookmark.storyName) {
                // Handle both old format (DD/MM/YYYY) and new ISO format
                let formattedDate;
                if (!bookmark.addTime) {
                    formattedDate = '-';
                } else if (bookmark.addTime.includes('/')) {
                    // Legacy format: DD/MM/YYYY
                    const dateParts = bookmark.addTime.split('/');
                    const day = dateParts[0];
                    const month = dateParts[1];
                    const year = dateParts[2];
                    formattedDate = `${month}.${day}.${year}`;
                } else {
                    // New ISO format
                    const date = new Date(bookmark.addTime);
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    formattedDate = `${month}.${day}.${year}`;
                }
                bookmark.formattedDate = formattedDate;
                bookmarkData.push(bookmark);
            }
        }

        bookmarkData.sort((a, b) => {
            if (a.formattedDate === '-') {
                return 1;
            }
            if (b.formattedDate === '-') {
                return -1;
            }
            const aDate = a.formattedDate.replaceAll('.', '/');
            const bDate = b.formattedDate.replaceAll('.', '/');

            if (new Date(aDate).getTime() < new Date(bDate).getTime()) {
                return 1;
            }
            return -1;
        });

        bookmarkData.forEach((bookmark) => {
            const tableRow = document.createElement('tr');
            const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
            ];

            const dateParts = bookmark.formattedDate.split('.');
            let displayDate = '-';
            if (dateParts[1]) {
                displayDate = `${months[Number(dateParts[0]) - 1]} ${dateParts[1]}, ${dateParts[2]}`;
            }

            tableRow.innerHTML = `<tr>
                <td>${bookmark.id}</td>
                <td><a href="https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}/${bookmark.storyName.replaceAll(' ', '-')}">${bookmark.storyName}</a></td>
                <td>${bookmark.chapter}</td>
                <td>${bookmark.fandom}</td>
                <td>${bookmark.author}</td>
                <td>${displayDate}</td>
                <td><a href="">Delete</a></td>
            </tr>`;

            tableRow.querySelectorAll('a')[1].addEventListener('click', () => {
                chrome.storage.local.remove(bookmark.id)
                    .catch((error) => {
                        console.error(`Failed to delete bookmark for story ${bookmark.id}:`, error);
                    });
                tableRow.remove();
            });

            tableRow.classList.toggle('table-row');
            tableBody.appendChild(tableRow);
        });
    })
    .catch((error) => {
        console.error('Failed to load bookmarks from local storage:', error);
    });

document.querySelector('#export').addEventListener('click', () => {
    chrome.storage.local.get()
        .then((result) => {
            const jsonData = result;
            const jsonContent = JSON.stringify(jsonData);

            const exportBlob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });

            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(exportBlob);
            downloadLink.download = 'bookmarks.json';

            downloadLink.click();
        })
        .catch((error) => {
            console.error('Failed to export bookmarks to JSON file:', error);
        });
});

document.querySelector('#import').addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';

    fileInput.onchange = function (event) {
        const file = event.target.files[0];

        const fileReader = new FileReader();

        fileReader.onload = function (event) {
            const contents = event.target.result;

            try {
                const jsonData = JSON.parse(contents);
                chrome.storage.local.clear()
                    .then(() => {
                        for (const key in jsonData) {
                            const value = jsonData[key];

                            chrome.storage.local.set({
                                [key]: value,
                            });
                        }
                    })
                    .catch((error) => {
                        console.error('Failed to import bookmarks from JSON file:', error);
                    });
            } catch (error) {
                console.error('Failed to parse imported JSON file:', error);
            }
        };

        fileReader.readAsText(file);
        location.reload();
    };
    fileInput.click();
});

function updateSort(sortType, sortDirection) {
    try {
        document.querySelectorAll('.table-row').forEach((element) => {
            element.remove();
        });

        if (sortType === 'addTime') {
            bookmarkData.sort((a, b) => {
                if (a.formattedDate === '-') {
                    return 1;
                }
                const [day1, month1, year1] = a.formattedDate.split('.');
                const [day2, month2, year2] = b.formattedDate.split('.');
                const numDate1 = new Date(`${month1}/${day1}/${year1}`).getTime();
                const numDate2 = new Date(`${month2}/${day2}/${year2}`).getTime();
                if (numDate1 < numDate2) {
                    return 1;
                }
                return -1;
            });
        } else {
            bookmarkData.sort((a, b) => {
                let aValue = a[sortType];
                let bValue = b[sortType];

                if (sortType === 'chapter') {
                    aValue = parseInt(aValue);
                    bValue = parseInt(bValue);
                }

                const isGreater = aValue > bValue;
                if (isGreater === false) {
                    return 1;
                }
                return -1;
            });
        }

        if (sortDirection === 1) {
            bookmarkData.reverse();
        }

        bookmarkData.forEach((bookmark) => {
            const tableRow = document.createElement('tr');
            const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
            ];

            const dateParts = bookmark.formattedDate.split('.');
            let displayDate = '-';
            if (dateParts[1]) {
                displayDate = `${dateParts[0]} ${months[Number(dateParts[1]) - 1]} ${dateParts[2]}`;
            }

            tableRow.innerHTML = `<tr>
                <td>${bookmark.id}</td>
                <td><a href="https://www.fanfiction.net/s/${bookmark.id}/${bookmark.chapter}/${bookmark.storyName.replaceAll(' ', '-')}">${bookmark.storyName}</a></td>
                <td>${bookmark.chapter}</td>
                <td>${bookmark.fandom}</td>
                <td>${bookmark.author}</td>
                <td>${displayDate}</td>
                <td><a href="">Delete</a></td>
            </tr>`;

            tableRow.querySelectorAll('a')[1].addEventListener('click', () => {
                chrome.storage.local.remove(bookmark.id)
                    .catch((error) => {
                        console.error(`Failed to delete bookmark for story ${bookmark.id} during sorting:`, error);
                    });
                tableRow.remove();
            });

            tableRow.classList.toggle('table-row');
            tableBody.appendChild(tableRow);
        });
    } catch (error) {
        console.error('Failed to update bookmark table sorting:', error);
    }
}

// Add event listeners for sorting
document.querySelectorAll('th[data-sort-type]').forEach((element) => {
    element.addEventListener('click', () => {
        const sortType = element.getAttribute('data-sort-type');
        const sortDirection = element.classList.contains('active') ? 1 : 0;

        document.querySelectorAll('th').forEach((header) => {
            header.classList.remove('active');
        });

        // Add active class to clicked header
        element.classList.add('active');

        updateSort(sortType, sortDirection);
    });
});
