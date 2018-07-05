/**
 * Provides a mirrored version of the static `Reflect` APIs.
 * These can be used outside of `ignore` without being traced.
 * @type {Reflect}
 */
const R = {};

Object.getOwnPropertyNames(Reflect).forEach(name => R[name] = Reflect[name]);

export default R;
