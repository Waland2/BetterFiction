const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', 'BetterFiction', file), 'utf8').replaceAll('\r\n', '\n');
const flush = () => new Promise(setImmediate);
const record = { id: '123', chapter: 7, storyName: 'Test', status: 'Dropped', addTime: '2025-01-02T00:00:00.000Z' };
const oldSettings = Object.fromEntries([
    'autoSave', 'markBookmarks', 'colorBookmarks', 'organizer', 'entireWork',
    'groupDescriptions', 'styleDescriptions', 'adblock', 'copy', 'shortcuts',
    'bookmarks', 'wordCounter', 'profileSorts', 'bigCovers', 'separateFics',
].map(key => [key, false]));

const storage = (initial) => {
    const area = {
        data: structuredClone(initial), writes: [], failGet: false, failSet: false,
        async get(key) {
            if (area.failGet) throw new Error('Read failed');
            return structuredClone(key ? { [key]: area.data[key] } : area.data);
        },
        async set(value) {
            area.writes.push(['set', structuredClone(value)]);
            if (area.failSet) throw new Error('Write failed');
            Object.assign(area.data, structuredClone(value));
        },
        async remove(keys) {
            area.writes.push(['remove', keys]);
            for (const key of Array.isArray(keys) ? keys : [keys]) delete area.data[key];
        },
        async clear() { area.writes.push(['clear']); area.data = {}; },
    };
    return area;
};

const background = (settings = oldSettings) => {
    const sync = storage({ settings, profileUrl: 'https://www.fanfiction.net/u/42' });
    const local = storage({ '123': record });
    let install, message;
    const chrome = { storage: { sync, local }, runtime: {
        getManifest: () => ({ version: '1.4.0' }),
        onInstalled: { addListener: fn => { install = fn; } },
        onMessage: { addListener: fn => { message = fn; } },
    } };
    vm.runInNewContext(read('background.js'), { chrome, console: { error() {} } });
    return { sync, local, update: () => install({ reason: 'update', previousVersion: '1.2.1' }), message };
};

test('1.2.1 settings, unknown keys and bookmarks survive repeated updates', async () => {
    const initial = { ...oldSettings, extra: 'keep' };
    const app = background(initial);
    for (let i = 0; i < 2; i++) {
        app.update();
        await flush();
        for (const [key, value] of Object.entries(initial)) assert.deepEqual(app.sync.data.settings[key], value, key);
        assert.equal(app.sync.data.settings.favoritesLink, false);
        assert.equal(app.sync.data.settings.followsLink, false);
        assert.equal(app.sync.data.profileUrl, 'https://www.fanfiction.net/u/42');
        assert.deepEqual(app.local.data, { '123': record });
        assert.deepEqual(app.local.writes, []);
    }
});

test('modern settings take precedence over legacy aliases', async () => {
    const app = background({ markBookmarks: false, markFicWithBookmark: true, shortcuts: false, favoritesLink: true });
    app.update(); await flush();
    assert.equal(app.sync.data.settings.markBookmarks, false);
    assert.equal(app.sync.data.settings.favoritesLink, true);
    assert.equal(app.sync.data.settings.followsLink, false);
});

test('failed settings reads or writes preserve previous settings', async () => {
    for (const failure of ['failGet', 'failSet']) {
        const app = background();
        app.sync[failure] = true;
        app.update(); await flush();
        assert.deepEqual(app.sync.data.settings, oldSettings);
    }
});

test('1.2.1 bookmark messages preserve stored date, status and unknown fields', async () => {
    const app = background();
    app.local.data['123'].extra = 'keep';
    app.message({ message: 'set-bookmark', id: '123', chapter: 8, storyName: 'Test' }, {}, () => {});
    await flush();
    assert.deepEqual(app.local.data['123'], { ...record, extra: 'keep', chapter: 8 });
});

test('a stale chapter tab cannot delete a moved bookmark', async () => {
    const app = background();
    const send = action => new Promise(resolve => app.message({ id: '123', ...action }, {}, resolve));
    const move = send({ message: 'set-bookmark', chapter: 8 });
    const stale = send({ message: 'del-bookmark', chapter: 7 });
    await move;
    const current = { ...record, chapter: 8 };
    assert.deepEqual((await stale).result.bookmark, current);
    await send({ message: 'del-bookmark' }); // Older tabs cannot identify the chapter.
    assert.deepEqual(app.local.data, { '123': current });
    assert.equal((await send({ message: 'del-bookmark', chapter: 8 })).result.ok, true);
    assert.deepEqual(app.local.data, {});
});

