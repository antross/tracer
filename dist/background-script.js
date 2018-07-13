// Normalize access to extension APIs across browsers.
const browser = this.browser || this.chrome;

const enabledTabs = new Set();

browser.tabs.onActivated.addListener(info => {
    const tabId = info.tabId;
    const enabled = enabledTabs.has(tabId);
    browser.browserAction.setBadgeText(enabled ? '!' : '');
});

browser.browserAction.onClicked.addListener(tab => {
    const tabId = tab.id;
    const enabled = !enabledTabs.has(tabId);
    if (enabled) enabledTabs.add(tabId);
    else enabledTabs.delete(tabId);
    browser.tabs.sendMessage(tabId, { enabled: enabled });
});
