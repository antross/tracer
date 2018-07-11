import _fixInstanceStyles from './workarounds/fix-instance-styles.js';
import Trace from './trace.js';
import { ignore as _ignore } from './trace.js';

// Import mirrored types to avoid self-tracing.
import Array from './mirror/Array.js';
import Object from './mirror/Object.js';
import Proxy from './mirror/Proxy.js';
import Reflect from './mirror/Reflect.js';
import String from './mirror/String.js';
import WeakMap from './mirror/WeakMap.js';
import WeakSet from './mirror/WeakSet.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;
const fixInstanceStyles = _fixInstanceStyles;

/**
 * Collection to remember tracked objects ensuring they are only wrapped once.
 */
const tracked = new WeakSet();

/**
 * Tracks event listeners to establish trace context.
 * @type {WeakMap<Function, Proxy>}
 */
const mapFunctionToProxy = new WeakMap();

/**
 * Reverse mapping of proxies wrapping event listeners back to the original function.
 * Used to return the original function when accessing `obj.on*` properties.
 * @type {WeakMap<Proxy, Function>}
 */
const mapProxyToFunction = new WeakMap();

/**
 * List of properties to ignore while tracing, typically due to side-effects.
 * This list should be as small as possible to reduce blind spots during tracing.
 * @type {string[]}
 */
const exclude = new Array(
    'constructor',  // Was somehow wrapped for `Promise`, creating odd logs around `then` calls.
    'frames',       // Already not tracked in Chrome due to being a 'value' property.
    'navigation',   // Firefox throws errors using `performance.navigation` as a `WeakMap` key.
    'self',         // Already not tracked in Chrome due to being a 'value' property.
    'timing'        // Firefox throws errors using `performance.timing` as a `WeakMap` key.
);

/**
 * List of built-in functions with static methods that work with any `this` value.
 * Used to exclude these objects from `fixStaticThis()`.
 */
const jsTypes = new Array(
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
 */
function fixStaticThis(proxy, native, key, path) {
    if (jsTypes.indexOf(key) !== -1 || new String(path).indexOf('prototype') !== -1)
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

/**
 * Track and log actions against the provided object.
 * @param {any} obj The object to track.
 * @param {string} [path=''] The path to display in logs.
 */
export default function watch(obj, path) {
    if (!obj || tracked.has(obj))
        return; // Ignore empty values and objects which have already been tracked.

    path = path || '';

    // Mark this object as tracked.
    tracked.add(obj);

    const prefix = path ? `${path}.` : '';
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    const keys = new Array()
        .concat(Object.keys(descriptors))
        .filter(k => k[0] !== '$' && exclude.indexOf(k) === -1);

    keys.forEach(key => {
        const descriptor = descriptors[key];

        //  Wrap all configurable getters, setters, and function values
        if (descriptor.configurable) {
            watchGetter(descriptor, key);
            watchSetter(descriptor, key);
            watchFunction(descriptor, key, path);

            Object.defineProperty(obj, key, descriptor);
        }

        // Recursively wrap functions and objects
        if (typeof descriptor.value === "function" || typeof descriptor.value === "object") {
            watch(descriptor.value, prefix + key);
        }
    });
}

/**
 * Wrap and log `get` calls to the provided descriptor if it has a getter.
 * @param {any} descriptor The descriptor whose getter to wrap.
 * @param {string} key The name of the property.
 */
function watchGetter(descriptor, key) {
    if (descriptor.get) {
        descriptor.get = new Proxy(descriptor.get, {
            apply: (target, obj, args) => {
                return new Trace().get(obj, key, Reflect.apply(target, obj, args));
            }
        });

        // Watch contexts for event listeners.
        if (new String(key).startsWith('on')) {
            descriptor.get = new Proxy(descriptor.get, {
                apply: (target, obj, args) => {
                    args[0] = getFunctionFor(args[0]);
                    return Reflect.apply(target, obj, args);
                }
            });
        }

        // Work around missing properties on CSSStyleDeclaration in Chrome
        if (key === 'style') {
            descriptor.get = fixInstanceStyles(descriptor.get);
        }
    }
}

/**
 * Wrap and log `set` calls to the provided descriptor if it has a setter.
 * @param {any} descriptor The descriptor whose setter to wrap.
 * @param {string} key The name of the property.
 */
function watchSetter(descriptor, key) {
    if (descriptor.set) {
        descriptor.set = new Proxy(descriptor.set, {
            apply: (target, obj, args) => {
                return new Trace().set(obj, key, args[0], Reflect.apply(target, obj, args));
            }
        });

        // Watch contexts for event listeners.
        if (new String(key).startsWith('on')) {
            const name = new String(key).substr(2);
            descriptor.set = new Proxy(descriptor.set, {
                apply: (target, obj, args) => {
                    args[0] = watchEvent(name, args[0]);
                    return Reflect.apply(target, obj, args);
                }
            });
        }
    }
}

/**
 * Wrap and log calls to value of the provided descriptor if it is a function.
 * @param {any} descriptor The descriptor whose value to wrap.
 * @param {string} key The name of the property.
 * @param {string} path The global path to the object this function lives on (e.g. `Node.prototype`).
 */
function watchFunction(descriptor, key, path) {

    const value = descriptor.value;
    if (value && typeof value === 'function') {

        const proxy = descriptor.value = new Proxy(value, {
            apply: (target, obj, args) => {
                return new Trace().apply(obj, key, args, Reflect.apply(target, obj, args));
            },
            construct: (target, args, newTarget) => {
                return new Trace().construct(key, args, Reflect.construct(target, args, newTarget));
            }
        });

        fixStaticThis(proxy, value, key, path);

        // Work around missing properties on CSSStyleDeclaration in Chrome
        if (key === 'getComputedStyle') {
            descriptor.value = fixInstanceStyles(descriptor.value);
        }

        // Watch contexts for event listeners and known callbacks.
        // TODO: create a helper method to reduce duplicate code.
        if (key === 'addEventListener') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[1] = watchEvent(args[0], args[1]);
                    return Reflect.apply(target, obj, args);
                }
            });
        } else if (key === 'removeEventListener') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[1] = getProxyFor(args[1]);
                    return Reflect.apply(target, obj, args);
                }
            });
        } else if (key === 'requestAnimationFrame') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`animation frame`, args[0]);
                    return Reflect.apply(target, obj, args);
                }
            });
        } else if (key === 'setTimeout') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`timeout ${args[1]}ms`, args[0]);
                    return Reflect.apply(target, obj, args);
                }
            });
        } else if (key === 'setInterval') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`interval ${args[1]}ms`, args[0]);
                    return Reflect.apply(target, obj, args);
                }
            });
        } else if (key === 'then') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`then (fulfilled)`, args[0]);
                    args[1] = watchContext(`then (rejected)`, args[1]);
                    return Reflect.apply(target, obj, args);
                }
            });
        } else if (key === 'catch') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`catch`, args[0]);
                    return Reflect.apply(target, obj, args);
                }
            });
        } else if (key === 'finally') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`finally`, args[0]);
                    return Reflect.apply(target, obj, args);
                }
            });
        }
    }
}

