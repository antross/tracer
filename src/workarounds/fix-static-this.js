import Array from '../mirror/Array.js';
import Object from '../mirror/Object.js';
import Proxy from '../mirror/Proxy.js';
import Reflect from '../mirror/Reflect.js';
import String from '../mirror/String.js';

/**
 * List of built-in functions with static methods that work with any `this` value.
 */
const exclude = new Array(
    'Array',
    'Date',
    'Error',
    'Number',
    'Object',
    'Promise',
    'Proxy',
    'String',
    'Symbol',
    'RegExp'
);

/**
 * Fix `this` for watched native static methods (e.g. `URL.createObjectURL`) in Chrome.
 * Chrome throws an exception if `this` is a proxy in these cases; other browsers do not.
 * Only applies when one of our proxies is the current `this` to avoid altering native behavior.
 *
 * @param {Proxy} proxy The wrapping proxy which will be the value of `this` that needs fixed.
 * @param {Function} native The native object to change `this` to when `this` is `proxy`.
 * @param {string} key The property name (used to exclude items which don't need fixed).
 * @param {string} path The path to the object (used to exclude items which don't need fixed).
 */
export default function fixStaticThis(proxy, native, key, path) {
    if (exclude.indexOf(key) !== -1 || new String(path).indexOf('prototype') !== -1)
        return; // Only fix global functions with static methods.

    const descriptors = Object.getOwnPropertyDescriptors(native);

    for (let prop in descriptors) {
        const descriptor = descriptors[prop];

        if (descriptor.configurable && typeof descriptor.value === 'function') {

            // Re-wire `this` when a static method is invoked to point to the native object.
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    return Reflect.apply(target, obj === proxy ? native : obj, args);
                }
            });

            Object.defineProperty(native, prop, descriptor);
        }
    }
}
