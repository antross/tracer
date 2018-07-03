import Trace from './trace.js';
import { ignore as i } from './trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = i;

// Check for CSS properties missing from the prototype chain (Chrome bug).
const fixCSSStyleDeclaration = !('color' in CSSStyleDeclaration.prototype);

/**
 * Collection to remember tracked objects ensuring they are only wrapped once.
 */
const tracked = new WeakSet();

/**
 * Tracks event listeners to establish trace context.
 * @type {WeakMap<Function, Function>}
 */
const listeners = new WeakMap();

/**
 * Track and log actions against the provided object.
 * @param {string} path The path to display in logs.
 * @param {any} obj The object to track.
 */
export default function watch(path, obj) {
    if (!obj || tracked.has(obj))
        return; // Ignore empty values and objects which have already been tracked.

    // Mark this object as tracked.
    tracked.add(obj);

    const prefix = path ? `${path}.` : '';
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    const keys = Object.keys(descriptors).filter(k => k[0] !== '$' && !/^(apply|construct|constructor)$/.test(k));

    keys.forEach(key => {
        const descriptor = descriptors[key];

        // Recursively wrap functions and objects
        if (typeof descriptor.value === "function" || typeof descriptor.value === "object") {
            watch(prefix + key, descriptor.value);
        }

        //  Wrap all configurable getters, setters, and function values
        if (descriptor.configurable) {
            watchGetter(descriptor, key);
            watchSetter(descriptor, key);
            watchFunction(descriptor, key);

            Object.defineProperty(obj, key, descriptor);
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
                return new Trace().get(obj, key, target.apply(obj, args));
            }
        });

        // Watch contexts for event listeners.
        if (/^on/.test(key)) {
            descriptor.get = new Proxy(descriptor.get, {
                apply: (target, obj, args) => {
                    args[0] = getFunctionFor(args[0]);
                    return target.apply(obj, args);
                }
            });
        }

        // Work around missing properties on CSSStyleDeclaration in Chrome
        if (key === 'style' && fixCSSStyleDeclaration) {
            descriptor.get = new Proxy(descriptor.get, {
                apply: (target, obj, args) => {
                    const style = target.apply(obj, args);
                    let proxy;
                    ignore(() => {
                        proxy = new Proxy(style, {
                            get: (t, p) => {
                                return new Trace().get(style, p, t[p]);
                            },
                            set: (t, p, v) => {
                                return new Trace().set(style, p, v, t[p] = v);
                            }
                        });
                    });
                    return proxy;
                }
            })
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
                return new Trace().set(obj, key, args[0], target.apply(obj, args));
            }
        });

        // Watch contexts for event listeners.
        if (/^on/.test(key)) {
            const name = key.substr(2);
            descriptor.set = new Proxy(descriptor.set, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`event ${name}`, args[0]);
                    return target.apply(obj, args);
                }
            });
        }
    }
}

/**
 * Wrap and log calls to value of the provided descriptor if it is a function.
 * @param {any} descriptor The descriptor whose value to wrap.
 * @param {string} key The name of the property.
 */
function watchFunction(descriptor, key) {
    if (descriptor.value && typeof descriptor.value === 'function') {
        descriptor.value = new Proxy(descriptor.value, {
            apply: (target, obj, args) => {
                return new Trace().apply(obj, key, args, target.apply(obj, args));
            },
            construct: (target, args, newTarget) => {
                return new Trace().construct(key, args, Reflect.construct(target, args, newTarget));
            }
        });

        // Watch contexts for event listeners and known callbacks.
        if (key === 'addEventListener') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[1] = watchContext(`event ${args[0]}`, args[1]);
                    return target.apply(obj, args);
                }
            });
        } else if (key === 'removeEventListener') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[1] = getProxyFor(args[1]);
                    return target.apply(obj, args);
                }
            });
        } else if (key === 'setTimeout') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`timeout ${args[1]}ms`, args[0]);
                    return target.apply(obj, args);
                }
            });
        } else if (key === 'setInterval') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`interval ${args[1]}ms`, args[0]);
                    return target.apply(obj, args);
                }
            });
        } else if (key === 'then') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`then (fulfilled)`, args[0]);
                    args[1] = watchContext(`then (rejected)`, args[1]);
                    return target.apply(obj, args);
                }
            });
        } else if (key === 'catch') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`catch`, args[0]);
                    return target.apply(obj, args);
                }
            });
        } else if (key === 'finally') {
            descriptor.value = new Proxy(descriptor.value, {
                apply: (target, obj, args) => {
                    args[0] = watchContext(`finally`, args[0]);
                    return target.apply(obj, args);
                }
            });
        }
    }
}

/**
 * Wrap callbacks to track the start and end of execution contexts (e.g. event handlers).
 * @param {string} name The name of the context to log.
 * @param {Function} fn The callback invoked to start the context.
 */
function watchContext(name, fn) {
    if (!fn) return fn;

    let proxy = fn;

    ignore(() => {

        proxy = new Proxy(fn, {

            apply: (target, obj, args) => {

                new Trace().begin(name);
                const result = target.apply(obj, args);
                new Trace().end();

                return result;
            }
        });

        listeners.set(fn, proxy);
    });

    return proxy;
}

/**
 * 
 * @param {Function} fn 
 */
function getProxyFor(fn) {
    let proxy;

    ignore(() => proxy = (listeners.get(fn) || null));

    return proxy;
}

/**
 * 
 * @param {*} proxy 
 */
function getFunctionFor(proxy) {
    let fn = proxy;

    ignore(() => fn = (listeners.get(proxy) || null));

    return fn;
}
