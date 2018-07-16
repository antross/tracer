// Normalize access to extension APIs across browsers.
const browser = this.browser || this.chrome;

const enabledTabs = new Set();

browser.tabs.onActivated.addListener(info => {
    const tabId = info.tabId;
    const enabled = enabledTabs.has(tabId);
    updateIcon(enabled);
});

browser.browserAction.onClicked.addListener(tab => {
    const tabId = tab.id;
    const enabled = !enabledTabs.has(tabId);
    if (enabled) {
        enabledTabs.add(tabId);
    } else {
        enabledTabs.delete(tabId);
    }
    updateIcon(enabled);
    browser.tabs.sendMessage(tabId, { enabled: enabled });
});

function updateIcon(enabled) {
    browser.browserAction.setIcon({
        path: {
            "40": `image/${enabled ? 'tracing' : 'default'}.png`
        }
    });
}
