/**
 * Main function to apply UI changes and features based on user settings.
 * @returns {Promise<void>}
 */
async function main() {
    const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage({ message: 'get-info' }, (response) => {
            resolve(response.result);
        });
    });

    const settings = await messagePromise;
    const imagesParent = document.querySelectorAll('.z-list');
    const images = document.querySelectorAll('.cimage');

    imagesParent.forEach((element) => {
        const descriptionDiv = element.querySelector('div').querySelector('div');
        const metaItems = descriptionDiv.innerText.split(' - ');

        const newString = metaItems.map((item) => `<span>${item}</span>`).join(' - ');
        let spanType;

        descriptionDiv.innerHTML = newString;

        const metaSpans = descriptionDiv.querySelectorAll('span');

        metaSpans[0].classList = 'lang';

        metaSpans.forEach((span) => {
            const item = span.innerText;
            spanType = '';
            if (item.includes('Staff')) {
                spanType = 'stf';
            } else if (item.includes('Archive')) {
                spanType = 'arh';
            } else if (item.includes('Followers')) {
                spanType = 'fol';
            } else if (item.includes('Since')) {
                spanType = 'since';
            } else if (item.includes('Founder')) {
                spanType = 'founder';
            }

            if (spanType) {
                span.classList.add(spanType);
            }
        });

        const staffSpan = descriptionDiv.querySelector('.stf');
        const followSpan = descriptionDiv.querySelector('.fol');
        const archiveSpan = descriptionDiv.querySelector('.arh');

        let textArray = staffSpan.innerText.split(' ');
        textArray[1] = `<span class='stf-cnt'>${textArray[1]}</span>`;
        staffSpan.innerHTML = textArray.join(' ');

        textArray = followSpan.innerText.split(' ');
        textArray[1] = `<span class='fol-cnt'>${textArray[1]}</span>`;
        followSpan.innerHTML = textArray.join(' ');
        textArray = archiveSpan.innerText.split(' ');
        textArray[1] = `<span class='arh-cnt'>${textArray[1]}</span>`;
        archiveSpan.innerHTML = textArray.join(' ');
    });

    if (settings.bigCovers) {
        images.forEach((element) => {
            element.style.width = '75px';
            element.style.height = '112px';
        });

        imagesParent.forEach((element) => {
            element.style.height = '115px';
        });
    }

    if (settings.separateFics) {
        imagesParent.forEach((element) => {
            element.style.marginBottom = '10px';
            element.style.borderBottom = '1px solid #969696';
            element.style.borderTop = '1px solid #969696';
            element.style.borderRight = '1px solid #969696';
        });
    }

    if (settings.betterInfoColor) {
        imagesParent.forEach((element) => {
            const descriptionDiv = element.querySelector('div').querySelector('div');

            const languageSpan = descriptionDiv.querySelector('.lang'); // Language color
            if (languageSpan.innerText === 'English') {
                languageSpan.style.color = '#970000';
            } else if (languageSpan.innerText === 'Spanish') {
                languageSpan.style.color = '#ab8f00';
            } else {
                languageSpan.style.color = '#0000ff';
            }

            const staffCntSpan = descriptionDiv.querySelector('.stf-cnt');
            const followCntSpan = descriptionDiv.querySelector('.fol-cnt');
            const archiveCntSpan = descriptionDiv.querySelector('.arh-cnt');
            staffCntSpan.style.color = '#000000';
            followCntSpan.style.color = '#000000';
            archiveCntSpan.style.color = '#000000';
        });
    }

    if (settings.betterInfo) {
        imagesParent.forEach((element) => {
            const descriptionDiv = element.querySelector('div').querySelector('div');
            if (settings.bigCovers) {
                descriptionDiv.style.marginLeft = '62px';
            }

            descriptionDiv.querySelector('.lang').after(document.createElement('br'));
            descriptionDiv.querySelector('.fol').after(document.createElement('br'));

            element.style.height = 'auto';
            element.style.minHeight = '120px';

            descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace(/<br>.{2}/g, '<br>');
        });
    }
}

main();

