import Proxy from '../mirror/Proxy.js';
import Reflect from '../mirror/Reflect.js';

// Cache native APIs used in shims to shield from overrides
const NativeDate = Date;
const Date_toString = Date.prototype.toString;

/**
 * A fixed starting date seed to keep values consisted across runs.
 */
let d = new NativeDate(2018, 6, 17, 11, 32).getTime();

/**
 * Always return the same stable date.
 * An earlier approach stepped in 100ms increments, but produced a fair amount
 * of noise if an additional call was made early on in one of the traces.
 * @return {number} The next stabilized step.
 */
export function now() {
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
