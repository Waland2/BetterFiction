const sendMessage = (payload) => {
    return chrome.runtime.sendMessage(payload).then(response => response.result).catch(() => ({}));
};

const main = async () => {
    try {
        const settings = await sendMessage({ message: 'get-info' });

        const topMenu = document.querySelector('div')?.querySelector('div');
        if (!topMenu || topMenu.classList[0] !== 'menulink') {
            return;
        }

        if (settings.allowCopy) {
            document.querySelectorAll('p').forEach((element) => {
                element.style.userSelect = 'text';
            });
        }

        if (settings.bookmarkButton) {
            topMenu.appendChild(Object.assign(document.createElement('span'), {
                innerHTML: `<a href='${chrome.runtime.getURL('tabs/bookmarks/bookmarks.html')}' style='margin-left: 10px;'><img src='${chrome.runtime.getURL('icons/bookmark3.png')}' style='vertical-align: middle; cursor: default;' title='Favorite Stories' width='20' height='20'></a>`,
                id: 'openBookmarkList'
            }));
        }

        if (settings.myFicList) {
            topMenu.appendChild(Object.assign(document.createElement('span'), {
                innerHTML: `<img src='${chrome.runtime.getURL('icons/list.png')}' style='vertical-align: middle; cursor: default; margin-left: 12px;' title='My fic list' width='20' height='20'>`,
                id: 'openMyFicList'
            })).addEventListener('click', () => {
                sendMessage({ message: 'open-html-page', fileName: 'tabs/my-list/my-list.html' });
            });
        }

        if (settings.shortcuts) {
            topMenu.appendChild(Object.assign(document.createElement('div'), {
                style: 'position: relative; display: inline-block; margin-bottom: 0px;'
            }));
            topMenu.lastChild.attachShadow({ mode: 'open' }).appendChild(Object.assign(document.createElement('span'), {
                innerHTML: `<a href='https://www.fanfiction.net/favorites/story.php' style='margin-left: 10px;'><img src='${chrome.runtime.getURL('icons/heart.png')}' style='vertical-align: middle; cursor: default;' title='Favorite Stories' width='20' height='20'></a><a href='https://www.fanfiction.net/alert/story.php' style='margin-left: 8px;'><img src='${chrome.runtime.getURL('icons/book.png')}' style='vertical-align: middle; cursor: default;' title='Followed Stories' width='20' height='20'></a>`
            }));
        }

        document.querySelectorAll('.adsbygoogle').forEach((element) => element.remove());

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

        if (settings.moreOptionsInProfile) {
            [['st', 'mystories', 0], ['fs', 'favstories', 1]].forEach(([place, storyType, sortType]) => {
                const placeElem = document.querySelector(`#${place}`);
                const sortButton = document.querySelector(`[onclick="stories_init(${place}_array,'.${storyType}');${place}_array.sort(sortByReviews); storylist_draw('${place}_inside', ${place}_array, 1, 1, ${sortType});"]`);
                if (!sortButton || !placeElem) {
                    return;
                }
                const storyContainer = document.querySelector(`#${place}_inside`);
                ['Follows', 'Favs'].forEach((metatype) => {
                    sortButton.before(Object.assign(document.createElement('span'), {
                        innerHTML: metatype,
                        className: 'gray',
                        onclick: () => {
                            const sorted = Array.from(placeElem.querySelectorAll(`.${storyType}`)).sort((a, b) => {
                                const get = (s) => Number(s.querySelector(`.${metatype.toLowerCase()}metatype-val`)?.innerText.replaceAll(',', '')) || 0;
                                return get(b) - get(a);
                            });
                            placeElem.querySelectorAll(`.${storyType}`).forEach((element) => element.remove());
                            sorted.forEach((element) => storyContainer.appendChild(element));
                        }
                    }), document.createTextNode(' . '));
                });
            });
        }

        let id;
        const bookmarkDir = await sendMessage({ message: 'get-dir' });
        const storyContrastButton = document.querySelector('[title=\'Story Contrast\']');
        const recolored = (color) => {
            if (!storyContrastButton?.parentElement || storyContrastButton?.parentElement.style.backgroundColor !== 'rgb(51, 51, 51)') {
                return color;
            }
            const [r, g, b] = color.match(/\d+/g).map(Number);
            return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
        };

        let imagesParent = document.querySelectorAll('.z-list');
        if (!imagesParent.length) {
            imagesParent = document.querySelectorAll('[target="rating"]');
        }
        imagesParent.forEach((element) => {
            if (settings.separateFics) {
                Object.assign(element.style, {
                    marginBottom: '10px',
                    borderBottom: '1px solid #969696',
                    borderTop: '1px solid #969696',
                    borderRight: '1px solid #969696'
                });
            }

            if (settings.bigCovers) {
                element.style.height = '115px';
                const img = element.querySelector('.cimage');
                if (img) {
                    Object.assign(img.style, {
                        width: '75px',
                        height: '100px'
                    });
                }
            }

            const descriptionDiv = storyContrastButton ? element.parentElement : element.querySelector('div')?.querySelector('div');
            if (descriptionDiv) {
                const placeholderText = '[@]';
                const splitByRated = descriptionDiv.innerText.split(' - Rated: ');

                if (splitByRated.length > 1) {
                    if (splitByRated[0].startsWith('Crossover - ')) {
                        splitByRated[0] = splitByRated[0].substring(11);
                    }
                    splitByRated[0] = 'Fandom: ' + splitByRated[0].replaceAll(' - ', placeholderText);
                    descriptionDiv.innerText = splitByRated.join(' - Rated: ');
                }

                let endIndex = descriptionDiv.innerText.lastIndexOf(' - ');
                let endItem = descriptionDiv.innerText.substring(endIndex);
                if (endItem === ' - Complete') {
                    endItem = ' - Status: Complete';
                } else if (endItem.startsWith(' - id: ')) {
                    id = endItem.substring(7);
                    endItem = '';
                }

                descriptionDiv.innerText = descriptionDiv.innerText.substring(0, endIndex) + endItem;
                descriptionDiv.innerHTML = descriptionDiv.innerText.split(' - ').map((item) => `<span>${item}</span>`).join(' - ');

                const metaSpans = descriptionDiv.querySelectorAll('span');
                if (!metaSpans.length) {
                    return;
                }

                metaSpans.forEach((span) => {
                    Object.keys(METATYPES).forEach((metaType) => {
                        if (span.innerText.startsWith(metaType + ': ')) {
                            span.classList.add(metaType.toLowerCase() + 'metatype');
                        }
                    });
                });

                if (metaSpans[1]?.classList.contains('ratedmetatype')) {
                    metaSpans[0].innerHTML = metaSpans[0].innerHTML.replaceAll(placeholderText, ' - ');
                }

                let notDone = ['language', 'genre', 'characters'];
                const allGenres = 'AdventureAngstCrimeDramaFamilyFantasyFriendshipGeneralHorrorHumorHurt/ComfortMysteryParodyPoetryRomanceSci-FiSpiritualSupernaturalSuspenseTragedyWestern';
                descriptionDiv.querySelectorAll(':not([class])').forEach((span) => {
                    if (notDone[0] === 'genre' && !span.innerText.split('/').every((genre) => allGenres.includes(genre))) {
                        notDone.shift();
                    }
                    span.className = (notDone.shift() || 'characters') + 'metatype';
                });

                Object.keys(METATYPES).forEach((metaType) => {
                    const className = metaType.toLowerCase() + 'metatype';
                    const span = descriptionDiv.querySelector('.' + className);
                    const start = metaType + ': ';
                    if (span?.innerText.startsWith(start)) {
                        span.innerHTML = `${start}<span class='${className}-val'>${span.innerText.substring(start.length)}</span>`;
                    }
                });

                if (settings.betterInfo) {
                    Object.assign(descriptionDiv.style, { display: 'flow-root', paddingLeft: '0' });
                    descriptionDiv.innerHTML = descriptionDiv.innerHTML.split(' - ').sort((a, b) => {
                        const findIndex = (item) => METATYPES[item.charAt(13).toUpperCase() + item.substring(14, item.indexOf('metatype'))]?.[0];
                        return findIndex(a) - findIndex(b);
                    }).join(' - ');

                    [['fandom'], ['genre', 'language'], ['words', 'posts', 'followers'], ['follows', 'favs', 'reviews'], ['status', 'published']].forEach((item) => {
                        const getSpan = (metatype) => descriptionDiv.querySelector('.' + metatype + 'metatype');
                        const metatype = item.find(getSpan);
                        getSpan(metatype)?.after(document.createElement('br'));
                    });

                    descriptionDiv.innerHTML = descriptionDiv.innerHTML.replace(/<br>.{2}/g, '<br>');
                    Object.assign(element.style, { height: 'auto', minHeight: '120px' });
                }

                if (settings.betterInfoColor) {
                    const colorMetaTypes = () => {
                        Object.entries(METATYPES).forEach(([metaType, styleVal]) => {
                            let currentStyle = styleVal;
                            const className = '.' + metaType.toLowerCase() + 'metatype';
                            const span = descriptionDiv.querySelector(className + '-val') || descriptionDiv.querySelector(className);
                            if (span) {
                                if (!Array.isArray(currentStyle)) {
                                    currentStyle = currentStyle[span.innerText] || currentStyle.default;
                                }
                                if (Array.isArray(currentStyle)) {
                                    const [order, fw, color] = currentStyle;
                                    if (fw) {
                                        span.style.fontWeight = fw;
                                    }
                                    if (color) {
                                        span.style.color = recolored(color);
                                    }
                                }
                            }
                        });
                    };

                    colorMetaTypes();

                    if (storyContrastButton) {
                        storyContrastButton.onclick = colorMetaTypes;
                    }
                }
            }

            if (settings.markFicWithBookmark && !storyContrastButton) {
                id = element.querySelector('a')?.href.match(/fanfiction\.net\/s\/(\d+)/)?.[1];
                if (id && bookmarkDir[id]?.chapter) {
                    element.style.backgroundColor = '#e1edff';
                    element.querySelector('div').before(Object.assign(document.createElement('img'), {
                        src: chrome.runtime.getURL('icons/bookmark1.png'),
                        width: 14,
                        height: 14
                    }));
                }
            }
        });

        if (storyContrastButton) {
            const chapSelects = Array.from(document.querySelectorAll('#chap_select'));
            const storyName = Array.from(document.querySelectorAll('b'))?.[5]?.innerText || '';
            const followButton = document.querySelector('.icon-heart');
            const chapter = chapSelects[0] ? Number(chapSelects[0].options[chapSelects[0].selectedIndex].innerText.split('.')[0]) : 1;
            const iconUnmarked = `<img src="${chrome.runtime.getURL('icons/bookmark2.png')}" width="20" height="20">`;
            const iconMarked = `<img src="${chrome.runtime.getURL('icons/bookmark1.png')}" width="20" height="20">`;
            let lastChapterBookmark = 0;
            const preStoryLinks = document.querySelector('#pre_story_links')?.querySelectorAll('a');
            let fandom = preStoryLinks?.[1]?.innerText || preStoryLinks?.[0]?.innerText || '';

            if (settings.chapterWordCounter) {
                let wordCounter = 0;
                Array.from(document.querySelectorAll('p')).forEach((element) => {
                    wordCounter += element.innerText.trim().split(/\s+/).length;
                });
                chapSelects.forEach((element) => {
                    element.options[element.selectedIndex].textContent += ` - ${wordCounter} words`;
                });
            }

            const goButton = Object.assign(document.createElement('button'), {
                id: 'gobutton',
                type: 'button',
                className: 'btn pull-right',
                textContent: 'Go to bookmark'
            });
            Object.assign(goButton.style, {
                marginRight: '5px',
                display: 'none'
            });

            const createBookmarkButton = (chapNum, isFirst = true) => {
                const button = document.createElement('button');
                Object.assign(button, {
                    type: 'button',
                    className: 'btn pull-right bookmark',
                    title: 'bookmark',
                    innerHTML: iconUnmarked,
                    id: `bookmark${chapNum}`
                });
                button.style.height = '30px';
                button.addEventListener('click', () => {
                    if (lastChapterBookmark === chapNum) {
                        lastChapterBookmark = 0;
                        button.innerHTML = iconUnmarked;
                        goButton.style.display = 'none';
                        sendMessage({ message: 'del-bookmark', id });
                    } else {
                        const prevButton = document.querySelector(`#bookmark${lastChapterBookmark}`);
                        if (prevButton) {
                            prevButton.click();
                        }
                        lastChapterBookmark = chapNum;
                        button.innerHTML = iconMarked;
                        if (isFirst) {
                            goButton.style.display = 'none';
                        } else {
                            goButton.style.display = '';
                        }
                        const profileAuthor = document.querySelector('#profile_top a')?.innerText || '';
                        sendMessage({
                            message: 'set-bookmark',
                            chapter: chapNum,
                            id,
                            fandom,
                            author: profileAuthor,
                            storyName
                        });
                    }
                });
                return button;
            };

            if (settings.bookmarkButton) {
                const bookmarkButton = createBookmarkButton(chapter);
                const selectionDiv = chapSelects[0] ? chapSelects[0].parentElement : document.querySelector('[style="float:right; "]');
                Object.assign(selectionDiv.style, {
                    float: '',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginTop: '20px',
                    gap: '5px'
                });
                selectionDiv.prepend(bookmarkButton);

                goButton.addEventListener('click', () => {
                    const bookmarkedChapter = document.querySelector(`#storytext${lastChapterBookmark}`);
                    if (bookmarkedChapter) {
                        bookmarkedChapter.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        window.open(`https://www.fanfiction.net/s/${id}/${lastChapterBookmark}/${storyName}`, '_self');
                    }
                });
                followButton.after(goButton);

                if (bookmarkDir[id]?.chapter) {
                    lastChapterBookmark = Number(bookmarkDir[id].chapter);
                    if (lastChapterBookmark === chapter) {
                        bookmarkButton.innerHTML = iconMarked;
                    } else {
                        goButton.style.display = '';
                    }
                }

                if (settings.autoSave && lastChapterBookmark < chapter) {
                    bookmarkButton.click();
                }
            }

            if (settings.allFicButton && chapSelects[0]) {
                const allFicButton = document.createElement('button');
                Object.assign(allFicButton, {
                    type: 'button',
                    className: 'btn pull-right',
                    textContent: 'Entire Work'
                });
                allFicButton.style.marginRight = '5px';

                const getChapterURL = (n) => `https://www.fanfiction.net/s/${id}/${n}`;
                const sepSpan = (i, arr, className) => {
                    const span = Object.assign(document.createElement('span'), {
                        className,
                        innerHTML: '<br><br><br><br>' + (i !== arr.length ? `<h3>${arr[i]}</h3>` : '') + '<hr size="1" noshade style="background: darkgrey; height: 2px;"><br><br><br>'
                    });

                    if (settings.bookmarkButton && i !== arr.length) {
                        span.querySelector('h3').after(createBookmarkButton(i + 1, false));
                    }
                    return span;
                };

                allFicButton.addEventListener('click', async () => {
                    allFicButton.style.display = 'none';
                    if (lastChapterBookmark) {
                        goButton.style.display = '';
                    }
                    chapSelects.forEach((element) => {
                        element.parentElement.style.display = 'none';
                    });

                    const count = Number(document.querySelector('.chaptersmetatype-val').innerText);
                    const chaptersName = Array.from(chapSelects[0].options).map((option) => option.textContent);
                    let storyTextElem = document.querySelector('#storytext');
                    const finalSpan = sepSpan(count, chaptersName, storyTextElem.className);
                    storyTextElem.before(finalSpan);
                    storyTextElem.remove();

                    let start = 0;
                    const loadMoreButton = Object.assign(document.createElement('button'), {
                        type: 'button',
                        className: 'btn pull-right',
                        textContent: 'Load more chapters',
                        onclick: async () => {
                            loadMoreButton.style.display = 'none';
                            for (let i = start; i < count; i++) {
                                try {
                                    const response = await fetch(getChapterURL(i + 1));
                                    if (!response.ok) {
                                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                    }
                                    const chapterHTML = await response.text();
                                    const chapterElem = new DOMParser().parseFromString(chapterHTML, 'text/html').querySelector('#storytext');
                                    if (!chapterElem) {
                                        break;
                                    }
                                    chapterElem.id = `storytext${i + 1}`;

                                    if (settings.chapterWordCounter && i + 1 !== chapter) {
                                        let wc = 0;
                                        chapterElem.querySelectorAll('p').forEach((p) => {
                                            wc += p.innerText.trim().split(/\s+/).length;
                                        });
                                        chaptersName[i] += ` - ${wc} words`;
                                    }
                                    finalSpan.before(chapterElem);
                                    chapterElem.before(sepSpan(i, chaptersName, finalSpan.className));
                                    storyContrastButton.click();
                                    storyContrastButton.click();
                                } catch (error) {
                                    console.error(`Failed to fetch chapter ${i + 1} from ${getChapterURL(i + 1)}`, error);
                                    start = i;
                                    loadMoreButton.style.display = '';
                                    break;
                                }

                                const allFicTextElem = document.querySelector('#storytext1').parentElement;
                                allFicTextElem.id = 'storytext';
                                if (settings.allowCopy) {
                                    allFicTextElem.querySelectorAll('*').forEach((element) => {
                                        element.style.userSelect = 'text';
                                    });
                                }
                                
                                if (settings.bookmarkButton) {
                                    document.querySelectorAll(`#bookmark${lastChapterBookmark}`).forEach((element) => {
                                        element.innerHTML = iconMarked;
                                    });
                                }
                            }
                        }
                    });

                    finalSpan.querySelector('hr').after(loadMoreButton);
                    loadMoreButton.click();
                });
                followButton.after(allFicButton);
            }
        }
    } catch (error) {
        console.error('Failed to apply UI enhancements and features in content script:', error);
    }
};

main();
