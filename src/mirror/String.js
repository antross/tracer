import mirror from './mirror.js';
import Proxy from './Proxy.js';
import Reflect from './Reflect.js';

const MirrorString = mirror(String);

[
    'charAt',
    'concat',
    'normalize',
    'padEnd',
    'padStart',
    'repeat',
    'replace', // TODO: fix Symbol.replace causing self-tracing
    'slice',
    'substr',
    'substring',
    'toLowerCase',
    'toUpperCase',
    'trim'
].forEach(mirrorResult);

/**
 * Wraps the specified method to return new instances of `MirrorString`.
 * @param {string} method The name of the method to wrap. 
 */
function mirrorResult(method) {
    MirrorString.prototype[method] = new Proxy(MirrorString.prototype[method], {
        apply: (target, obj, args) => {
            return new MirrorString(Reflect.apply(target, obj, args));
        }
    });
}

export default MirrorString;