test('both manifests start dark mode on desktop and mobile pages', () => {
    for (const file of ['manifest.json', 'firefox_manifest.json']) {
        const scripts = JSON.parse(read(file)).content_scripts;
        const theme = scripts.find(script => script.js.includes('dark-mode.js'));
        assert.equal(theme.run_at, 'document_start');
        for (const site of ['www', 'm']) assert.ok(theme.matches.includes(`https://${site}.fanfiction.net/*`));
    }
});

const organizerLoad = async (initial) => {
    const local = storage(initial);
    const source = read('tabs/bookmarks/bookmarks.js');
    // Execute the production loading chain with rendering replaced by a counter.
    const start = source.indexOf('Promise.all([settingsPromise, chrome.storage.local.get()])');
    const end = source.indexOf('\nsearchEl.addEventListener', start);
    assert.ok(start >= 0 && end > start);
    let rendered = 0;
    const context = vm.createContext({
        chrome: { storage: { local } }, settingsPromise: Promise.resolve({ settings: { bookmarks: true, autoStatus: true } }),
        window: { validateDateFormat: () => null, formatDate: () => 'date' },
        addTimeMs: new WeakMap(), searchText: new WeakMap(),
        console: { error() {} }, location: { reload() {} }, hideOrganizerUI() {},
        render: () => { rendered++; },
    });
    vm.runInContext(source.slice(start, end), context);
    await flush();
    return { local, context, rendered };
};

test('legacy bookmarks display without any storage writes', async () => {
    const initial = { '123': { storyId: '123', fandomName: 'Fandom', chapter: 7, storyName: 'Test', addTime: '02/01/2025' } };
    const { local, context, rendered } = await organizerLoad(initial);
    assert.deepEqual(local.writes, []);
    assert.deepEqual(local.data, initial);
    assert.equal(rendered, 1);
    assert.equal(context.bookmarks[0].id, '123');
    assert.equal(context.bookmarks[0].chapter, 7);
    assert.equal(context.bookmarks[0].fandom, 'Fandom');
});

test('invalid legacy dates and unrelated records do not hide valid bookmarks', async () => {
    const initial = { '123': { ...record, addTime: 'bad/date/value' }, unrelated: null };
    const { local, context, rendered } = await organizerLoad(initial);
    assert.equal(rendered, 1);
    assert.equal(context.bookmarks.length, 1);
    assert.deepEqual(local.data, initial);
    assert.deepEqual(local.writes, []);
});

const importFile = async (data, failSet = false, confirm = true, initial = { '123': record }) => {
    const local = storage(initial);
    local.failSet = failSet;
    let click, change;
    const input = { files: [{ text: async () => JSON.stringify(data) }], remove() {}, click() {},
        addEventListener: (event, fn) => { if (event === 'change') change = fn; } };
    const document = { getElementById: () => ({ addEventListener: (event, fn) => { click = fn; } }),
        createElement: () => input, body: { appendChild() {} } };
    const source = read('tabs/bookmarks/bookmarks.js');
    const start = source.indexOf("document.getElementById('import').addEventListener");
    assert.ok(start >= 0);
    vm.runInNewContext(source.slice(start), { document, chrome: { storage: { local } },
        window: { confirm: () => confirm }, bookmarks: [record], location: { reload() {} },
        console: { error() {} }, noticeTextEl: {}, undoEl: {}, noticeEl: {} });
    click(); await change();
    return local;
};

test('failed import write and cancelled import preserve existing bookmarks', async () => {
    for (const [fail, confirm] of [[true, true], [false, false]]) {
        const local = await importFile({ '456': { ...record, id: '456' } }, fail, confirm);
        assert.deepEqual(local.data, { '123': record });
    }
});

test('invalid import records never overwrite or delete bookmarks', async () => {
    for (const data of [{ hello: 'world' }, { '123': null }, { '123': { ...record, id: '456' } }]) {
        const local = await importFile(data);
        assert.deepEqual(local.data, { '123': record });
        assert.deepEqual(local.writes, []);
    }
});

test('successful replacement writes imported records before removing old keys', async () => {
    const data = { '456': { ...record, id: '456' } };
    const local = await importFile(data);
    assert.deepEqual(local.data, data);
    assert.deepEqual(local.writes.map(entry => entry[0]), ['set', 'remove']);
});

test('legacy exports and status-only records can be imported', async () => {
    const data = {
        '123': { storyId: '123', fandomName: 'Fandom', chapter: 7, storyName: 'Test', addTime: '02/01/2025' },
        '456': { id: '456', status: 'Planned' },
    };
    const local = await importFile(data);
    assert.deepEqual(local.data, data);
});

const ao3Work = { id: 'ao3-456', chapter: 2, chapters: 5, storyName: 'Work', status: 'Reading', site: 'ao3',
    url: 'https://archiveofourown.org/works/456/chapters/22', addTime: '2025-01-02T00:00:00.000Z' };

