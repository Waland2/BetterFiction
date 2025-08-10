const sendMessage = (payload) => {
    return chrome.runtime.sendMessage(payload).then(response => response.result).catch(() => ({}));
};

const betterFiction = async () => {
    const info = await sendMessage({
        message: 'get-info'
    });

    const dir = await sendMessage({
        message: 'get-dir'
    });

    const adblock = () => {
        if (info.adblock) {
            document.querySelectorAll('.adsbygoogle').forEach((element) => element.remove());
        }
    };

    const copy = () => {
        if (info.copy) {
            document.querySelectorAll('p').forEach((element) => {
                element.style.userSelect = 'text';
                element.style.webkitUserSelect = 'text'; // for Safari
            });
        }
    };

    const shortcuts = () => {
        const topMenu = document.querySelector('div')?.querySelector('div');
        if (!topMenu) {
            return;
        }

        const icon = (title) => `<img src="${chrome.runtime.getURL(`icons/${title.toLowerCase()}.svg`)}" style="vertical-align: middle; cursor: default;" width="20" height="20" title="${title}" alt="${title}">`;

        if (info.bookmarks) {
            topMenu.appendChild(Object.assign(document.createElement('span'), {
                innerHTML: 
                `<a href='${chrome.runtime.getURL('tabs/bookmarks/bookmarks.html')}' style='margin-left: 10px;'>
                    ${icon('Bookmarks')}
                </a>`,
                id: 'openBookmarks'
            }));
        }

        if (info.ficList) {
            topMenu.appendChild(Object.assign(document.createElement('span'), {
                innerHTML: 
                `<a href='${chrome.runtime.getURL('tabs/ficlist/ficlist.html')}' style='margin-left: 12px;'>
                    ${icon('ficList')}
                </a>`,
                id: 'openFicList'
            }));
        }

        if (info.shortcuts) {
            topMenu.appendChild(Object.assign(document.createElement('div'), {
                style: 'position: relative; display: inline-block; margin-bottom: 0px;'
            }));
            topMenu.lastChild.attachShadow({ mode: 'open' }).appendChild(Object.assign(document.createElement('span'), {
                innerHTML: 
                `<a href='https://www.fanfiction.net/favorites/story.php' style='margin-left: 10px;'>
                    ${icon('Favorites')}
                </a>
                <a href='https://www.fanfiction.net/alert/story.php' style='margin-left: 8px;'>
                    ${icon('Follows')}
                </a>`
            }));
        }
    };

    const separateFics = (element) => {
        if (info.separateFics) {
            element.style.marginBottom = '10px';
            element.style.borderBottom = '1px solid #969696';
            element.style.borderTop = '1px solid #969696';
            element.style.borderRight = '1px solid #969696';
        }
    };

    const bigCover = (element) => {
        if (info.bigCovers) {
            element.style.height = '115px';
            const img = element.querySelector('.cimage');
            if (img) {
                img.style.width = '75px';
                img.style.height = '100px';
            }
        }
    };

    const profileSorts = () => {
        if (info.profileSorts) {
            [['st', 'mystories', 0], ['fs', 'favstories', 1]].forEach(([place, storyType, sortType]) => {
                const placeElem = document.querySelector(`#${place}`);
                const sort = document.querySelector(`[onclick="stories_init(${place}_array,'.${storyType}');${place}_array.sort(sortByReviews); storylist_draw('${place}_inside', ${place}_array, 1, 1, ${sortType});"]`);
                if (!sort || !placeElem) {
                    return;
                }
                const storyContainer = document.querySelector(`#${place}_inside`);
                ['Follows', 'Favs'].forEach((metatype) => {
                    sort.before(Object.assign(document.createElement('span'), {
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
    };

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

    const groupDescription = (description) => {
        if (info.groupDescriptions) {
            description.style.display = 'flow-root';
            description.style.paddingLeft = '0';
            description.innerHTML = description.innerHTML.split(' - ').sort((a, b) => {
                const findIndex = (item) => METATYPES[item.charAt(13).toUpperCase() + item.substring(14, item.indexOf('metatype'))]?.[0];
                return findIndex(a) - findIndex(b);
            }).join(' - ');

            [['fandom'], ['genre', 'language'], ['words', 'posts', 'followers'], ['follows', 'favs', 'reviews'], ['status', 'published']].forEach((item) => {
                const getSpan = (metatype) => description.querySelector('.' + metatype + 'metatype');
                const metatype = item.find(getSpan);
                getSpan(metatype)?.after(document.createElement('br'));
            });

            description.innerHTML = description.innerHTML.replace(/<br>.{2}/g, '<br>');

            const idSpan = description.querySelector('.idmetatype');
            if (idSpan) {
                idSpan.style.display = 'none';
                const prevNode = idSpan.previousSibling;
                if (prevNode && prevNode.nodeType === Node.TEXT_NODE) {
                    prevNode.textContent = prevNode.textContent.replace(/\s*-\s*$/, '');
                }
            }
        }
    }

    const storyContrast = document.querySelector('[title=\'Story Contrast\']');
    const styleDescription = (description) => {
        if (info.styleDescriptions) {
            const colorDescription = () => {
                Object.entries(METATYPES).forEach(([metaType, styleVal]) => {
                    let currentStyle = styleVal;
                    const className = '.' + metaType.toLowerCase() + 'metatype';
                    const metaSpan = description.querySelector(className + '-val') || description.querySelector(className);
                    const spans = metaSpan ? [metaSpan].concat(Array.from(metaSpan.querySelectorAll('*'))) : [];
                    spans.forEach((span) => {
                        span.classList = metaSpan.classList;
                        if (!Array.isArray(currentStyle)) {
                            currentStyle = currentStyle[span.innerText] || currentStyle.default;
                        }
                        if (Array.isArray(currentStyle)) {
                            let [order, fw, color] = currentStyle;
                            if (fw) {
                                span.style.fontWeight = fw;
                            }
                            if (color) {
                                if (storyContrast?.parentElement?.style.backgroundColor === 'rgb(51, 51, 51)') {
                                    const [r, g, b] = color.match(/\d+/g).map(Number);
                                    color = `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
                                }
                                span.style.color = color;
                            }
                        }
                    });
                });
            };

            colorDescription();

            if (storyContrast) {
                storyContrast.onclick = colorDescription;
            }
        }
    }

    const betterDescription = (element) => {
        const description = element.querySelector('.xgray');
        if (!description) {
            return;
        }

        const placeholder = '{[@p]}';
        const splitByRated = description.innerHTML.split(' - Rated: ');

        if (splitByRated.length > 1) {
            if (splitByRated[0].startsWith('Crossover - ')) {
                splitByRated[0] = splitByRated[0].substring(11);
            }
            splitByRated[0] = 'Fandom: ' + splitByRated[0].replaceAll(' - ', placeholder);
            description.innerHTML = splitByRated.join(' - Rated: ');
        }

        let endIndex = description.innerHTML.lastIndexOf(' - ') + 3;
        if (description.innerHTML.substring(endIndex) === 'Complete') {
            description.innerHTML = description.innerHTML.substring(0, endIndex) + 'Status: Complete';
        }

        description.innerHTML = (description.innerHTML).split(' - ').map((item) => `<span>${item}</span>`).join(' - ').replaceAll(placeholder, ' - ');

        const metaSpans = description.querySelectorAll('span');
        if (!metaSpans.length) {
            return;
        }

        metaSpans.forEach((span) => {
            const metatype = Object.keys(METATYPES).find((metatype) => span.innerText.startsWith(metatype + ': '));
            if (metatype) {
                span.classList.add(metatype.toLowerCase() + 'metatype');
            }
        });

        let notDone = ['language', 'genre', 'characters'];
        const allGenres = 'AdventureAngstCrimeDramaFamilyFantasyFriendshipGeneralHorrorHumorHurt/ComfortMysteryParodyPoetryRomanceSci-FiSpiritualSupernaturalSuspenseTragedyWestern';
        description.querySelectorAll(':not([class])').forEach((span) => {
            if (notDone[0] === 'genre' && !span.innerText.split('/').every((genre) => allGenres.includes(genre))) {
                notDone.shift();
            }
            span.className = (notDone.shift() || 'characters') + 'metatype';
        });

        Object.keys(METATYPES).forEach((metaType) => {
            const className = metaType.toLowerCase() + 'metatype';
            const span = description.querySelector('.' + className);
            const start = metaType + ': ';
            if (span?.innerHTML.startsWith(start)) {
                span.innerHTML = `${start}<span class='${className}-val'>${span.innerHTML.substring(start.length)}</span>`;
            }
        });

        element.style.height = 'auto';
        element.style.minHeight = '120px';
        groupDescription(description);
        styleDescription(description);
    };

    const colorBookmark = (chapters, chapter) => {
        let icon = 'icons/bookmark';
        if (info.colorBookmarks && chapter !== chapters) {
            if (chapter === 1) {
                icon += '-planned';
            } else if (chapter < chapters) {
                icon += '-ongoing';
            } else {
                icon += '-error';
            }
        } else {
            icon += '-complete';
        }
        return chrome.runtime.getURL(icon + '.svg');
    };

    const markBookmark = (element, dir, chapters) => {
        if (info.markBookmarks) {
            const id = element.querySelector('a')?.href.match(/fanfiction\.net\/s\/(\d+)/)?.[1];
            if (id && dir[id]?.chapter) {
                element.style.backgroundColor = '#e1edff';
                const src = colorBookmark(chapters, dir[id].chapter);
                element.querySelector('div')?.before(Object.assign(document.createElement('img'), {
                    src,
                    width: 14,
                    height: 14
                }));
            }
        }
    };

    const wordCounter = (chapSelects, storyTexts) => {
        if (info.wordCounter) {
            storyTexts.forEach((element) => {
                const chapter = Number(element.id.replace('storytext', ''));
                if (/ - Words: \d+$/.test(chapSelects[0].options[chapter - 1].textContent)) {
                    return;
                }
                let wordCounter = 0;
                element.querySelectorAll('p').forEach((p) => {
                    wordCounter += p.innerText.trim().split(/\s+/).length;
                });
                chapSelects.forEach((chapSelect) => {
                    chapSelect.options[chapter - 1].textContent += ` - Words: ${wordCounter}`;
                });
            });
        }
    };

    const bookmarks = (id, chapters, chapter, follow) => {
        if (!info.bookmarks || chapter < 1 || chapter > chapters) {
            return '';
        }

        const iconUnmarked = `<img src="${chrome.runtime.getURL('icons/bookmark.svg')}" width="20" height="20">`;
        const iconMarked = `<img src="${colorBookmark(chapters, chapter)}" width="20" height="20">`;
        const preStoryLinks = document.querySelector('#pre_story_links')?.querySelectorAll('a');
        const fandom = preStoryLinks?.[1]?.innerText || preStoryLinks?.[0]?.innerText || '';
        const author = document.querySelector('#profile_top a')?.innerText || '';
        const storyName = document.querySelectorAll('b')?.[5]?.innerText || '';

        let go = document.querySelector('#gobutton');
        if (!go) {
            go = Object.assign(document.createElement('button'), {
                id: 'gobutton',
                type: 'button',
                className: 'btn pull-right',
                textContent: 'Go to bookmark',
                style: `margin-right: 5px; display: ${(info.bookmarks && dir[id]?.chapter) ? '' : 'none'}`,
                onclick: () => {
                    const markedChapter = document.querySelector(`#storytext${dir[id].chapter}`);
                    if (markedChapter) {
                        markedChapter.scrollIntoView({
                            behavior: 'smooth'
                        });
                    } else {
                        window.open(`https://www.fanfiction.net/s/${id}/${dir[id].chapter}`, '_self');
                    }
                }
            });
            follow.after(go);
        }

        const button = Object.assign(document.createElement('button'), {
            type: 'button',
            className: 'btn pull-right bookmark',
            title: 'bookmark',
            innerHTML: dir[id]?.chapter === chapter ? iconMarked : iconUnmarked,
            id: `bookmark${chapter}`,
            style: 'height: 30px;'
        });
        button.onclick = () => {
            if (dir[id]?.chapter === chapter) {
                button.innerHTML = iconUnmarked;
                go.style.display = 'none';
                delete dir[id];
                sendMessage({
                    message: 'del-bookmark',
                    id
                });
            } else {
                const lastBookmark = document.querySelector(`#bookmark${dir[id]?.chapter || 0}`)
                if (lastBookmark) {
                    lastBookmark.click();
                }
                button.innerHTML = iconMarked;
                go.style.display = '';
                const bookmarkInfo = {
                    chapter,
                    id,
                    fandom,
                    author,
                    storyName
                }
                dir[id] = bookmarkInfo;
                bookmarkInfo.message = 'set-bookmark';
                sendMessage(bookmarkInfo);
            }
        };
        return button;
    };

    const story = (id, chapters, chapSelects, storyTexts, follow) => {
        if (!id) {
            return;
        }

        copy();
        wordCounter(chapSelects, storyTexts);

        const separatorId = (chapter) => `separator${chapter}`;
        const separator = (chapter) => {
            const span = Object.assign(document.createElement('span'), {
                className: storyTexts[storyTexts.length - 1].className,
                id: separatorId(chapter),
                innerHTML: '<br><br><br><br>' + `<h3>${chapSelects[0].options[chapter - 1]?.innerText || ''}</h3>` + '<hr size="1" noshade style="background: darkgrey; height: 2px;"><br><br><br>'
            });

            span.querySelector('h3').after(bookmarks(id, chapters, chapter, follow));
            return span;
        };

        if (!document.querySelector(`#${separatorId(chapters + 1)}`)) {
            const finalSeparator = separator(chapters + 1);
            storyTexts[storyTexts.length - 1].after(finalSeparator);
        }
        storyTexts.forEach((element) => {
            const chapter = Number(element?.id?.replace('storytext', '') || 0);
            if (chapter && !document.querySelector(`#${separatorId(chapter)}`)) {
                element.before(separator(chapter));
            }
        });
    };

    const entireWork = (id, chapters, chapSelects, storyTexts, follow) => {
        if (info.entireWork && chapSelects[0]) {
            const button = Object.assign(document.createElement('button'), {
                type: 'button',
                className: 'btn pull-right',
                textContent: 'Entire Work',
                style: 'margin-right: 5px;'
            });

            button.onclick = async () => {
                button.style.display = 'none';
                button.disabled = true;
                chapSelects.forEach((element) => {
                    element.parentElement.style.display = 'none';
                });

                document.querySelector(`#separator${storyTexts[0].id.replace('storytext', '')}`).remove();
                storyTexts.shift().remove();

                const finalSeparator = document.querySelector(`#separator${chapters + 1}`);
                let start = 1;
                const loadMore = Object.assign(document.createElement('button'), {
                    type: 'button',
                    className: 'btn pull-right',
                    textContent: 'Load more chapters',
                });

                loadMore.onclick = async () => {
                    loadMore.style.display = 'none';
                    for (let chapter = start; chapter <= chapters; chapter++) {
                        try {
                            const response = await fetch(`https://www.fanfiction.net/s/${id}/${chapter}`);
                            if (!response.ok) {
                                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                            }
                            const chapterHTML = await response.text();
                            const chapterElem = new DOMParser().parseFromString(chapterHTML, 'text/html').querySelector('#storytext');
                            if (!chapterElem) {
                                break;
                            }
                            chapterElem.id = `storytext${chapter}`;

                            finalSeparator.before(chapterElem);
                            storyTexts.push(chapterElem);
                        } catch (error) {
                            console.error(`Failed to fetch chapter ${chapter}`, error);
                            start = chapter;
                            loadMore.style.display = '';
                            break;
                        }
                        storyContrast.click();
                        storyContrast.click();
                        story(id, chapters, chapSelects, storyTexts, follow);
                    }
                };

                finalSeparator.querySelector('hr').after(loadMore);
                loadMore.click();
            };
            follow.after(button);
        }
    }

    try {
        adblock();

        shortcuts();

        profileSorts();

        let imagesParent = document.querySelectorAll('.z-list');
        if (!imagesParent.length) {
            imagesParent = document.querySelectorAll('#profile_top');
        }
        imagesParent.forEach((element) => {
            separateFics(element);

            bigCover(element);

            betterDescription(element);

            const chapters = Number(element.querySelector('.chaptersmetatype-val')?.innerText || 1);
            markBookmark(element, dir, chapters);
        });

        const id = document.querySelector('.idmetatype-val')?.innerText || '';
        if (id) {
            const chapters = Number(document.querySelector('.chaptersmetatype-val')?.innerText || 1);
            const chapSelects = document.querySelectorAll('#chap_select');
            let chapter = 1;
            if (chapSelects[0]) {
                chapSelects[0].parentElement.style.marginTop= '20px';
                chapter = Number(chapSelects[0].options[chapSelects[0].selectedIndex].innerText.split('.')[0]);
            }
            const storyTexts = Array.from(document.querySelectorAll('#storytext'));
            storyTexts[0].id = `storytext${chapter}`;
            storyTexts[0].parentElement.id = 'storytext';
            const follow = document.querySelector('.icon-heart');
            
            story(id, chapters, chapSelects, storyTexts, follow);
            entireWork(id, chapters, chapSelects, storyTexts, follow);

            if (info.bookmarks && info.autoSave && (dir[id]?.chapter || 0) < chapter) {
                document.querySelector(`#bookmark${chapter}`).click();
            }
        }
    } catch (e) {
        console.log("content-script.js did not run correctly, ", e);
    }
};

betterFiction();
