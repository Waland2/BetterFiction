
async function main() {
    const { Runtime } = await import("../browser-api.js");

    const messagePromise = new Promise((resolve) => {
        Runtime.sendMessage({ message: "get-info" }, response => { 
            resolve(response.result);
        })
    })


    var states = await messagePromise;
    // console.log(fwb);
    
    let fics = document.querySelectorAll('[class="z-list zhover zpointer "]');
    let covers = document.querySelectorAll(".cimage");

    await makeSpans();


    if (states.bigCovers) {
        covers.forEach(el => {
            el.style.width = "75px";
            el.style.height = "112px";
        })
        
        fics.forEach(el =>{ 
            el.style.height = "115px";
        })
    }


    const messagePromise2 = new Promise((resolve) => {
        Runtime.sendMessage({ message: "get-links" }).then(response => {
            resolve(response.result);
        })
    })

    var fwb = await messagePromise2;
    
    fics.forEach(el => {
        
        // Declarating spans
        let rating = el.querySelector(".rated"),
            language = el.querySelector(".lang"),
            genres = el.querySelector(".genres"),
            chapters = el.querySelector(".chapters"),
            chaptersCount = el.querySelector(".chapters-cnt"),
            words = el.querySelector(".words"),
            wordsCount = el.querySelector(".words-cnt"),
            reviews = el.querySelector(".review"),
            reviewsCount = el.querySelector(".rew-cnt"),
            favs = el.querySelector(".fav"),
            favsCount = el.querySelector(".fav-cnt"),
            follows = el.querySelector(".follow"),
            followsCount = el.querySelector(".fol-cnt"),
            updated = el.querySelector(".updated"),
            published = el.querySelector(".published"),
            characters = el.querySelector(".characters"),
            status = el.querySelector(".status");

        if (states.separateFics) {
            el.style.marginBottom = "10px";
            el.style.borderBottom = "1px solid rgb(150, 150, 150)";
            el.style.borderTop = "1px solid rgb(150, 150, 150)";
            el.style.borderRight = "1px solid rgb(150, 150, 150)";
        }

        // Mark fics with bookmark
        if (states.markFicWithBookmark) {
            if (fwb.includes(el.querySelector("a").href)) {
                el.style.backgroundColor = "#e1edff";
                book = document.createElement('img');
                book.src = Runtime.getURL("icons/bookmark1.png");
                book.width = "14";
                book.height = "14";
                el.querySelector("div").before(book);
            }
        }

        if (states.betterInfoColor) {
            let desc = el.querySelector("div").querySelector("div");

            // Language color
            if (language.innerText === "English") language.style.color = "rgb(151, 0, 0)";
            else if (language.innerText === "Spanish") language.style.color = "rgb(171, 143, 0)";
            else language.style.color = "blue";
            
            // Color for `complete`
            if (status) { 
                status.style.color = "rgb(0, 99, 31)";
                status.style.fontWeight = "600";
            }

            // Rating color
            if (rating) {
                rating.style.color = "rgb(8, 131, 131)";
            }    

            wordsCount.style.color = "black";
            chaptersCount.style.color = "black";

            if (favsCount) favsCount.style.color = "black";
            if (followsCount) followsCount.style.color = "black";
            if (reviewsCount) reviewsCount.style.color = "black";
            if (genres) genres.style.color = "rgb(144, 48, 0)";
        }

        if (states.betterInfo) {
            
            let desc  = el.querySelector("div").querySelector("div");
            if (states.bigCovers) desc.style.marginLeft = "62px";

            let check = 0;
            genres = desc.querySelector(".genres")


            if (genres) genres.after(document.createElement("br"));
            else language.after(document.createElement("br"));

            words.after(document.createElement("br"));

            if (follows) follows.after(document.createElement("br"));
            else if (favs) favs.after(document.createElement("br"));
            else if (reviews) reviews.after(document.createElement("br"));
            else check = 1

            if (status || characters) {
                published.after(document.createElement("br"));
            }

            el.style.height = `auto`;
            el.style.minHeight = "120px";

            desc.innerHTML = desc.innerHTML.replace(/<br>.{2}/g, '<br>');    
        }

    });

}

async function makeSpans() {
    let imagesParent = document.querySelectorAll('[class="z-list zhover zpointer "]');

    imagesParent.forEach(el => {
            
        let desc = el.querySelector("div").querySelector("div");
        
        desc.innerHTML = desc.innerText.split(" - ").map(item => `<span>${item}</span>`).join(" - ");
        let t;
        
        mySpans = desc.querySelectorAll("span");

        mySpans[1].classList = "lang"
        if (!mySpans[2].innerText.includes("Chapters")) {
            mySpans[2].classList = "genres";
        }


        mySpans.forEach(i => {
            let item = i.innerText;
            t = ""
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
        if (v) v.className = "characters";

        let wordSpan = desc.querySelector(".words");
        let chapterSpan = desc.querySelector(".chapters");
        let favSpan = desc.querySelector(".fav");
        let folSpan = desc.querySelector(".follow");
        let rewSpan = desc.querySelector(".review");

        let a = wordSpan.innerText.split(" ");
        a[1] = `<span class='words-cnt'>${a[1]}</span>`;
        wordSpan.innerHTML = a.join(" ")

        a = chapterSpan.innerText.split(" ");
        a[1] = `<span class='chapters-cnt'>${a[1]}</span>`;
        chapterSpan.innerHTML = a.join(" ")

        if (favSpan) {
            a = favSpan.innerText.split(" ");
            a[1] = `<span class='fav-cnt'>${a[1]}</span>`;
            favSpan.innerHTML = a.join(" ")
        }
        if (folSpan) {
            a = folSpan.innerText.split(" ");
            a[1] = `<span class='fol-cnt'>${a[1]}</span>`;
            folSpan.innerHTML = a.join(" ")
        }
        if (rewSpan) {
            a = rewSpan.innerText.split(" ");
            a[1] = `<span class='rew-cnt'>${a[1]}</span>`;
            rewSpan.innerHTML = a.join(" ")
        }
    })

}
main();

 