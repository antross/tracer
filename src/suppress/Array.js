import { ignoreAfter as _ignoreAfter, ignoreSubCalls as _ignoreSubCalls } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignoreAfter = _ignoreAfter;
const ignoreSubCalls = _ignoreSubCalls;

/**
 * Make `Array.prototype.concat` and other array methods returning new arrays
 * consistent by ignoring sub-calls to `new Array()`. Both Chrome and Firefox
 * make these sub-calls. Edge does not except for `Array.from()`.
 * Note the sub-calls are still made, just ignored in the trace.
 */
export default function suppress() {

    ignoreSubCalls(Array, 'from');

    ignoreSubCalls(Array.prototype, 'concat');
    ignoreSubCalls(Array.prototype, 'slice');
    ignoreSubCalls(Array.prototype, 'splice');

    ignoreAfter(Array.prototype, 'filter');
    ignoreAfter(Array.prototype, 'map');

}
