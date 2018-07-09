import stabilize from './stabilize.js';
import { ignore as _ignore, save as _save } from './trace.js';
import watch from './watch.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;
const save = _save;

stabilize();

console.log('API Tracer: Tracing script loaded. Watching API calls...');

document.addEventListener('click', () => {
    const log = save();
    ignore(() => {
        if (document.title === 'Trace Test') {
            document.querySelector('pre').textContent = log;
        } else {
            console.log('// API Trace\n' + log);
        }
    });
});

ignore(() => watch(window));
