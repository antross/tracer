import { ignoreSubCalls as _ignoreSubCalls } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignoreSubCalls = _ignoreSubCalls;

/**
 * Make `Promise.prototype.then` and related APIs ignore sub-call to `Promise`.
 * This happens in all browsers, but just generates unnecessary logs in the trace.
 * Note that this sub-call is still made, just ignored in the trace.
 */
export default function suppress() {

    // TODO: test if these are needed
    // ignoreSubCalls(Promise, 'all');
    // ignoreSubCalls(Promise, 'race');

    ignoreSubCalls(Promise.prototype, 'catch');
    ignoreSubCalls(Promise.prototype, 'finally');
    ignoreSubCalls(Promise.prototype, 'then');

}
