import normalize from '../src/normalize.js';
import stabilize from '../src/stabilize.js';
import suppress from '../src/suppress.js';
import {ignore, save} from '../src/trace.js';
import watch from '../src/watch.js';

const _setTimeout = setTimeout;

normalize();
stabilize();
suppress();

ignore(() => watch(window));

window.done = () => {
    _setTimeout(() => {
        callback(save());
    }, 0);
};
