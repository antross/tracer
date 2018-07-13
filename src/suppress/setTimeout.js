import Reflect from '../mirror/Reflect.js';
import Trace from '../trace.js';
import { handle } from '../watch.js';

/**
 * Map traces for `setTimeout` to omit the returned timer ID.
 * This normalizes Firefox traces since it starts at `2` instead of `1`.
 * It also reduces noise due to extra `setTimeout` calls between traces.
 * Similarly, the ID passed to `clearTimeout` is omitted.
 */
export default function suppress() {

    handle('clearTimeout', {
        apply: (target, obj, args) => {
            const result = Reflect.apply(target, obj, args);

            // Omit the arguments to exclude the ID from the trace.
            new Trace().apply(obj, 'clearTimeout', []);

            return result;
        }
    });

    handle('setTimeout', {
        apply: (target, obj, args) => {
            const result = Reflect.apply(target, obj, args);

            // Omit the `result` parameter to set it to `undefined`.
            // This causes the result to be excluded from the trace.
            new Trace().apply(obj, 'setTimeout', args);

            return result;
        }
    });
}
