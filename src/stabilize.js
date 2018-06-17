// Stabilize platform behavior by changing non-deterministic APIs to have deterministic behavior
(function() {
    'use strict';

    // Make Math.random() step from 0 to 1 in 0.01 increments, then repeat
    let random = 0;
    Math.random = function() {
        random = (random + 1) % 100;
        return random / 100;
    };

    // Make Date(), new Date(), and Date.now() increment by 100ms each call
    const _Date = Date;
    let d = 1528327767458;
    const now = () => d += 100;
    Date.now = now;
    Date = function(...args) {
        if (!args.length) args[0] = now();
        return this instanceof _Date ? Reflect.construct(_Date, args) : _Date.apply(this, args);
    };
    Object.defineProperties(Date, Object.getOwnPropertyDescriptors(_Date));

    // Make performance.now() increment by 100ms each call
    let n = 0;
    performance.now = () => n += 0.1;

}());
