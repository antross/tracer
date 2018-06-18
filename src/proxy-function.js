(function() {

    // Check if the polyfill is needed
    try {
        if (new Proxy(Date, {}).toString() === 'function Date() { [native code] }') {
            return; // If not, exit now 
        }
    } catch(e) {
        // An exception also indicates the polyfill is needed
    }

    const proxies = new WeakMap();

    Proxy = new Proxy(Proxy, {
        construct: (target, args, newTarget) => {

            const result = Reflect.construct(target, args, newTarget);

            // Track proxies created for functions
            if (typeof args[0] === 'function') {
                proxies.set(result, args[0]);
            }

            return result;
        }
    });

    Function.prototype.toString = new Proxy(Function.prototype.toString, {
        apply: (target, obj, args) => {

            // Unwrap proxies around functions before converting to string
            if (proxies.has(obj)) {
                obj = proxies.get(obj);
            }

            return target.apply(obj, args);
        }
    });

}());
