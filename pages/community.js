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
    let imagesParent = document.querySelectorAll('.z-list');
    let images = document.querySelectorAll(".cimage");

    imagesParent.forEach(el => {
        
        let desc = el.querySelector("div").querySelector("div");
        
        let mas = desc.innerText.split(" - ");

        // console.table(mas);

        let newString = mas.map(item => `<span>${item}</span>`).join(" - ");
        let t;
        
        desc.innerHTML = newString;
        
        let mySpans = desc.querySelectorAll("span");

        // console.log(mySpans[0].innerText);
        if (!mySpans[0].innerText.includes("Rated")) {
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
        } 
        else {
            mySpans[1].classList = "lang"
            if (!mySpans[2].innerText.includes("Chapters")) {
                mySpans[2].classList = "genres";
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
            if (frn[frn.length - 1]) {
                frn[frn.length - 1].after(document.createElement("br"));
            }

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
    
}


main();

 