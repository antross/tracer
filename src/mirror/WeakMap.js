import mirror from './mirror.js';
import MirrorMap from './Map.js';

const MirrorWeakMap = mirror(WeakMap);

/**
 * In Firefox, instances of some native objects are not allowed as `WeakMap`
 * keys. This function detects and works around that for `MirrorWeakMap` by
 * falling back to a `Map` instance instead (leaks memory).
 * TODO: only fallback to `Map` for blocked keys to minimize leaks.
 * 
 * @returns {WeakMapConstructor} The mirror `Map` or `WeakMap` constructor
 */
function fixBlockedWeakMapKeys() {
    try {
        const wm = new WeakMap();
        wm.set(performance.navigation, 1);
        wm.set(performance.timing, 1);
        wm.set(new WebKitCSSMatrix(), 1);
        return MirrorWeakMap;
    } catch (e) {
        if (e.message !== 'cannot use the given object as a weak map key')
            throw e;

        return MirrorMap;
    }
}

export default fixBlockedWeakMapKeys();
