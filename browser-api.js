// browser-api.js

function detectBrowser() {
  if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
    return 'firefox';
  } else if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') {
    return 'chrome';
  } else if (typeof safari !== 'undefined' && typeof safari.extension !== 'undefined') {
    return 'safari';
  }
  return 'unknown';
}

const browserType = detectBrowser();

let Runtime = null;
let Storage = null;
let Tabs = null;
let Downloads = null;

switch (browserType) {
  case 'firefox':
    Runtime = browser.runtime;
    Storage = browser.storage;
    Tabs = browser.tabs;
    Downloads = browser.downloads;
    break;

  case 'chrome':
    Runtime = chrome.runtime;
    Storage = chrome.storage;
    Tabs = chrome.tabs;
    Downloads = chrome.downloads;
    break;

  case 'safari':
    Runtime = safari.extension; // Safari doesn't expose APIs like tabs or downloads in the same way
    Storage = null;
    Tabs = null;
    Downloads = null;
    break;

  default:
    console.warn("Unsupported browser or runtime environment.");
}

export { Runtime, Storage, Tabs, Downloads, browserType as Browser };
