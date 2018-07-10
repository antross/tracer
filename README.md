# tracer

## Interoperability

A collection of interoperability differences found while building this project.

### `setTimeout`

1. In Firefox, the IDs returned from calling `setTimeout()` begin at `2`.
   Chrome and Edge begin at `1`.

### Regular Expressions

1. In Chrome and Firefox, `RegExp.prototype.test()` invokes
   `RegExp.prototype.exec()` when called. Edge does not.
2. In Chrome and Firefox, `String.prototype.match()` invokes
   `RegExp.prototype.global` and `RegExp.prototype.exec()` when called.
   Edge does not.

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
