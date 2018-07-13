import Proxy from '../mirror/Proxy.js';
import Reflect from '../mirror/Reflect.js';
import { ignore as _ignore } from '../trace.js';

// Workaround webpack adding Object() references which break tracking.
const ignore = _ignore;

/**
 * Make `Function.prototype.toString` consitent by serializing "[native code]"
 * on a single line. Firefox normally serializes this text on a separate line.
 * Edge and Chrome both match the normalized behavior.
 */
export default function normalize() {
    if (`${Date}`.indexOf('\n') === -1)
        return; // Only run if needed

    Function.prototype.toString = new Proxy(Function.prototype.toString, {
        apply:(target, obj, args) => {
            return ignore(() => Reflect.apply(target, obj, args).replace(/\s+(\[native code\])\s+/, " $1 "));
        }
    });
}
