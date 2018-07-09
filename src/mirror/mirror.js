
// Cache references to native APIs.
// Avoids being influenced by overrides later.
const apply = Reflect.apply;
const construct = Reflect.construct;
const defineProperties = Object.defineProperties;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const Array_forEach = Array.prototype.forEach;
const NativeProxy = Proxy;
const WeakMap_get = WeakMap.prototype.get;
const WeakMap_set = WeakMap.prototype.set;
const __proto__set = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;

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
 * @param {string[]} [spawnMethods] Methods which return new instances of NativeType.
 * @return {T} A mirror type tied to the provided.
 */
export default function mirror(NativeType, spawnMethods) {

    // Check for previously mirrored types if available.
    let MirrorType = apply(WeakMap_get, mapNativeToMirror, [NativeType]);

    // Otherwise create a new mirrored type.
    if (!MirrorType) {

        // Handle constructors vs. static objects appropriately.
        if (typeof NativeType === 'function') {
            MirrorType = mirrorFunction(NativeType, spawnMethods);
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
 * @param {string[]} [spawnMethods] Methods which return new instances of NativeType.
 * @return {T} The mirrored type.
 */
function mirrorFunction(NativeType, spawnMethods) {

    // A constructor to be the public entry point for the mirrored type.
    function MirrorType(...args) {
        return mirrorInstance(MirrorType, construct(NativeType, args));
    }

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

    } else {

        // Special-case `Proxy` to `undefined`.
        MirrorType.prototype = NativeType.prototype;

    }

    // Handle methods which return new instances of NativeType.
    if (spawnMethods) {
        mirrorResult(MirrorType, spawnMethods);
    }

    return MirrorType;
}

/**
 * Ties the provided native instance to the specified mirrored type.
 */
function mirrorInstance(MirrorType, nativeInstance) {
    if (MirrorType.prototype) {
        apply(__proto__set, nativeInstance, [MirrorType.prototype]);
    }
    return nativeInstance;
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

/**
 * Wraps the specified methods to return new instances of the mirrored type.
 * Used for types like `Array` on methods like `concat`, `map`, etc.
 * @param {Function} MirrorType The type to wrap methods for.
 * @param {Function[]} methods The names of the methods returning new MirrorType instances.
 */
function mirrorResult(MirrorType, methods) {
    apply(Array_forEach, methods, [(methodName) => {
        MirrorType.prototype[methodName] = new NativeProxy(MirrorType.prototype[methodName], {
            apply: (target, obj, args) => {
                return mirrorInstance(MirrorType, apply(target, obj, args));
            }
        });
    }]);
}
