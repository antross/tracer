import Reflect from '../mirror/Reflect.js';
import Trace from '../trace.js';
import { ignoreSubCalls as _ignoreSubCalls } from '../trace.js';
import { handle } from '../watch.js';

// Workaround webpack adding Object() references which break tracking.
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

    ignoreSubCalls(Array.prototype, 'filter', [0]);
    ignoreSubCalls(Array.prototype, 'map', [0]);

    omitResult('Array.prototype', 'push');
    omitResult('Array.prototype', 'unshift');

}

function omitResult(path, key) {
    const fullPath = path ? `${path}.${key}` : key;

    handle(fullPath, {
        apply: (target, obj, args) => {
            const result = Reflect.apply(target, obj, args);

            // Omit the `result` parameter to set it to `undefined`.
            // This causes the result to be excluded from the trace.
            new Trace().apply(obj, key, args);

            return result;
        }
    });
}