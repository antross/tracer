import Proxy from '../mirror/Proxy.js';
import { ignore as _ignore } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;

/**
 * Make `Number.prototype.toLocaleString` consistent by ignoring sub-calls in
 * Edge to `Map.get()` and `toString()`. Chrome and Firefox do not make these.
 * Note that the sub-calls are still made in Edge, just ignored in the trace.
 */
export default function normalize() {

    Number.prototype.toLocaleString = new Proxy(Number.prototype.toLocaleString, {
        apply: (target, obj, args) => {
            let result;
            ignore(() => result = Reflect.apply(target, obj, args));
            return result;
        }
    });
}
