table = document.querySelector("tbody");

let arr = [];
chrome.storage.local.get().then(result => {
    // var arr = []; 
    for (let key in result) {
        let el = result[key];
        if (el.storyName) {
            let time;
            if (!el.addTime) time = '-';
            else {
                let d = el.addTime.split('/'), day = Number(d[0]), month = Number(d[1]), year = Number(d[2]);
                if (day < 10) day = `0${day}`;
                if (month < 10) month = `0${month}`;
                time = `${day}.${month}.${year}`;
            } 
            el.time = time;
            arr.push(el)

        }
    }
    arr.sort((a, b) => {
        if (a.time === "-") {
            return 1;
        }
        const [day1, month1, year1] = a.time.split('.');
        const [day2, month2, year2] = b.time.split('.');
        
        const numDate1 = new Date(`${month1}/${day1}/${year1}`).getTime();
        const numDate2 = new Date(`${month2}/${day2}/${year2}`).getTime();

        // Сравниваем числовые значения дат
        if (numDate1 < numDate2) {
          return 1;
        } 
        return -1;
    })
    // console.table(arr);
    
    arr.forEach(el => {
        let tr = document.createElement("tr");
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        let dt = el.time.split(".");
        if (!dt[1]) nTime = "-";
        else nTime = `${dt[0]} ${months[Number(dt[1]) - 1]} ${dt[2]}`;


        tr.innerHTML = `<tr>
            <td>${el.storyId}</td>
            <td><a href = "https://www.fanfiction.net/s/${el.storyId}/${el.chapter}/${el.storyName.replaceAll(" ", "-")}">${el.storyName}</a></td>
            <td>${el.chapter}</td>
            <td>${el.fandomName}</td>
            <td>${el.author}</td>
            <td>${nTime}</td>
            <td><a href="">Delete</a></td>
            </tr>`
        tr.querySelectorAll("a")[1].addEventListener("click", () => {
            chrome.storage.local.remove(el.storyId);
            tr.remove();
        })

        tr.classList.toggle('table-row')
        table.appendChild(tr);
    })

})

document.querySelector("#export").addEventListener("click", () => {
    chrome.storage.local.get().then(result => {
        var data = result;
        var jsonContent = JSON.stringify(data);

        var blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" });
    
        var downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = "bookmarks.json";
    
        downloadLink.click();
    })
})

document.querySelector("#import").addEventListener("click", () => {
    var fileInput = document.createElement("input");
      fileInput.type = "file";

      fileInput.onchange = function(e) {
        var file = e.target.files[0];
        
        var reader = new FileReader();
        
        reader.onload = function(e) {
            let contents = e.target.result;
            
            let jsonData = JSON.parse(contents);
            chrome.storage.local.clear().then(() => {
                for (const key in jsonData) {
                    let value = jsonData[key];
                    
                    chrome.storage.local.set({
                        [key]: value
                    })
                }
            })
        }

        reader.readAsText(file);
        location.reload();
    }
    fileInput.click();

})


function updateSort(type, dir) {
    document.querySelectorAll('.table-row').forEach(el => {
        el.remove();
    })

    if (type === 'addTime') {
        arr.sort((a, b) => {
            if (a.time === "-") return 1;
            const [day1, month1, year1] = a.time.split('.');
            const [day2, month2, year2] = b.time.split('.');   
            const numDate1 = new Date(`${month1}/${day1}/${year1}`).getTime();
            const numDate2 = new Date(`${month2}/${day2}/${year2}`).getTime();
            if (numDate1 < numDate2) return 1;
            return -1;
        })
    }else {
        arr.sort((a, b) => {
            aVal = a[type];
            bVal = b[type];

            if (type === "chapter") {
                aVal = parseInt(aVal);
                bVal = parseInt(bVal);
            }
            
            let bl = (aVal > bVal)
            if (bl === false) return 1;
            return -1;
        })
    }

    if (dir === 1) {
        arr.reverse();
    }

    arr.forEach(el => {
        let tr = document.createElement("tr");
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        let dt = el.time.split(".");
        if (!dt[1]) nTime = "-";
        else nTime = `${dt[0]} ${months[Number(dt[1]) - 1]} ${dt[2]}`;


        tr.innerHTML = `<tr>
            <td>${el.storyId}</td>
            <td><a href = "https://www.fanfiction.net/s/${el.storyId}/${el.chapter}/${el.storyName.replaceAll(" ", "-")}">${el.storyName}</a></td>
            <td>${el.chapter}</td>
            <td>${el.fandomName}</td>
            <td>${el.author}</td>
            <td>${nTime}</td>
            <td><a href="">Delete</a></td>
            </tr>`
        tr.querySelectorAll("a")[1].addEventListener("click", () => {
            chrome.storage.local.remove(el.storyId);
            tr.remove();
        })

        tr.classList.toggle('table-row')
        table.appendChild(tr);
    })
}

document.addEventListener('DOMContentLoaded', event => {
    document.querySelectorAll("th").forEach(el => {
        el.addEventListener('click', (event) => {
            let dir = 0;
            if (document.querySelector('.active') === event.target) {
                dir = 1;
            }

            if (document.querySelector('.active')) {
                document.querySelector('.active').classList.toggle('active');
            }
            updateSort(event.target.dataset.sortType, dir)//, event.target.dataset.dir)

            event.target.classList.toggle('active');
        })
    })
})