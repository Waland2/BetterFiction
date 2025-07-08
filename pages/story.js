let colorOfLang;
let reverseColorOfLang;
const allGenres = 'AdventureAngstCrimeDramaFamilyFantasyFriendshipGeneralHorrorHumorHurt/ComfortMysteryParodyPoetryRomanceSci-FiSpiritualSupernaturalSuspenseTragedyWestern';

const regex = /https:\/\/www\.fanfiction\.net\/s\/(.*?)\/(.*?)\/(.*?)$/;
const match = window.location.href.match(regex);

let chapter;
let id;
let storyName;

async function main() {
    const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage({ message: 'get-info' }, (response) => {
            resolve(response.result);
        });
    });

    const settings = await messagePromise;

    // Get chapter and id from url
    if (match) {
        chapter = match[2];
        id = match[1];
    } else {
        chapter = 1;
        id = '0'; // declaring later
    }

    storyName = document.querySelectorAll('b')[5].innerText;

    await makeSpans();

    // Declaring spans
    const rating = document.querySelector('.rated');
    const language = document.querySelector('.lang');
    const genres = document.querySelector('.genres');
    const chapters = document.querySelector('.chapters');
    const chaptersCount = document.querySelector('.chapters-cnt');
    const words = document.querySelector('.words');
    const wordsCount = document.querySelector('.words-cnt');
    const reviews = document.querySelector('.review');
    let reviewsCount = document.querySelector('.rew-cnt');
    const favs = document.querySelector('.fav');
    const favsCount = document.querySelector('.fav-cnt');
    const follows = document.querySelector('.follow');
    const followsCount = document.querySelector('.fol-cnt');
    const updated = document.querySelector('.updated');
    const published = document.querySelector('.published');
    const characters = document.querySelector('.characters');
    const status = document.querySelector('.status');

    if (reviewsCount) {
        reviewsCount = reviewsCount.querySelector('a');
    }

    // Story Word Counter
    let wordCounterSpan;
    if (settings.chapterWordCounter && document.querySelector('#chap_select')) {
        let wordCounter = 0;
        document.querySelectorAll('p').forEach((element) => {
            wordCounter += element.innerText.trim().split(/\s+/).length;
        });

        wordCounterSpan = document.createElement('span');
        wordCounterSpan.innerHTML = `<br>Words in chapter: <b>${wordCounter}</b>`;
        wordCounterSpan.style.color = '#000000';

        const navigationBar = document.querySelector('[style="float:right; "]');
        navigationBar.appendChild(wordCounterSpan);
        rating.parentElement.before(navigationBar);
    }

    if (settings.bookmarkButton) {
        // Create bookmark button
        const bookmarkButton = document.createElement('button');
        bookmarkButton.type = 'button';
        bookmarkButton.className = 'btn pull-right';
        bookmarkButton.style.marginRight = '5px';
        bookmarkButton.style.height = '30px';
        bookmarkButton.title = 'bookmark';

        bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL('icons/bookmark2.png')}" width="20" height="20">`;

        const followButton = document.querySelector('.icon-heart');
        followButton.before(bookmarkButton);
        followButton.remove();
        bookmarkButton.before(followButton);

        let isBookmarked = false;

        bookmarkButton.addEventListener('click', () => {
            if (isBookmarked) {
                isBookmarked = false;
                bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL('icons/bookmark2.png')}" width="20" height="20">`;
                chrome.runtime.sendMessage({
                    message: 'del-bookmark',
                    id: id,
                });
            } else {
                isBookmarked = true;
                bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL('icons/bookmark1.png')}" width="20" height="20">`;
                let fandom = document.querySelector('#pre_story_links').querySelectorAll('a');
                if (fandom[1]) {
                    fandom = fandom[1].innerText;
                } else {
                    fandom = fandom[0].innerText;
                }

                chrome.runtime.sendMessage({
                    message: 'set-bookmark',
                    chapter: Number(chapter),
                    id: id,
                    fandom: fandom,
                    author: document.querySelector('#profile_top').querySelector('a').innerText,
                    storyName: document.querySelectorAll('b')[5].innerText,
                });
            }
        });

        // Auto bookmark on last chapter
        if (settings.autoSave) {
            chrome.runtime.sendMessage(
                { message: 'auto-bookmark', chapter, id: id },
                (response) => {
                    if (response.status) {
                        bookmarkButton.click();
                    }
                }
            );
        }

        // Current chapter bookmark check
        chrome.runtime.sendMessage({ message: 'get-bookmark', id: id }, (response) => {
            if (Number(response.chapter) === Number(chapter) && !isBookmarked) {
                isBookmarked = true;
                bookmarkButton.innerHTML = `<img src="${chrome.runtime.getURL('icons/bookmark1.png')}" width="20" height="20">`;
            }
        });

        // Creating go-to-bookmark button
        const goButton = document.createElement('button');
        goButton.type = 'button';
        goButton.className = 'btn pull-right';
        goButton.innerHTML = 'Go to bookmark';
        goButton.style.marginRight = '5px';
        bookmarkButton.before(goButton);

        goButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ message: 'get-bookmark', id: id }, (response) => {
                if (Number(response.chapter) !== 0) {
                    const chapterLink = `https://www.fanfiction.net/s/${response.id}/${response.chapter}/${response.storyName}`;
                    window.open(chapterLink, '_self');
                }
            });
        });
    }

    // All on one page button
    if (settings.allFicButton && document.querySelector('#chap_select')) {
        const allFicButton = document.createElement('button');
        allFicButton.type = 'button';
        allFicButton.className = 'btn';
        allFicButton.innerHTML = 'Entire Work';
        allFicButton.style.marginLeft = '5px';

        document.querySelector('[onclick="toggleTheme();"]').after(allFicButton);

        const bookmarkChapter = () => `<img src="${chrome.runtime.getURL('icons/bookmark2.png')}" width="20" height="20">`;

        const sepSpan = (index, chaptersArray) => {
            const span = document.createElement('span');
            if (index + 1 === chaptersArray.length) {
                span.innerHTML = '<br><br><br><hr size="1" noshade=""><br><br><br>';
            } else if (settings.bookmarkButton) {
                span.innerHTML = `<br><br><br><br><h3>${chaptersArray[index + 1]}</h3><button type="button" class="btn pull-right bookmark" title="bookmark" style="margin-right: 5px; height: 30px;" id="bookmark${index + 2}">${bookmarkChapter()}</button><hr size="1" noshade="" style="background: darkgrey; height: 2px;"><br><br><br>`;
            } else {
                span.innerHTML = `<br><br><br><br><h3>${chaptersArray[index + 1]}</h3><hr size="1" noshade="" style="background: darkgrey; height: 2px;"><br><br><br>`;
            }
            return span;
        };

        const getChapterURL = (chapterNumber) => `https://www.fanfiction.net/s/${id}/${chapterNumber}`;

        allFicButton.addEventListener('click', async () => {
            const count = Number(chaptersCount.innerText);
            const currentChapter = Number(chapter);

            const newFullStory = document.createElement('div');
            const chaptersArray = [];
            const chaptersName = document.querySelector('#chap_select').innerText.split('\n');
            let fetchedChapter;

            const getQuery = async (url, index) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');

                    const responseText = await response.text();
                    const htmlCode = new DOMParser().parseFromString(responseText, 'text/html');

                    const nextChapter = htmlCode.querySelector('#storytext');
                    nextChapter.id = `storytext${index + 1}`;

                    fetchedChapter = nextChapter;
                    return 1;
                } catch (error) {
                    console.error(`Failed to fetch chapter content from URL: ${url}`, error);
                    return 0;
                }
            };

            for (let i = 0; i < count; i++) {
                const url = getChapterURL(i + 1);
                if (!(await getQuery(url, i))) {
                    break;
                } else {
                    if (i === 0) {
                        document.querySelector('#storytext').before(sepSpan(-1, chaptersName));
                    }
                    document.querySelector('#storytext').before(fetchedChapter);
                    document.querySelector('#storytext').before(sepSpan(i, chaptersName));
                }
            }

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
            document.querySelector('#storytext').remove();
            const allFicText = document.querySelector('#storytext1').parentElement;
            allFicText.id = 'storytext';
            if (settings.allowCopy) {
                allFicText.querySelectorAll('*').forEach((element) => (element.style.userSelect = 'text'));
            }
            let isBookmarked = false;
            let lastChapterBookmark = -1;
            if (settings.bookmarkButton) {
                document.querySelectorAll('.bookmark').forEach((element) => {
                    element.addEventListener('click', () => {
                        if (
                            isBookmarked &&
                            lastChapterBookmark === Number(element.id.replace(/[a-zA-Z]/g, ''))
                        ) {
                            lastChapterBookmark = -1;
                            isBookmarked = false;
                            element.innerHTML = `<img src="${chrome.runtime.getURL('icons/bookmark2.png')}" width="20" height="20">`;
                            chrome.runtime.sendMessage({
                                message: 'del-bookmark',
                                id: id,
                            });
                        } else {
                            if (lastChapterBookmark !== -1) {
                                document.querySelector(`#bookmark${lastChapterBookmark}`).click();
                            }
                            lastChapterBookmark = Number(element.id.replace(/[a-zA-Z]/g, ''));
                            isBookmarked = true;
                            element.innerHTML = `<img src="${chrome.runtime.getURL('icons/bookmark1.png')}" width="20" height="20">`;
                            let fandom = document
                                .querySelector('#pre_story_links')
                                .querySelectorAll('a');
                            if (fandom[1]) {
                                fandom = fandom[1].innerText;
                            } else {
                                fandom = fandom[0].innerText;
                            }

                            chrome.runtime.sendMessage({
                                message: 'set-bookmark',
                                chapter: Number(element.id.replace(/[a-zA-Z]/g, '')),
                                id: id,
                                fandom: fandom,
                                author: document.querySelector('#profile_top').querySelector('a')
                                    .innerText,
                                storyName: document.querySelectorAll('b')[5].innerText,
                            });
                        }
                    });
                });

                chrome.runtime.sendMessage({ message: 'get-bookmark', id: id }, (response) => {
                    const bookmarkElement = document.querySelector(`#bookmark${response.chapter}`);
                    if (bookmarkElement) {
                        bookmarkElement.click();
                    } else {
                        console.warn(`Bookmark element for chapter ${response.chapter} of story ${id} not found in DOM.`);
                    }
                });
            }

            document.querySelector('[title="bookmark"]').remove();

            // Hide the button after it's clicked
            allFicButton.style.display = 'none';

            // Hide the chapter dropdown, next, and previous buttons
            const chapterDropdown = document.querySelector('#chap_select');
            const nextButton = Array.from(document.querySelectorAll('.btn')).find((btn) =>
                btn.textContent.includes('Next >')
            );
            const prevButton = Array.from(document.querySelectorAll('.btn')).find((btn) =>
                btn.textContent.includes('< Prev')
            );

            if (chapterDropdown) {
                chapterDropdown.style.display = 'none';
            }
            if (nextButton) {
                nextButton.style.display = 'none';
            }
            if (prevButton) {
                prevButton.style.display = 'none';
            }

            const themeToggleButton = document.querySelector("[title='Story Contrast']");
            if (themeToggleButton) {
                themeToggleButton.click(); // First click to toggle
                themeToggleButton.click(); // Second click to toggle back
            } else {
                console.warn('Theme toggle button not found in story page DOM.');
            }
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
            document.querySelectorAll('h3')
        );
    }

    document.querySelector('[onclick="toggleTheme();"]').addEventListener('click', () => {
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
            document.querySelectorAll('h3')
        );
    });
};

