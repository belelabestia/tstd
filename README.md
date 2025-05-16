# TypeStandard - a low-arch TypeScript standard library

`tstd` (TypeStandard) is a tiny library (one could call it a micro-library) aiming at highlighting and easing the use of a particular set of language features, which can successfully manage 100% of what can be achieved by that language, while completely ignoring some others that at the end of the day are just different fancier names for specific use cases.


## Principles

`tstd` facilitates lean procedural code without sacrificing the overall type-safety and testability of the code.
It focuses on the following principles.

### Master short-circuiting

Guards, early exiting, negative-space programming, defensive programming; all these names refer to the very basic principle of using flow at our own advantage to gradually simplify the mental model of the problem by handling most exceptional cases first and falling back on the more general ones in a funnel of possibilities. This concept is closely related to the concept of _narrowing_.

### Dry the syntax, not the code

JS has many overlapping syntax constructs and language features. Most of them be completely ignored without suffering their lack at all. A static class can be just a module. A dynamic one is just a closure. Inheritance can be completely replaced by composition. Hierarchies (and enums) can be replaced by algebraic types.

### Treat features as such

TypeScript doesn't really make a good job in becoming Scala, Haskell or Gleam, but it can do an excellent job in becoming Go or Zig, if you completely omit the topics of performance or memory management. Type narrowing can completely replace your casting functions and boolean type guards should be perfectly able to replace complex schema validation libraries. `tstd` is designed to facilitate that.

### Maximise type inference

If a function is used in the code and it changes its return type, the function shouldn't break; it's the code that uses that function that should. Type inference achieves that perfectly. The only exception is type guards, that need to be explicit by language spec.

## Warning

For now, this is a research project. If you like its principles I suggest you just copy my approach or parts of the code.

## Installation

For now, the focus is entirely on the code, leaving the complexities of building, packaging, and publishing aside. To use this library, simply clone it as a Git submodule.

## Style

To get the most out of `tstd` you should be coding by these style rules; I might provide an eslint file at some point.

- Function names are the only level of abstraction truly needed.
- Except for type guards, never declare return type.
- Use `const` whenever possible; use `let` when reassignment is needed.
- Do not use `function`, `class`, `constructor`, `this`, `new` as they provide redundant constructs.
- Consequently, do not use `extends`, `super` as no one needs class hierarchies.
- Always use `type` over `interface` as they have too much overlap and `type` covers everything.
- Export module members individually while declaring them over any other `export` syntax.
- Import modules with `import * as`; keep them small or re-export the needed members to optimize tree-shaking.
- Whenever a module has a dynamic dependency, turn it into a "class" (or "dynamic module") by exporting an `init` function.
- Prefer flow over callbacks.
- Use `defer` to avoid template-flow higher-order functions.
- Return as early as possible.
- Boil-up decision making by using `Union`.
- Only use `Union` when all branches have a truthy value type, otherwise use simple `null` checks.
- Use `$try` to convert `try/catch` to a `Union`.
- Use type narrowing (`x is T`) over parsing (`return x as T`) for validation.
