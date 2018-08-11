import Proxy from '../mirror/Proxy.js';

/**
 * Track the number of times `random()` has been called to limit increments.
 */
let calls = 0;

/**
 * Start `Math.random()` at `0.5`.
 */
let value = 50;

/**
 * Return a stabilized random value incrementing by 0.01 every 100 calls.
 * This reduces noise due to extra calls while avoiding hanging pages
 * which use tight loops while waiting for the value to change.
 * An earlier approach stepped on every call, but produced a fair amount
 * of noise if an additional call was made early on in one of the traces.
 * @return {number} The next stabilized step.
 */
function next() {
    calls++;

    if (calls > 100) {
        value = (value + 1) % 100;
        calls = 0;
    }

    return value / 100;
}

/**
 * Override `Math.random()` to always return stabilized results.
 */
export default function stabilize() {

    Math.random = new Proxy(Math.random, { apply: () => next() });

}