function switchTheme(
    wordCounterSpan,
    rating,
    lang,
    genres,
    chapters,
    words,
    reviews,
    favs,
    follows,
    status,
    h3s
) {
    const setColor = (colorArray) => {
        colorArray.forEach((colorItem) => {
            if (colorItem && colorItem[0]) {
                colorItem[0].style.color = colorItem[1];
            }
        });
    };

    if (rating.style.color === '#088383') {
        // Black background with white text
        setColor([
            [wordCounterSpan, '#ffffff'],
            [rating, '#f77c7c'],
            [lang, reverseColorOfLang],
            [genres, '#6fcfff'],
            [chapters, '#ffffff'],
            [words, '#ffffff'],
            [reviews, '#ff7c19'],
            [favs, '#ffffff'],
            [follows, '#ffffff'],
            [status, '#ff9ce0'],
        ]);
        h3s.forEach((element) => {
            setColor([[element, '#ffffff']]);
        });

        rating.parentElement.classList = 'xgray';
        rating.parentElement.style.color = '#d0d0d0';
    } else {
        // White background with black text
        setColor([
            [wordCounterSpan, '#000000'],
            [rating, '#088383'],
            [lang, colorOfLang],
            [genres, '#903000'],
            [chapters, '#000000'],
            [words, '#000000'],
            [reviews, ''],
            [favs, '#000000'],
            [follows, '#000000'],
            [status, '#00631f'],
        ]);
        h3s.forEach((element) => {
            setColor([[element, '#000000']]);
        });

        rating.parentElement.classList = 'xgray';
        rating.parentElement.style.color = '';
    }
}

