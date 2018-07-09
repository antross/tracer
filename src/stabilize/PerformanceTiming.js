import {now} from './Date.js';
import Proxy from '../mirror/Proxy.js';

/**
 * List of timings in the order they are expected to occur.
 */
const timings = [
    'redirectStart',
    'redirectEnd',
    'navigationStart',
    'secureConnectionStart',
    'fetchStart',
    'domainLookupStart',
    'domainLookupEnd',
    'connectStart',
    'connectEnd',
    'requestStart',
    'responseStart',
    'responseEnd',
    'domLoading',
    'unloadEventStart',
    'unloadEventEnd',
    'domInteractive',
    'domContentLoadedEventStart',
    'domContentLoadedEventEnd',
    'loadEventStart',
    'loadEventEnd'
];

/**
 * Override `performance.timing` APIs to step by 100ms between timing events.
 */
export default function stabilize() {

    const proto = PerformanceTiming.prototype;

    timings.forEach(name => {
        // Grab the next time from our stabilized Date step.
        const when = name.startsWith('redirect') ? 0 : now();

        // Override the API to return the stabilized time.
        const descriptor = Object.getOwnPropertyDescriptor(proto, name);
        if (descriptor) {
            descriptor.get = new Proxy(descriptor.get, {
                apply: () => when
            });
            Object.defineProperty(proto, name, descriptor);
        }
    });

}