import _fixInstanceStyles from './workarounds/fix-instance-styles.js';
import _fixStaticThis from './workarounds/fix-static-this.js';
import Trace from './trace.js';
import { ignore as _ignore, tracked } from './trace.js';

// Import mirrored types to avoid self-tracing.
import Array from './mirror/Array.js';
import Number from './mirror/Number.js';
import Object from './mirror/Object.js';
import Proxy from './mirror/Proxy.js';
import Reflect from './mirror/Reflect.js';
import String from './mirror/String.js';
import WeakMap from './mirror/WeakMap.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;
const fixInstanceStyles = _fixInstanceStyles;
const fixStaticThis = _fixStaticThis;

// Cache references to native APIs to avoid self-tracing.
const _isNaN = isNaN;

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
 * Properties to ignore while tracing, typically due to side-effects.
 * This should be as small as possible to reduce blind spots during tracing.
 */
const excludeProps = {

    // Generates "duplicate" logs if used against native APIs we already track.
    // Also not too interested in invocations against page-level functions anyway.
    apply: Function.prototype,
    call: Function.prototype,

    // Already not tracked in Chrome due to being a 'value' property.
    frames: window,

    // Edge allows this to be overridden, but Chrome and Firefox don't
    isTrusted: Event.prototype,

    // Edge allows this to be overridden, but Chrome and Firefox don't
    location: Document.prototype,

    // Already not tracked in Chrome due to being a 'value' property.
    self: window

};

/**
 * Objects to fully ignore while tracing.
 * This should be as small as possible to reduce blind spots during tracing.
 */
const excludeObjects = new Set([

    // Edge allows most string getters to be overriden, but Chrome and Firefox don't
    // Affects `location.href`, `location.host`, etc.
    Location.prototype

]);

/**
 * Collection of custom watch handlers to defer to when setting up watch proxies.
 * @type {Map<string, ProxyHandler>}
 */
const handlers = new Map();

/**
 * Register a custom watch handler for the specified function.
 * This allows altering how a given function appears in the trace.
 * @param {string} key
 * @param {ProxyHandler} handler
 */
export function handle(key, handler) {
    handlers.set(key, handler);
}

/**
 * Track and log actions against the provided object.
 * @param {any} obj The object to track.
 * @param {string} [path=''] The path to display in logs.
 */
export default function watch(obj, path) {
    if (!obj || tracked.has(obj))
        return; // Ignore empty values and objects which have already been tracked.

    if (excludeObjects.has(obj))
        return; // Ignore objects we've explicitly decided to exclude.

    path = path || '';

    // Mark this object as tracked.
    tracked.add(obj);

    const prefix = path ? `${path}.` : '';
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    const keys = Array.from(Object.keys(descriptors))
        .filter(k => k[0] !== '$') // Ignore items injected by dev tools.
        .filter(k => _isNaN(Number(k))) // Ignore number properties
        .filter(k => k !== 'constructor') // Ignore `constructor` (handled by 'mirror/Proxy.js').
        .filter(k => excludeProps[k] !== obj); // Ignore explicitly excluded properties.

    keys.forEach(key => {
        const descriptor = descriptors[key];

        //  Wrap all configurable getters, setters, and function values
        if (descriptor.configurable) {
            watchGetter(descriptor, key);
            watchSetter(descriptor, key);
            watchValue(descriptor, key, path);

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
function watchValue(descriptor, key, path) {

    const value = descriptor.value;
    if (value && typeof value === 'function') {

        const proxy = descriptor.value = new Proxy(value, handlers.get(key) || {
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
    if (typeof fn !== 'function') return fn;

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
