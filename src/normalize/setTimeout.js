
/**
 * Make `setTimeout` and `setInterval` consistent by starting at the same ID.
 * Both Chrome and Edge start at `1`, but Firefox starts at `2`.
 * An extra call is made in Chrome and Edge so everyone starts at `3`.
 */
export default function normalize() {
    if (setTimeout(function(){}, 0) === 1) {
        setTimeout(function(){}, 0);
    }
}
