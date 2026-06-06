/**
 * Checkbox handler utility for BetterFiction extension
 * This file is included via script tags in popup and tabs HTML files
 */

let _settingsPromise = null;
const _getSettings = () => {
    if (!_settingsPromise) {
        _settingsPromise = chrome.storage.sync.get('settings')
            .then(result => result.settings || {})
            .catch((error) => {
                console.error('Failed to load settings:', error);
                return {};
            });
    }
    return _settingsPromise;
};

window.getSettings = _getSettings;

/**
 * Sets up checkbox event handlers for extension settings
 * Loads current settings and saves changes to chrome storage
 */
window.setupCheckboxes = () => {
    const checkboxes = document.querySelectorAll('[type="checkbox"]');

    _getSettings().then((settings) => {
        checkboxes.forEach(checkbox => {
            if (settings[checkbox.id] !== undefined) {
                checkbox.checked = settings[checkbox.id];
            }

            checkbox.addEventListener('click', () => {
                settings[checkbox.id] = checkbox.checked;
                chrome.storage.sync.set({ settings })
                    .catch((error) => {
                        console.error(`Failed to save checkbox state for ${checkbox.id}:`, error);
                    });
            });
        });
    });
};


window.setupSelects = () => {
    const selects = document.querySelectorAll('select');

    _getSettings().then((settings) => {
        selects.forEach(select => {
            if (settings[select.id] !== undefined) {
                select.value = settings[select.id];
            }

            select.addEventListener('change', () => {
                settings[select.id] = select.value;
                chrome.storage.sync.set({ settings })
                    .catch((error) => {
                        console.error(`Failed to save select state for ${select.id}:`, error);
                    });
            });
        });
    });
};

