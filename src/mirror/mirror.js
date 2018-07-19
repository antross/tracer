
// Cache references to native APIs.
// Avoids being influenced by overrides later.
const construct = Reflect.construct;
const defineProperties = Object.defineProperties;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;

/**
 * Provides a mirrored version of the `NativeType` constructor and prototype.
 * If `NativeType` is not a function, creates a mirror of just `NativeType`.
 * Returned objects can be used without being traced by later overrides.
 * @template T
 * @param {T} NativeType The type to mirror.
 * @return {T} A mirror type tied to the provided.
 */
export default function mirror(NativeType) {

    // An object/constructor to be the public entry point for the mirrored type.
    const MirrorType = typeof NativeType !== 'function' ? {} : function(...args) {
        return construct(NativeType, args, MirrorType);
    };

    // Copy NativeType properties to MirrorType (except `prototype`).
    const descriptors = getOwnPropertyDescriptors(NativeType);
    delete descriptors.prototype;
    defineProperties(MirrorType, descriptors)

    if (NativeType.prototype) {

        // Copy NativeType prototype properties to the mirrored prototype.
        defineProperties(
            MirrorType.prototype,
            getOwnPropertyDescriptors(NativeType.prototype)
        );

    } else if (MirrorType.prototype) {

        // Special-case `Proxy` to `undefined`.
        MirrorType.prototype = NativeType.prototype;

    }

    return MirrorType;
}
