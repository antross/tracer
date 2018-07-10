import stabilize from './stabilize.js';
import { ignore as _ignore, save as _save } from './trace.js';
import watch from './watch.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;
const save = _save;

const _createObjectURL = URL.createObjectURL;
const _setTimeout = setTimeout;

stabilize();

console.log('API Tracer: Tracing script loaded. Watching API calls...');

window.addEventListener('load', () => {
    ignore(() => {
        _setTimeout(() => {
            const log = save();
            ignore(() => {
                if (document.title === 'Trace Test') {
                    document.querySelector('pre').textContent = log;
                } else {
                    const file = new Blob([log], { type: 'text/plain' });
                    const url = _createObjectURL(file);
                    const a = document.createElement('a');

                    const ua = navigator.userAgent;
                    const browser = /\bEdge\b/.test(ua) ? 'edge' : 
                        /\bFirefox\b/.test(ua) ? 'firefox' :
                        /\bChrome\b/.test(ua) ? 'chrome' :
                        /\bSafari\b/.test(ua) ? 'safari' : 
                        'unknown';

                    a.href = url;
                    a.download = `${browser}-trace.txt`;
                    document.body.appendChild(a);
                    a.click();

                    _setTimeout(() => {
                        ignore(() => {
                            a.remove();
                            URL.revokeObjectURL(url);
                        });
                    }, 10);
                }
            });
        }, 1000);
    });
});

ignore(() => watch(window));
