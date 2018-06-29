import Trace from './trace.js';

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
    const keys = Object.keys(descriptors).filter(k => k[0] !== '$' && !/^(apply|construct)$/.test(k));

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
                return Trace.logGet(Trace.add(), obj, key, target.apply(obj, args));
            }
        });
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
                return Trace.logSet(Trace.add(), obj, key, args[0], target.apply(obj, args));
            }
        });
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

                if (key === 'addEventListener') {
                    Trace.ignore(() => {
                        const fn = args[1];

                        const proxy = args[1] = new Proxy(fn, {
                            apply: (t, o, a) => {
                                Trace.logContextBegin(`event '${args[0]}'`);
                                const result = t.apply(o, a);
                                Trace.logContextEnd();
                                return result;
                            }
                        });

                        listeners.set(fn, proxy);
                    });
                }

                if (key === 'removeEventListener') {
                    Trace.ignore(() => args[1] = listeners.get(args[1]));
                }

                return Trace.logApply(Trace.add(), obj, key, args, target.apply(obj, args));
            },
            construct: (target, args, newTarget) => {
                return Trace.logConstruct(Trace.add(), key, args, Reflect.construct(target, args, newTarget));
            }
        })
    }
}
