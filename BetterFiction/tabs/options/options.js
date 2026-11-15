setupCheckboxes();
setupSelects();

document.getElementById('version').textContent = chrome.runtime.getManifest().version;

// Compact or detailed layout: compact by default on desktop, detailed on small screens.
// The choice is remembered on this device.
const VIEW_KEY = 'betterfiction-settings-view';
const viewButtons = document.querySelectorAll('.view-switch .view');
const showView = (view) => {
    document.body.classList.toggle('compact', view === 'compact');
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
};
let savedView = null;
try {
    savedView = localStorage.getItem(VIEW_KEY);
} catch (error) {
    // storage blocked: use the default
}
if (savedView !== 'compact' && savedView !== 'detailed') {
    savedView = window.matchMedia('(max-width: 700px)').matches ? 'detailed' : 'compact';
}
showView(savedView);
viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
        showView(button.dataset.view);
        try {
            localStorage.setItem(VIEW_KEY, button.dataset.view);
        } catch (error) {
            // storage blocked: the choice lasts until the page is closed
        }
    });
});

const dateInput = document.getElementById('dateFormat');
const previewEl = document.getElementById('dateFormatPreview');
const errorEl = document.getElementById('dateFormatError');

const render = () => {
    const fmt = dateInput.value;
    const err = window.validateDateFormat(fmt);
    if (err) {
        errorEl.textContent = err;
        errorEl.hidden = false;
        previewEl.textContent = '';
    } else {
        errorEl.hidden = true;
        previewEl.textContent = window.formatDate(new Date(), fmt);
    }
    return err;
};

getSettings().then((settings) => {
    if (settings.dateFormat !== undefined) dateInput.value = settings.dateFormat;
    render();

    dateInput.addEventListener('input', () => {
        const err = render();
        if (err) return;
        settings.dateFormat = dateInput.value;
        chrome.storage.sync.set({ settings })
            .catch((error) => {
                console.error('Failed to save dateFormat:', error);
            });
    });
});

// Profile address for the top bar's profile link
const profileInput = document.getElementById('profileUrl');
const profileMessage = document.getElementById('profileUrlMessage');

/**
 * Turns what was typed into a clean profile address.
 * @param {string} value
 * @returns {string|null} The address, '' when empty, or null when it isn't a profile address.
 */
const cleanProfileUrl = (value) => {
    let text = value.trim();
    if (!text) return '';
    if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
    try {
        const url = new URL(text);
        if (!/(^|\.)fanfiction\.net$/i.test(url.hostname) || !/^\/u\/\d+/.test(url.pathname)) return null;
        return `https://www.fanfiction.net${url.pathname}`;
    } catch (error) {
        return null;
    }
};

const showProfileMessage = (text, isError = false) => {
    profileMessage.textContent = text;
    profileMessage.classList.toggle('error', isError);
    profileInput.setAttribute('aria-invalid', String(isError));
};

chrome.storage.sync.get('profileUrl')
    .then(({ profileUrl }) => {
        profileInput.value = profileUrl || '';
    })
    .catch((error) => {
        console.error('Failed to load the profile address:', error);
    });

profileInput.addEventListener('change', () => {
    const clean = cleanProfileUrl(profileInput.value);
    if (clean === null) {
        showProfileMessage('That isn\'t a FanFiction.net profile address. It looks like https://www.fanfiction.net/u/1234567/YourName', true);
        return;
    }
    profileInput.value = clean;
    chrome.storage.sync.set({ profileUrl: clean })
        .then(() => showProfileMessage(clean ? 'Profile address saved.' : 'Profile address removed.'))
        .catch((error) => {
            console.error('Failed to save the profile address:', error);
            showProfileMessage('The address couldn\'t be saved. Try again.', true);
        });
});
