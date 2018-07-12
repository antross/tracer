import Object from '../mirror/Object.js';
import Proxy from '../mirror/Proxy.js';

/**
 * Make `Navigator.prototype.userAgent` consistent by returning Chrome's UA.
 * Also alters the related property `Navigator.prototype.appVersion` to match.
 * Note this also normalizes the OS details to be Chrome on Windows 10 on x64.
 * This change reduces noise - the vast majority of pages access this property,
 * but typically just for analytics purposes.
 */
export default function normalize() {

    const appVersion = '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36';

    override('appVersion', appVersion);
    override('userAgent', `Mozilla/${appVersion}`);

}

function override(name, value) {
    const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, name);
    descriptor.get = new Proxy(descriptor.get, { apply: () => value });
    Object.defineProperty(Navigator.prototype, name, descriptor);
}
