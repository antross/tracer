import mirror from './mirror.js';
import Reflect from './Reflect.js';
import WeakMap from './WeakMap.js';

let MirrorProxy = mirror(Proxy);

/**
 * Alter `Function.prototype.toString` to make `MirrorProxy` appear more native.
 * This leaves the native `Proxy` unaltered to avoid masking cross-browser issues.
 * Currently all browsers "leak" that a native function is proxied in some way:
 * * Expected - `function Date() { [native code] }`
 * * Chrome - `function () { [native code] }`
 * * Edge - throws exception
 * * Firefox - throws exception
 */
function fixProxyToString() {

    // Check if the fix is needed
    try {
        if (`${new Proxy(Date, {})}` === 'function Date() { [native code] }') {
            return; // If not, exit now 
        }
    } catch(e) {
        // An exception also indicates the polyfill is needed
    }

    /**
     * Map of `MirrorProxy` objects to their wrapped functions.
     * @type {WeakMap<MirrorProxy, Function>}
     */
    const proxies = new WeakMap();

    // Shim mirror proxy creation to track proxied functions
    MirrorProxy = new Proxy(MirrorProxy, {
        construct: (target, args, newTarget) => {

            const result = Reflect.construct(target, args, newTarget);

            // Track proxies created for functions
            if (typeof args[0] === 'function') {
                proxies.set(result, args[0]);
            }

            return result;
        }
    });

    // Shim `Function.prototype.toString` to unwrap proxied functions
    Function.prototype.toString = new MirrorProxy(Function.prototype.toString, {
        apply: (target, obj, args) => {

            // Unwrap proxies around functions before converting to string
            while (proxies.has(obj)) {
                obj = proxies.get(obj);
            }

            return Reflect.apply(target, obj, args);
        }
    });

}

fixProxyToString();

export default MirrorProxy;
