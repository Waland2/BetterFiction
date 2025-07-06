var states
chrome.runtime.sendMessage({message: "get-info"}, response => { 
    states = response.result;
})
let colorOfLang, reverseColorOfLang;
const allGeners = "AdventureAngstCrimeDramaFamilyFantasyFriendshipGeneralHorrorHumorHurt/ComfortMysteryParodyPoetryRomanceSci-FiSpiritualSupernaturalSuspenseTragedyWestern"

var regex = /https:\/\/www\.fanfiction\.net\/s\/(.*?)\/(.*?)\/(.*?)$/;
var match = window.location.href.match(regex);

var chapter, storyID, ficName
if (match) {
    chapter = match[2]; 
    storyID = match[1];
} else {    
    chapter = 1;
    storyID = "0"; // declarating later
}
ficName = document.querySelectorAll("b")[5].innerText;


async function main() {
    const messagePromise = new Promise((resolve) => {
      chrome.runtime.sendMessage({ message: "get-info" }, response => { 
        resolve(response.result);
      });
    });
    
    states = await messagePromise;
    await makeSpans();

    // Declarating spans
    let rating = document.querySelector(".rated"),
        language = document.querySelector(".lang"),
        genres = document.querySelector(".genres"),
        chapters = document.querySelector(".chapters"),
        chaptersCount = document.querySelector(".chapters-cnt"),
        words = document.querySelector(".words"),
        wordsCount = document.querySelector(".words-cnt"),
        reviews = document.querySelector(".review"),
        reviewsCount = document.querySelector(".rew-cnt"),
        favs = document.querySelector(".fav"),
        favsCount = document.querySelector(".fav-cnt"),
        follows = document.querySelector(".follow"),
        followsCount = document.querySelector(".fol-cnt"),
        updated = document.querySelector(".updated"),
        published = document.querySelector(".published"),
        characters = document.querySelector(".characters"),
        status = document.querySelector(".status");
    if (reviewsCount) reviewsCount = reviewsCount.querySelector("a");

    // Story Word Counter
    let wordCounterSpan = undefined;
    if (states.chapterWordCounter && document.querySelector("#chap_select")) {
        let wordCounter = 0;
        document.querySelectorAll("p").forEach(el => wordCounter += el.innerText.trim().split(/\s+/).length);

        wordCounterSpan = document.createElement("span");
        wordCounterSpan.innerHTML = `<br>Words in chapter: <b>${wordCounter}</b>`;
        wordCounterSpan.style.color = "black";

        const navigationBar =  document.querySelector('[style="float:right; "]');
        navigationBar.appendChild(wordCounterSpan);
        rating.parentElement.before(navigationBar);
    }



    if (states.bookmarkButton) {

        // Create bookmark button

        const bookmarkButton = document.createElement("button");
        bookmarkButton.type = "button";
        bookmarkButton.className = "btn pull-right"; 
        bookmarkButton.style.marginRight = "5px";
        bookmarkButton.style.height = "30px";
        bookmarkButton.title = "bookmark";

        bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL("icons/bookmark2.png")}" width="20" height="20">`;

        const followButton = document.querySelector(".icon-heart");
        followButton.before(bookmarkButton);
        followButton.remove();
        bookmarkButton.before(followButton);
        
        var isBookmarkLeaved = false;

        bookmarkButton.addEventListener("click", () => {
            
            if (isBookmarkLeaved) {
                isBookmarkLeaved = false;
                bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL("icons/bookmark2.png")}" width="20" height="20">`;
                chrome.runtime.sendMessage({
                    message: "del-bookmark",
                    id: storyID
                })
            }
            else {
                isBookmarkLeaved = true;
                bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL("icons/bookmark1.png")}" width="20" height="20">`;
                let fandomName = document.querySelector("#pre_story_links").querySelectorAll("a");
                if (fandomName[1]) fandomName = fandomName[1].innerText;
                else fandomName = fandomName[0].innerText;

                chrome.runtime.sendMessage({ 
                    message: "set-bookmark",
                    chapter: Number(chapter),
                    id: storyID, 
                    fandom: fandomName,
                    author: document.querySelector("#profile_top").querySelector("a").innerText,
                    storyName: document.querySelectorAll("b")[5].innerText
                });

            }
        })

        // Auto bookmark on last chapter
        if (states.autoSave) { 
            chrome.runtime.sendMessage({ message: "auto-bookmark", chapter: chapter, id: storyID}, response => {
                if (response.status) {
                    bookmarkButton.click();
                }
            })
        }

        // Current chapter bookmark check
        chrome.runtime.sendMessage({ message: "get-bookmark", id: storyID}, response => {
            if (Number(response.chapter) === Number(chapter) && !isBookmarkLeaved) {
                isBookmarkLeaved = true;
                bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL("icons/bookmark1.png")}" width="20" height="20">`;
            }
        })


        // Creating go-to-bookmark button
        const goButton = document.createElement("button"); 
        goButton.type = "button";
        goButton.className = "btn pull-right"; 
        goButton.innerHTML = "Go to bookmark"

        goButton.style.marginRight = "5px";
        bookmarkButton.before(goButton)

        goButton.addEventListener("click", () => {
            chrome.runtime.sendMessage({ message: "get-bookmark", id: storyID}, response => {
                if (Number(response.chapter) !== 0) {
                    let chapterLink = (`https://www.fanfiction.net/s/${response.storyID}/${response.chapter}/${response.storyName}`)
                    window.open(chapterLink, "_self");
                }
            })
        }) 
        
    }

     // All on one page button
     if (states.allFicButton && document.querySelector("#chap_select")) {

        const allFicButton = document.createElement("button"); 
        allFicButton.type = "button";
        allFicButton.className = "btn"; 
        allFicButton.innerHTML = "Entire Work";
        allFicButton.style.marginLeft = "5px";

        document.querySelector(`[onclick="toggleTheme();"]`).after(allFicButton);

        bookmarkChapter = () => {
            return `<img src="${chrome.runtime.getURL("icons/bookmark2.png")}" width="20" height="20">`;
        }

        sepSpan = (i, a) => {
            let span = document.createElement("span");
            if (i + 1 === a.length) span.innerHTML = `<br><br><br><hr size="1" noshade=""><br><br><br>`;
            else if (states.bookmarkButton) span.innerHTML = `<br><br><br><br><h3>${a[i + 1]}</h3><button type="button" class="btn pull-right bookmark" title="bookmark" style="margin-right: 5px; height: 30px;" id="bookmark${i + 2}">${bookmarkChapter()}</button><hr size="1" noshade="" style="
            background: darkgrey;
            height: 2px;
        "><br><br><br>`;
            else span.innerHTML = `<br><br><br><br><h3>${a[i + 1]}</h3><hr size="1" noshade="" style="
            background: darkgrey;
            height: 2px;
        "><br><br><br>`;
            return span;
        }

        getChapterURL = (i) => {return `https://www.fanfiction.net/s/${storyID}/${i}`; }

        allFicButton.addEventListener("click", async () => {
            let count = Number(chaptersCount.innerText);
            let currentChapter = Number(chapter);

            let newFullStory = document.createElement("div");
            var chaptersArray = [], chaptersName = document.querySelector("#chap_select").innerText.split("\n");
            var gettedChapter;

            getQuery = async (url, i) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');

                    const responseText = await response.text();
                    const htmlCode = new DOMParser().parseFromString(responseText, 'text/html');

                    const nextChapter = htmlCode.querySelector('#storytext');
                    nextChapter.id = `storytext${i + 1}`;

                    gettedChapter = nextChapter;
                    return 1;
                } catch (error) {
                    console.error('Fetch error:', error);
                    return 0;
                }
            }

            for (let i = 0; i < count; i++) {
                let url = getChapterURL(i + 1);
                if (!await getQuery(url, i)) {
                    break;
                }else {
                    if (i === 0) {
                        document.querySelector("#storytext").before(sepSpan(-1, chaptersName));
                    }
                    document.querySelector("#storytext").before(gettedChapter);
                    document.querySelector("#storytext").before(sepSpan(i, chaptersName));
                }
            }
            // console.log(chaptersArray);

            // chaptersArray.sort((a, b) => {
            //     let aNum = Number(a.id.replace(/[a-zA-Z]/g, "")), bNum = Number(b.id.replace(/[a-zA-Z]/g, ""));

            //     if (aNum > bNum) return 1;
            //     else return -1;
            // })

            // console.log(chaptersArray);

            // document.querySelector("#storytext").before(sepSpan(-1, chaptersName));
            // for (let i = 0; i < count; ++i) {
            //     if (!chaptersArray[i]) break; 
            //     document.querySelector("#storytext").before(chaptersArray[i]);
            //     document.querySelector("#storytext").before(sepSpan(i, chaptersName));
            // }


            // wtf
            document.querySelector("#storytext").remove();
            let allFicText = document.querySelector("#storytext1").parentElement;
            allFicText.id = "storytext";
            if (states.allowCopy) {
                allFicText.querySelectorAll("*").forEach(el => el.style.userSelect = "text");
            }
            let isBookmarkLeaved = false, lastChapterBookmark = -1;
            if (states.bookmarkButton) {
                document.querySelectorAll(".bookmark").forEach(el => {
                    
                    el.addEventListener("click", () => {
        
                        if (isBookmarkLeaved && lastChapterBookmark === Number(el.id.replace(/[a-zA-Z]/g, ""))) {
                            lastChapterBookmark = -1
                            isBookmarkLeaved = false;
                            el.innerHTML = `<img src="${chrome.runtime.getURL("icons/bookmark2.png")}" width="20" height="20">`;
                            chrome.runtime.sendMessage({
                                message: "del-bookmark",
                                id: storyID
                            })
                        }
                        else {
                            if (lastChapterBookmark !== -1) {
                                document.querySelector(`#bookmark${lastChapterBookmark}`).click();
                            }
                            lastChapterBookmark = Number(el.id.replace(/[a-zA-Z]/g, ""));
                            isBookmarkLeaved = true;
                            el.innerHTML = `<img src="${chrome.runtime.getURL("icons/bookmark1.png")}" width="20" height="20">`;
                            let fandomName = document.querySelector("#pre_story_links").querySelectorAll("a");
                            if (fandomName[1]) fandomName = fandomName[1].innerText;
                            else fandomName = fandomName[0].innerText;
            
                            chrome.runtime.sendMessage({ 
                                message: "set-bookmark",
                                chapter: Number(el.id.replace(/[a-zA-Z]/g, "")),
                                id: storyID, 
                                fandom: fandomName,
                                author: document.querySelector("#profile_top").querySelector("a").innerText,
                                storyName: document.querySelectorAll("b")[5].innerText
                            });
            
                        }
                    })

                })

                chrome.runtime.sendMessage({ message: "get-bookmark", id: storyID}, response => {
                    document.querySelector(`#bookmark${response.chapter}`).click();
                })
            }

            document.querySelector(`[title="bookmark"]`).remove();
            
        });
    }

    
    // Switching colors
    if (rating.parentElement.classList.length >= 3) {
        switchTheme(
            wordCounterSpan, 
            rating, 
            language,
            genres,
            chaptersCount,
            wordsCount, 
            reviewsCount,
            favsCount, 
            followsCount,
            status,
            document.querySelectorAll("h3")
        );
    }

    document.querySelector(`[onclick="toggleTheme();"]`).addEventListener("click", () => {
        switchTheme(
            wordCounterSpan, 
            rating, 
            language,
            genres,
            chaptersCount,
            wordsCount, 
            reviewsCount,
            favsCount, 
            followsCount,
            status,
            document.querySelectorAll("h3")
        );
    })
}

