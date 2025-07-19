/**
 * Main entry point for UI and feature enhancements.
 * Fetches user settings, applies UI changes, and sets up feature toggles.
 * @returns {Promise<void>}
 */
async function main() {
    try {
        const settings = await new Promise(resolve => chrome.runtime.sendMessage({ message: 'get-info' }, r => resolve(r.result)));

        const topMenu = document.querySelector('div')?.querySelector('div');
        if (!topMenu || topMenu.classList[0] !== 'menulink') return;

        const storyContrastButton = document.querySelector("[title='Story Contrast']");

        if (settings.allowCopy) document.querySelectorAll('p').forEach(e => e.style.userSelect = 'text');

        if (settings.bookmarkButton) topMenu.appendChild(Object.assign(document.createElement('span'), {
            innerHTML: `<a href='${chrome.runtime.getURL('tabs/bookmarks/bookmarks.html')}' style='margin-left: 10px;'><img src='${chrome.runtime.getURL('icons/bookmark3.png')}' style='vertical-align: middle; cursor: default;' title='Favorite Stories' width='20' height='20'></a>`,
            id: 'openBookmarkList'
        }));

        if (settings.myFicList) {
            topMenu.appendChild(Object.assign(document.createElement('span'), {
                innerHTML: `<img src='${chrome.runtime.getURL('icons/list.png')}' style='vertical-align: middle; cursor: default; margin-left: 12px;' title='My fic list' width='20' height='20'>`,
                id: 'openMyFicList'
            })).addEventListener('click', () => chrome.runtime.sendMessage({ message: 'open-html-page', fileName: 'tabs/my-list/my-list.html' }));
        }

        if (settings.shortcuts) {
            topMenu.appendChild(Object.assign(document.createElement('div'), { style: 'position: relative; display: inline-block; margin-bottom: 0px;' }));
            topMenu.lastChild.attachShadow({ mode: 'open' }).appendChild(Object.assign(document.createElement('span'), {
                innerHTML: `<a href='https://www.fanfiction.net/favorites/story.php' style='margin-left: 10px;'><img src='${chrome.runtime.getURL('icons/heart.png')}' style='vertical-align: middle; cursor: default;' title='Favorite Stories' width='20' height='20'></a><a href='https://www.fanfiction.net/alert/story.php' style='margin-left: 8px;'><img src='${chrome.runtime.getURL('icons/book.png')}' style='vertical-align: middle; cursor: default;' title='Followed Stories' width='20' height='20'></a>`
            }));
        }

        document.querySelectorAll('.adsbygoogle').forEach(e => e.remove());

        const METATYPES = {
            Fandom: [0, '600', null],
            Rated: [1, null, 'rgb(8, 131, 131)'],
            Language: {
                English: [2, null, 'rgb(151, 0, 0)'],
                Spanish: [2, null, 'rgb(171, 143, 0)'],
                default: [2, null, 'rgb(0, 0, 255)']
            },
            Genre: [3, null, 'rgb(144, 48, 0)'],
            Chapters: [4, null, 'rgb(0, 0, 0)'],
            Words: [5, null, 'rgb(0, 0, 0)'],
            Staff: [3, null, 'rgb(0, 0, 0)'],
            Archive: [4, null, 'rgb(0, 0, 0)'],
            Followers: [5, null, 'rgb(0, 0, 0)'],
            Topics: [4, null, 'rgb(0, 0, 0)'],
            Posts: [5, null, 'rgb(0, 0, 0)'],
            Reviews: [6, null, 'rgb(0, 0, 0)'],
            Favs: [7, null, 'rgb(0, 0, 0)'],
            Follows: [8, null, 'rgb(0, 0, 0)'],
            Updated: [9, null, null],
            Published: [10, null, null],
            Since: [9, null, null],
            Founder: [10, null, null],
            Admin: [10, null, null],
            Status: [11, '600', 'rgb(0, 99, 31)'],
            Characters: [12, null, null],
            id: [13, null, null],
        };

        let imagesParent = document.querySelectorAll('.z-list');
        if (!imagesParent.length) imagesParent = document.querySelectorAll('[target="rating"]');

        settings.moreOptionsInProfile && [['st', 'mystories', 0], ['fs', 'favstories', 1]].forEach(([place, storyType, sortType]) => {
            const placeElem = document.querySelector(`#${place}`);
            const sortButton = document.querySelector(`[onclick="stories_init(${place}_array,'.${storyType}');${place}_array.sort(sortByReviews); storylist_draw('${place}_inside', ${place}_array, 1, 1, ${sortType});"]`);
            if (!sortButton || !placeElem) return;
            const storyContainer = document.querySelector(`#${place}_inside`);
            ['Follows', 'Favs'].forEach(metatype => {
                sortButton.before(Object.assign(document.createElement('span'), {
                    innerHTML: metatype,
                    className: 'gray',
                    onclick: () => {
                        Array.from(placeElem.querySelectorAll(`.${storyType}`)).sort((a, b) => {
                            const get = s => Number(s.querySelector(`.${metatype.toLowerCase()}metatype-val`)?.innerText.replaceAll(',', '')) || 0;
                            return get(b) - get(a);
                        }).forEach(e => storyContainer.appendChild(e));
                        placeElem.querySelectorAll(`.${storyType}`).forEach(e => e.remove());
                    }
                }), document.createTextNode(' . '));
            });
        });

        const bookmarkDir = settings.markFicWithBookmark ? await new Promise(resolve => {
            chrome.runtime.sendMessage({ message: 'get-dir' })
                .then(r => resolve(r.result))
                .catch(() => resolve({}));
        }) : {};

        const chapSelect = document.querySelector('#chap_select');
        const allParagraphs = Array.from(document.querySelectorAll('p'));
        const allChapSelects = Array.from(document.querySelectorAll('#chap_select'));
        let id;

        imagesParent.forEach(element => {
            settings.separateFics && Object.assign(element.style, {
                marginBottom: '10px', borderBottom: '1px solid #969696', borderTop: '1px solid #969696', borderRight: '1px solid #969696'
            });
            if (settings.bigCovers) {
                element.style.height = '115px';
                const img = element.querySelector('.cimage');
                img && Object.assign(img.style, { width: '75px', height: '100px' });
            }
            const descriptionDiv = chapSelect ? element.parentElement : element.querySelector('div')?.querySelector('div');
            if (descriptionDiv) {
                const splitByRated = descriptionDiv.innerText.split(' - Rated: ');
                if (splitByRated.length > 1) {
                    if (splitByRated[0].startsWith('Crossover - ')) splitByRated[0] = splitByRated[0].substring(11);
                    splitByRated[0] = 'Fandom: ' + splitByRated[0].replaceAll(' - ', '[@]');
                    descriptionDiv.innerText = splitByRated.join(' - Rated: ');
                }
                let endIndex = descriptionDiv.innerText.lastIndexOf(' - ');
                let endItem = descriptionDiv.innerText.substring(endIndex);
                if (endItem === ' - Complete') endItem = ' - Status: Complete';
                else if (endItem.startsWith(' - id: ')) { id = endItem.substring(7); endItem = ''; }
                descriptionDiv.innerText = descriptionDiv.innerText.substring(0, endIndex) + endItem;
                descriptionDiv.innerHTML = descriptionDiv.innerText.split(' - ').map(item => `<span>${item}</span>`).join(' - ');
                const metaSpans = descriptionDiv.querySelectorAll('span');
                if (!metaSpans.length) return;
                metaSpans.forEach(span => {
                    Object.keys(METATYPES).forEach(metaType => {
                        if (span.innerText.startsWith(metaType + ': ')) span.classList.add(metaType.toLowerCase() + 'metatype');
                    });
                });
                if (metaSpans[1]?.classList.contains('ratedmetatype')) metaSpans[0].innerHTML = metaSpans[0].innerHTML.replaceAll('[@]', ' - ');
                let notDone = ['language', 'genre', 'characters'];
                const allGenres = 'AdventureAngstCrimeDramaFamilyFantasyFriendshipGeneralHorrorHumorHurt/ComfortMysteryParodyPoetryRomanceSci-FiSpiritualSupernaturalSuspenseTragedyWestern';
                descriptionDiv.querySelectorAll(':not([class])').forEach(span => {
                    if (notDone[0] === 'genre' && !span.innerText.split('/').every(genre => allGenres.includes(genre))) notDone.shift();
                    span.classList = (notDone.shift() || 'characters') + 'metatype';
                });
                Object.keys(METATYPES).forEach(metaType => {
                    const className = metaType.toLowerCase() + 'metatype';
                    const span = descriptionDiv.querySelector('.' + className);
                    const start = metaType + ': ';
                    if (span?.innerText.startsWith(start)) span.innerHTML = start + `<span class='${className}-val'>${span.innerText.substring(start.length)}</span>`;
                });
                if (settings.betterInfo) {
                    Object.assign(descriptionDiv.style, { display: 'flow-root', paddingLeft: '0' });
                    descriptionDiv.innerHTML = descriptionDiv.innerHTML.split(' - ').sort((a, b) => {
                        const findIndex = item => METATYPES[item.charAt(13).toUpperCase() + item.substring(14, item.indexOf('metatype'))]?.[0];
                        return findIndex(a) - findIndex(b);
                    }).join(' - ');
                    [['fandom'], ['genre', 'language'], ['words', 'posts', 'followers'], ['follows', 'favs', 'reviews'], ['status', 'published']].forEach(item => {
                        const getSpan = metatype => descriptionDiv.querySelector('.' + metatype + 'metatype');
                        const metatype = item.find(getSpan);
                        getSpan(metatype)?.after(document.createElement('br'));
                    });
                    descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace(/<br>.{2}/g, '<br>');
                    Object.assign(element.style, { height: 'auto', minHeight: '120px' });
                }
                if (settings.betterInfoColor) {
                    const recolored = (color) => {
                        if (!storyContrastButton?.parentElement || storyContrastButton?.parentElement.style.backgroundColor !== 'rgb(51, 51, 51)') return color;
                        const [r, g, b] = color.match(/\d+/g).map(Number);
                        return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
                    };
                    const colorMetaTypes = () => Object.entries(METATYPES).forEach(([metaType, styleVal]) => {
                        const className = '.' + metaType.toLowerCase() + 'metatype';
                        const span = descriptionDiv.querySelector(className + '-val') || descriptionDiv.querySelector(className);
                        if (span) {
                            if (!Array.isArray(styleVal)) styleVal = styleVal[span.innerText];
                            if (Array.isArray(styleVal)) {
                                const [order, fw, color] = styleVal;
                                if (fw) span.style.fontWeight = fw;
                                if (color) span.style.color = recolored(color);
                            }
                        }
                    });
                    colorMetaTypes();
                    if (storyContrastButton) storyContrastButton.onclick = colorMetaTypes;
                }
            }
            id = chapSelect ? id : element.querySelector('a')?.href.match(/fanfiction\.net\/s\/(\d+)/)?.[1];
            if (!chapSelect && id && bookmarkDir[id]?.chapter) {
                element.style.backgroundColor = '#e1edff';
                element.querySelector('div').before(Object.assign(document.createElement('img'), {
                    src: chrome.runtime.getURL('icons/bookmark1.png'),
                    width: 14,
                    height: 14
                }));
            }
        });

        if (chapSelect) {
            const storyName = Array.from(document.querySelectorAll('b'))?.[5]?.innerText || '';
            const profileAuthor = document.querySelector('#profile_top a')?.innerText || '';
            const preStoryLinks = document.querySelector('#pre_story_links')?.querySelectorAll('a');
            const followButton = document.querySelector('.icon-heart');
            const chaptersCount = document.querySelector('.chaptersmetatype-val');
            const chapter = Number(chapSelect.options[chapSelect.selectedIndex].innerText.split('.')[0]);
            const iconUnmarked = `<img src="${chrome.runtime.getURL('icons/bookmark2.png')}" width="20" height="20">`;
            const iconMarked = `<img src="${chrome.runtime.getURL('icons/bookmark1.png')}" width="20" height="20">`;
            let lastChapterBookmark = 0;
            let fandom = preStoryLinks?.[1]?.innerText || preStoryLinks?.[0]?.innerText || '';
            if (settings.chapterWordCounter) {
                let wordCounter = 0;
                allParagraphs.forEach(e => wordCounter += e.innerText.trim().split(/\s+/).length);
                allChapSelects.forEach(e => e.options[e.selectedIndex].textContent += ` - ${wordCounter} words`);
            }
            const goButton = document.createElement('button');
            const createBookmarkButton = (chapNum, isFirst = true) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn pull-right bookmark';
                button.title = 'bookmark';
                button.innerHTML = iconUnmarked;
                button.style.height = '30px';
                button.id = `bookmark${chapNum}`;
                button.addEventListener('click', () => {
                    if (lastChapterBookmark === chapNum) {
                        lastChapterBookmark = 0;
                        button.innerHTML = iconUnmarked;
                        goButton.style.display = 'none';
                        chrome.runtime.sendMessage({ message: 'del-bookmark', id });
                    } else {
                        const prevButton = document.querySelector(`#bookmark${lastChapterBookmark}`);
                        if (prevButton) prevButton.click();
                        lastChapterBookmark = chapNum;
                        button.innerHTML = iconMarked;
                        if (isFirst) goButton.style.display = 'none';
                        else goButton.style.display = '';
                        chrome.runtime.sendMessage({ message: 'set-bookmark', chapter: chapNum, id, fandom, author: profileAuthor, storyName });
                    }
                });
                return button;
            };
            if (settings.bookmarkButton) {
                const bookmarkButton = createBookmarkButton(chapter);
                Object.assign(chapSelect.parentElement.style, { float: '', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '20px', gap: '5px' });
                chapSelect.parentElement.prepend(bookmarkButton);
                goButton.type = 'button';
                goButton.className = 'btn pull-right';
                goButton.textContent = 'Go to bookmark';
                goButton.style.marginRight = '5px';
                goButton.style.display = 'none';
                goButton.addEventListener('click', () => {
                    const bookmarkedChapter = document.querySelector(`#storytext${lastChapterBookmark}`);
                    if (bookmarkedChapter) bookmarkedChapter.scrollIntoView({ behavior: 'smooth' });
                    else window.open(`https://www.fanfiction.net/s/${id}/${lastChapterBookmark}/${storyName}`, '_self');
                });
                followButton.after(goButton);
                if (settings.autoSave) chrome.runtime.sendMessage({ message: 'auto-bookmark', chapter, id }, r => { if (r.status) bookmarkButton.click(); });
                if (bookmarkDir[id]?.chapter) {
                    lastChapterBookmark = Number(bookmarkDir[id].chapter);
                    if (lastChapterBookmark === chapter) bookmarkButton.innerHTML = iconMarked;
                    else goButton.style.display = '';
                }
            }
            if (settings.allFicButton) {
                const getChapterURL = n => `https://www.fanfiction.net/s/${id}/${n}`;
                const sepSpan = (i, arr, className) => {
                    const span = Object.assign(document.createElement('span'), {
                        className,
                        innerHTML: '<br><br><br><br>' + (i !== arr.length ? `<h3>${arr[i]}</h3>` : '') + '<hr size="1" noshade style="background: darkgrey; height: 2px;"><br><br><br>'
                    });
                    i !== arr.length && settings.bookmarkButton && span.querySelector('h3').after(createBookmarkButton(i + 1, false));
                    return span;
                };
                const allFicButton = document.createElement('button');
                allFicButton.type = 'button';
                allFicButton.className = 'btn pull-right';
                allFicButton.textContent = 'Entire Work';
                allFicButton.style.marginRight = '5px';
                allFicButton.addEventListener('click', async () => {
                    allFicButton.style.display = 'none';
                    if (lastChapterBookmark) goButton.style.display = '';
                    allChapSelects.forEach(e => e.parentElement.style.display = 'none');
                    const count = Number(chaptersCount.innerText);
                    const chaptersName = Array.from(chapSelect.options).map(o => o.textContent);
                    let storyTextElem = document.querySelector('#storytext');
                    for (let i = 0; i < count; i++) {
                        try {
                            const chapterElem = new DOMParser().parseFromString(
                                await (await fetch(getChapterURL(i + 1))).text(),
                                'text/html'
                            ).querySelector('#storytext');
                            if (!chapterElem) break;
                            chapterElem.id = `storytext${i + 1}`;
                            if (settings.chapterWordCounter && i + 1 !== chapter) {
                                let wc = 0;
                                chapterElem.querySelectorAll('p').forEach(p => wc += p.innerText.trim().split(/\s+/).length);
                                chaptersName[i] += ` - ${wc} words`;
                            }
                            storyTextElem.before(chapterElem);
                            chapterElem.before(sepSpan(i, chaptersName, storyTextElem.className));
                            storyContrastButton.click();
                            storyContrastButton.click();
                        } catch (e) { console.error('Failed to fetch chapter', getChapterURL(i + 1), e); break; }
                    }
                    storyTextElem.before(sepSpan(count, chaptersName, storyTextElem.className));
                    storyTextElem.remove();
                    const allFicTextElem = document.querySelector('#storytext1').parentElement;
                    allFicTextElem.id = 'storytext';
                    if (settings.allowCopy) allFicTextElem.querySelectorAll('*').forEach(e => e.style.userSelect = 'text');
                    if (settings.bookmarkButton) {
                        document.querySelectorAll(`#bookmark${lastChapterBookmark}`).forEach(e => e.innerHTML = iconMarked);
                    }
                });
                followButton.after(allFicButton);
            }
        }
    } catch (error) {
        console.error('Failed to apply UI enhancements and features in content script:', error);
    }
}

main();
