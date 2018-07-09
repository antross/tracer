import Proxy from '../mirror/Proxy.js';
import Reflect from '../mirror/Reflect.js';
import Trace from '../trace.js';
import WeakMap from '../mirror/WeakMap.js';

/**
 * Is true if CSS properties are missing from CSSStyleDeclaration.prototype (Chrome bug).
 * Also checks CSS2Properties because Firefox defines these here instead of CSSStyleDeclaration.
 */
const hasInstanceStyles = !('color' in CSSStyleDeclaration.prototype || (window.CSS2Properties && 'color' in CSS2Properties.prototype));

/**
 * Keeps track of proxies used to wrap CSSStyleDeclaration objects.
 * @type {WeakMap<CSSStyleDeclaration, Proxy>}
 */
const mapStyleToProxy = new WeakMap();

/**
 * Wrap the provided getter or value function to track instance styles.
 * Works around Chrome omitting CSS properties from the prototype chain.
 * @param {Function} fn The function returning a CSSStyleDeclaration to wrap.
 * @returns {Function} A wrapper to replace the passed function.
 */
export default function fixInstanceStyles(fn) {
    if (!hasInstanceStyles) {
        // Return the original function if no fix is needed.
        return fn;
    }

    return new Proxy(fn, {
        apply: (target, obj, args) => {
            let proxy; 

            // When retrieving a CSSStyleDeclaration instance...
            const style = Reflect.apply(target, obj, args);

            // Return an existing proxy if we've already wrapped it.
            proxy = mapStyleToProxy.get(style);

            if (!proxy) {

                // Otherwise create a new proxy to track gets/sets.
                proxy = new Proxy(style, {
                    get: (t, p) => {
                        return new Trace().get(style, p, t[p]);
                    },
                    set: (t, p, v) => {
                        return new Trace().set(style, p, v, t[p] = v);
                    }
                });

                // And remember the mapping for future use.
                mapStyleToProxy.set(style, proxy);
            }

            return proxy;
        }
    });
}
