import { ignoreSubCalls as _ignoreSubCalls } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignoreSubCalls = _ignoreSubCalls;

/**
 * Make `Number.prototype.toLocaleString` consistent by ignoring sub-calls in
 * Edge to `Map.get()` and `toString()`. Chrome and Firefox do not make these.
 * Note that the sub-calls are still made in Edge, just ignored in the trace.
 */
export default function suppress() {

    ignoreSubCalls(Number.prototype, 'toLocaleString');

}
