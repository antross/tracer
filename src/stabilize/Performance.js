import Proxy from '../mirror/Proxy.js';

/**
 * Override `performance.now()` to increment by 100.1ms each call.
 */
export default function stabilize() {

    let n = 0;
    performance.now = new Proxy(performance.now, {
        apply: () => n += 100.1
    });

}
