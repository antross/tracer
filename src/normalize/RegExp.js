import Proxy from '../mirror/Proxy.js';
import { ignore as _ignore } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;

/**
 * Make `RegExp.prototype.test` consistent by ignoring sub-calls to `exec`.
 * Both Chrome and Firefox make these sub-calls. Edge does not.
 */
export default function normalize() {

    RegExp.prototype.test = new Proxy(RegExp.prototype.test, {
        apply: (target, obj, args) => {
            let result;
            ignore(() => result = Reflect.apply(target, obj, args));
            return result;
        }
    });
}