setupCheckboxes();
setupSelects();

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATE_TOKEN_RE = /Month|Mon|MM|YYYY|YY|DD|D/g;
const TOKEN_CATEGORY = {
    Month: 'month', Mon: 'month', MM: 'month',
    DD: 'day', D: 'day',
    YYYY: 'year', YY: 'year',
};

const validateDateFormat = (fmt) => {
    if (!fmt) return 'Format cannot be empty.';
    const matches = [...fmt.matchAll(DATE_TOKEN_RE)];
    if (matches.length === 0) {
        return 'No date tokens found. Use Month, Mon, or MM; DD or D; YYYY or YY.';
    }
    const counts = { month: 0, day: 0, year: 0 };
    for (const m of matches) counts[TOKEN_CATEGORY[m[0]]]++;
    if (counts.month === 0) return 'Format must include a month token: Month, Mon, or MM.';
    if (counts.month > 1) return 'Use exactly one month token (Month, Mon, or MM).';
    if (counts.day === 0) return 'Format must include a day token: DD or D.';
    if (counts.day > 1) return 'Use exactly one day token (DD or D).';
    if (counts.year === 0) return 'Format must include a year token: YYYY or YY.';
    if (counts.year > 1) return 'Use exactly one year token (YYYY or YY).';
    if (matches[0].index !== 0) {
        return 'Format cannot start with text — it must begin with a token.';
    }
    const last = matches[matches.length - 1];
    if (last.index + last[0].length !== fmt.length) {
        return 'Format cannot end with text — it must end with a token.';
    }
    for (let i = 1; i < matches.length; i++) {
        const prevEnd = matches[i - 1].index + matches[i - 1][0].length;
        const sep = fmt.slice(prevEnd, matches[i].index);
        if (sep && /[a-zA-Z0-9]/.test(sep)) {
            return 'Separators must be empty or contain no letters or digits.';
        }
    }
    return null;
};

const formatDate = (date, fmt) => {
    const day = date.getDate();
    const monthIdx = date.getMonth();
    const yearFull = date.getFullYear();
    const tokens = {
        Month: MONTH_NAMES_FULL[monthIdx],
        Mon: MONTH_NAMES[monthIdx],
        MM: String(monthIdx + 1).padStart(2, '0'),
        YYYY: String(yearFull),
        YY: String(yearFull).slice(-2),
        DD: String(day).padStart(2, '0'),
        D: String(day),
    };
    return fmt.replace(DATE_TOKEN_RE, m => tokens[m]);
};

const dateInput = document.getElementById('dateFormat');
const previewEl = document.getElementById('dateFormatPreview');
const errorEl = document.getElementById('dateFormatError');

const render = () => {
    const fmt = dateInput.value;
    const err = validateDateFormat(fmt);
    if (err) {
        errorEl.textContent = err;
        errorEl.hidden = false;
        previewEl.textContent = '';
    } else {
        errorEl.hidden = true;
        previewEl.textContent = formatDate(new Date(), fmt);
    }
    return err;
};

getSettings().then((settings) => {
    if (settings.dateFormat !== undefined) dateInput.value = settings.dateFormat;
    render();

    dateInput.addEventListener('input', () => {
        const err = render();
        if (err) return;
        settings.dateFormat = dateInput.value;
        chrome.storage.sync.set({ settings })
            .catch((error) => {
                console.error('Failed to save dateFormat:', error);
            });
    });
});
