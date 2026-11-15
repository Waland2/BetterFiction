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
