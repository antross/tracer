import normalize from './normalize.js';
import stabilize from './stabilize.js';
import suppress from './suppress.js';
import { ignore as _ignore, save as _save, setTracing as _setTracing } from './trace.js';
import watch from './watch.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;
const save = _save;
const setTracing = _setTracing;

const _createObjectURL = URL.createObjectURL;
const _random = Math.random;
const _setTimeout = setTimeout;

// Save the user agent before shimming to get the "real" browser.
const ua = navigator.userAgent;

const tracerKey = '--tracer--';

if (document.querySelectorAll('script').length > 1) {
    throw new Error('tracer: Injected too late - other scripts have already run!');
}

normalize();
stabilize();
suppress();

console.log(`tracer: Tracing script loaded for ${location.href}. Watching API calls...`);

document.addEventListener(tracerKey, evt => {
    ignore(() => {
        const enabled = JSON.parse(evt.detail).enabled;
        if (!enabled) {
            saveTraceToFile();
            setTracing(false);
        } else {
            setTracing(true);
        }
    });
});

window.addEventListener('load', () => {
    ignore(() => {
        if (document.title === 'Trace Test') {
            _setTimeout(() => {
                ignore(() => {
                    const actions = save();
                    document.querySelector('pre').textContent = actions
                        .map((line, index) => `${(index + '').padStart(3)}: ${line}`)
                        .join('\n');
                });
            }, 1000);
        }
    });
});

function saveTraceToFile() {
    ignore(() => {
        const actions = save();
        if (!actions.length)
            return;

        const file = new Blob([actions.join('\n')], { type: 'text/plain' });
        const url = _createObjectURL(file);
        const a = document.createElement('a');

        const browser = /\bEdge\b/.test(ua) ? 'edge' : 
            /\bFirefox\b/.test(ua) ? 'firefox' :
            /\bChrome\b/.test(ua) ? 'chrome' :
            /\bSafari\b/.test(ua) ? 'safari' : 
            'unknown';

        a.href = url;
        a.download = `${location.hostname}${location.pathname.replace(/\//g, '_')}.${browser}.trace.txt`;
        document.body.appendChild(a);

        _setTimeout(() => {

            ignore(() => a.click());

            _setTimeout(() => {
                ignore(() => {
                    a.remove();
                    URL.revokeObjectURL(url);
                });
            }, 15000);

        }, _random() * 500); // Stagger to avoid stuck downloads in Edge when saving multiple frames.
    });
}

ignore(() => watch(window));
