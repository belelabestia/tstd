# type-standard (tstd) - a very minimal standard library for typescript

`tstd` (type-standard) is a tiny library aiming at highlighting and easing the use of a particular set of language features, which can successfully manage 100% of what can be achieved by that language, while completely ignoring some others that at the end of the day are just different fancier names for specific use cases.

## principles

`tstd` facilitates lean procedural code without sacrificing the overall type-safety and testability of the code; it focuses on the following principles.

### master short-circuiting

guards, early exiting, negative-space programming, defensive programming; all these names refer to the very basic principle of using flow at our own advantage to gradually simplify the mental model of the problem by handling most exceptional cases first and falling back on the more general ones in a funnel of possibilities.

this concept is closely related to the concept of _narrowing_.

### dry the syntax, not the code

javascript has many overlapping syntax constructs and language features; most of them can be completely ignored without suffering their lack at all: a static class can be just a module; a dynamic one is just a closure (a module with an `init` function); inheritance can be completely replaced by composition; hierarchies (and enums) can be replaced by algebraic types.

### treat features as such

typescript doesn't really make a good job in becoming scala, haskell or gleam, but it can do an excellent job in becoming go or zig, if you completely omit the topics of performance or memory management.

type narrowing can almost completely replace casting functions; type guards can replace complex schema validation libraries if you accept to separate the concern of type-mapping (encoding/decoding).

`tstd` is designed to facilitate that.

### maximize type inference

if a function is used in the code and it changes its return type, its signature shouldn't break; it's the code that uses that function that should; type inference achieves that perfectly.

specifying the return type of a function can only be useful when that's the only way for the language to know about our branding intentions, i.e. in type guards.

## warning

this is a research project; if you like its principles i suggest you just copy my approach or parts of the code.

the same goes if you feel like there are too many lacking features: feel free to try to implement those without sacrificing the radical minimalism that this approach embodies.

## installation

this library is built as js modules with `tsc` and can be installed via its github registry.

## style

to get the most out of `tstd`, you should consider to learn to code with the following style rules; i might provide an eslint ruleset at some point.

- function and object names are the only level of abstraction truly needed
- avoid any template method, strategy pattern or inversion of control
- except for type guards, never declare return types

- use `const` whenever possible, even when mutation occurs; use `let` when reassignment is by design
- avoid `function`, `class`, `constructor`, `this`, `new` as they provide redundant constructs
- consequently, do not use `extends`, `super` as no one needs class hierarchies
- always use `type` over `interface` as they have too much overlap and `type` covers everything

- export module members individually while declaring them; avoid any other `export` syntax
- use `index.ts` files to manipulate module structure for the convenience of the consumer
- use lowercase for module names or api containers: no one wants to use the shift key in order to help intellisense help them
- for namespacing, prefer nesting over prefixing or postfixing
- whenever a module has a dynamic dependency, make it dynamic by exporting an `init` function

- always prefer flow over callbacks; use callbacks only as entrypoints
- delegate decisions to the caller by using `branch` and `Union`
- return as early as possible
- avoid `else` unless you're dealing with a boolean that's meaningful in both cases
- avoid `switch` unless you're dealing with a union that's meaningful in all cases
- use `branch` only if checking against presence or absence of a return value isn't enough

- prefer type narrowing (`x is T`) to parsing (`return x as T`) for validation as it is a cheaper abstraction
- native errors and values from outside are `unknown` by design: don't try to fix this, just narrow their type
