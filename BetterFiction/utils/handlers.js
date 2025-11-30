/**
 * Checkbox handler utility for BetterFiction extension
 * This file is included via script tags in popup and tabs HTML files
 */

/**
 * Sets up checkbox event handlers for extension settings
 * Loads current settings and saves changes to chrome storage
 */
window.setupCheckboxes = () => {
    const checkboxes = document.querySelectorAll('[type="checkbox"]');

    // Load all settings once to avoid repeated storage calls
    chrome.storage.sync.get('settings')
        .then((result) => {
            const settings = result.settings || {};

            checkboxes.forEach(checkbox => {
                // Set current checkbox state
                if (settings[checkbox.id] !== undefined) {
                    checkbox.checked = settings[checkbox.id];
                }

                // Handle checkbox changes
                checkbox.addEventListener('click', () => {
                    settings[checkbox.id] = checkbox.checked;
                    chrome.storage.sync.set({ settings: settings })
                        .catch((error) => {
                            console.error(`Failed to save checkbox state for ${checkbox.id}:`, error);
                        });
                });
            });
        })
        .catch((error) => {
            console.error('Failed to load checkbox states:', error);
        });
};


window.setupSelects = () => {
    const selects = document.querySelectorAll('select');

    chrome.storage.sync.get('settings')
        .then((result) => {
            const settings = result.settings || {};

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
        })
        .catch((error) => {
            console.error('Failed to load select states:', error);
        });
};