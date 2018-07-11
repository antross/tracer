import normalizeFunction from './normalize/Function.js';
import normalizeNumber from './normalize/Number.js';
import normalizeRegExp from './normalize/RegExp.js';
import normalizeSetInterval from './normalize/setInterval.js';
import normalizeSetTimeout from './normalize/setTimeout.js';
import normalizeString from './normalize/String.js';

export default function normalize() {
    normalizeFunction();
    normalizeNumber();
    normalizeRegExp();
    normalizeSetInterval();
    normalizeSetTimeout();
    normalizeString();
}
