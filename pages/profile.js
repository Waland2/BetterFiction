var states
chrome.runtime.sendMessage({message: "get-info"}, response => { 
    states = response.result;
})


async function main() {
    const messagePromise = new Promise((resolve) => {
            chrome.runtime.sendMessage({ message: "get-info" }, response => { 
            resolve(response.result);
        })
    })

    states = await messagePromise;
    let imagesParent = document.querySelectorAll('.mystories, .favstories');
    let images = document.querySelectorAll(`[height="66"]`);

    const messagePromise2 = new Promise((resolve) => {
        chrome.runtime.sendMessage({ message: "get-links" }).then(response => {
            resolve(response.result);
        })
    })

    var fwb = await messagePromise2;
    imagesParent.forEach(el => {
            
        let desc = el.querySelector("div").querySelector("div");
        
        let mas = desc.innerText.split(" - ");

        let newString = mas.map(item => `<span>${item}</span>`).join(" - ");
        let t;
        
        desc.innerHTML = newString;
        
        let mySpans = desc.querySelectorAll("span");

        if (mySpans[0].innerText === "Crossover") {
            mySpans[0].classList = "fran"
            mySpans[1].classList = "fran"
            mySpans[3].classList = "lang"
            if (!mySpans[4].innerText.includes("Chapters")) {
                mySpans[4].classList = "genres";
            }
        }else {
            mySpans[0].classList = "fran"
            mySpans[2].classList = "lang"
            if (!mySpans[3].innerText.includes("Chapters")) {
                mySpans[3].classList = "genres";
            }
        }

        if (mySpans[mySpans.length - 1].innerText === "Complete") {
            mySpans[mySpans.length - 1].classList = "status";
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

    if (states.markFicWithBookmark) {
        imagesParent.forEach(el =>{ 
            if (fwb.includes(el.querySelector("a").href)) {
                el.style.backgroundColor = "#e1edff";
                book = document.createElement('img');
                book.src = chrome.runtime.getURL("icons/bookmark1.png");
                book.width = "14";
                book.height = "14";
                el.querySelector("div").before(book);
            }
        })
    }

    if (states.bigCovers) {
        images.forEach(el => {
            el.style.width = "75px";
            el.style.height = "112px";
        })
        
        imagesParent.forEach(el =>{ 
            el.style.height = "115px";
        })
    }

    if (states.separateFics) {
        imagesParent.forEach(el =>{ 
            el.style.marginBottom = "10px";
            el.style.borderBottom = "1px solid rgb(150, 150, 150)";
            el.style.borderTop = "1px solid rgb(150, 150, 150)";
            el.style.borderRight = "1px solid rgb(150, 150, 150)";
        })
    }

    if (states.betterInfoColor) {

        imagesParent.forEach(el => {
            let desc = el.querySelector("div").querySelector("div");

            let langSpan = desc.querySelector(".lang"); // Language color
            if (langSpan.innerText === "English") langSpan.style.color = "rgb(151, 0, 0)";
            else if (langSpan.innerText === "Spanish") langSpan.style.color = "rgb(171, 143, 0)";
            else langSpan.style.color = "blue";
            
            let statusSpan = desc.querySelector(".status"); 
            if (statusSpan) { // color for Complete
                statusSpan.style.color = "rgb(0, 99, 31)";
                statusSpan.style.fontWeight = "600";
            }

            let rateSpan = desc.querySelector(".rated");
            if (rateSpan) {
                rateSpan.style.color = "rgb(8, 131, 131)";
            }    

            let wordSpan = desc.querySelector(".words-cnt");
            let chapterSpan = desc.querySelector(".chapters-cnt");
            wordSpan.style.color = "black";
            chapterSpan.style.color = "black";
            // wordSpan.style.fontWeight = "600";
            // chapterSpan.style.fontWeight = "600";

            let favSpan = desc.querySelector(".fav-cnt");
            let folSpan = desc.querySelector(".fol-cnt");
            let rewSpan = desc.querySelector(".rew-cnt");
            if (favSpan) {
                favSpan.style.color = "black";
            }
            if (folSpan) {
                folSpan.style.color = "black";
            }
            if (rewSpan) {
                rewSpan.style.color = "black";
            }
            // favSpan.style.fontWeight = "600";
            // folSpan.style.fontWeight = "600";
            // rewSpan.style.fontWeight = "600";

            let genSpan = desc.querySelector(".genres");
            if (genSpan) {
                genSpan.style.color = "rgb(144, 48, 0)";
            }

            let frn = desc.querySelectorAll(".fran");
            frn.forEach(it => {
                it.style.fontWeight = "600";
            })
        })
    }


    if (states.betterInfo) {

        imagesParent.forEach(el => {
            
            let desc  = el.querySelector("div").querySelector("div");
            if (states.bigCovers) {
                desc.style.marginLeft = "62px";
            }
            let frn, gen, wrd, flw, pbl;
            let check = 0;
            gen = desc.querySelector(".genres")

            frn = el.querySelectorAll(".fran")
            frn[frn.length - 1].after(document.createElement("br"));

            if (gen){
                gen.after(document.createElement("br"));
            } 
            else {
                desc.querySelector(".lang").after(document.createElement("br"));
            }

            wrd = desc.querySelector(".words")
            wrd.after(document.createElement("br"));

            flw = desc.querySelector(".follow")
            if (flw) flw.after(document.createElement("br"));
            else if (desc.querySelector(".fav")) desc.querySelector(".fav").after(document.createElement("br"));
            else if (desc.querySelector(".review")) desc.querySelector(".review").after(document.createElement("br"));
            else check = 1

            pbl = desc.querySelector(".published");
            if (desc.querySelector(".status") || desc.querySelector(".characters")) {
                pbl.after(document.createElement("br"));
            }

            el.style.height = `auto`;
            el.style.minHeight = "120px";



            desc.innerHTML = desc.innerHTML.replace(/<br>.{2}/g, '<br>');

        })

    }

    if (states.moreOptionsInProfile) {
        addButtons = (place) => {
            let stories = "favstories";
            if (place === "st") {
                stories = "mystories"
            }

            let newEl = document.createElement("span"), newEl2 = document.createElement("span");
            let point = () => {
                let p = document.createElement("span");
                p.innerText = " . ";
                return p
            }
            newEl.innerHTML = `Favs`;
            newEl.className = "gray";      
            newEl2.innerHTML = `Follows`;
            newEl2.className = "gray";
            let st = 0;
            if (place == "fs") st = 1;

            let g = document.querySelector(`[onclick="stories_init(${place}_array,'.${stories}');${place}_array.sort(sortByReviews); storylist_draw('${place}_inside', ${place}_array, 1, 1, ${st});"]`)
            g.after(newEl2);
            g.after(point());
            g.after(newEl);
            g.after(point());
    
            let myStories = document.querySelector(`#${place}`).querySelectorAll(`.${stories}`);
            newEl.addEventListener("click", () => {
    
                let array = Array.from(myStories);
                array.sort((a, b) => {
                    let aNum, bNum;
                    try { aNum = Number(a.querySelector(".fav-cnt").innerText.replaceAll(",", "")); } catch { aNum = 0}
                    try { bNum = Number(b.querySelector(".fav-cnt").innerText.replaceAll(",", "")); } catch { bNum = 0}
                    return bNum - aNum;
                })
    
                document.querySelector(`#${place}`).querySelectorAll(`.${stories}`).forEach(el => {
                    el.remove();
                })
    
                let barx = document.querySelector(`#${place}_inside`)
                array.forEach(el => {
                    barx.appendChild(el);
                })
    
            })
    
            newEl2.addEventListener("click", () => {
    
                let array = Array.from(myStories);

                array.sort((a, b) => {
                    let aNum, bNum;
                    try { aNum = Number(a.querySelector(".fol-cnt").innerText.replaceAll(",", "")); } catch { aNum = 0}
                    try { bNum = Number(b.querySelector(".fol-cnt").innerText.replaceAll(",", "")); } catch { bNum = 0}
                    return bNum - aNum;
                })
    
                document.querySelector(`#${place}`).querySelectorAll(`.${stories}`).forEach(el => {
                    el.remove();
                })
    
                let barx = document.querySelector(`#${place}_inside`)
                array.forEach(el => {
                    barx.appendChild(el);
                })
    
            })
    
        }

        try { addButtons("st") } catch {};
        try { addButtons("fs") } catch {};
    }
}


main();

 