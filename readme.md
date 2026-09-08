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

### distrust what the types cannot say

a signature is the whole contract, so a construct that carries a requirement the signature cannot express will typecheck cleanly and fail at runtime. two of them are worth naming, because between them they are the reason for most of the keyword rules below.

a method's `this` requirement is invisible. a class method is typed `(x: boolean) => string`, with no trace of the instance it needs, so tearing it off its object and passing it somewhere else compiles and then throws when called. annotating the receiving parameter `this: void` does not catch it either: that rejects only a function which declares a `this` parameter explicitly, and a class method never declares one. no guard can recover the information at runtime, because a function's use of `this` is not observable; only its source text is, and reading source text is not narrowing.

a thrown exception is invisible in exactly the same way. nothing in `(x: string) => number` admits that the call can fail, so a throwing call typechecks and takes the process down.

this is why constructors, `this` and `try`/`catch`/`finally` are confined to `make` and `call` rather than merely discouraged. those two are the only places the unsafety is allowed to exist, and their job is to convert it into something the types can state: a `Result` that the signature returns. `scope` adds no `try` of its own; it is built out of `call`.

## warning

this is a research project; if you like its principles i suggest you just copy my approach or parts of the code.

the same goes if you feel like there are too many lacking features: feel free to try to implement those without sacrificing the radical minimalism that this approach embodies.

## installation

this library is built as js modules with `tsc` and can be installed via its github registry; it ships as esm only.

point the scope at the registry in your `.npmrc`:

```
@belelabestia:registry=https://npm.pkg.github.com
```

then install as usual:

```
npm i @belelabestia/tstd
```

github packages wants a token even for public ones, so you might need a `//npm.pkg.github.com/:_authToken=...` line too.

## style

to get the most out of `tstd`, you should consider to learn to code with the following style rules; i might provide an eslint ruleset at some point.

### abstractions

- function and object names are the only level of abstraction truly needed
- avoid any template method, strategy pattern or inversion of control whenever possible
- except for type guards, never declare return types

### keywords

- use `const` whenever possible, even when mutation occurs; use `let` when reassignment is by design
- avoid `function`, `class`, `constructor`, `this`, `new`: they are redundant constructs, and a method also carries a `this` requirement that its type never mentions
- `make` owns every class instantiation there is, native ones included; the instance never escapes the module that built it
- consequently, do not use `extends` or `super` as no one needs class hierarchies
- always use `type` over `interface` as they have too much overlap and `type` covers everything

### modules

- export module members individually while declaring them; avoid any other `export` syntax
- write the `.js` extension in relative imports: this is esm
- use `index.ts` files to manipulate module structure for consumer convenience
- use lowercase for module names or api containers: no one wants to use the shift key in order to guide intellisense
- for namespacing, prefer nesting over prefixing or postfixing
- whenever a module has a dynamic dependency, make it dynamic as well by exporting an `init` function
- a dependency is a resource that has to be established once, like a connection; everything else is a value and travels as an argument, the way a schema does
- make dynamic modules (i.e. objects with function properties) short-lived and narrow-scoped
- stick to obviously serializable primitives for long-lived objects such as models or props objects

### flow

- always prefer flow over callbacks; use callbacks only as entrypoints
- `try`, `catch` and `finally` appear only inside `make` and `call`: a throw is as invisible to a signature as a `this` requirement, so it gets turned into a `Result` at the boundary instead of travelling as flow
- never hide flow behind data: no `map`, `andThen`, `unwrap` or `match` on a branch
- a function that cannot fail returns an unboxed value, not a result
- delegate decisions to the caller by using `branch` and `Union`
- return as early as possible
- avoid `else` unless you're dealing with a boolean that's meaningful in both cases
- avoid `switch` unless you're dealing with a union that's meaningful in all cases
- use `branch` only if checking against presence or absence of a return value isn't enough
- do not waste time telling `null` and `undefined` apart; just reason in terms of presence/absence

### types

- prefer type narrowing (`x is T`) to parsing (`return x as T`) for validation as it is a cheaper abstraction
- `as` is allowed exactly where it's the only way to obtain a peculiar typescript behavior, as in `branch`
- native errors and values from outside are `unknown` by design: don't try to fix this, just narrow their type
- when a guard checks more than its type can say, brand the requirement, as `is.number` does with `Finite`
