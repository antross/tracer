
// Cache references to native APIs.
// Avoids being influenced by overrides later.
const apply = Reflect.apply;
const construct = Reflect.construct;
const defineProperties = Object.defineProperties;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const WeakMap_get = WeakMap.prototype.get;
const WeakMap_set = WeakMap.prototype.set;

/**
 * Map resolving native types to their mirrored types to avoid duplication.
 */
const mapNativeToMirror = new WeakMap();

/**
 * Provides a mirrored version of the `NativeType` constructor and prototype.
 * If `NativeType` is not a function, creates a mirror of just `NativeType`.
 * Returned objects can be used without being traced by later overrides.
 * @template T
 * @param {T} NativeType The type to mirror.
 * @return {T} A mirror type tied to the provided  
 */
export default function mirror(NativeType) {

    // Check for previously mirrored types if available.
    let MirrorType = apply(WeakMap_get, mapNativeToMirror, [NativeType]);

    // Otherwise create a new mirrored type.
    if (!MirrorType) {
        if (typeof NativeType === 'function') {
            MirrorType = mirrorFunction(NativeType);
        } else {
            MirrorType = mirrorObject(NativeType);
        }

        // And save the mapping for future use.
        apply(WeakMap_set, mapNativeToMirror, [NativeType, MirrorType]);
    }

    return MirrorType;
}

/**
 * Returns a constructor of mirrored types tied to their own mirrored prototype.
 * Created instances are still backed by the original native type.
 * Used for types like `Date`, `WeakMap`, etc.
 * @template T
 * @param {T} NativeType The native type to mirror.
 * @return {T} The mirrored type.
 */
function mirrorFunction(NativeType) {

    // A constructor to be the public entry point for the mirrored type.
    function MirrorType(...args) {
        // Return a native instance tied to the mirrored prototype.
        const nativeInstance = construct(NativeType, args);
        nativeInstance.__proto__ = MirrorType.prototype;
        return nativeInstance;
    }

    // Copy NativeType properties to MirrorType (except `prototype`).
    defineProperties(
        MirrorType,
        getOwnPropertyDescriptors(NativeType)
    )

    // Copy NativeType prototype properties to the mirrored prototype.
    defineProperties(
        MirrorType.prototype,
        getOwnPropertyDescriptors(NativeType.prototype)
    );

    return MirrorType;
}

/**
 * Returns an object with copies of all properties from the provided native object.
 * Used for types like `Math`, `Reflect`, etc.
 * @template T
 * @param {T} NativeObject The native object to mirror.
 * @returns {T} The mirrored object.
 */
function mirrorObject(NativeObject) {
    // Copy NativeObject properties to MirrorObject.
    const MirrorObject = {};
    defineProperties(MirrorObject, getOwnPropertyDescriptors(NativeObject));
    return MirrorObject;
}
