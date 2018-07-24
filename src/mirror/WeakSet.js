import mirror from './mirror.js';
import MirrorSet from './Set.js';

const MirrorWeakSet = mirror(WeakSet);

/**
 * In Firefox, instances of some native objects are not allowed as `WeakSet`
 * keys. This function detects and works around that for `MirrorWeakSet` by
 * falling back to a `Set` instance instead (leaks memory).
 * TODO: only fallback to `Set` for blocked keys to minimize leaks.
 * 
 * @returns {WeakSetConstructor} The mirror `Set` or `WeakSet` constructor
 */
function fixBlockedWeakSetKeys() {
    try {
        const ws = new WeakSet();
        ws.add(performance.navigation);
        ws.add(performance.timing);
        ws.add(new WebKitCSSMatrix());
        return MirrorWeakSet;
    } catch (e) {
        if (e.message !== 'cannot use the given object as a weak map key')
            throw e;

        return MirrorSet;
    }
}

export default fixBlockedWeakSetKeys();
