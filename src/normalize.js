import normalizeFunction from './normalize/Function.js';
import normalizeNavigator from './normalize/Navigator.js';
import normalizeStorage from './normalize/Storage.js';

/**
 * Normalize cross-browser differences that commonly produce noise in the logs.
 * This can occasionally cause an issue to not repro, which means it is known.
 * If so, disable normalizers until the issue repros again to identify the bug.
 * TODO: allow disabling each and every normalizer.
 */
export default function normalize() {
    normalizeFunction();
    normalizeNavigator();
    normalizeStorage();
}
