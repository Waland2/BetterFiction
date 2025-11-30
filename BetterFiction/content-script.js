const METATYPES = { // [sortOrder, fontWeight, color]
    fandom: [0, '600', null],
    rated: [1, null, 'rgb(8, 131, 131)'],
    language: [2, null, {
        English: 'rgb(151, 0, 0)',
        Spanish: 'rgb(171, 143, 0)',
        default: 'rgb(0, 0, 255)'
    }],
    genre: [3, null, 'rgb(144, 48, 0)'],
    chapters: [4, null, 'rgb(0, 0, 0)'],
    words: [5, null, 'rgb(0, 0, 0)'],
    staff: [3, null, 'rgb(0, 0, 0)'],
    archive: [4, null, 'rgb(0, 0, 0)'],
    followers: [5, null, 'rgb(0, 0, 0)'],
    topics: [4, null, 'rgb(0, 0, 0)'],
    posts: [5, null, 'rgb(0, 0, 0)'],
    reviews: [6, null, 'rgb(0, 0, 0)'],
    favs: [7, null, 'rgb(0, 0, 0)'],
    follows: [8, null, 'rgb(0, 0, 0)'],
    updated: [9, null, null],
    published: [10, null, null],
    since: [9, null, null],
    founder: [10, null, null],
    admin: [10, null, null],
    characters: [12, null, null],
    status: [13, '600', 'rgb(0, 99, 31)'],
    id: [14, null, null],
};

const sendMessage = (payload) => {
    return chrome.runtime.sendMessage(payload).then(response => response.result).catch(() => ({}));
};

const adblock = (info) => {
    if (info.adblock) {
        document.querySelectorAll('.adsbygoogle').forEach((element) => element.remove());
    }
};

const copy = (info) => {
    if (info.copy) {
        document.querySelectorAll('p').forEach((element) => {
            element.style.userSelect = 'text';
            element.style.webkitUserSelect = 'text'; // for Safari
        });
    }
};

