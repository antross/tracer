import { ignoreSubCalls as _ignoreSubCalls } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignoreSubCalls = _ignoreSubCalls;

/**
 * Make `String.prototype.match` and `String.prototype.replace` consistent by
 * ignoring sub-calls to `global` and `exec`. Both Chrome and Firefox make
 * these sub-calls. Edge does not. Note that the sub-calls are still made, just
 * ignored in the trace.
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
