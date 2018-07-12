import normalizeFunction from './normalize/Function.js';
import normalizeNavigator from './normalize/Navigator.js';
import normalizeNumber from './normalize/Number.js';
import normalizeRegExp from './normalize/RegExp.js';
import normalizeSetInterval from './normalize/setInterval.js';
import normalizeSetTimeout from './normalize/setTimeout.js';
import normalizeString from './normalize/String.js';

/**
 * Normalize cross-browser differences that commonly produce noise in the logs.
 * This can occasionally cause an issue to not repro, which means it is known.
 * If so, disable normalizers until the issue repros again to identify the bug.
 * TODO: allow disabling each and every normalizer.
 */
export default function normalize() {
    normalizeFunction();
    normalizeNavigator();
    normalizeNumber();
    normalizeRegExp();
    normalizeSetInterval();
    normalizeSetTimeout();
    normalizeString();
}
