// Use the shared checkbox handler
setupCheckboxes();
setupSelects();

document.querySelector('#det-setting').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tabs/options/options.html') });
});

document.querySelector('#ext-version').innerText += chrome.runtime.getManifest().version;
