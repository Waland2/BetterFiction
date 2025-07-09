// Define main and secondary functions
/**
 * Main feature toggles for the extension.
 * @type {string[]}
 */
const mainFunctions = [
    'autoSave',
    'markFicWithBookmark',
    'bigCovers',
    'separateFics',
    'betterInfo',
    'betterInfoColor',
    'myFicList',
    'allFicButton',
];

/**
 * Secondary feature toggles for the extension.
 * @type {string[]}
 */
const secondaryFunctions = [
    'shortcuts',
    'allowCopy',
    'bookmarkButton',
    'chapterWordCounter',
    'moreOptionsInProfile',
];

chrome.runtime.onInstalled.addListener(() => {
    const defaultSettings = {
        autoSave: false,
        bigCovers: true,
        separateFics: true,
        betterInfo: true,
        betterInfoColor: true,
        myFicList: false,
        allFicButton: false,
        markFicWithBookmark: false,
    };

    // Set default values for secondary functions
    secondaryFunctions.forEach((setting) => {
        defaultSettings[setting] = true;
    });

    chrome.storage.sync.get('settings')
        .then((result) => {
            const settings = result.settings;
            if (settings) {
                [...mainFunctions, ...secondaryFunctions].forEach((setting) => {
                    defaultSettings[setting] = settings[setting];
                });
            }
            return chrome.storage.sync.set({ settings: defaultSettings });
        })
        .catch((error) => {
            console.error('Failed to initialize extension settings during installation:', error);
        });
});

/**
 * Handles all runtime messages for the extension.
 */
chrome.runtime.onMessage.addListener((action, sender, sendResponse) => {
    if (action.message === 'set-bookmark') {
        chrome.storage.local.set({
            [action.id]: {
                chapter: action.chapter,
                id: action.id,
                fandom: action.fandom,
                author: action.author,
                storyName: action.storyName,
                addTime: new Date().toISOString(),
            },
        })
        .catch((error) => {
            console.error(`Failed to save bookmark for story ${action.id}:`, error);
        });
    } else if (action.message === 'del-bookmark') {
        chrome.storage.local.remove(action.id)
            .catch((error) => {
                console.error(`Failed to delete bookmark for story ${action.id}:`, error);
            });
    } else if (action.message === 'auto-bookmark') {
        chrome.storage.local.get([action.id])
            .then((result) => {
                if (!result[action.id] || Number(action.chapter) > Number(result[action.id].chapter)) {
                    sendResponse({ status: true });
                } else {
                    sendResponse({ status: false });
                }
            })
            .catch((error) => {
                console.error(`Failed to check auto-bookmark status for story ${action.id}:`, error);
                sendResponse({ status: false });
            });
    } else if (action.message === 'get-bookmark') {
        chrome.storage.local.get([action.id])
            .then((result) => {
                if (result[action.id]) {
                    let storyName = null;
                    if (result[action.id].storyName) {
                        storyName = result[action.id].storyName.replaceAll(' ', '-');
                    }

                    if (result[action.id].chapter) {
                        sendResponse({
                            chapter: result[action.id].chapter,
                            id: action.id,
                            storyName,
                        });
                    } else {
                        sendResponse({ chapter: result[action.id], id: action.id });
                    }
                } else {
                    sendResponse({ chapter: '0', id: action.id });
                }
            })
            .catch((error) => {
                console.error(`Failed to retrieve bookmark data for story ${action.id}:`, error);
                sendResponse({ chapter: '0', id: action.id });
            });
    } else if (action.message === 'get-info') {
        chrome.storage.sync.get('settings')
            .then((result) => {
                const settings = result.settings;
                sendResponse({ result: settings });
            })
            .catch((error) => {
                console.error('Failed to retrieve extension settings from storage:', error);
                sendResponse({ result: {} });
            });
    } else if (action.message === 'open-html-page') {
        chrome.tabs.create({ url: action.fileName })
            .catch((error) => {
                console.error(`Failed to open HTML page: ${action.fileName}`, error);
            });
    } else if (action.message === 'get-links') {
        chrome.storage.local.get()
            .then((result) => {
                const bookmarkData = [];
                for (const key in result) {
                    const bookmark = result[key];
                    if (bookmark.storyName) {
                        const link = `https://www.fanfiction.net/s/${bookmark.id}/1/${bookmark.storyName
                            .replaceAll(/[,&:;)]/g, '')
                            .replaceAll(/['(]/g, ' ')
                            .replaceAll(' ', '-')}`;
                        bookmarkData.push(link);
                    }
                }
                sendResponse({ result: bookmarkData });
            })
            .catch((error) => {
                console.error('Failed to retrieve bookmark links from local storage:', error);
                sendResponse({ result: [] });
            });
    }
    return true;
});