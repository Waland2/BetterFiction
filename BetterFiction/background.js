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
    'autoStatus',
    'entireWork',
    'groupDescriptions',
    'styleDescriptions',
    'dateFormat',
    'dateFormatMode',
    'customDateFormat',
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
    'mobileFiltersTop',
    'mobileChapterNav',
    'mobileBigMore',
    'bookmarks',
    'wordCounter',
    'profileSorts',
    'bigCovers',
    'separateFics'
];

// Default values for primary functions
const primaryDefaults = {
    markBookmarks: true,
    lastRead: true,
    entireWork: true,
    groupDescriptions: true,
    styleDescriptions: true,
    organizer: true,
    dateFormat: "MM/DD/YY",
    dateFormatMode: '',
    customDateFormat: ''
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
let updateNoticeQueue = Promise.resolve();
let storageQueue = Promise.resolve();

// A read/modify/write must finish before another tab reads the same record.
const queueWrite = (write) => {
    const result = storageQueue.then(write);
    storageQueue = result.catch(() => {});
    return result;
};

chrome.runtime.onInstalled.addListener((details) => {
    const version = chrome.runtime.getManifest().version;
    if (details.reason === 'update' && details.previousVersion !== version) {
        updateNoticeQueue = updateNoticeQueue
            .then(() => chrome.storage.sync.set({ pendingUpdateNotice: version }))
            .catch(error => console.error('Failed to save update notice:', error));
    }

    const defaultSettings = {};
    primaryFunctions.forEach(setting => defaultSettings[setting] = primaryDefaults[setting] ?? false);
    secondaryFunctions.forEach(setting => defaultSettings[setting] = true);

    queueWrite(async () => {
        const { settings } = await chrome.storage.sync.get('settings');
        if (settings) {
            Object.assign(defaultSettings, settings);
            // "Icons for quick navigation" used to be one switch for both Favorites and Follows
            if (settings.shortcuts !== undefined) {
                ['favoritesLink', 'followsLink'].forEach((setting) => {
                    if (settings[setting] === undefined) defaultSettings[setting] = settings.shortcuts;
                });
            }
            // compatibility with old version settings
            for (let i = 0; i < legacyMapKeys.length; i++) {
                const oldKey = legacyMapKeys[i];
                if (settings[oldKey] !== undefined && settings[legacyMap[oldKey]] === undefined) {
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
    if (action.message === 'get-update-notice') {
        updateNoticeQueue = updateNoticeQueue.then(async () => {
            const { pendingUpdateNotice } = await chrome.storage.sync.get('pendingUpdateNotice');
            if (pendingUpdateNotice) await chrome.storage.sync.remove('pendingUpdateNotice');
            sendResponse({ result: { version: pendingUpdateNotice } });
        }).catch(error => {
            console.error('Failed to read update notice:', error);
            sendResponse({ result: {} });
        });
        return true;
    }
    if (!['set-settings', 'set-bookmark', 'del-bookmark', 'set-status'].includes(action.message)) return;
    queueWrite(async () => {
        if (action.message === 'set-settings') {
            const { settings } = await chrome.storage.sync.get('settings');
            await chrome.storage.sync.set({ settings: { ...settings, ...action.changes } });
            return;
        }
        const data = await chrome.storage.local.get(action.id);
        const existing = data[action.id];
        if (action.message === 'del-bookmark') {
            if (!action.chapter || Number(existing?.chapter) !== action.chapter) return existing;
            await chrome.storage.local.remove(action.id);
            return;
        }
        if (!existing && action.existingOnly) throw new Error('Bookmark no longer exists');
        const updated = { ...existing, id: action.id };
        if (action.message === 'set-status') {
            updated.status = action.status;
        } else {
            for (const key of ['chapter', 'chapters', 'fandom', 'author', 'storyName']) {
                if (action[key] !== undefined) updated[key] = action[key];
            }
            if (!updated.status) updated.status = action.status || 'Reading';
        }
        if (!updated.addTime) updated.addTime = action.addTime || new Date().toISOString();
        await chrome.storage.local.set({ [action.id]: updated });
        return updated;
    }).then(bookmark => sendResponse({ result: { ok: true, bookmark } }))
        .catch(error => {
            console.error(`Failed to apply ${action.message}:`, error);
            sendResponse({ result: { ok: false } });
        });
    return true;
});

