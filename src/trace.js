import Array from './mirror/Array.js';
import JSON from './mirror/JSON.js';
import Reflect from './mirror/Reflect.js';
import String from './mirror/String.js';
import WeakMap from './mirror/WeakMap.js';

// Cached reference to stringify objects without self-tracing.
const toString = Object.prototype.toString;

/**
 * Log of actions performed during the trace.
 * @type {string[]}
 */
export const actions = new Array('var o = [];');

/**
 * Tracks seen objects to assign consistent IDs in the trace.
 * @type {WeakMap<any, number>}
 */
const created = new WeakMap();

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
const serializeArgs = (args) => {
    let results = new Array();
    for (let i = 0; i < args.length; i++) {
        results.push(id(args[i]));
    }
    return results.join(', ');
};

/**
 * Helper to get a string identifier for an object.
 * @param {any} obj The object to ID.
 */
const id = (obj) => {

    if (obj === window)
        return 'window';

    if (obj === document)
        return 'document';

    switch (typeof obj) {

        case 'function':
            return (obj.name || `function() {}`);

        case 'object':
            if (created.has(obj)) {

                return `o[${created.get(obj)}]`;

            } else if (Array.isArray(obj)) {

                return '[...]';

            } else if (obj instanceof Function) {

                // Work around functions wrapped by 2+ proxies in Edge.
                return (obj.name || `function() {}`); 

            } else {

                // Carefully stringify the object to avoid self-tracing.
                const s = Reflect.apply(toString, obj, []); 

                if (s === '[object Object]') {

                    return '{...}';

                } else {

                    // Handle Math, Reflect, etc.
                    return new String(s).replace(/^\[object ([^\]]+)]$/, '$1');

                }
            }

        default:
            return JSON.stringify(obj);
    }
};

/**
 * Run a function ignoring any contained trace calls.
 * Will not run if trace calls are already being ignored.
 * @param {function} fn The function to run.
 * @param {boolean} [alwaysRun=false] If `true`, run the function even if ignoring.
 */
export function ignore(fn, alwaysRun) {
    if (!ignoring) {
        ignoring = true;
        fn();
        ignoring = false;
    } else if (alwaysRun) {
        fn();
    }
}

/**
 * Serialize the log of actions.
 * @returns {string} A string with each logged action on its own line.
 */
export function save() {
    let result = '';
    ignore(() => {
        result = actions.join('\n');
    });
    return result;
}

/**
 * Represents a log entry in the trace.
 */
export default class Trace {

    constructor() {
        let index = 0;
        ignore(() => {
            index = actions.push('') - 1;
        });
        this.index = index;
    }

    /**
     * Log a `get` with the provided information to the trace.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any} result The returned value.
     */
    get(obj, key, result) {

        ignore(() => {
            let prefix = '', suffix = '';
            const type = typeof result;

            if (result && type === 'object') {

                if (created.has(result)) {

                    prefix = `${id(result)} === `;

                } else {

                    prefix = `o[${nextId}] = `;
                    created.set(result, nextId++);

                }

            } else if (type !== 'undefined') {

                suffix = ` === ${id(result)}`;

            }

            actions[this.index] = `${indent}${prefix}${id(obj)}.${key}${suffix};`;
        });

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
        ignore(() => {
            actions[this.index] = `${indent}${id(obj)}.${key} = ${id(value)};`;
        });
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

        ignore(() => {
            let prefix = '';
            let postfix = '';
            let type = typeof result;

            if (result && type === 'object' && !created.has(result)) {
                prefix = `o[${nextId}] = `;
                created.set(result, nextId++);
            } else if (type !== 'undefined') {
                postfix = ` === ${id(result)}`;
            }

            actions[this.index] = `${indent}${prefix}${!obj ? '' : id(obj) + '.'}${key}(${serializeArgs(args)})${postfix};`;
        });

        return result;
    }

    /**
     * Log an object creation with the provided information to the trace.
     * @param {string} key The property name.
     * @param {any[]} args The provided arguments.
     * @param {any} result The returned value.
     */
    construct(key, args, result) {

        ignore(() => {
            created.set(result, nextId);
            actions[this.index] = `${indent}o[${nextId}] = new ${key}(${serializeArgs(args)});`;
            nextId++;
        });

        return result;
    }

    /**
     * Wrap and indent subsequent trace logs under a named context.
     * @param {string} name The name to display for the context.
     */
    begin(name) {
        ignore(() => {
            actions[this.index] = `\n${indent}// ${name}\n${indent}{`;
            indent += '\t';
        });
    }

    /**
     * Close the current wrapping context and remove the indent.
     */
    end() {
        ignore(() => {
            indent = indent.substr(1);
            actions[this.index] = `${indent}}`;
        });
    }
}