async function makeSpans() {
    const descriptionDiv = document.querySelector('[target="rating"]').parentElement;

    descriptionDiv.innerHTML = descriptionDiv.innerText
        .split(' - ')
        .map((item) => `<span>${item}</span>`)
        .join(' - '); // separate blocks

    const metaSpans = descriptionDiv.querySelectorAll('span');

    metaSpans[1].classList = 'lang';
    metaSpans[metaSpans.length - 1].classList = 'ids';
    if (!metaSpans[2].innerText.includes('Chapters')) {
        if (metaSpans[2].innerText.includes('/') || allGenres.includes(metaSpans[2].innerText)) {
            metaSpans[2].classList = 'genres';
        }
    }

    metaSpans.forEach((span) => {
        const item = span.innerText;
        let type = '';
        if (item.includes('Rated')) {
            type = 'rated';
        } else if (item.includes('Chapters')) {
            type = 'chapters';
        } else if (item.includes('Words')) {
            type = 'words';
        } else if (item.includes('Reviews')) {
            type = 'review';
        } else if (item.includes('Favs')) {
            type = 'fav';
        } else if (item.includes('Follows')) {
            type = 'follow';
        } else if (item.includes('Updated')) {
            type = 'updated';
        } else if (item.includes('Published')) {
            type = 'published';
        } else if (item.includes('Complete')) {
            type = 'status';
        }

        if (type) {
            span.classList.add(type);
        }
    });

    const characterSpan = descriptionDiv.querySelector(':not([class])');
    if (characterSpan) {
        characterSpan.className = 'characters';
    }

    let rating = document.querySelector('.rated');
    let language = document.querySelector('.lang');
    let genres = document.querySelector('.genres');
    const chapters = document.querySelector('.chapters');
    let words = document.querySelector('.words');
    const reviews = document.querySelector('.review');
    const favs = document.querySelector('.fav');
    let follows = document.querySelector('.follow');
    const updated = document.querySelector('.updated');
    let published = document.querySelector('.published');
    let characters = document.querySelector('.characters');
    const status = document.querySelector('.status');

    const idSpan = descriptionDiv.querySelector('.ids');
    let textArray = words.innerText.split(' ');
    textArray[1] = `<span class='words-cnt'>${textArray[1]}</span>`;
    words.innerHTML = textArray.join(' ');

    if (chapters) {
        textArray = chapters.innerText.split(' ');
        textArray[1] = `<span class='chapters-cnt'>${textArray[1]}</span>`;
        chapters.innerHTML = textArray.join(' ');
    }
    if (favs) {
        textArray = favs.innerText.split(' ');
        textArray[1] = `<span class='fav-cnt'>${textArray[1]}</span>`;
        favs.innerHTML = textArray.join(' ');
    }
    if (follows) {
        textArray = follows.innerText.split(' ');
        textArray[1] = `<span class='fol-cnt'>${textArray[1]}</span>`;
        follows.innerHTML = textArray.join(' ');
    }
    if (reviews) {
        textArray = reviews.innerText.split(' ');
        textArray[1] = `<span class='rew-cnt'>${textArray[1]}</span>`;
        reviews.innerHTML = textArray.join(' ');
    }
    if (idSpan) {
        textArray = idSpan.innerText.split(' ');
        textArray[1] = `<span class='real-id'>${textArray[1]}</span>`;
        idSpan.innerHTML = textArray.join(' ');
        if (id === '0') {
            id = document.querySelector('.real-id').innerText;
        }

        idSpan.remove();
    }

    let chaptersCount = document.querySelector('.chapters-cnt');
    let wordsCount = document.querySelector('.words-cnt');
    let reviewsCount = document.querySelector('.rew-cnt');
    let favsCount = document.querySelector('.fav-cnt');
    let followsCount = document.querySelector('.fol-cnt');
    if (reviewsCount) {
        reviewsCount = reviewsCount.querySelector('a');
    }

    // Language color
    if (language.innerText === 'English') {
        language.style.color = '#970000';
        colorOfLang = '#970000';
        reverseColorOfLang = '#68ffff';
    } else if (language.innerText === 'Spanish') {
        language.style.color = '#ab8f00';
        colorOfLang = '#ab8f00';
        reverseColorOfLang = '#5470ff';
    } else {
        language.style.color = '#0000ff';
        colorOfLang = '#0000ff';
        reverseColorOfLang = '#ffff00';
    }

    // Color for Complete
    if (status) {
        status.style.color = '#00631f';
        status.style.fontWeight = '600';
        status.innerHTML = status.innerHTML.replace('Status: ', '');
        descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace('Complete</span> - ', 'Complete</span>');
    } else if (descriptionDiv.querySelector('.characters')) {
        const str = descriptionDiv.innerHTML;
        const lastDashIndex = str.lastIndexOf('-');
        descriptionDiv.innerHTML = str.slice(0, lastDashIndex) + str.slice(lastDashIndex + 1);
    }

    // Create rate span
    rating = descriptionDiv.querySelector('.rated');
    if (rating) {
        rating.style.color = '#088383';
        const rate = rating.innerText;
        if (rate.includes('Fiction K+')) {
            rating.title =
                'Suitable for more mature childen, 9 years and older, with minor action violence without serious injury. May contain mild coarse language. Should not contain any adult themes.';
        } else if (rate.includes('Fiction K')) {
            rating.title =
                'Intended for general audience 5 years and older. Content should be free of any coarse language, violence, and adult themes.';
        } else if (rate.includes('Fiction T')) {
            rating.title =
                'Suitable for teens, 13 years and older, with some violence, minor coarse language, and minor suggestive adult themes.';
        } else {
            rating.title =
                'Intended for general audience 5 years and older. Content should be free of any coarse language, violence, and adult themes. Fiction M can contain adult language, themes and suggestions. Detailed descriptions of physical interaction of sexual or violent nature is considered Fiction MA.';
        }
        rating.innerText = rate.replace('Fiction', '');
    }

    wordsCount = descriptionDiv.querySelector('.words-cnt');
    chaptersCount = descriptionDiv.querySelector('.chapters-cnt');
    if (wordsCount) {
        wordsCount.style.color = '#000000';
    }
    if (chaptersCount) {
        chaptersCount.style.color = '#000000';
    }

    favsCount = descriptionDiv.querySelector('.fav-cnt');
    followsCount = descriptionDiv.querySelector('.fol-cnt');
    reviewsCount = descriptionDiv.querySelector('.rew-cnt');
    if (favsCount) {
        favsCount.style.color = '#000000';
    }
    if (followsCount) {
        followsCount.style.color = '#000000';
    }
    if (reviewsCount) {
        reviewsCount.innerHTML = `<a href="/r/${id}/">${reviewsCount.innerHTML}</a>`;
        reviewsCount.style.color = '#000000';
    }

    genres = descriptionDiv.querySelector('.genres');
    if (genres) {
        genres.style.color = '#903000';
    }

    words = descriptionDiv.querySelector('.words');
    follows = descriptionDiv.querySelector('.follow');
    published = descriptionDiv.querySelector('.published');
    characters = descriptionDiv.querySelector('.characters');
    language = descriptionDiv.querySelector('.lang');

    if (characters) {
        published.after(characters);
        published.after(' -');
    }

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
    }

    if (descriptionDiv.querySelector('.status') || descriptionDiv.querySelector('.characters')) {
        published.after(document.createElement('br'));
    }

    descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace('<br> -  - ', '<br> -');
    descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace(/<br>.{2}/g, '<br>');

    const stats = document.querySelector('.lang').parentElement;
    stats.parentElement.after(stats);
}

main();
