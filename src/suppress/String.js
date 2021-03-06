import { ignoreSubCalls as _ignoreSubCalls } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignoreSubCalls = _ignoreSubCalls;

/**
 * Make traces for `String.prototype` methods consistent and less noisy by
 * ignoring sub-calls where needed. Note that the sub-calls are still made,
 * just omitted from the trace.
 */
export default function suppress() {

    /**
     * Calling `String.prototype.match` calls `global` and `exec` in Chrome
     * and Firefox, but not Edge. Ignoring to reduce noise.
     * 
     * Code: `'11px'.match(/\d+px/);`
     * 
     * Trace:
     * ```
     * "11px".match({...}) === [...];
     * {...}.global === false;
     * [...] = {...}.exec("11px");
     * ```
     */
    ignoreSubCalls(String.prototype, 'match');

    /**
     * Calling `String.prototype.replace` calls `global` and `exec` in Chrome
     * and Firefox, but not Edge. Ignoring to reduce noise.
     * 
     * Code: `'11px'.replace(/(\d+)px/, '$1');`
     * 
     * Trace:
     * ```
     * "11px".replace({...}, "$1") === "11";
     * {...}.global === false;
     * [...] = {...}.exec("11px");
     * ```
     */
    ignoreSubCalls(String.prototype, 'replace', [1]);

    /**
     * Calling `String.prototype.search` calls `exec` in Chrome and Firefox,
     * but not Edge. Ignoring to reduce noise.
     * 
     * Code '11px'.search(/px/);
     * 
     * Trace:
     * ```
     * "11px".search(/px/) === 2;
     * [...] = /px/.exec("11px");
     * ```
     */
    ignoreSubCalls(String.prototype, 'search');

    /**
     * When passed a `RegExp`, `String.prototype.split` produces a large number
     * of sub-calls in Chrome and Firefox, but not Edge. Ignoring to reduce
     * noise.
     * 
     * Code: `'12'.split(/(?=[\s\S])/);`
     * 
     * Trace:
     * ```
     * [...] = "12".split({...});
     * {...}.flags === "";
     * {...}.global === false;
     * {...}.ignoreCase === false;
     * {...}.multiline === false;
     * {...}.dotAll === false; // Only in Chrome, not Firefox
     * {...}.unicode === false;
     * {...}.sticky === false;
     * {...} = new RegExp({...}, "y");
     * [...] = {...}.exec("12");
     * [...] = {...}.exec("12");
     * [...] = {...}.exec("12");
     * ```
     */
    ignoreSubCalls(String.prototype, 'split');

}
