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
    const imagesParent = document.querySelectorAll('.z-list.zhover');
    const images = document.querySelectorAll('.cimage');

    const bookmarkDataPromise = new Promise((resolve) => {
        chrome.runtime.sendMessage({ message: 'get-links' })
            .then((response) => {
                resolve(response.result);
            })
            .catch((error) => {
                console.error('Failed to retrieve bookmark links for crossover page:', error);
                resolve([]);
            });
    });

    const bookmarkData = await bookmarkDataPromise;

    imagesParent.forEach((element) => {
        const descriptionDiv = element.querySelector('div').querySelector('div');
        const metaItems = descriptionDiv.innerText.split(' - ');

        const newString = metaItems.map((item) => `<span>${item}</span>`).join(' - ');
        let spanType;

        descriptionDiv.innerHTML = newString;

        const metaSpans = descriptionDiv.querySelectorAll('span');

        if (!metaSpans[0].innerText.includes('Rated')) {
            if (metaSpans[0].innerText === 'Crossover') {
                metaSpans[0].classList = 'fran';
                metaSpans[1].classList = 'fran';
            } else {
                metaSpans[0].classList = 'fran';
            }

            metaSpans[3].classList = 'lang';
            if (!metaSpans[4].innerText.includes('Chapters')) {
                metaSpans[4].classList = 'genres';
            }
        } else {
            metaSpans[1].classList = 'lang';
            if (!metaSpans[2].innerText.includes('Chapters')) {
                metaSpans[2].classList = 'genres';
            }
        }

        if (metaSpans[metaSpans.length - 1].innerText === 'Complete') {
            metaSpans[metaSpans.length - 1].classList = 'status';
        }

        metaSpans.forEach((span) => {
            const item = span.innerText;
            spanType = '';
            if (item.includes('Rated')) {
                spanType = 'rated';
            } else if (item.includes('Chapters')) {
                spanType = 'chapters';
            } else if (item.includes('Words')) {
                spanType = 'words';
            } else if (item.includes('Reviews')) {
                spanType = 'review';
            } else if (item.includes('Favs')) {
                spanType = 'fav';
            } else if (item.includes('Follows')) {
                spanType = 'follow';
            } else if (item.includes('Updated')) {
                spanType = 'updated';
            } else if (item.includes('Published')) {
                spanType = 'published';
            }

            if (spanType) {
                span.classList.add(spanType);
            }
        });

        const characterSpan = descriptionDiv.querySelector(':not([class])');
        if (characterSpan) {
            characterSpan.className = 'characters';
        }

        const wordsSpan = descriptionDiv.querySelector('.words');
        const chaptersSpan = descriptionDiv.querySelector('.chapters');
        const favSpan = descriptionDiv.querySelector('.fav');
        const followSpan = descriptionDiv.querySelector('.follow');
        const reviewSpan = descriptionDiv.querySelector('.review');

        let textArray = wordsSpan.innerText.split(' ');
        textArray[1] = `<span class='words-cnt'>${textArray[1]}</span>`;
        wordsSpan.innerHTML = textArray.join(' ');

        textArray = chaptersSpan.innerText.split(' ');
        textArray[1] = `<span class='chapters-cnt'>${textArray[1]}</span>`;
        chaptersSpan.innerHTML = textArray.join(' ');

        if (favSpan) {
            textArray = favSpan.innerText.split(' ');
            textArray[1] = `<span class='fav-cnt'>${textArray[1]}</span>`;
            favSpan.innerHTML = textArray.join(' ');
        }
        if (followSpan) {
            textArray = followSpan.innerText.split(' ');
            textArray[1] = `<span class='fol-cnt'>${textArray[1]}</span>`;
            followSpan.innerHTML = textArray.join(' ');
        }
        if (reviewSpan) {
            textArray = reviewSpan.innerText.split(' ');
            textArray[1] = `<span class='rew-cnt'>${textArray[1]}</span>`;
            reviewSpan.innerHTML = textArray.join(' ');
        }
    });

    if (settings.markFicWithBookmark) {
        imagesParent.forEach((element) => {
            if (bookmarkData.includes(element.querySelector('a').href)) {
                element.style.backgroundColor = '#e1edff';
                const bookmarkIcon = document.createElement('img');
                bookmarkIcon.src = chrome.runtime.getURL('icons/bookmark1.png');
                bookmarkIcon.width = '14';
                bookmarkIcon.height = '14';
                element.querySelector('div').before(bookmarkIcon);
            }
        });
    }

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

            const statusSpan = descriptionDiv.querySelector('.status');
            if (statusSpan) {
                // color for Complete
                statusSpan.style.color = '#00631f';
                statusSpan.style.fontWeight = '600';
            }

            const ratingSpan = descriptionDiv.querySelector('.rated');
            if (ratingSpan) {
                ratingSpan.style.color = '#088383';
            }

            const wordsSpan = descriptionDiv.querySelector('.words-cnt');
            const chaptersSpan = descriptionDiv.querySelector('.chapters-cnt');
            wordsSpan.style.color = '#000000';
            chaptersSpan.style.color = '#000000';

            const favSpan = descriptionDiv.querySelector('.fav-cnt');
            const followSpan = descriptionDiv.querySelector('.fol-cnt');
            const reviewSpan = descriptionDiv.querySelector('.rew-cnt');
            if (favSpan) {
                favSpan.style.color = '#000000';
            }
            if (followSpan) {
                followSpan.style.color = '#000000';
            }
            if (reviewSpan) {
                reviewSpan.style.color = '#000000';
            }

            const genreSpan = descriptionDiv.querySelector('.genres');
            if (genreSpan) {
                genreSpan.style.color = '#903000';
            }

            const fandomSpans = descriptionDiv.querySelectorAll('.fran');
            fandomSpans.forEach((span) => {
                span.style.fontWeight = '600';
            });
        });
    }

    if (settings.betterInfo) {
        imagesParent.forEach((element) => {
            const descriptionDiv = element.querySelector('div').querySelector('div');
            if (settings.bigCovers) {
                descriptionDiv.style.marginLeft = '62px';
            }
            let fandomSpans;
            let genreSpan;
            let wordsSpan;
            let followSpan;
            let publishedSpan;
            let hasExtraInfo = 0;
            genreSpan = descriptionDiv.querySelector('.genres');

            fandomSpans = element.querySelectorAll('.fran');
            if (fandomSpans[fandomSpans.length - 1]) {
                fandomSpans[fandomSpans.length - 1].after(document.createElement('br'));
            }

            if (genreSpan) {
                genreSpan.after(document.createElement('br'));
            } else {
                descriptionDiv.querySelector('.lang').after(document.createElement('br'));
            }

            wordsSpan = descriptionDiv.querySelector('.words');
            wordsSpan.after(document.createElement('br'));

            followSpan = descriptionDiv.querySelector('.follow');
            if (followSpan) {
                followSpan.after(document.createElement('br'));
            } else if (descriptionDiv.querySelector('.fav')) {
                descriptionDiv.querySelector('.fav').after(document.createElement('br'));
            } else if (descriptionDiv.querySelector('.review')) {
                descriptionDiv.querySelector('.review').after(document.createElement('br'));
            } else {
                hasExtraInfo = 1;
            }

            publishedSpan = descriptionDiv.querySelector('.published');
            if (descriptionDiv.querySelector('.status') || descriptionDiv.querySelector('.characters')) {
                publishedSpan.after(document.createElement('br'));
            }

            element.style.height = 'auto';
            element.style.minHeight = '120px';

            descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace(/<br>.{2}/g, '<br>');
        });
    }
}

const link = window.location.href;
if (link.includes('Crossovers')) {
    main();
}
