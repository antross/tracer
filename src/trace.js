
(function(win) {
    'use strict';

    let ignoring = true;
    let nextId = 1;
    let nextFn = 1;

    const tracked = new WeakSet();
    const created = new WeakMap();
    const functions = new WeakMap();
    const listeners = new WeakMap();
    const actions = [];
    const exclude = ['constructor', 'length', 'name', 'arguments', 'caller', 'call', 'apply', 'construct'];

    const argsToString = (args) => {
        let results = [];
        for (let i = 0; i < args.length; i++) {
            results.push(id(args[i]));
        }
        return results.join(', ');
    };

    const id = (obj) => {

        if (obj === window)
            return 'window';

        if (obj === document)
            return 'document';

        if (obj === Math)
            return 'Math';

        switch (typeof obj) {
            case 'string':
                return JSON.stringify(obj);
            case 'function':
                return functions.has(obj) ? 'f' + functions.get(obj) : (obj.name || `function() {}`);
            case 'object':
                return created.has(obj) ? 'o' + created.get(obj) : `${obj}`;
            default:
                return `${obj}`;
        }
    };

    const ignore = (fn) => {
        ignoring = true;
        fn();
        ignoring = false;
    };

    const track = (path, obj) => {
        if (!obj || tracked.has(obj))
            return;

        tracked.add(obj);

        const prefix = path ? `${path}.` : '';
        const descriptors = Object.getOwnPropertyDescriptors(obj);
        const keys = Object.keys(descriptors).filter(k => k[0] !== '$' && exclude.indexOf(k) === -1);

        keys.forEach(key => wrap(`${prefix}`, obj, key, descriptors[key]));
    };

    const wrap = (path, obj, key, descriptor) => {

        const value = descriptor.value;
        const type = typeof value;

        if (type === "function" || type === "object") {
            track(path + key, value);
        }

        if (descriptor.configurable) {
            if (descriptor.get) {
                const getter = descriptor.get;
                descriptor.get = function(...args) {
                    const result = getter.apply(this, args);
                    if (!ignoring) {
                        ignore(() => {
                            let prefix = '';
                            if (typeof result === 'object') {
                                if (created.has(result)) {
                                    prefix = `${id(result)} = `;
                                } else {
                                    prefix = `var o${nextId} = `;
                                    created.set(result, nextId++);
                                }
                            }
                            actions.push(`${prefix}${id(this)}.${key};`);
                        });
                    }
                    return result;
                };
            }

            if (descriptor.set) {
                const setter = descriptor.set;
                descriptor.set = function(...args) {
                    const result = setter.apply(this, args);
                    if (!ignoring) {
                        ignore(() => {
                            actions.push(`${id(this)}.${key} = ${id(args[0])};`);
                        });
                    }
                    return result;
                };
            }

            if (type === "function") {
                descriptor.value = function(...args) {

                    if (!ignoring && key === 'addEventListener') {
                        const fn = args[1];
                        const wrapper = function (...a) {
                            ignore(() => actions.push(`\n// event '${args[0]}'`));
                            return fn.apply(this, a);
                        };
                        args[1] = wrapper;
                        ignore(() => listeners.set(fn, wrapper));
                    }

                    if (!ignoring && key === 'removeEventListener') {
                        ignore(() => args[1] = listeners.get(args[1]));
                    }

                    let index = 0;
                    if (!ignoring) {
                        ignore(() => {
                            index = actions.length;
                            actions.push('');
                        });
                    }

                    const isNew = value.prototype && this instanceof value;
                    const result = isNew ? Reflect.construct(value, args) : value.apply(this, args);

                    if (!ignoring) {
                        ignore(() => {
                            let prefix = '';
                            let postfix = '';
                            let type = typeof result;
                            if (type === 'object' && !created.has(result)) {
                                prefix = `var o${nextId} = ${isNew ? 'new ' : ''}`;
                                created.set(result, nextId++);
                            } else if (type !== 'undefined') {
                                postfix = ` === ${id(result)}`;
                            }
                            actions[index] = `${prefix}${isNew || !this ? '' : id(this) + '.'}${key}(${argsToString(args)})${postfix};`;
                        });
                    }

                    return result;
                };
                descriptor.value.prototype = value.prototype;
                Object.defineProperties(descriptor.value, Object.getOwnPropertyDescriptors(value));
            }

            Object.defineProperty(obj, key, descriptor);
        }
    };

    track('', win);
    win._actions = actions;
    ignoring = false;

}(window));
