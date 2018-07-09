import Proxy from '../mirror/Proxy.js';
import Reflect from '../mirror/Reflect.js';

// Cache native APIs used in shims to shield from overrides
const NativeDate = Date;
const Date_toString = Date.prototype.toString;

/**
 * A fixed starting date seed to keep values consisted across runs.
 */
let d = 1528327767458;

/**
 * Stabilize steps from the starting date by 100ms increments each call.
 * @return {number} The next stabilized step.
 */
export function now() {
    return d += 100;
}

/**
 * Override `Date` APIs to step by 100ms between calls.
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
