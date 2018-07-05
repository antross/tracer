import fixProxyToString from './workarounds/fix-proxy-tostring';
import stabilize from './stabilize.js';
import { ignore as i, save as s } from './trace.js';
import watch from './watch.js';

const ignore = i;
const save = s;

fixProxyToString();
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

ignore(() => watch('', window));
