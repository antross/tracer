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
const _setTimeout = setTimeout;

// Save the user agent before shimming to get the "real" browser.
const ua = navigator.userAgent;

const tracerKey = '--tracer--';

normalize();
stabilize();
suppress();

console.log('tracer: Tracing script loaded. Watching API calls...');

document.addEventListener(tracerKey, evt => {
    ignore(() => {
        const enabled = evt.detail.enabled;
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
        a.download = `${location.hostname}_${browser}.trace.txt`;
        document.body.appendChild(a);
        a.click();

        _setTimeout(() => {
            ignore(() => {
                a.remove();
                URL.revokeObjectURL(url);
            });
        }, 10);
    });
}

ignore(() => watch(window));
