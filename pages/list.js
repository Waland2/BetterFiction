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

        const imagesParent = document.querySelectorAll('[class="z-list zhover zpointer "]');
        const images = document.querySelectorAll('.cimage');

        await makeSpans();

        if (settings.bigCovers) {
            images.forEach((element) => {
                element.style.width = '75px';
                element.style.height = '112px';
            });

            imagesParent.forEach((element) => {
                element.style.height = '115px';
            });
        }

        const bookmarkDataPromise = new Promise((resolve) => {
            chrome.runtime.sendMessage({ message: 'get-links' })
                .then((response) => {
                    resolve(response.result);
                })
                .catch((error) => {
                    console.error('Failed to retrieve bookmark data for list page:', error);
                    resolve([]);
                });
        });

        const bookmarkData = await bookmarkDataPromise;

        imagesParent.forEach((element) => {
            // Declaring spans
            const rating = element.querySelector('.rated');
            const language = element.querySelector('.lang');
            let genres = element.querySelector('.genres');
            const chapters = element.querySelector('.chapters');
            const chaptersCount = element.querySelector('.chapters-cnt');
            const words = element.querySelector('.words');
            const wordsCount = element.querySelector('.words-cnt');
            const reviews = element.querySelector('.review');
            const reviewsCount = element.querySelector('.rew-cnt');
            const favs = element.querySelector('.fav');
            const favsCount = element.querySelector('.fav-cnt');
            const follows = element.querySelector('.follow');
            const followsCount = element.querySelector('.fol-cnt');
            const updated = element.querySelector('.updated');
            const published = element.querySelector('.published');
            const characters = element.querySelector('.characters');
            const status = element.querySelector('.status');

            if (settings.separateFics) {
                element.style.marginBottom = '10px';
                element.style.borderBottom = '1px solid #969696';
                element.style.borderTop = '1px solid #969696';
                element.style.borderRight = '1px solid #969696';
            }

            // Mark fics with bookmark
            if (settings.markFicWithBookmark) {
                if (bookmarkData.includes(element.querySelector('a').href)) {
                    element.style.backgroundColor = '#e1edff';
                    const bookmarkIcon = document.createElement('img');
                    bookmarkIcon.src = chrome.runtime.getURL('icons/bookmark1.png');
                    bookmarkIcon.width = '14';
                    bookmarkIcon.height = '14';
                    element.querySelector('div').before(bookmarkIcon);
                }
            }

            if (settings.betterInfoColor) {
                const descriptionDiv = element.querySelector('div').querySelector('div');

                // Language color
                if (language.innerText === 'English') {
                    language.style.color = '#970000';
                } else if (language.innerText === 'Spanish') {
                    language.style.color = '#ab8f00';
                } else {
                    language.style.color = '#0000ff';
                }

                // Color for `complete`
                if (status) {
                    status.style.color = '#00631f';
                    status.style.fontWeight = '600';
                }

                // Rating color
                if (rating) {
                    rating.style.color = '#088383';
                }

                wordsCount.style.color = '#000000';
                chaptersCount.style.color = '#000000';

                if (favsCount) {
                    favsCount.style.color = '#000000';
                }
                if (followsCount) {
                    followsCount.style.color = '#000000';
                }
                if (reviewsCount) {
                    reviewsCount.style.color = '#000000';
                }
                if (genres) {
                    genres.style.color = '#903000';
                }
            }

            if (settings.betterInfo) {
                const descriptionDiv = element.querySelector('div').querySelector('div');
                if (settings.bigCovers) {
                    descriptionDiv.style.marginLeft = '62px';
                }

                let hasExtraInfo = 0;
                genres = descriptionDiv.querySelector('.genres');

                if (genres) {
                    genres.after(document.createElement('br'));
                } else {
                    language.after(document.createElement('br'));
                }

                words.after(document.createElement('br'));

                if (follows) {
                    follows.after(document.createElement('br'));
                } else if (favs) {
                    favs.after(document.createElement('br'));
                } else if (reviews) {
                    reviews.after(document.createElement('br'));
                } else {
                    hasExtraInfo = 1;
                }

                if (status || characters) {
                    published.after(document.createElement('br'));
                }

                element.style.height = 'auto';
                element.style.minHeight = '120px';

                descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace(/<br>.{2}/g, '<br>');
            }
        });
    } catch (error) {
        console.error('Failed to apply UI enhancements and features on list page:', error);
    }
}

async function makeSpans() {
    try {
        const imagesParent = document.querySelectorAll('[class="z-list zhover zpointer "]');

        imagesParent.forEach((element) => {
            const descriptionDiv = element.querySelector('div').querySelector('div');

            descriptionDiv.innerHTML = descriptionDiv.innerText
                .split(' - ')
                .map((item) => `<span>${item}</span>`)
                .join(' - ');
            let spanType;

            const metaSpans = descriptionDiv.querySelectorAll('span');

            metaSpans[1].classList = 'lang';
            if (!metaSpans[2].innerText.includes('Chapters')) {
                metaSpans[2].classList = 'genres';
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
                } else if (item.includes('Complete')) {
                    spanType = 'status';
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
    } catch (error) {
        console.error('Failed to create and style span elements in makeSpans function:', error);
    }
}

main();
