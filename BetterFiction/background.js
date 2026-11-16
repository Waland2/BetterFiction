// Define primary and secondary functions
/**
 * Primary feature toggles for the extension.
 * @type {string[]}
 */
const primaryFunctions = [
    'autoSave',
    'markBookmarks',
    'lastRead',
    'organizer',
    'entireWork',
    'groupDescriptions',
    'styleDescriptions',
    'dateFormat',
    'darkMode',
];

/**
 * Secondary feature toggles for the extension.
 * @type {string[]}
 */
const secondaryFunctions = [
    'adblock',
    'copy',
    'favoritesLink',
    'followsLink',
    'profileLink',
    'siteSwitch',
    'bookmarks',
    'wordCounter',
    'profileSorts',
    'bigCovers',
    'separateFics',
    'ao3Enabled'
];

// Default values for primary functions
const primaryDefaults = {
    markBookmarks: true,
    lastRead: true,
    entireWork: true,
    groupDescriptions: true,
    styleDescriptions: true,
    organizer: true,
    dateFormat: "MM/DD/YY"
};

const legacyMap = {
    markFicWithBookmark: 'markBookmarks',
    betterInfo: 'groupDescriptions',
    betterInfoColor: 'styleDescriptions',
    bookmarkButton: 'bookmarks',
    chapterWordCounter: 'wordCounter',
    moreOptionsInProfile: 'profileSorts',
    allowCopy: 'copy',
    allFicButton: 'entireWork',
};
const legacyMapKeys = Object.keys(legacyMap);
const allFunctions = [...primaryFunctions, ...secondaryFunctions];

chrome.runtime.onInstalled.addListener((details) => {
    const defaultSettings = {};
    primaryFunctions.forEach(setting => defaultSettings[setting] = primaryDefaults[setting] ?? false);
    secondaryFunctions.forEach(setting => defaultSettings[setting] = true);

    chrome.storage.sync.get('settings')
        .then((result) => {
            const settings = result.settings;
            if (settings) {
                for (let i = 0; i < allFunctions.length; i++) {
                    const setting = allFunctions[i];
                    if (settings[setting] !== undefined) {
                        defaultSettings[setting] = settings[setting];
                    }
                }
                // "Icons for quick navigation" used to be one switch for both Favorites and Follows
                if (settings.shortcuts !== undefined) {
                    ['favoritesLink', 'followsLink'].forEach((setting) => {
                        if (settings[setting] === undefined) defaultSettings[setting] = settings.shortcuts;
                    });
                }
                // compatibility with old version settings
                for (let i = 0; i < legacyMapKeys.length; i++) {
                    const oldKey = legacyMapKeys[i];
                    if (settings[oldKey] !== undefined) {
                        defaultSettings[legacyMap[oldKey]] = settings[oldKey];
                    }
                }
            }

            return chrome.storage.sync.set({
                settings: defaultSettings
            });
        })
        .catch((error) => {
            console.error('Failed to initialize extension settings during installation:', error);
        });

    if (details.reason === "install") {
        chrome.tabs.create({
            url: chrome.runtime.getURL("tabs/options/options.html")
        });
    }
});

/**
 * Handles all runtime messages for the extension.
 */
chrome.runtime.onMessage.addListener((action, sender, sendResponse) => {
    if (action.message === 'set-bookmark') {
        chrome.storage.local.set({
            [action.id]: {
                chapter: action.chapter,
                chapters: action.chapters,
                id: action.id,
                fandom: action.fandom,
                author: action.author,
                storyName: action.storyName,
                addTime: action.addTime,
                status: action.status,
                // AO3 works: which site, and the address of the bookmarked chapter
                ...(action.site ? { site: action.site, url: action.url } : {})
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
    }
    else if (action.message === 'set-status') {
        chrome.storage.local.get(action.id)
            .then(data => data[action.id] || { id: action.id })
            .then((existing) => {
                const updated = { ...existing, status: action.status };
                if (!updated.addTime) updated.addTime = new Date().toISOString();
                return chrome.storage.local.set({ [action.id]: updated });
            })
            .then(() => {
                sendResponse({ result: { ok: true } });
            })
            .catch((error) => {
                console.error(`Failed to set status for story ${action.id}:`, error);
                sendResponse({ result: { ok: false } });
            });
    }
    return true;
});

