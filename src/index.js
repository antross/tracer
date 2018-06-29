import { actions, ignore } from './trace.js';
import watch from './watch.js';

window._actions = actions;
ignore(() => watch('', window));
