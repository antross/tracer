import Proxy from '../mirror/Proxy.js';

/**
 * Override `Math.random()` to step from 0 to 1 in 0.01 increments, then repeat.
 */
export default function stabilize() {

    let random = 0;
    Math.random = new Proxy(Math.random, {
        apply: () => {
            random = (random + 1) % 100;
            return random / 100;
        }
    });

}
