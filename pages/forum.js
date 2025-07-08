/**
 * Main function to apply UI changes and features based on user settings.
 * @returns {Promise<void>}
 */
async function main() {
    try {
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
                if (item.includes('Topics')) {
                    spanType = 'top';
                } else if (item.includes('Posts')) {
                    spanType = 'pst';
                } else if (item.includes('Since')) {
                    spanType = 'since';
                } else if (item.includes('Admin')) {
                    spanType = 'admin';
                }

                if (spanType) {
                    span.classList.add(spanType);
                }
            });

            const topicsSpan = descriptionDiv.querySelector('.top');
            const postsSpan = descriptionDiv.querySelector('.pst');

            let textArray = topicsSpan.innerText.split(' ');
            textArray[1] = `<span class='top-cnt'>${textArray[1]}</span>`;
            topicsSpan.innerHTML = textArray.join(' ');

            textArray = postsSpan.innerText.split(' ');
            textArray[1] = `<span class='pst-cnt'>${textArray[1]}</span>`;
            postsSpan.innerHTML = textArray.join(' ');
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

                const topicsCntSpan = descriptionDiv.querySelector('.top-cnt');
                const postsCntSpan = descriptionDiv.querySelector('.pst-cnt');
                topicsCntSpan.style.color = '#000000';
                postsCntSpan.style.color = '#000000';
            });
        }

        if (settings.betterInfo) {
            imagesParent.forEach((element) => {
                const descriptionDiv = element.querySelector('div').querySelector('div');
                if (settings.bigCovers) {
                    descriptionDiv.style.marginLeft = '62px';
                }

                const languageSpan = descriptionDiv.querySelector('.lang');
                languageSpan.after(document.createElement('br'));

                const postsSpan = descriptionDiv.querySelector('.pst');
                postsSpan.after(document.createElement('br'));

                element.style.height = 'auto';
                element.style.minHeight = '120px';

                descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace(/<br>.{2}/g, '<br>');
            });
        }
    } catch (error) {
        console.error('Failed to apply UI enhancements and features on forum page:', error);
    }
}

main();
