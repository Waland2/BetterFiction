const mainFunks = ["autoSave", "markFicWithBookmark", "bigCovers", "separateFics", "betterInfo", "betterInfoColor", "myFicList", "allFicButton"];
const secondaryFunks = ["shortcuts", "allowCopy", "bookmarkButton", "chapterWordCounter", "moreOptionsInProfile"];


chrome.runtime.onInstalled.addListener(function () {
    var data = {
        autoSave: false,
        bigCovers: true,
        separateFics: true,
        betterInfo: true,
        betterInfoColor: true,
        myFicList: false,
        allFicButton: false,
        markFicWithBookmark: false
    };

    secondaryFunks.forEach(el => {
        data[el] = true;
    })

    chrome.storage.sync.get("settings").then(result => {
        if (result.settings) {
            [...mainFunks, ...secondaryFunks].forEach(el => {
                data[el] = result.settings[el];
            })
        }
        chrome.storage.sync.set({ settings: data });
    })

})



chrome.runtime.onMessage.addListener((action, sender, sendResponse) => {
    if (action.message === "set-bookmark") {

        var currentDate = new Date();
        var day = currentDate.getDate(), month = currentDate.getMonth() + 1, year = currentDate.getFullYear();
        if (day < 10) day = `0${day}`;
        if (month < 10) month = `0${month}`;
        
        chrome.storage.local.set({
            [action.id]: {
                chapter: action.chapter,
                storyId: action.id,
                fandomName: action.fandom,
                author: action.author,
                storyName: action.storyName,
                addTime: `${day}/${month}/${year}`
            }
        });
    }
    else if (action.message === "del-bookmark") {
        chrome.storage.local.remove(action.id);
    }
    else if (action.message === "auto-bookmark") {
        chrome.storage.local.get([action.id]).then(result => {
            if (!result[action.id] || Number(action.chapter) > Number(result[action.id].chapter)) {
                sendResponse({ status: true });
            }
            else { sendResponse({ status: false }); }
        })
    }
    else if (action.message === "get-bookmark") {
        chrome.storage.local.get([action.id]).then(result => {
            if (result[action.id]) {
                let storyName = null;
                if (result[action.id].storyName) storyName = result[action.id].storyName.replaceAll(" ", "-");

                if (result[action.id].chapter) sendResponse({ chapter: result[action.id].chapter, storyID: action.id, storyName: storyName});
                else sendResponse({ chapter: result[action.id], storyID: action.id });
            }
            else sendResponse({ chapter: "0", storyID: action.id });
        })
    }
    else if (action.message === "get-info") {
        chrome.storage.sync.get("settings").then(result => {
            sendResponse({ result: result.settings });
        })
    }
    else if (action.message === "open-html-page") {
        chrome.tabs.create({ url: action.fileName });
    }
    else if (action.message === "get-links") {
        chrome.storage.local.get().then(result => {

            var arr = []; 
            for (let key in result) {
                let mk = result[key];
                
                if (mk.storyName) {
                    let link = `https://www.fanfiction.net/s/${mk.storyId}/1/${mk.storyName.replaceAll(/[,&:;)]/g, "").replaceAll(/['(]/g, " ").replaceAll(" ", "-")}`
                    arr.push(link)
                }
            }

            sendResponse({ result: arr });
        })
    }
    return true;
})

