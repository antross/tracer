import Proxy from '../mirror/Proxy.js';
import Reflect from '../mirror/Reflect.js';

// Cache native APIs used in shims to shield from overrides
const NativeDate = Date;
const Date_toString = Date.prototype.toString;

/**
 * A fixed starting date seed to keep values consisted across runs.
 */
let d = Date.UTC(2018, 6, 17, 11, 32);

/**
 * Track the number of times `now()` has been called to limit increments.
 */
let calls = 0;

/**
 * Return a stabilized date incrementing by 1ms every 100 calls.
 * This reduces noise due to extra calls while avoiding hanging pages
 * which use tight loops while waiting for the date to increment.
 * An earlier approach stepped on every call, but produced a fair amount
 * of noise if an additional call was made early on in one of the traces.
 * @return {number} The next stabilized step.
 */
export function now() {
    calls++;

    if (calls > 100) {
        d += 1;
        calls = 0;
    }

    return d;
}

/**
 * Override `Date` APIs to use our defined step.
 */
export default function stabilize() {

    Date.now = new Proxy(Date.now, { 
        apply: () => now()
    });

    Date = new Proxy(NativeDate, {
        apply: () => Reflect.apply(Date_toString, new NativeDate(now()), []),
        construct: (t, a, n) => Reflect.construct(t, a.length ? a : [now()], n)
    });

}
