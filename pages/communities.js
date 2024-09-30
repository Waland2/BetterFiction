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

        let newString = mas.map(item => `<span>${item}</span>`).join(" - ");
        let t;
        
        desc.innerHTML = newString;
        
        mySpans = desc.querySelectorAll("span");

        mySpans[0].classList = "lang";


        mySpans.forEach(i => {
            let item = i.innerText;
            t = ""
            if (item.includes("Staff")) t = "stf";
            else if (item.includes("Archive")) t = "arh";
            else if (item.includes("Followers")) t = "fol";
            else if (item.includes("Since")) t = "since";
            else if (item.includes("Founder")) t = "founder";

            if (t) i.classList.add(t);
        })

        let stfSpan = desc.querySelector(".stf");
        let folSpan = desc.querySelector(".fol");
        let arhSpan = desc.querySelector(".arh");

        let a = stfSpan.innerText.split(" ");
        a[1] = `<span class='stf-cnt'>${a[1]}</span>`;
        stfSpan.innerHTML = a.join(" ")

        a = folSpan.innerText.split(" ");
        a[1] = `<span class='fol-cnt'>${a[1]}</span>`;
        folSpan.innerHTML = a.join(" ")
        
        a = arhSpan.innerText.split(" ");
        a[1] = `<span class='arh-cnt'>${a[1]}</span>`;
        arhSpan.innerHTML = a.join(" ")
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
            

            desc.querySelector(".fol-cnt").style.color = "black";
            desc.querySelector(".arh-cnt").style.color = "black";
            desc.querySelector(".stf-cnt").style.color = "black";

        })
        
    }


    if (states.betterInfo) {
        
        imagesParent.forEach(el => {    
            let desc  = el.querySelector("div").querySelector("div");
            if (states.bigCovers) {
                desc.style.marginLeft = "62px";
            }

            desc.querySelector(".lang").after(document.createElement("br"));
            desc.querySelector(".fol").after(document.createElement("br"));

            el.style.height = "auto";
            el.style.minHeight = "120px";
            

            desc.innerHTML = desc.innerHTML.replace(/<br>.{2}/g, '<br>');

        })

    }

    
}


main();

 