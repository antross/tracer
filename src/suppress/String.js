import { ignoreSubCalls as _ignoreSubCalls } from '../trace.js';
import { SSL_OP_NETSCAPE_REUSE_CIPHER_CHANGE_BUG } from 'constants';

// Workaround webpack adding Object() references which break tracking.
const ignoreSubCalls = _ignoreSubCalls;

/**
 * Make `String.prototype.match` consistent by ignoring sub-calls to `global`
 * and `exec`. Both Chrome and Firefox make these sub-calls. Edge does not.
 * Note that the sub-calls are still made, just ignored in the trace.
 */
export default function suppress() {

    ignoreSubCalls(String.prototype, 'match');
    ignoreSubCalls(String.prototype, 'replace');

}
