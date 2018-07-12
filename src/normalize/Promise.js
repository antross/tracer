import Array from '../mirror/Array.js';
import Proxy from '../mirror/Proxy.js';
import Reflect from '../mirror/Reflect.js';
import { ignore as _ignore } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;

/**
 * Make `Promise.prototype.then` and related APIs ignore sub-call to `Promise`.
 * This happens in all browsers, but just generates unnecessary logs in the trace.
 * Note that this sub-call is still made, just ignored in the trace.
 */
export default function normalize() {
    // new Array('all', 'race')
    //     .forEach(name => ignoreSubCalls(Promise, name));

    new Array('catch', 'finally', 'then')
        .forEach(name => ignoreSubCalls(Promise.prototype, name));
}

function ignoreSubCalls(obj, name) {
    if (!obj[name])
        return;

    obj[name] = new Proxy(obj[name], {
        apply: (target, obj, args) => {
            let result;
            ignore(() => result = Reflect.apply(target, obj, args));
            return result;
        }
    });
}