function switchTheme(wordCounterSpan, rating, lang, genres, chapters, words, rev, fav, fol, status, h3s) {
    setColor = (arr) => {
        arr.forEach(el => {
            if (el && el[0]) el[0].style.color = el[1];
        })
    }

    if (rating.style.color === "rgb(8, 131, 131)") {
        setColor([
                    [wordCounterSpan, "white"],
                    [rating, "rgb(247, 124, 124)"],
                    [lang, reverseColorOfLang],
                    [genres, "rgb(111, 207, 255)"],
                    [chapters, "white"],
                    [words, "white"],
                    [rev, "rgb(255, 124, 25)"],
                    [fav, "white"],
                    [fol, "white"],
                    [status, "rgb(255, 156, 224)"],
                ])
        h3s.forEach(el => {
            setColor([[el, "white"]]);
        })

        rating.parentElement.classList = "xgray"
        rating.parentElement.style.color = "rgb(208, 208, 208)"
    }
    else {
        setColor([
                    [wordCounterSpan, "black"],
                    [rating, "rgb(8, 131, 131)"],
                    [lang, colorOfLang],
                    [genres, "rgb(144, 48, 0)"],
                    [chapters, "black"],
                    [words, "black"],
                    [rev, ""],
                    [fav, "black"],
                    [fol, "black"],
                    [status, "rgb(0, 99, 31)"]
                    [h3s, "black"]
                ])
        h3s.forEach(el => {
            setColor([[el, "black"]]);
        })

        rating.parentElement.classList = "xgray"
        rating.parentElement.style.color = ""
    }
}

