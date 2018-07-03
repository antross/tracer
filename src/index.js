import fixProxyToString from './fix-proxy-tostring.js';
import stabilize from './stabilize.js';
import { ignore as i, save as s } from './trace.js';
import watch from './watch.js';

const ignore = i;
const save = s;

fixProxyToString();
stabilize();

setTimeout(() => {
    const log = save();
    document.querySelector('pre').textContent = log;
}, 1500);

ignore(() => watch('', window));
