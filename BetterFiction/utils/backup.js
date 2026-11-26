/**
 * BetterFiction backup file: your bookmarks and settings in one file, for moving them between devices
 * (for example through a Google Drive or Dropbox folder; Firefox doesn't sync extensions to Android).
 *
 * Loading a backup merges it with what is already on this device:
 *  - for each story, the copy that was changed most recently wins (moving the bookmark, adding it or
 *    changing its status counts as a change; the chapter count being refreshed doesn't);
 *  - stories removed on the other device are removed here too, unless you changed them here later;
 *  - settings in the file replace the ones here; a setting the file doesn't have keeps its value.
 * Bookmarks files from Export, and FicShelf backups (their bookmarks), load too.
 * Loaded by the settings page.
 */
(() => {
    const DELETED = '__bf_deleted'; // { storyKey: ISO date it was removed }
    const SYNC_KEYS = ['settings', 'profileUrl'];
    const FILE_NAME = 'betterfiction-backup.json';
    const FORMATS = ['betterfiction-backup', 'ficshelf-backup'];

    /** A story as BetterFiction stores it: a FanFiction.net story id or "ao3-<work id>", with sane values. */
    const isEntry = (key, value) => /^(?:\d+|ao3-\d+)$/.test(key)
        && Boolean(value) && typeof value === 'object' && !Array.isArray(value)
        && String(value.id ?? value.storyId ?? key) === key
        && (value.chapter === undefined || (Number.isInteger(Number(value.chapter)) && Number(value.chapter) >= 1))
        && (value.storyName === undefined || typeof value.storyName === 'string')
        && Boolean(value.storyName || value.chapter || value.status);
    const stamp = (entry) => Date.parse(entry?.updatedAt || entry?.addTime || '') || 0;
    const notABackup = () => new Error("That file isn't a BetterFiction backup. Choose the betterfiction-backup.json file you saved.");

    /**
     * Saves your bookmarks and settings to betterfiction-backup.json.
     * @returns {Promise<{stories: number}>}
     */
    const save = async () => {
        const [local, sync] = await Promise.all([chrome.storage.local.get(), chrome.storage.sync.get(SYNC_KEYS)]);
        const library = {};
        Object.entries(local).forEach(([key, value]) => { if (isEntry(key, value)) library[key] = value; });
        const data = {
            format: 'betterfiction-backup',
            version: 1,
            app: chrome.runtime.getManifest().version,
            savedAt: new Date().toISOString(),
            settings: sync,
            library,
            deleted: local[DELETED] || {},
        };
        const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json;charset=utf-8' });
        const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: FILE_NAME });
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 60000);
        try { localStorage.setItem('betterfiction-last-backup', data.savedAt); } catch (e) { /* storage blocked */ }
        return { stories: Object.keys(library).length };
    };

    /**
     * Merges a backup (or an Export bookmarks file) into this device.
     * @param {{text: Function}} file
     * @returns {Promise<{added: number, updated: number, removed: number, kept: number, settings: boolean, savedAt: ?string}>}
     */
    const load = async (file) => {
        let parsed;
        try {
            parsed = JSON.parse(await file.text());
        } catch (e) {
            throw notABackup();
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw notABackup();
        const isBackup = FORMATS.includes(parsed.format);
        const incoming = isBackup ? (parsed.library || {}) : parsed; // an Export file is just the bookmarks
        const incomingDeleted = isBackup && parsed.deleted && typeof parsed.deleted === 'object' ? parsed.deleted : {};
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw notABackup();
        const entries = Object.entries(incoming).filter(([key, value]) => isEntry(key, value));
        if (!isBackup && !entries.length) throw notABackup();

        const local = await chrome.storage.local.get();
        const deleted = { ...(local[DELETED] || {}) };
        const toSet = {};
        const toRemove = [];
        let added = 0;
        let updated = 0;
        let removed = 0;
        let kept = 0;

        // Stories removed on the other device
        Object.entries(incomingDeleted).forEach(([key, when]) => {
            const removedAt = Date.parse(when) || 0;
            if (!/^(?:\d+|ao3-\d+)$/.test(key) || !removedAt) return;
            if (removedAt > (Date.parse(deleted[key]) || 0)) deleted[key] = new Date(removedAt).toISOString();
            if (isEntry(key, local[key]) && removedAt > stamp(local[key])) {
                toRemove.push(key);
                removed++;
            }
        });

        // Stories from the other device
        entries.forEach(([key, value]) => {
            const entry = { ...value, id: value.id || key };
            const removedAt = Date.parse(deleted[key]) || 0;
            if (removedAt && removedAt >= stamp(entry)) return; // removed after this copy was made
            const current = toRemove.includes(key) ? null : local[key];
            if (!isEntry(key, current)) {
                toSet[key] = entry;
                added++;
                return;
            }
            const theirs = stamp(entry);
            const ours = stamp(current);
            if (theirs > ours || (theirs === ours && (Number(entry.chapter) || 0) > (Number(current.chapter) || 0))) {
                toSet[key] = entry;
                updated++;
            } else {
                kept++;
            }
        });
        // A story added back after it was removed is no longer "removed"
        Object.keys(toSet).forEach((key) => {
            if (deleted[key] && (Date.parse(deleted[key]) || 0) < stamp(toSet[key])) delete deleted[key];
        });
        toSet[DELETED] = deleted;

        // Written before anything is removed, so a failed write never loses a story
        await chrome.storage.local.set(toSet);
        if (toRemove.length) await chrome.storage.local.remove(toRemove);

        let settings = false;
        // Settings only come from BetterFiction backups (FicShelf's settings don't all mean the same thing)
        if (parsed.format === 'betterfiction-backup' && parsed.settings && typeof parsed.settings === 'object') {
            const values = {};
            SYNC_KEYS.forEach((key) => { if (key in parsed.settings) values[key] = parsed.settings[key]; });
            if (values.settings && (typeof values.settings !== 'object' || Array.isArray(values.settings))) delete values.settings;
            if (typeof values.profileUrl !== 'string') delete values.profileUrl;
            if (values.settings) {
                const { settings: current = {} } = await chrome.storage.sync.get('settings');
                values.settings = { ...current, ...values.settings };
            }
            if (Object.keys(values).length) {
                await chrome.storage.sync.set(values);
                settings = true;
            }
        }
        return { added, updated, removed, kept, settings, savedAt: isBackup ? parsed.savedAt || null : null };
    };

    /** Opens the file picker and merges the chosen file. Resolves to null if no file is chosen. */
    const pickAndLoad = () => new Promise((resolve, reject) => {
        const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return resolve(null);
            load(file).then(resolve, reject);
        });
        input.addEventListener('cancel', () => resolve(null));
        input.click();
    });

    /** "Bookmarks: 2 added, 1 updated. Settings updated." */
    const describe = (result) => {
        if (!result) return '';
        const parts = [];
        if (result.added) parts.push(`${result.added} added`);
        if (result.updated) parts.push(`${result.updated} updated`);
        if (result.removed) parts.push(`${result.removed} removed`);
        if (result.kept) parts.push(`${result.kept} already up to date`);
        const library = parts.length ? `Bookmarks: ${parts.join(', ')}.` : 'Bookmarks: nothing new.';
        return `${library}${result.settings ? ' Settings updated.' : ''}`;
    };

    const lastSaved = () => {
        try { return localStorage.getItem('betterfiction-last-backup'); } catch (e) { return null; }
    };

    window.betterfictionBackup = { save, load, pickAndLoad, describe, lastSaved, DELETED };
})();
