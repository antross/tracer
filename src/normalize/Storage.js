import Object from '../mirror/Object.js';
import Proxy from '../mirror/Proxy.js';

/**
 * Normalize various forms of client-based session and local storage to begin
 * in an empty state and only persist changes in memory.
 */
export default function normalize() {

    normalizeCookies();

    normalizeStorageMethods();
    normalizeWithMemoryStorage(window, 'localStorage');
    normalizeWithMemoryStorage(window, 'sessionStorage');

    // TODO: handle IndexedDB
}

function normalizeCookies() {

    const name = 'cookie';
    const proto = name in Document.prototype ? Document.prototype : HTMLDocument.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);

    // TODO: simulate client cookie behavior in memory
    descriptor.get = new Proxy(descriptor.get, { apply: () => '' });
    descriptor.set = new Proxy(descriptor.set, { apply: rv => rv });

    Object.defineProperty(proto, name, descriptor);

}

function normalizeStorageMethods() {

    Storage.prototype.clear = new Proxy(Storage.prototype.clear, {
        apply: (target, obj, args) => {
            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                delete obj[keys[i]];
            }
        }
    });

    Storage.prototype.getItem = new Proxy(Storage.prototype.getItem, {
        apply: (target, obj, args) => {
            return obj[args[0]];
        }
    });

    Storage.prototype.key = new Proxy(Storage.prototype.clear, {
        apply: (target, obj, args) => {
            return Object.keys(obj)[args[0]];
        }
    });

    const descriptor = Object.getOwnPropertyDescriptor(Storage.prototype, 'length');
    descriptor.get = new Proxy(descriptor.get, {
        apply: (target, obj, args) => {
            return Object.keys(obj).length;
        }
    });
    Object.defineProperty(Storage.prototype, 'length', descriptor);

    Storage.prototype.removeItem = new Proxy(Storage.prototype.removeItem, {
        apply: (target, obj, args) => {
            delete obj[args[0]];
        }
    });

    Storage.prototype.setItem = new Proxy(Storage.prototype.setItem, {
        apply: (target, obj, args) => {
            return obj[args[0]] = args[1];
        }
    });
}

function normalizeWithMemoryStorage(obj, name) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, name);

    const proxy = new Proxy(Object.create(Storage.prototype), {
        set: (target, p, value) => {
            target[p] = `${value}`;
        }
    });

    descriptor.get = new Proxy(descriptor.get, { apply: () => proxy });
    Object.defineProperty(obj, name, descriptor);
}
