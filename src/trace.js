
/**
 * Log of actions performed during the trace.
 * @type {string[]}
 */
const actions = ['var o = [];'];

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
const argsToString = (args) => {
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
 * Collection of helpers to create a log of API calls.
 */
export default class Trace {

    static get actions() {
        return actions;
    }

    static get ignoring() {
        return ignoring;
    }

    /**
     * Run a function ignoring any contained trace calls.
     * Will not run if trace calls are already being ignored.
     * @param {function} fn The function to run.
     */
    static ignore(fn) {
        let result;
        if (!ignoring) {
            ignoring = true;
            result = fn();
            ignoring = false;
        }
        return result;
    }

    /**
     * Append a new log entry to the trace.
     * @returns {number} The index of the new log entry.
     */
    static add() {
        return Trace.ignore(() => actions.push('') - 1);
    }

    /**
     * Log a `get` with the provided information to the trace.
     * @param {number} index The log entry position to populate.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any} result The returned value.
     */
    static logGet(index, obj, key, result) {

        Trace.ignore(() => {
            let prefix = '';

            if (typeof result === 'object') {

                if (created.has(result)) {

                    prefix = `${id(result)} === `;

                } else {

                    prefix = `o[${nextId}] = `;
                    created.set(result, nextId++);

                }
            }

            actions[index] = `${indent}${prefix}${id(obj)}.${key};`;
        });

        return result;
    }

    /**
     * Log a `set` with the provided information to the trace.
     * @param {number} index The log entry position to populate.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any} value The returned value.
     * @param {any} result The returned value.
     */
    static logSet(index, obj, key, value, result) {
        Trace.ignore(() => {
            actions[index] = `${indent}${id(obj)}.${key} = ${id(value)};`;
        });
        return result;
    };

    /**
     * Log a function call with the provided information to the trace.
     * @param {number} index The log entry position to populate.
     * @param {any} obj The target object.
     * @param {string} key The property name.
     * @param {any[]} args The provided arguments.
     * @param {any} result The returned value.
     */
    static logApply(index, obj, key, args, result) {

        Trace.ignore(() => {
            let prefix = '';
            let postfix = '';
            let type = typeof result;

            if (type === 'object' && !created.has(result)) {
                prefix = `o[${nextId}] = `;
                created.set(result, nextId++);
            } else if (type !== 'undefined') {
                postfix = ` === ${id(result)}`;
            }

            actions[index] = `${indent}${prefix}${!obj ? '' : id(obj) + '.'}${key}(${argsToString(args)})${postfix};`;
        });

        return result;
    }

    /**
     * Log an object creation with the provided information to the trace.
     * @param {number} index The log entry position to populate.
     * @param {string} key The property name.
     * @param {any[]} args The provided arguments.
     * @param {any} result The returned value.
     */
    static logConstruct(index, key, args, result) {

        Trace.ignore(() => {
            created.set(result, nextId);
            actions[index] = `${indent}o[${nextId}] = new ${key}(${argsToString(args)});`;
            nextId++;
        });

        return result;
    }

    /**
     * 
     * @param {string} name 
     */
    static logContextBegin(name) {
        Trace.ignore(() => {
            actions.push(`\n${indent}// ${name}\n${indent}{`);
            indent += '\t';
        });
    }

    /**
     * 
     */
    static logContextEnd() {
        Trace.ignore(() => {
            indent = indent.substr(1);
            actions.push(`${indent}}`);
        });
    }
}
