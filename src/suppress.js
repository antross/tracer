import suppressArray from './suppress/Array.js';
import suppressNumber from './suppress/Number.js';
import suppressPromise from './suppress/Promise.js';
import suppressRegExp from './suppress/RegExp.js';
import suppressSetInterval from './suppress/setInterval.js';
import suppressSetTimeout from './suppress/setTimeout.js';
import suppressString from './suppress/String.js';

/**
 * Suppress noise in the logs without altering actual behavior.
 * Often these involve ignoring sub-calls from native methods which call other
 * native methods as part of their implementation. Sometimes not all browsers
 * make the same sub-calls, but even when they do such calls are often are not
 * valuable in the trace. Sub-calls are not ignored for all native APIs by
 * default to avoid accidentally ignoring code in re-entrant callbacks such
 * as in `Array.prototype.forEach()`.
 */
export default function suppress() {
    suppressArray();
    suppressNumber();
    suppressPromise();
    suppressRegExp();
    suppressSetInterval();
    suppressSetTimeout();
    suppressString();
}