async function makeSpans() {
    let desc = document.querySelector(`[target="rating"]`).parentElement;

    desc.innerHTML = desc.innerText.split(" - ").map(item => `<span>${item}</span>`).join(" - "); // separate blocks
    
    mySpans = desc.querySelectorAll("span");

    mySpans[1].classList = "lang"
    mySpans[mySpans.length - 1].classList = "ids";
    if (!mySpans[2].innerText.includes("Chapters")) {
        if (mySpans[2].innerText.includes("/") || allGeners.includes(mySpans[2].innerText)) {
            mySpans[2].classList = "genres";
        }
    }

    mySpans.forEach(i => {
        let item = i.innerText;
        let t = ""
        if (item.includes("Rated")) t = "rated";
        else if (item.includes("Chapters")) t = "chapters";
        else if (item.includes("Words")) t = "words";
        else if (item.includes("Reviews")) t = "review";
        else if (item.includes("Favs")) t = "fav";
        else if (item.includes("Follows")) t = "follow";
        else if (item.includes("Updated")) t = "updated";
        else if (item.includes("Published")) t = "published";
        else if (item.includes("Complete")) t = "status";
        
        if (t) i.classList.add(t);
    })

    let v = desc.querySelector(":not([class])")
    if (v) {
        v.className = "characters";
    }

    let rating = document.querySelector(".rated"),
        language = document.querySelector(".lang"),
        genres = document.querySelector(".genres"),
        chapters = document.querySelector(".chapters"),
        words = document.querySelector(".words"),
        reviews = document.querySelector(".review"),
        favs = document.querySelector(".fav"),
        follows = document.querySelector(".follow"),
        updated = document.querySelector(".updated"),
        published = document.querySelector(".published"),
        characters = document.querySelector(".characters"),
        status = document.querySelector(".status");

    let idSpan = desc.querySelector(".ids");    
    let a = words.innerText.split(" ");
    a[1] = `<span class='words-cnt'>${a[1]}</span>`;
    words.innerHTML = a.join(" ")

    if (chapters) {
        a = chapters.innerText.split(" ");
        a[1] = `<span class='chapters-cnt'>${a[1]}</span>`;
        chapters.innerHTML = a.join(" ")
    }
    if (favs) {
        a = favs.innerText.split(" ");
        a[1] = `<span class='fav-cnt'>${a[1]}</span>`;
        favs.innerHTML = a.join(" ")
    }
    if (follows) {
        a = follows.innerText.split(" ");
        a[1] = `<span class='fol-cnt'>${a[1]}</span>`;
        follows.innerHTML = a.join(" ")
    }
    if (reviews) {
        a = reviews.innerText.split(" ");
        a[1] = `<span class='rew-cnt'>${a[1]}</span>`;
        reviews.innerHTML = a.join(" ")
    }
    if (idSpan) {
        a = idSpan.innerText.split(" ");
        a[1] = `<span class='real-id'>${a[1]}</span>`;
        idSpan.innerHTML = a.join(" ")
        if (storyID === "0") storyID = document.querySelector(".real-id").innerText;

        idSpan.remove();
    }       



    let chaptersCount = document.querySelector(".chapters-cnt"),
        wordsCount = document.querySelector(".words-cnt"),
        reviewsCount = document.querySelector(".rew-cnt"),
        favsCount = document.querySelector(".fav-cnt"),
        followsCount = document.querySelector(".fol-cnt")
    if (reviewsCount) reviewsCount = reviewsCount.querySelector("a");

    // Language color
    if (language.innerText === "English") {
        language.style.color = "rgb(151, 0, 0)";
        colorOfLang = "rgb(151, 0, 0)"
        reverseColorOfLang = "rgb(104, 255, 255)"
    }
    else if (language.innerText === "Spanish") { 
        language.style.color = "rgb(171, 143, 0)";
        colorOfLang = "rgb(171, 143, 0)"
        reverseColorOfLang = "rgb(84, 112, 255)"
    }
    else {
        language.style.color = "blue";
        colorOfLang = "blue"    
        reverseColorOfLang = "rgb(255, 255, 0)"
    } 
    

    // Color for Complete
    if (status) { 
        status.style.color = "rgb(0, 99, 31)";
        status.style.fontWeight = "600";
        status.innerHTML = status.innerHTML.replace("Status: ", "");
        desc.innerHTML = desc.innerHTML.replace("Complete</span> - ", "Complete</span>")
    }else if (desc.querySelector(".characters")) {
        let str = desc.innerHTML;
        let lastDashIndex = str.lastIndexOf("-");
        desc.innerHTML = str.slice(0, lastDashIndex) + str.slice(lastDashIndex + 1);
    }

    // Create rate span
    rating = desc.querySelector(".rated");
    if (rating) {
        rating.style.color = "rgb(8, 131, 131)";  
        let rate = rating.innerText;
        if (rate.includes("Fiction K+")) rating.title = "Suitable for more mature childen, 9 years and older, with minor action violence without serious injury. May contain mild coarse language. Should not contain any adult themes.";
        else if (rate.includes("Fiction K")) rating.title = "Intended for general audience 5 years and older. Content should be free of any coarse language, violence, and adult themes.";
        else if (rate.includes("Fiction T")) rating.title = "Suitable for teens, 13 years and older, with some violence, minor coarse language, and minor suggestive adult themes.";
        else rating.title = "Intended for general audience 5 years and older. Content should be free of any coarse language, violence, and adult themes. Fiction M can contain adult language, themes and suggestions. Detailed descriptions of physical interaction of sexual or violent nature is considered Fiction MA.";
        rating.innerText = rate.replace("Fiction", "")
    }


    wordsCount = desc.querySelector(".words-cnt");
    chaptersCount = desc.querySelector(".chapters-cnt");
    if (wordsCount) wordsCount.style.color = "black";
    if (chaptersCount) chaptersCount.style.color = "black";


    favsCount = desc.querySelector(".fav-cnt");
    followsCount = desc.querySelector(".fol-cnt");
    reviewsCount = desc.querySelector(".rew-cnt");
    if (favsCount) favsCount.style.color = "black";
    if (followsCount) followsCount.style.color = "black";
    if (reviewsCount) {
        reviewsCount.innerHTML = `<a href="/r/${storyID}/">${reviewsCount.innerHTML}</a>`
        reviewsCount.style.color = "black";
    }

    genres = desc.querySelector(".genres");
    if (genres) {
        genres.style.color = "rgb(144, 48, 0)";
    }
        
    words = desc.querySelector(".words")
    follows = desc.querySelector(".follow")
    published = desc.querySelector(".published");
    characters = desc.querySelector(".characters")
    language = desc.querySelector(".lang");

    if (characters) {
        published.after(characters);
        published.after(" -");
    }

    if (genres) genres.after(document.createElement("br"));
    else language.after(document.createElement("br"));

    words.after(document.createElement("br"));

    if (follows) follows.after(document.createElement("br"));
    else if (favs) favs.after(document.createElement("br"));
    else if (reviews) reviews.after(document.createElement("br"));

    if (desc.querySelector(".status") || desc.querySelector(".characters")) {
        published.after(document.createElement("br"));
    }

    desc.innerHTML = desc.innerHTML.replace('<br> -  - ', '<br> -')
    desc.innerHTML = desc.innerHTML.replace(/<br>.{2}/g, '<br>');


    let stats = document.querySelector(".lang").parentElement
    stats.parentElement.after(stats);  
}

main();