const icon = (d, fillColor, strokeColor) => 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/></svg>`);
const bookmarkIcon = (color) => icon('m6 4v16l6-2 6 2V4z', color, '#333298');

const shortcuts = (info) => {
    const topMenu = document.querySelector('div')?.querySelector('div');
    if (!topMenu) {
        return;
    }

    const makeIcon = (name, icon, link, addStyle='') => {
        topMenu.appendChild(Object.assign(document.createElement('span'), {
            innerHTML:
                `<a href='${link}' target="_blank" style='position: relative; cursor: default; display: inline-block; margin-left: 10px;'>
                    <img src="${icon}" style="vertical-align: middle; ${addStyle}" width="24" height="24" title="${name}" alt="${name}">
                </a>`
        }));
    };

    if (info.bookmarks) {
        makeIcon('Bookmarks', bookmarkIcon('#fff'), chrome.runtime.getURL('tabs/bookmarks/bookmarks.html'), 'filter: drop-shadow(2px -1px 0px rgba(255,255,255,1));')
    }

    if (info.shortcuts) {
        makeIcon('Favorites', icon('m12 21-7-7C-6 4 10 0 12 6c2-6 18-1 7 8z', '#fff', '#333298'), 'https://www.fanfiction.net/favorites/story.php');
        makeIcon('Alerts', icon('M7 4h2l3 1 10-1 1 1v14H1V5zM3 6v11h8V7C9 6 5 6 3 7m10-1v11h8V6zm7-6q1 8-1 11s-3 4-5 5q-1-9 1-11', '#fff', 'none'), 'https://www.fanfiction.net/alert/story.php');
    }
};


const separateFics = (info, element) => {
    if (info.separateFics) {
        element.style.marginBottom = '10px';
        element.style.borderBottom = '1px solid #969696';
        element.style.borderTop = '1px solid #969696';
        element.style.borderRight = '1px solid #969696';
    }
};

const bigCover = (info, element) => {
    if (info.bigCovers) {
        element.style.height = '115px';
        const img = element.querySelector('.cimage');
        if (img) {
            img.style.width = '75px';
            img.style.height = '100px';
        }
    }
};

const profileSorts = (info) => {
    if (info.profileSorts) {
        [['st', 'mystories', 0], ['fs', 'favstories', 1]].forEach(([place, storyType, sortType]) => {
            const placeElem = document.querySelector(`#${place}`);
            const sort = document.querySelector(`[onclick="stories_init(${place}_array,'.${storyType}');${place}_array.sort(sortByReviews); storylist_draw('${place}_inside', ${place}_array, 1, 1, ${sortType});"]`);
            if (!sort || !placeElem) {
                return;
            }
            const storyContainer = document.querySelector(`#${place}_inside`);
            ['Follows', 'Favs'].forEach((meta) => {
                sort.before(Object.assign(document.createElement('span'), {
                    innerHTML: meta,
                    className: 'gray',
                    onclick: () => {
                        const sorted = Array.from(placeElem.querySelectorAll(`.${storyType}`)).sort((a, b) => {
                            const get = (s) => Number(s.querySelector(`.${meta}value`)?.innerText.replaceAll(',', '')) || 0;
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

const groupDescription = (info, description) => {
    if (info.groupDescriptions) {
        description.style.display = 'flow-root';
        description.style.paddingLeft = '0';

        description.innerHTML = Array.from(description.children).sort((a, b) => {
            const getIndex = (span) => METATYPES[span.className.substring(0, span.className.indexOf('meta'))]?.[0];
            return getIndex(a) - getIndex(b);
        }).map((span) => span.outerHTML).join(" - ");

        [['fandom'], ['genre', 'language'], ['words', 'posts', 'followers'], ['follows', 'favs', 'reviews'], ['published'], ['status', 'characters']].forEach((item) => {
            const getSpan = (meta) => description.querySelector(`:scope > .${meta}meta`);
            const meta = item.find(getSpan);
            getSpan(meta)?.after(document.createElement('br'));
        });

        description.innerHTML = description.innerHTML.replace(/<br> - /g, '<br>');

        const idSpan = description.querySelector('.idmeta');
        if (idSpan) idSpan.style.display = 'none';

        const statusSpan = description.querySelector('.statusmeta');
        if (statusSpan) statusSpan.innerHTML = statusSpan.innerHTML.replace('Status: ', '');

        const ratedSpan = description.querySelector('.ratedmeta');
        if (ratedSpan) {
            ratedSpan.innerHTML = ratedSpan.innerHTML.replace('Rated: ', '');
            const ratedSpanValue = description.querySelector('.ratedvalue');
            ratedSpanValue.innerHTML = 'Rated: ' + ratedSpanValue.innerHTML.replace('Fiction ', '');
        }
    }
};

const storyContrast = document.querySelector('[title=\'Story Contrast\']');
const styleDescription = (info, description) => {
    if (info.styleDescriptions) {
        const colorDescription = () => Object.entries(METATYPES).forEach(([meta, [sortOrder, fontWeight, color]]) => {
            const metaSpan = description.querySelector(`.${meta}meta`);
            const valueSpan = metaSpan?.querySelector(`.${meta}value`) || metaSpan;
            const spans = valueSpan ? [valueSpan].concat(Array.from(valueSpan.querySelectorAll('*'))) : [];
            spans.forEach((span) => {
                if (fontWeight) span.style.fontWeight = fontWeight;
                let trueColor = color?.[span.innerText] || color;
                if (trueColor) {
                    if (storyContrast?.parentElement?.style.backgroundColor === 'rgb(51, 51, 51)') {
                        const rgb = trueColor.match(/\d+/g);
                        if (rgb) {
                            const [r, g, b] = trueColor.match(/\d+/g).map(Number);
                            trueColor = `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
                        }
                    }
                    span.style.color = trueColor;
                }
            });
        });

        colorDescription();

        if (storyContrast) {
            storyContrast.onclick = colorDescription;
        }
    }
};

const betterDescription = (info, element) => {
    const description = element.querySelector('.xgray');
    if (!description) {
        return;
    }

    const placeholder = '{[@p]}';
    const splitByRated = description.innerHTML.split(' - Rated: ');

    if (splitByRated.length > 1) { // TBU
        if (splitByRated[0].startsWith('Crossover - ')) {
            splitByRated[0] = splitByRated[0].substring(11);
        }
        splitByRated[0] = 'Fandom: ' + splitByRated[0].replaceAll(' - ', placeholder);
        description.innerHTML = splitByRated.join(' - Rated: ');
    }

    description.innerHTML = (description.innerHTML).split(' - ').map((item) => `<span>${item}</span>`).join(' - ').replaceAll(placeholder, ' - ');

    const metaSpans = description.querySelectorAll('span');
    metaSpans.forEach((span) => {
        const meta = Object.keys(METATYPES).find((meta) => (span.innerText === 'Complete' && meta === 'status') || span.innerText.toLowerCase().startsWith(meta + ': '));
        if (meta) span.classList.add(meta + 'meta');
    });

    let notDone = ['language', 'genre', 'characters'];
    const allGenres = 'AdventureAngstCrimeDramaFamilyFantasyFriendshipGeneralHorrorHumorHurt/ComfortMysteryParodyPoetryRomanceSci-FiSpiritualSupernaturalSuspenseTragedyWestern';
    description.querySelectorAll(':not([class])').forEach((span) => {
        if (notDone[0] === 'genre' && !span.innerText.split('/').every((genre) => allGenres.includes(genre))) notDone.shift();
        span.className = (notDone.shift() || 'characters') + 'meta';
    });

    Object.keys(METATYPES).forEach((meta) => {
        const span = description.querySelector(`.${meta}meta`);
        const start = meta + ': ';
        if (span?.innerHTML.toLowerCase().startsWith(start)) {
            span.innerHTML = `${span.innerHTML.substring(0, start.length)}<span class='${meta}value'>${span.innerHTML.substring(start.length)}</span>`;
        }
    });

    element.style.height = 'auto';
    element.style.minHeight = '120px';
    groupDescription(info, description);
    styleDescription(info, description);
};

const colorBookmark = (info, dir, id, chapters, chapter) => {
    let color = '#096dd9';
    if (info.organizer) {
        if (dir[id]?.status === 'Completed' || (dir[id]?.status === 'Automatic' && chapter === chapters)) {
            color = '#237804';
        } else if (dir[id]?.status === 'Planned' || (dir[id]?.status === 'Automatic' && chapter === 1)) {
            color = '#d48806';
        } else if (dir[id]?.status === 'Dropped') {
            color = '#a8071a';
        }
    }
    return bookmarkIcon(color);
};

const markBookmark = (info, element, dir, chapters) => {
    if (info.markBookmarks) {
        const id = element.querySelector('a')?.href.match(/fanfiction\.net\/s\/(\d+)/)?.[1];
        if (id && dir[id]?.chapter) {
            if (dir[id].chapters !== chapters) {
                const bookmarkInfo = dir[id];
                bookmarkInfo.chapters = chapters;
                bookmarkInfo.message = 'set-bookmark';
                sendMessage(bookmarkInfo);
            }
            element.style.backgroundColor = '#e1edff';
            const src = colorBookmark(info, dir, id, chapters, dir[id].chapter);
            element.querySelector('div')?.before(Object.assign(document.createElement('img'), {
                src,
                width: 24,
                height: 24
            }));
        }
    }
};

const wordCounter = (info, chapSelects, storyTexts) => {
    if (info.wordCounter) {
        storyTexts.forEach((element) => {
            const chapter = Number(element.id.replace('storytext', ''));
            if (/ - Words: \d+$/.test(chapSelects[0]?.options[chapter - 1].textContent)) {
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

const bookmarks = (info, dir, id, chapters, chapter, follow) => {
    if (info.bookmarks) {
        const iconUnmarked = `<img src="${bookmarkIcon('none')}" width="24" height="24">`;
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
                style: `margin-right: 5px; display: ${dir[id]?.chapter ? '' : 'none'}`,
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
            innerHTML: dir[id]?.chapter === chapter ? `<img src="${colorBookmark(info, dir, id, chapters, chapter)}" width="24" height="24">` : iconUnmarked,
            id: `bookmark${chapter}`,
            style: 'height: 30px;'
        });
        button.onclick = () => {
            if (dir[id]?.chapter === chapter) {
                button.innerHTML = iconUnmarked;
                go.style.display = 'none';
                document.querySelector('#organizer-status-selecter').style.display = 'none';

                delete dir[id];
                sendMessage({
                    message: 'del-bookmark',
                    id
                });
            } else {
                const lastBookmark = document.querySelector(`#bookmark${dir[id]?.chapter || 0}`)
                let status = dir[id]?.status || 'Automatic';
                if (lastBookmark) {
                    lastBookmark.click();
                }
                const bookmarkInfo = {
                    chapter,
                    chapters,
                    id,
                    fandom,
                    author,
                    storyName,
                    addTime: new Date().toISOString(),
                    status
                };
                dir[id] = bookmarkInfo;
                button.innerHTML = `<img src="${colorBookmark(info, dir, id, chapters, chapter)}" width="24" height="24">`;
                go.style.display = '';
                document.querySelector('#organizer-status-selecter').style.display = '';
                bookmarkInfo.message = 'set-bookmark';
                sendMessage(bookmarkInfo);
            }
        };
        return button;
    }
    return '';
};

const organizer = (info, dir, id) => {
    if (info.organizer && id) {
        if (!dir[id]) dir[id] = { id };
        const STATUSES = ['Automatic', 'Planned', 'Reading', 'Completed', 'Dropped'];
        const current = STATUSES.includes(dir[id].status) ? dir[id].status : 'Automatic';

        const wrap = document.createElement('span');
        wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-inline:8px;';
        if (!dir[id]?.status) wrap.style.display = 'none';
        wrap.id = 'organizer-status-selecter';
        wrap.classList = 'pull-right';

        wrap.innerHTML = `
            <span class="xcontrast_txt" style="font-size:12px;color:#4b5563;">Status:</span>
            <select aria-label="Change reading status"
                style="height:30px;padding:2px 6px;font-size:12px;line-height:20px;
                       border:1px solid #d1d5db;border-radius:6px;background:#fff;">
                ${STATUSES.map(
            (s) => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`
        ).join('')}
            </select>
        `;

        const select = wrap.querySelector('select');
        select.addEventListener('change', () => {
            const next = select.value;
            dir[id].status = next;
            sendMessage({ message: 'set-status', id, status: next });
        });

        return wrap;
    }
    return '';
};


const story = (info, dir, id, chapters, chapSelects, storyTexts, follow, isEntireWork = false) => {
    if (!id) {
        return;
    }

    copy(info);
    wordCounter(info, chapSelects, storyTexts);

    const separatorId = (chapter) => `separator${chapter}`;
    const separator = (chapter) => {
        const chapterTitle = chapSelects[0]?.options[chapter - 1]?.innerText || '';
        const span = Object.assign(document.createElement('span'), {
            className: storyTexts[storyTexts.length - 1].className,
            id: separatorId(chapter),
            innerHTML: (isEntireWork ? '<br>' + `<h4 style='user-select: text'>${chapterTitle}</h4>` + '<hr size="1" noshade style="background: #e2e2e2; height: 1px;">' : '<br>' + `<h4 style='user-select: text; height: 15px'> </h4>` + '<hr size="1" noshade style="background: #e2e2e2; height: 1px;">')
        });

        if (chapter <= chapters) span.querySelector('h4').after(bookmarks(info, dir, id, chapters, chapter, follow));

        if (!document.querySelector("#organizer-status-selecter")) chapSelects[0].after(organizer(info, dir, id));
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

const entireWork = (info, dir, id, chapters, chapSelects, storyTexts, follow) => {
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
                    story(info, dir, id, chapters, chapSelects, storyTexts, follow, true);
                    storyContrast.click();
                    storyContrast.click();
                }
            };
            finalSeparator.querySelector('hr').after(loadMore);
            loadMore.click();
        };
        follow.after(button);

    }
};

const main = async () => {
    const info = await sendMessage({
        message: 'get-info'
    });

    const dir = await sendMessage({
        message: 'get-dir'
    });

    try {
        adblock(info);
        shortcuts(info);
        profileSorts(info);

        let id;
        let imagesParent = document.querySelectorAll('.z-list');
        if (!imagesParent.length) imagesParent = document.querySelectorAll('#profile_top');
        imagesParent.forEach((element) => {
            bigCover(info, element);
            betterDescription(info, element);
            id = document.querySelector('.idvalue')?.innerText.trim() || '';
            if (!id) separateFics(info, element);
            const chapters = Number(element.querySelector('.chaptersvalue')?.innerText || 1);
            markBookmark(info, element, dir, chapters);
        });

        if (id) {
            const chapters = Number(document.querySelector('.chaptersvalue')?.innerText || 1);
            const chapSelects = document.querySelectorAll('#chap_select');
            let chapter = 1;
            if (chapSelects[0]) {
                chapSelects[0].parentElement.style.marginTop = '20px';
                chapter = Number(chapSelects[0].options[chapSelects[0].selectedIndex].innerText.split('.')[0]);
            }
            const storyTexts = Array.from(document.querySelectorAll('#storytext'));
            storyTexts[0].id = `storytext${chapter}`;
            storyTexts[0].parentElement.id = 'storytext';
            const follow = document.querySelector('.icon-heart');

            if (dir[id] && dir[id].chapters !== chapters) {
                const bookmarkInfo = dir[id];
                bookmarkInfo.chapters = chapters;
                bookmarkInfo.message = 'set-bookmark';
                sendMessage(bookmarkInfo);
            }

            story(info, dir, id, chapters, chapSelects, storyTexts, follow);
            entireWork(info, dir, id, chapters, chapSelects, storyTexts, follow);

            if (info.bookmarks && info.autoSave && (dir[id]?.chapter || 0) < chapter) {
                document.querySelector(`#bookmark${chapter}`).click();
            }

            storyContrast.click();
            storyContrast.click();
        }
    } catch (e) {
        console.log("content-script.js did not run correctly, ", e);
    }
};

main();
