import mirror from './mirror.js';

export default mirror(String, [
    'charAt',
    'concat',
    'normalize',
    'padEnd',
    'padStart',
    'repeat',
    'replace', // TODO: fix Symbol.replace causing self-tracing
    'slice',
    'substr',
    'substring',
    'toLowerCase',
    'toUpperCase',
    'trim'
]);
