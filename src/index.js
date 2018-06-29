import Trace from './trace.js';
import watch from './watch.js';

window._actions = Trace.actions;
Trace.ignore(() => watch('', window));
