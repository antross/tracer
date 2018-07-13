// Normalize access to extension APIs across browsers.
const browser = this.browser || this.chrome;

const enabledKey = '--tracing--';

if (sessionStorage.getItem(enabledKey)) {

    // This runs at `document_start` before any scripts in the page.
    console.log('tracer: Content script loaded. Injecting tracing script...');

    // Syncronously fetch the source for the tracing script.
    const xhr = new XMLHttpRequest();
    xhr.open('GET', browser.extension.getURL('main.js'), false);
    xhr.send(null);

    // Inject and run the tracing script in the page.
    const s = document.createElement('script');
    s.textContent = xhr.responseText;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
}

browser.runtime.onMessage.addListener(message => {
    if (message.enabled) {
        sessionStorage.setItem(enabledKey, true);
    } else {
        sessionStorage.removeItem(enabledKey);
    }
    location.reload();
});
