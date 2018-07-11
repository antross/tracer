import Proxy from '../mirror/Proxy.js';
import { ignore as _ignore } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;

/**
 * Make `String.prototype.match` consistent by ignoring sub-calls to `global`
 * and `exec`. Both Chrome and Firefox make these sub-calls. Edge does not.
 * Note that the sub-calls are still made, just ignored in the trace.
 */
export default function normalize() {

    String.prototype.match = new Proxy(String.prototype.match, {
        apply: (target, obj, args) => {
            let result;
            ignore(() => result = Reflect.apply(target, obj, args));
            return result;
        }
    });

    String.prototype.replace = new Proxy(String.prototype.replace, {
        apply: (target, obj, args) => {
            let result;
            ignore(() => result = Reflect.apply(target, obj, args));
            return result;
        }
    });
}
