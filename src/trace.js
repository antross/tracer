import Array from './mirror/Array.js';
import JSON from './mirror/JSON.js';
import Proxy from './mirror/Proxy.js';
import Reflect from './mirror/Reflect.js';
import String from './mirror/String.js';
import WeakMap from './mirror/WeakMap.js';
import WeakSet from './mirror/WeakSet.js';

const traceObjectIDs = false;

/**
 * Log of actions performed during the trace.
 * @type {string[]}
 */
const actions = new Array('var o = [];');

/**
 * Tracks seen objects to assign consistent IDs in the trace.
 * @type {WeakMap<any, number>}
 */
const created = new WeakMap();

/**
 * Collection to remember tracked objects ensuring they are only wrapped once.
 */
export const tracked = new WeakSet();

/**
 * Map of global static object names (`JSON`, `Math`, etc.)
 * @type {WeakMap<any, string>}
 */
const staticGlobals = new WeakMap([
    [window.console, 'console'],
    [window.CSS, 'CSS'],
    [window.document, 'document'],
    [window, 'window'],
    [window.Intl, 'Intl'],
    [window.JSON, 'JSON'],
    [window.Math, 'Math'],
    [window.Reflect, 'Reflect'],
    [window.WebAssembly, 'WebAssembly']
]);

/**
 * Flag to (temporarily) disable tracing.
 */
let ignoring = false;

/**
 * Auto-incrementing ID to label newly seen objects.
 */
let nextId = 1;

/**
 * The current indent level for new action logs (based on context).
 */
let indent = '';

/**
 * Helper to serialize function parameters to a string.
 * @param {any[]} args The parameters to serialize.
 */
function serializeArgs(args) {
    return Array.from(args)
        .map(a => id(a))
        .join(', ');
}

/**
 * Helper to get a string identifier for an object.
 * @param {any} obj The object to ID.
 */
function id(obj) {

    const globalName = staticGlobals.get(obj);
    if (globalName)
        return globalName;

    switch (typeof obj) {

        case 'function':
            return idFunction(obj);

        case 'object':
            return idObject(obj);

        default:
            return JSON.stringify(obj);
    }
}

function idObject(obj) {

    if (traceObjectIDs && created.has(obj)) {

        return `o[${created.get(obj)}]`;

    } else if (Array.isArray(obj)) {

        return '[...]';

    } else if (obj instanceof Function) {

        // Work around functions wrapped by 2+ proxies in Edge.
        return idFunction(obj);

    } else {

        return '{...}';

    }
}

function idFunction(fn) {
    return tracked.has(fn) ? (fn.name || 'function() { [native code] }') : 'function() { }';
}

/**
 * Run a function ignoring any contained trace calls.
 * Used to ignore blocks of page execution (e.g. inside a `mousemove` listener).
 * @param {Function} fn The function to run.
 */
export function ignore(fn) {
    if (!ignoring) {
        try {
            ignoring = true;
            fn();
        } finally {
            ignoring = false;
        }
    } else {
        fn();
    }
}

/**
 * Run a function logging any contained trace calls even if currently ignoring.
 * Used to break out of blocks of ignored page execution (e.g. inside an
 * `Array.prototype.filter` callback function).
 * @param {Function} fn The function to run.
 */
function reveal(fn) {
    if (ignoring) {
        try {
            ignoring = false;
            fn();
        } finally {
            ignoring = true;
        }
    } else {
        fn();
    }
}

/**
 * Automatically ignore calls made within a method on an object.
 * @param {any} obj The target object.
 * @param {string} name The name of the method.
 * @param {number[]} exceptArgs Indices of callback functions to be revealed (e.g. `[0]` for `Array.prototype.filter`).
 */
export function ignoreSubCalls(obj, name, exceptArgs) {
    if (!obj[name])
        return;

    // Wrap the property in a proxy to automatically ignore sub-execution when invoked.
    obj[name] = new Proxy(obj[name], {
        apply: (target, obj, args) => {
            let result;

            // When invoked, check if any args contain callbacks to be revealed.
            // And wrap them in a revealing proxy if needed.
            if (!ignoring && exceptArgs) {
                Array.from(exceptArgs).forEach(index => {
                    args[index] = revealSubCalls(args[index]);
                });
            }

            // Then ignore the actual sub-call.
            ignore(() => result = Reflect.apply(target, obj, args));

            return result;
        }
    });
}

/**
 * Automatically include sub-calls of the provided function in the trace.
 * @param {Function} fn The function whose sub-calls to reveal.
 */
function revealSubCalls(fn) {
    return new Proxy(fn, {
        apply: (target, obj, args) => {
            let result;
            reveal(() => result = Reflect.apply(target, obj, args));
            return result;
        }
    });
}

/**
 * Serialize the log of actions.
 * @returns {string} A string with each logged action on its own line.
 */
export function save() {
    return actions.join('\n');
}

/**
 * Represents a log entry in the trace.
 */
export default class Trace {

    constructor() {
        this.index = ignoring ? 0 : actions.push('') - 1;
    }

    /**
     * Log a `get` with the provided information to the trace.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any} result The returned value.
     */
    get(obj, key, result) {

        if (!ignoring) {
            let prefix = '', suffix = '';
            const type = typeof result;

            if (result && type === 'object') {

                if (created.has(result)) {

                    prefix = `${id(result)} === `;

                } else {

                    created.set(result, nextId++);

                    prefix = `${id(result)} = `;

                }

            } else if (type !== 'undefined') {

                suffix = ` === ${id(result)}`;

            }

            actions[this.index] = `${indent}${prefix}${id(obj)}.${key}${suffix};`;
        }

        return result;
    }

    /**
     * Log a `set` with the provided information to the trace.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any} value The returned value.
     * @param {any} result The returned value.
     */
    set(obj, key, value, result) {
        if (!ignoring) {
            actions[this.index] = `${indent}${id(obj)}.${key} = ${id(value)};`;
        }
        return result;
    };

    /**
     * Log a function call with the provided information to the trace.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any[]} args The provided arguments.
     * @param {any} result The returned value.
     */
    apply(obj, key, args, result) {

        if (!ignoring) {
            let prefix = '';
            let postfix = '';
            let type = typeof result;

            if (result && type === 'object' && !created.has(result)) {
                created.set(result, nextId++);
                prefix = `${id(result)} = `;
            } else if (type !== 'undefined') {
                postfix = ` === ${id(result)}`;
            }

            actions[this.index] = `${indent}${prefix}${!obj ? '' : id(obj) + '.'}${key}(${serializeArgs(args)})${postfix};`;
        }

        return result;
    }

    /**
     * Log an object creation with the provided information to the trace.
     * @param {string} key The property name.
     * @param {any[]} args The provided arguments.
     * @param {any} result The returned value.
     */
    construct(key, args, result) {

        if (!ignoring) {
            created.set(result, nextId);
            actions[this.index] = `${indent}${id(result)} = new ${key}(${serializeArgs(args)});`;
            nextId++;
        }

        return result;
    }

    /**
     * Wrap and indent subsequent trace logs under a named context.
     * @param {string} name The name to display for the context.
     */
    begin(name) {
        if (!ignoring) {
            actions[this.index] = `\n${indent}// ${name}\n${indent}{`;
            indent += '\t';
        }
    }

    /**
     * Close the current wrapping context and remove the indent.
     */
    end() {
        if (!ignoring) {
            indent = new String(indent).substr(1);
            actions[this.index] = `${indent}}`;
        }
    }
}
