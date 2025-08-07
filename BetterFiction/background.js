// Define primary and secondary functions
/**
 * Primary feature toggles for the extension.
 * @type {string[]}
 */
const primaryFunctions = [
    'autoSave',
    'markBookmarks',
    'colorBookmarks',
    'ficList',
    'entireWork',
    'groupDescriptions',
    'styleDescriptions',
];

/**
 * Secondary feature toggles for the extension.
 * @type {string[]}
 */
const secondaryFunctions = [
    'adblock',
    'copy',
    'shortcuts',
    'bookmarks',
    'wordCounter',
    'profileSorts',
    'bigCovers',
    'separateFics',
];

chrome.runtime.onInstalled.addListener(() => {
    const defaultSettings = {};
    primaryFunctions.forEach(setting => defaultSettings[setting] = false);
    secondaryFunctions.forEach(setting => defaultSettings[setting] = true);

    chrome.storage.sync.get('settings')
        .then((result) => {
            const settings = result.settings;
            if (settings) {
                [...primaryFunctions, ...secondaryFunctions].forEach(setting => {
                    if (settings[setting] !== undefined) {
                        defaultSettings[setting] = settings[setting];
                    }
                });
            }
            return chrome.storage.sync.set({
                settings: defaultSettings
            });
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
    } else if (action.message === 'get-dir') {
        chrome.storage.local.get()
            .then((result) => {
                sendResponse({ result });
            })
            .catch((error) => {
                console.error('Failed to retrieve bookmark directory from local storage:', error);
                sendResponse({ result: {} });
            });
    }
    return true;
});