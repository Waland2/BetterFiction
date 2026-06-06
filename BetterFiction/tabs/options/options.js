setupCheckboxes();
setupSelects();

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
