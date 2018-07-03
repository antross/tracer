/**
 * Stabilize platform behavior by overriding global, non-deterministic APIs.
 * Overridden APIs are altered to produce deterministic behavior.
 */
export default function stabilize() {

    // Make Math.random() step from 0 to 1 in 0.01 increments, then repeat
    let random = 0;
    Math.random = function() {
        random = (random + 1) % 100;
        return random / 100;
    };

    // Make Date(), new Date(), and Date.now() increment by 100ms each call
    let d = 1528327767458;
    const now = () => d += 100;

    Date.now = new Proxy(Date.now, { 
        apply: () => now()
    });

    Date = new Proxy(Date, {
        apply: () => `${new Date()}`,
        construct: (t, a, n) => Reflect.construct(t, a.length ? a : [now()], n)
    });

    // Make performance.now() increment by 100ms each call
    let n = 0;
    performance.now = new Proxy(performance.now, {
        apply: () => n += 0.1
    });

}
