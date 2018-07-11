import normalizeFunction from './normalize/Function.js';
import normalizeRegExp from './normalize/RegExp.js';
import normalizeSetInterval from './normalize/setInterval.js';
import normalizeSetTimeout from './normalize/setTimeout.js';
import normalizeString from './normalize/String.js';

export default function normalize() {
    normalizeFunction();
    normalizeRegExp();
    normalizeSetInterval();
    normalizeSetTimeout();
    normalizeString();
}
