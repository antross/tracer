import Proxy from '../mirror/Proxy.js';

/**
 * Override `Math.random()` to always return `0.5` for stable results.
 * An earlier approach used a stable pattern, but resulted in a fair amount
 * of noise if a single extra call occurred early on in one of the traces.
 */
export default function stabilize() {

    Math.random = new Proxy(Math.random, { apply: () => 0.5 });

}
