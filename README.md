# tracer

A library and collection of browser extensions for tracing the execution flow
of web pages running in the browser. These traces are stabilized against
non-deterministic behavior and normalized where minor "safe" differences occur.
Resulting traces can be loaded in a "diff" utility to look for differences
between browsers. Ultimately the goal is to simplify discovering the root cause
of site compatibility issues which occur in some, but not all major browsers.

## Interoperability

A collection of interoperability differences found while building this project.

### `document.location`

1. In Edge, `document.location` and most properties on it are configurable.
   In Chrome and Firefox they are not.

### `history.state`

1. In Edge, `history.state` returns a new instance each call.
   Chrome and Firefox return the same instance each call (for the same state).

### `navigator.serviceWorker`

1. When private browsing in Chrome, `navigator.serviceWorker` exists and works.
   In Edge and Firefox, this is `undefined`, and `'serviceWorker' in navigator`
   returns `false`. All browsers support this when browsing normally.

### `setTimeout`

1. In Firefox, the IDs returned from calling `setTimeout()` begin at `2`.
   Chrome and Edge begin at `1`.

### `Array`

1. In Chrome and Firefox, operations on `Array.prototype` which produce a new
   `Array` (e.g. `Array.prototype.slice()` invoke `new Array()` when called.
   Edge does not.

### `Number`

1. In Edge, `Number.prototype.toLocaleString()` invokes `Map.prototype.get()`
   when called. Chrome and Firefox do not.
2. Subtle floating-point differences exist between browsers.
   For example, a JavaScript UUID approach using `(0.01).toString(36)` returns
   * `"0.0cyk5rcyk5ra"` in Chrome
   * `"0.0cyk5rcyk5r9k"` in Edge
   * `"0.0cyk5rcyk5re"` in Firefox

### `RegExp`

1. In Chrome and Firefox, `RegExp.prototype.test()` invokes
   `RegExp.prototype.exec()` when called. Edge does not.

### `String`

1. In Chrome and Firefox, `String.prototype.match()` invokes
   `RegExp.prototype.global` and `RegExp.prototype.exec()` when called.
   Edge does not.
2. In Chrome and Firefox, `String.prototype.replace()` invokes
   `RegExp.prototype.global`, `RegExp.prototype.unicode`, and
   `RegExp.prototype.exec()` when called. Edge does not.

### `CSSStyleDeclaration.prototype`

1. In Chrome, CSS properties (e.g. `color`) are defined as fields on style
   instances instead of as getters/setters on `CSSStyleDeclaration.prototype`.
2. In Firefox, CSS properties are defined on `CSS2Properties.prototype`
   instead of `CSSStyleDeclaration.prototype`.

### `CSS` object

1. Edge only has `CSS.supports()`. Firefox has `CSS.supports()` and
   `CSS.escape()`. Chrome has both of these plus many other properties.
2. In Edge and Firefox `typeof CSS === 'object'`.
   In Chrome `typeof CSS === 'function'`.

### `URL` function

1. In Chrome, static methods on `URL` (e.g. `URL.createObjectURL()`) throw an
   error if invoked against another object (e.g. a `Proxy`).
   Edge and Firefox do not.

### `Map` and `WeakMap`

1. In Firefox, `Map` and `WeakMap` throw an error when attempting to use either
   `performance.timing` or `performance.navigation` as keys.

### `Proxy`

1. In Firefox and Edge, calling `Function.prototype.toString()` on a `Proxy`
   throws an error. Chrome does not.
2. In Chrome, calling `Function.prototype.toString()` on a `Proxy` to a native
   function omits the function name.

### `Function.prototype.toString()`

1. In Firefox, `Function.prototype.toString()` places the text `[native code]`
   indented on a separate line. Edge and Chrome print it on a single line
   surrounded by spaces.

### `document.implementation`

1. In Edge, `document.implementation` returns a new instance each call.
   Chrome and Firefox return the same instance each call.

### `window`

1. In Chrome, `window.frames`, `window.self`, `window.top`, and `window.window`
   are all exposed as value descriptors. In Edge and Firefox these are exposed
   as getters/setters.