/**
 * Wrap callbacks to track the start and end of execution contexts (e.g. event handlers).
 * @param {string} name The name of the context to log.
 * @param {Function} fn The callback invoked to start the context.
 * @param {boolean} ignored Whether or not this context is ignored.
 */
function watchContext(name, fn, ignored) {
    if (!fn) return fn;

    let proxy = new Proxy(fn, {

        apply: (target, obj, args) => {
            let result;

            if (ignored) {

                ignore(() => {
                    result = Reflect.apply(target, obj, args);
                });

            } else {

                new Trace().begin(name);
                result = Reflect.apply(target, obj, args);
                new Trace().end();

            }

            return result;
        }
    });

    mapFunctionToProxy.set(fn, proxy);
    mapProxyToFunction.set(proxy, fn);

    return proxy;
}

/**
 * List of events to automatically ignore when tracing.
 * This helps create a more stable trace for comparisons.
 * TODO: Make this configurable.
 */
const ignoredEvents = new Array(
    'mousemove',
    'pointermove',
    'scroll',
    'touchmove'
);

/**
 * Wrap event callbacks to track the start and end of execution contexts.
 * @param {string} name The name of the event to log.
 * @param {Function} fn The event callback.
 */
function watchEvent(name, fn) {
    let ignored = ignoredEvents.indexOf(name) !== -1;
    return watchContext(`event ${name}`, fn, ignored);
}

/**
 * Get a proxy used to previously wrap a function.
 * Returns the passed function if no such wrapper exists.
 * @param {Function} fn The previously wrapped function.
 */
function getProxyFor(fn) {
    return mapFunctionToProxy.get(fn) || fn;
}

/**
 * Get the function wrapped by the provided proxy.
 * Returns the passed object if it is not a wrapper for a function.
 * @param {Proxy} proxy
 */
function getFunctionFor(proxy) {
    return mapProxyToFunction.get(proxy) || proxy;
}
