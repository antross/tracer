import mirror from './mirror.js';

export default mirror(Array, [
    'concat',
    'filter',
    'map',
    'slice',
    'splice'
]);
