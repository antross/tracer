import Array from './mirror/Array.js';
import JSON from './mirror/JSON.js';
import String from './mirror/String.js';
import WeakMap from './mirror/WeakMap.js';

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
function serializeArgs(args) {
    return new Array()
        .concat(args)
        .map(a => id(a))
        .join(', ');
}

/**
 * Helper to get a string identifier for an object.
 * @param {any} obj The object to ID.
 */
function id(obj) {

    if (obj === window)
        return 'window';

    if (obj === document)
        return 'document';

    if (obj === window.Math)
        return 'Math';

    if (obj === window.Reflect)
        return 'Reflect';

    switch (typeof obj) {

        case 'function':
            return idFunction(obj);

        case 'object':
            if (created.has(obj)) {

                return `o[${created.get(obj)}]`;

            } else if (Array.isArray(obj)) {

                return '[...]';

            } else if (obj instanceof Function) {

                // Work around functions wrapped by 2+ proxies in Edge.
                return idFunction(obj);

            } else {

                return '{...}';

            }

        default:
            return JSON.stringify(obj);
    }
}

function idFunction(fn) {
    return fn.name || 'function() {}';
}

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

                    prefix = `o[${nextId}] = `;
                    created.set(result, nextId++);

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

        if(!ignoring) {
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
            actions[this.index] = `${indent}o[${nextId}] = new ${key}(${serializeArgs(args)});`;
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
