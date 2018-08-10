import Array from './mirror/Array.js';
import JSON from './mirror/JSON.js';
import Proxy from './mirror/Proxy.js';
import Reflect from './mirror/Reflect.js';
import RegExp from './mirror/RegExp.js';
import String from './mirror/String.js';
import WeakMap from './mirror/WeakMap.js';
import WeakSet from './mirror/WeakSet.js';

const NativeRegExp = window.RegExp;
const Element_localName = Object.getOwnPropertyDescriptor(Element.prototype, 'localName').get;
const toString = Object.prototype.toString;

const tab = new String('    ');
const traceObjectIDs = false;
const maxTraceCount = 100000;

let droppedCount = 0;

/**
 * Log of actions performed during the trace.
 * @type {Trace[]}
 */
let actions = new Array();

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
 * Extracts the name from the result of `Object.prototype.toString()`.
 * E.g. extracts `Date` from `[object Date]`.
 */
const rxObjectName = new RegExp(/([^ ]+)]/);

/**
 * Tests if a serialized `RegExp` contains a forward slash `/` in a character
 * set `[]`, e.g. the equivalent expressions `[/]` or `[\/]`. This matters
 * because Chrome always escapes this regardless of whether it was escaped in
 * the original `RegExp`, leading to different serializations between browsers.
 */
const rxSlashInCharSet = new RegExp(/\[[^\]]*\/[^\]]*\]/);

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
 * Flag to track whether tracing has been enabled by the user.
 */
let tracing = true;

/**
 * Flag to (temporarily) disable tracing for a sequence of calls.
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

function isActive() {
    return !ignoring && tracing;
}

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

    if (obj === null)
        return 'null';

    switch (typeof obj) {

        case 'function':
            return idFunction(obj);

        case 'object':
            return idObject(obj);

        case 'string':
            const str = new String(obj);
            return str.length < 128 ? JSON.stringify(str) : 'str';

        default:
            return JSON.stringify(obj);
    }
}

function idObject(obj) {

    if (traceObjectIDs && created.has(obj)) {

        return `o[${created.get(obj)}]`;

    } else if (Array.isArray(obj)) {

        return 'arr';

    } else if (obj instanceof Function) {

        // Work around functions wrapped by 2+ proxies in Edge.
        return idFunction(obj);

    } else if (obj instanceof NativeRegExp) {

        const str = new String(new RegExp(obj));
        return str.length < 128 && !rxSlashInCharSet.test(str) ? str : 'regex';

    } else if (obj instanceof CSSStyleDeclaration) {

        return 'style';

    } else if (obj instanceof Element) {

        return Reflect.apply(Element_localName, obj, []);

    } else if (obj instanceof XMLHttpRequest) {

        return 'xhr';

    } else if (obj instanceof Storage) {

        return 'storage';

    } else {

        const str = Reflect.apply(toString, obj, []);
        return new String(rxObjectName.exec(str)[1]).toLowerCase();

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
    let result;
    if (!ignoring) {
        try {
            ignoring = true;
            result = fn();
        } finally {
            ignoring = false;
        }
    } else {
        result = fn();
    }
    return result;
}

/**
 * Run a function logging any contained trace calls even if currently ignoring.
 * Used to break out of blocks of ignored page execution (e.g. inside an
 * `Array.prototype.filter` callback function).
 * @param {Function} fn The function to run.
 */
function reveal(fn) {
    let result;
    if (ignoring) {
        try {
            ignoring = false;
            result = fn();
        } finally {
            ignoring = true;
        }
    } else {
        result = fn();
    }
    return result;
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

            // When invoked, check if any args contain callbacks to be revealed.
            // And wrap them in a revealing proxy if needed.
            if (!ignoring && exceptArgs) {
                Array.from(exceptArgs).forEach(index => {
                    args[index] = revealSubCalls(args[index]);
                });
            }

            // Then ignore the actual sub-call.
            return ignore(() => Reflect.apply(target, obj, args));
        }
    });
}

/**
 * Automatically include sub-calls of the provided function in the trace.
 * @param {Function} fn The function whose sub-calls to reveal.
 */
function revealSubCalls(fn) {
    if (!(fn instanceof Function))
        return fn;

    // Use a function instead of a Proxy to avoid an Edge bug in some cases:
    // https://github.com/Microsoft/ChakraCore/issues/5479
    const target = fn;
    return function(...args) {
        const obj = this;
        return reveal(() => Reflect.apply(target, obj, args));
    };
}

/**
 * Save the log of actions, clearing the list in the process.
 * @returns {string[]} A list of logged actions.
 */
export function save() {
    const result = actions.map(trace => trace.value);

    if (droppedCount > 0) {
        result.push(`// + ${droppedCount} dropped lines`);
    }

    actions = new Array();
    droppedCount = 0;

    return result;
}

/**
 * Enable/disable tracing.
 * @param {boolean} value 
 */
export function setTracing(value) {
    tracing = value;
}

function increaseIndent() {
    indent += tab;
}

function decreaseIndent() {
    indent = new String(indent).substr(tab.length);
}

/**
 * Represents a log entry in the trace. Create new instances of `Trace`
 * BEFORE actually making an API call. Then use the appropriate method on a
 * `Trace` instance AFTER making an API call to fill out the call details.
 * This ensures the order of entries in the trace remains correct for even
 * for re-entrant calls.
 */
export default class Trace {

    constructor() {
        this.value = '';

        if (isActive()) {
            increaseIndent();

            if (actions.length > maxTraceCount) {

                // Ignore traces if we're over the limit.
                droppedCount++;

            } else {

                // Otherwise add the new trace to the log. This is done before
                // setting data to keep the correct order for re-entrant calls.
                actions.push(this);

            }
        }
    }

    /**
     * Log a `get` with the provided information to the trace.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any} result The returned value.
     */
    get(obj, key, result) {

        if (isActive()) {
            decreaseIndent();

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

            this.value = `${indent}${prefix}${id(obj)}.${key}${suffix};`;
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

        if (isActive()) {
            decreaseIndent();

            this.value = `${indent}${id(obj)}.${key} = ${id(value)};`;
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

        if (isActive()) {
            decreaseIndent();

            let prefix = '';
            let postfix = '';
            let type = typeof result;

            if (result && type === 'object' && !created.has(result)) {
                created.set(result, nextId++);
                prefix = `${id(result)} = `;
            } else if (type !== 'undefined') {
                postfix = ` === ${id(result)}`;
            }

            const objId = typeof obj === 'undefined' ? '' : typeof obj === 'number' ? `(${id(obj)}).` : `${id(obj)}.`;

            this.value = `${indent}${prefix}${objId}${key}(${serializeArgs(args)})${postfix};`;
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

        if (isActive()) {
            decreaseIndent();

            created.set(result, nextId);
            this.value = `${indent}${id(result)} = new ${key}(${serializeArgs(args)});`;
            nextId++;
        }

        return result;
    }

    /**
     * Wrap and indent subsequent trace logs under a named context.
     * @param {string} name The name to display for the context.
     */
    begin(name) {
        if (isActive()) {
            decreaseIndent();
            actions.push({ value: `${indent}// ${name}` });
            actions.push({ value: `${indent}{` });
            increaseIndent();
        }
    }

    /**
     * Close the current wrapping context and remove the indent.
     */
    end() {
        if (isActive()) {
            decreaseIndent();
            decreaseIndent();
            this.value = `${indent}}`;
        }
    }
}
