import mirror from './mirror.js';
import Reflect from './Reflect.js';
import WeakMap from './WeakMap.js';

// TODO: generically fix incorrect `this` for native prototype methods when wrapping instances in a proxy (see fix-instance-styles.js workaround).
let MirrorProxy = mirror(Proxy);

/**
 * Map of `MirrorProxy` objects to their provided handlers.
 * @type {WeakMap<MirrorProxy, ProxyHandler>}
 */
const handlers = new WeakMap();

/**
 * Map of `MirrorProxy` objects to their wrapped functions.
 * @type {WeakMap<MirrorProxy, Function>}
 */
const proxies = new WeakMap();

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

    // Shim mirror proxy creation to track proxied functions
    MirrorProxy = new Proxy(MirrorProxy, {
        construct: (target, args, newTarget) => {
            if (mergeNestedFunctionProxies(args[0], args[1]))
                return args[0];

            const result = Reflect.construct(target, args, newTarget);

            // Track proxies created for functions
            if (typeof args[0] === 'function') {
                proxies.set(result, args[0]);
                handlers.set(result, args[1]);

                // Also update `prototype.constructor` for completeness
                // Excludes `Promise` for now due to extra logs in Chrome...
                if (args[0].prototype && args[0].prototype.constructor === args[0] && args[0] !== Promise) {
                    args[0].prototype.constructor = result;
                }
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

/**
 * Avoid double-wrapping functions to work around `typeof` bug in Edge.
 * Instead, merge their handlers together into the original `Proxy`.
 * https://github.com/Microsoft/ChakraCore/issues/5282
 */
function mergeNestedFunctionProxies(target, handler) {
    if (typeof target !== 'function')
        return false;

    const currentHandler = handlers.get(target);
    if (!currentHandler)
        return false;

    merge(handler, currentHandler);
    return true;
}

/**
 * Merge a new `ProxyHandler` into an existing one to avoid `Proxy` nesting.
 * TODO: support merging traps beyond `apply` and `construct`.
 * @param {ProxyHandler} newHandler
 * @param {ProxyHandler} currentHandler
 */
function merge(newHandler, currentHandler) {

    if (newHandler.apply) {
        const currentApply = currentHandler.apply;
        if (currentApply) {
            // if an existing trap exists, chain it to the new one using mapping functions
            // the resulting chained wrapper replaces the trap on the existing handler
            currentHandler.apply = function (target, obj, args) {
                return newHandler.apply(function (...a) {
                    return currentApply(target, this, a);
                }, obj, args);
            };
        } else {
            // otherwise just assign the new trap to the existing handler
            currentHandler.apply = newHandler.apply;
        }
    }

    if (newHandler.construct) {
        const currentConstruct = currentHandler.construct;
        if (currentConstruct) {
            // if an existing trap exists, chain it to the new one using mapping functions
            // the resulting chained wrapper replaces the trap on the existing handler
            currentHandler.construct = function (target, args, newTarget) {
                return newHandler.construct(function (...a) {
                    return currentConstruct(target, a, new.target);
                }, args, newTarget);
            };
        } else {
            // otherwise just assign the new trap to the existing handler
            currentHandler.construct = newHandler.construct;
        }
    }
}

fixProxyToString();

export default MirrorProxy;
