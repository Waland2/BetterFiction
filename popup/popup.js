// Use the shared checkbox handler
setupCheckboxes();

document.querySelector('#det-setting').addEventListener('click', () => {
    chrome.tabs.create({ url: 'tabs/options/options.html' });
});

document.querySelector('#ext-version').innerText += chrome.runtime.getManifest().version;
