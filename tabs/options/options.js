const checkboxes = document.querySelectorAll('[type="checkbox"]');

checkboxes.forEach((checkbox) => {
    chrome.storage.sync.get('settings')
        .then((result) => {
            const settings = result.settings;
            if (settings && settings[checkbox.id] !== undefined) {
                checkbox.checked = settings[checkbox.id];
            }
        })
        .catch((error) => {
            console.error(`Failed to load checkbox state for ${checkbox.id}:`, error);
        });

    checkbox.addEventListener('click', () => {
        chrome.storage.sync.get('settings')
            .then((result) => {
                let settings = result.settings;
                if (!settings) {
                    settings = {};
                }
                settings[checkbox.id] = checkbox.checked;
                return chrome.storage.sync.set({ settings: settings });
            })
            .catch((error) => {
                console.error(`Failed to save checkbox state for ${checkbox.id}:`, error);
            });
    });
});