test('AO3 works keep their site and chapter address when saved and moved', async () => {
    const app = background();
    const send = action => new Promise(resolve => app.message(action, {}, resolve));
    await send({ message: 'set-bookmark', ...ao3Work, chapter: 1, url: 'https://archiveofourown.org/works/456/chapters/11' });
    await send({ message: 'set-bookmark', ...ao3Work });
    assert.deepEqual(app.local.data['ao3-456'], ao3Work);
    assert.deepEqual(app.local.data['123'], record);
});

test('exports with AO3 works can be imported, and replacing removes old AO3 works', async () => {
    const data = { '456': { ...record, id: '456' }, 'ao3-456': ao3Work };
    const local = await importFile(data, false, true, { '123': record, 'ao3-789': { ...ao3Work, id: 'ao3-789' } });
    assert.deepEqual(local.data, data);
    for (const bad of [{ 'ao3-': { ...ao3Work, id: 'ao3-' } }, { 'ao3-456': { ...ao3Work, id: 'ao3-789' } }]) {
        assert.deepEqual((await importFile(bad)).data, { '123': record });
    }
});

test('failed bookmark read or write preserves the saved chapter', async () => {
    for (const failure of ['failGet', 'failSet']) {
        const app = background();
        app.local[failure] = true;
        app.message({ message: 'set-bookmark', id: '123', chapter: 8 }, {}, () => {});
        await flush();
        assert.deepEqual(app.local.data, { '123': record });
    }
});

test('failed settings load does not attach controls that could overwrite saved settings', async () => {
    const sync = storage({ settings: oldSettings });
    sync.failGet = true;
    let bound = false;
    const context = vm.createContext({ window: {}, chrome: { storage: { sync } },
        console: { error() {} }, document: { querySelectorAll: () => [{ id: 'bookmarks',
            addEventListener: () => { bound = true; } }] } });
    vm.runInContext(read('utils/handlers.js'), context);
    context.window.setupCheckboxes();
    await flush();
    assert.equal(bound, false);
    assert.deepEqual(sync.writes, []);
});

test('moving a bookmark sends only a save and preserves its original added date', async () => {
    const source = read('content-script.js');
    const start = source.indexOf('onclick: async function() {', source.indexOf("id: `bookmark${ch}`"));
    const end = source.indexOf('\n                }\n            });', start);
    assert.ok(start >= 0 && end > start);
    const messages = [];
    let clicked = false;
    const previousButton = { click: () => { clicked = true; } };
    const dir = { '123': structuredClone(record) };
    const context = vm.createContext({
        dir, id: '123', ch: 8, chapters: 20, fandom: '', author: '', name: 'Test',
        info: { bookmarks: true }, unmarked: 'unmarked', go: { style: {} },
        document: { getElementById: id => id === 'bookmark7' ? previousButton : null },
        getBookmarkStatus: (info, status) => status, getBookmarkColor() {}, bookmarkIcon() {},
        sendMsg: message => messages.push(message), showLastRead() {}, qs() {},
    });
    await vm.runInContext('(' + source.slice(start + 'onclick: '.length, end) + '\n}).call({})', context);
    assert.equal(clicked, false);
    assert.deepEqual(messages.map(message => message.message), ['set-bookmark']);
    assert.equal(messages[0].addTime, record.addTime);
    assert.equal(messages[0].status, record.status);
    assert.equal(messages[0].chapter, 8);
});

test('the disabled 1.2.1 color setting keeps a uniform green bookmark', () => {
    const source = read('content-script.js');
    const start = source.indexOf('const getBookmarkColor =');
    const end = source.indexOf('\n};', start) + 3;
    const color = vm.runInNewContext(source.slice(start, end) + '\ngetBookmarkColor({ colorBookmarks: false }, {}, "123", 10, 3)');
    assert.equal(color, '#389e0d');
});

test('content script reads legacy records without rewriting them and distinguishes read failure', async () => {
    const source = read('content-script.js');
    const start = source.indexOf('const loadInfoAndDir =');
    const end = source.indexOf('\nconst main =', start);
    assert.ok(start >= 0 && end > start);
    const initial = { '123': { storyId: '123', fandomName: 'Fandom', chapter: 7 } };
    const local = storage(initial);
    const context = vm.createContext({ pageStoryIds: () => ['123'],
        chrome: { storage: { local: { get: () => local.get() }, sync: storage({ settings: oldSettings }) } },
        console: { error() {} } });
    const load = vm.runInContext(source.slice(start, end) + '\nloadInfoAndDir', context);
    const [, dir] = await load();
    assert.equal(dir['123'].id, '123');
    assert.equal(dir['123'].fandom, 'Fandom');
    assert.deepEqual(local.data, initial);
    assert.deepEqual(local.writes, []);
    local.failGet = true;
    assert.equal((await load())[1], null);
});
