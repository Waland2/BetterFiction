function detectBrowser() {
  if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
    return 'firefox';
  } else if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') {
    return 'chrome';
  } else if (typeof safari !== 'undefined' && typeof safari.extension !== 'undefined') {
    return 'safari-legacy';
  }
  return 'unknown';
}

const browserType = detectBrowser();

// Use modern browser.* or chrome.* APIs
const ref =
  typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined'
    ? browser
    : typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined'
    ? chrome
    : null;

let Runtime = null;
let Storage = null;
let Tabs = null;
let Downloads = null;

if (ref) {
  Runtime = ref.runtime || null;
  Storage = ref.storage || null;
  Tabs = ref.tabs || null;
  Downloads = ref.downloads || null;
} else {
  console.warn('Unsupported browser or runtime environment.');
}

// If it's legacy Safari (not a WebExtension), clear everything
if (browserType === 'safari-legacy') {
  Runtime = null;
  Storage = null;
  Tabs = null;
  Downloads = null;
}

export { Runtime, Storage, Tabs, Downloads, browserType as Browser };
