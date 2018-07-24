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
 * Cache a reference to `CSSStyleDeclaration.prototype` for future use.
 */
const styleProto = CSSStyleDeclaration.prototype;

/**
 * Keeps track of proxies used to wrap CSSStyleDeclaration objects.
 * @type {WeakMap<CSSStyleDeclaration, Proxy>}
 */
const mapStyleToProxy = new WeakMap();

/**
 * Keeps track of proxies used to wrap CSSStyleDeclaration objects.
 * @type {WeakMap<Proxy, CSSStyleDeclaration>}
 */
const mapProxyToStyle = new WeakMap();

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
                        // Avoid tracing properties that are actually in the prototype chain.
                        if (p in styleProto) return t[p];

                        // Otherwise trace a getter call for the property.
                        return new Trace().get(style, p, t[p]);
                    },
                    set: (t, p, v) => {
                        // Avoid tracing properties that are actually in the prototype chain.
                        if (p in styleProto) return t[p] = v;

                        // Otherwise trace a setter call for the property. 
                        p in styleProto ? t[p] : new Trace().set(style, p, v, t[p] = v);

                        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/set
                        // > The set method should return a boolean value.
                        // > Return true to indicate that assignment succeeded.
                        // > If the set method returns false, and the
                        // > assignment happened in strict-mode code,
                        // > a TypeError will be thrown.
                        return true;
                    }
                });

                // And remember the mapping for future use.
                mapStyleToProxy.set(style, proxy);
                mapProxyToStyle.set(proxy, style);
            }

            return proxy;
        }
    });
}

// Re-wire `CSSStyleDeclaration.prototype` methods to point to the correct `this` when fix is in effect.
// TODO: make this generic as part of `MirrorProxy`.
if (hasInstanceStyles) {

    const proto = CSSStyleDeclaration.prototype;
    const descriptors = Object.getOwnPropertyDescriptors(proto);

    Object.keys(descriptors).forEach(name => {
        const descriptor = descriptors[name];

        if (typeof descriptor.value === 'function') {

            proto[name] = new Proxy(proto[name], {
                apply: (target, obj, args) => {
                    return Reflect.apply(target, mapProxyToStyle.get(obj), args);
                }
            });
        }
    });
}
