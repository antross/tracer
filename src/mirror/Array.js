import mirror from './mirror.js';
import Proxy from './Proxy.js';
import Reflect from './Reflect.js';

const MirrorArray = mirror(Array);

[
    'concat',
    'filter',
    'map',
    'slice',
    'splice'
].forEach(mirrorResult);

/**
 * Wraps the specified method to return new instances of `MirrorArray`.
 * @param {string} method The name of the method to wrap. 
 */
function mirrorResult(method) {
    MirrorArray.prototype[method] = new Proxy(MirrorArray.prototype[method], {
        apply: (target, obj, args) => {
            return MirrorArray.from(Reflect.apply(target, obj, args));
        }
    });
}

export default MirrorArray;
