// Use the shared checkbox handler
setupCheckboxes();
setupSelects();

document.getElementById('det-setting').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tabs/options/options.html') });
});

document.getElementById('ext-version').innerText += chrome.runtime.getManifest().version;
