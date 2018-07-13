import { ignoreSubCalls as _ignoreSubCalls } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignoreSubCalls = _ignoreSubCalls;

/**
 * Make `RegExp.prototype.test` consistent by ignoring sub-calls to `exec`.
 * Both Chrome and Firefox make these sub-calls. Edge does not.
 * Note that the sub-calls are still made, just ignored in the trace.
 */
export default function suppress() {

    ignoreSubCalls(RegExp.prototype, 'test');

}
