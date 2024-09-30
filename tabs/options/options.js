let boxes = document.querySelectorAll(`[type="checkbox"]`);


boxes.forEach(el => {

    chrome.storage.sync.get("settings").then(result => {
        el.checked = result.settings[el.id];
    })

    el.addEventListener("click", () => {
        chrome.storage.sync.get("settings").then(result => {
            result.settings[el.id] = el.checked;
            chrome.storage.sync.set({settings : result.settings});
        })
    })
})






