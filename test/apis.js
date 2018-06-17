
(function(win) {

    const tracked = new Set();
    const found = [];
    const ignore = ['constructor', 'length', 'name', 'arguments', 'caller', 'call', 'apply'];

    const track = (path, obj) => {
        if (!obj || tracked.has(obj))
            return;

        tracked.add(obj);

        const prefix = path ? `${path}.` : '';
        const descriptors = Object.getOwnPropertyDescriptors(obj);
        const keys = Object.keys(descriptors).filter(k => k[0] !== '$' && ignore.indexOf(k) === -1);

        keys.forEach(key => {

            const path = `${prefix}${key}`;

            found.push(path);

            const value = descriptors[key].value;
            const type = typeof value;

            if (type === "function" || type === "object") {
                track(path, value);
            }
        });
    };

    track('', win);
    win._actions = found;
    ready = true;

}(window));
