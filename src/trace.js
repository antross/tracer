
/**
 * Log of actions performed during the trace.
 * @type {string[]}
 */
export const actions = ['var o = [];'];

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
    let results = [];
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

    if (obj === Math)
        return 'Math';

    switch (typeof obj) {
        case 'string':
            return JSON.stringify(obj);
        case 'function':
            return (obj.name || `function() {}`);
        case 'object':
            return created.has(obj) ? `o[${created.get(obj)}]` : `${obj}`;
        default:
            return `${obj}`;
    }
};

/**
 * Run a function ignoring any contained trace calls.
 * Will not run if trace calls are already being ignored.
 * @param {function} fn The function to run.
 */
export function ignore(fn) {
    if (!ignoring) {
        ignoring = true;
        fn();
        ignoring = false;
    }
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
            let prefix = '';

            if (typeof result === 'object') {

                if (created.has(result)) {

                    prefix = `${id(result)} === `;

                } else {

                    prefix = `o[${nextId}] = `;
                    created.set(result, nextId++);

                }
            }

            actions[this.index] = `${indent}${prefix}${id(obj)}.${key};`;
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

            if (type === 'object' && !created.has(result)) {
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
