import Proxy from '../mirror/Proxy.js';

/**
 * Override `performance.now()` to always return 1000ms.
 * This used to increment by 100.1ms each call, but a single extra call
 * could produce noise in the rest of the trace.
 */
export default function stabilize() {

    let n = 1000.0;
    performance.now = new Proxy(performance.now, {
        apply: () => n
    });

}
