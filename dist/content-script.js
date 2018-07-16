// Normalize access to extension APIs across browsers.
const browser = this.browser || this.chrome;

const tracerKey = '--tracer--';

let injected = false;

// TODO: control injection from background-script.js
if (sessionStorage.getItem(tracerKey)) {

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

    injected = true;
}

browser.runtime.onMessage.addListener(message => {
    if (message.enabled) {
        sessionStorage.setItem(tracerKey, true);
        if (!injected) {
            location.reload();
        }
    } else {
        sessionStorage.removeItem(tracerKey);
    }
    sendMessage(JSON.stringify({ enabled: message.enabled }));
});

function sendMessage(data) {
    const evt = document.createEvent('CustomEvent');
    evt.initCustomEvent("--tracer--", false, false, data);
    document.dispatchEvent(evt);
}
