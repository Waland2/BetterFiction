/**
 * Content script for BetterFiction extension.
 * Handles UI enhancements and feature toggles on fanfiction.net pages.
 * Main function to apply UI changes and features based on user settings.
 * @returns {Promise<void>}
 */
async function main() {
    try {
        const messagePromise = new Promise((resolve) => {
            chrome.runtime.sendMessage({ message: 'get-info' }, (response) => {
                resolve(response.result);
            });
        });

        const settings = await messagePromise;

        // Allow copy text
        if (settings.allowCopy) {
            document.querySelectorAll('p').forEach((element) => {
                element.style.userSelect = 'text';
            });
        }

        // Create Bookmarks list button
        if (settings.bookmarkButton) {
            const bookmarkButton = document.createElement('span');
            bookmarkButton.innerHTML = `<a href='${chrome.runtime.getURL('tabs/bookmarks/bookmarks.html')}' style='margin-left: 10px;'><img src='${chrome.runtime.getURL('icons/bookmark3.png')}' style='vertical-align: middle; cursor: default;' title='Favorite Stories' width='20' height='20'></a>`;
            bookmarkButton.id = 'openBookmarkList';
            document.querySelector('div').querySelector('div').appendChild(bookmarkButton);
        }

        // Create my fic list button
        if (settings.myFicList) {
            const ficListButton = document.createElement('span');
            ficListButton.innerHTML = `<img src='${chrome.runtime.getURL('icons/list.png')}' style='vertical-align: middle; cursor: default; margin-left: 12px;' title='My fic list' width='20' height='20'>`;
            ficListButton.id = 'openMyFicList';
            document.querySelector('div').querySelector('div').appendChild(ficListButton);

            ficListButton.addEventListener('click', () => {
                chrome.runtime.sendMessage({
                    message: 'open-html-page',
                    fileName: 'tabs/my-list/my-list.html',
                });
            });
        }

        // Heart and book on the top bar
        if (settings.shortcuts) {
            const rootElement = document.createElement('div');
            rootElement.style.position = 'relative';
            rootElement.style.display = 'inline-block';
            rootElement.style.marginBottom = '0px';
            const shadowRoot = rootElement.attachShadow({ mode: 'open' });

            const topMenu = document.querySelector('div').querySelector('div');

            const newTop = document.createElement('span');
            const linkHeart = chrome.runtime.getURL('icons/heart.png');
            const linkBook = chrome.runtime.getURL('icons/book.png');

            newTop.innerHTML = `<a href='https://www.fanfiction.net/favorites/story.php' style='margin-left: 10px;'><img src='${linkHeart}' style='vertical-align: middle; cursor: default;' title='Favorite Stories' width='20' height='20'></a><a href='https://www.fanfiction.net/alert/story.php' style='margin-left: 8px;'><img src='${linkBook}' style='vertical-align: middle; cursor: default;' title='Followed Stories' width='20' height='20'></a>`;

            shadowRoot.appendChild(newTop);
            topMenu.appendChild(rootElement);
        }

        // Block advertisements
        document.querySelectorAll('[title="Advertisement"]').forEach((element) => {
            element.remove();
        });

        const advertisementBar = document.querySelector('[style="text-align:center;padding-top:5px;background-color: #f6f7ee;"]');
        if (advertisementBar) {
            advertisementBar.remove();
        }
    } catch (error) {
        console.error('Failed to apply UI enhancements and features in content script:', error);
    }
}

// Page check
if (
    document.querySelector('div').querySelector('div') &&
    document.querySelector('div').querySelector('div').classList[0] === 'menulink'
) {
    main();
}
