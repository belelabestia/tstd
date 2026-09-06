# claude.md

`tstd` is a research library about a way of writing typescript, not a utility belt. the ideas are the product; the code exists to demonstrate them. so a change that works but reads wrong is a failed change.

two documents govern this repo, and both are binding:

- `readme.md` — the principles and the style rules. it is a **specification**, not aspiration. code that contradicts it is a bug, and so is a rule you follow only halfway.
- `.claude/style-kb.md` — 65 worked entries, each grounded in a real line here, in ❌ instead of / ✅ do form. **read it before writing anything**, including prose. it also carries the open work at the top.

when the two disagree, say so instead of picking one silently.

## how to work here

- read `readme.md` and `.claude/style-kb.md` first. they are short.
- match the surrounding code exactly: naming, comment density, blank lines, idiom.
- do not add tooling. no eslint, no prettier, no bundler, no test framework, no `.editorconfig`. the readme says an eslint ruleset "might" come; that is the author's call, not a gap to fill.
- do not add features the readme rejects. see **what to refuse** below.
- when a design decision is genuinely open, ask. the author rules on it, and the ruling goes into the kb with its reasoning.

## commands

```
npm test     # tsc --noEmit over all of src, then tsx --test
npm run build
npm start    # tsc --watch, emit only
```

- `tsconfig.json` includes all of `src` — the editor and the typecheck. `tsconfig.build.json` narrows to `src/index.ts` and is the only thing that emits, which keeps specs out of `dist`.
- typescript is **7.x**, the native compiler. it needs `types` and `rootDir` stated explicitly; both are set, do not remove them.
- `.vscode/settings.json` pins the editor to the workspace compiler. without it vs code uses its own and disagrees with `npm test`.
- `.gitattributes` forces lf. plain `git add` is safe. never change a global or system git setting to work around line endings.

## verifying

types are the product, so a claim about a type is a claim to be checked.

- `npm test` typechecks every spec before running it. a spec that only asserts at runtime asserts nothing about the types.
- assert a type positively by assignment (`const x: Expected = ...`) and negatively with `// @ts-expect-error`, which fails the build when the type stops being wrong.
- **judge a typecheck by its exit code, never by grepping its output.** typescript 7 colourises, so escape codes sit between "error" and "TS" and a grep for `error TS` silently finds nothing. use `npx tsc --noEmit --pretty false` and read `$?`.
- never say inference "works" without having compiled it. a scratch spec, checked and deleted, is the cheap way.
- report what actually happened, including what you did not do.

## the rules

these compress `.claude/style-kb.md`. go there for the examples.

### files

- one concept per file, types and values together, file named after its export. there is no `types.ts` and there must never be one.
- specs sit beside their source: `iso.ts` + `iso.spec.ts`.
- `src` is flat. add a directory only when a module truly grows sub-modules.
- `index.ts` only re-exports. flat for unique names, `export * as x` for modules whose members are generic words (`is`, `form`, `iso`).
- lowercase filenames, always.
- relative imports carry the `.js` extension. this is esm.

### naming

- the same word, case-distinguished, for a type and its factory: `Branch`/`branch`, `Result`/`result`.
- when a module has two candidate types, the module's name goes to **what the caller gets back**, not to what it takes. `Lease` is the outcome; the argument record stays inline and unnamed, even when that duplicates it across `sync` and `async` — `scope` duplicates its two signatures too.
- construct every branch of one union the same way. mixing `branch('open', ...)` with `result.success(...)` in one function reads as two unions.
- namespace by nesting an object, never by prefixing a name: `result.success`, not `successResult`.
- the container carries the prefix: `is.number`, not `isNumber`.
- one word, no category suffixes. no `flattenType`, no `validators`, no `resultUtils`.
- name a module after what it literally is — `Json` is js object notation, `iso` is iso 8601 notation.
- name a conversion after its **source**, not its destination: `fromTimestamp`, not `toDate`. a destination name is fine only when exactly one route exists.

### keywords

- `export const` at the declaration. no trailing `export {}` blocks, except `index.ts`.
- arrow consts only. no `function`, `class`, `constructor`, `this`, `new`, `extends`, `super`.
- `type`, never `interface`.
- `make` owns every instantiation there is, native constructors included, even ones that cannot throw. the instance never escapes the module that built it.
- `const` even when the value mutates; `let` only when reassignment is the design.

### types

- never declare a return type. the one exception is a type guard, where `x is T` cannot be inferred.
- `as` only where it is the only way to obtain a peculiar typescript behavior — branding a computation a brand already proved, or writing into a generic mapped type. it needs no comment; this rule is the comment.
- tagged unions come from `Union<{ ... }>`, never hand-written.
- wrap anything a reader will hover in `Flat`.
- brand the requirement, not the type: `Brand<'Trimmed'>` composed with `&`, never one branded type per shape.
- when a guard checks more than its type can say, brand it — `is.number` narrows to `Finite`.
- `satisfies` for literals that must keep their inferred type: schemas, forms, encode bodies.
- values from outside are `unknown` and stay `unknown`. carry the error, do not normalise it.

### guards

- the body is one boolean expression, one condition per line, operator leading. it stays an expression so boolean algebra keeps matching type algebra.
- compose with `&&` and `||`. there are no combinators and there will be none.
- narrow, never parse. validation does not allocate.
- narrowing applies to references, not to literal expressions. bind to a variable first.

### flow

- return early, in a funnel. no `else` unless both boolean cases are meaningful; no `switch` unless the union is total.
- absence beats a branch. reach for `branch` only when presence/absence cannot carry it.
- never tell `null` and `undefined` apart. presence and absence.
- `try`/`catch` exists only inside `make` and `scope`. business code has none.
- never hide flow behind data. no `map`, `andThen`, `unwrap`, `match` on a branch.
- "callbacks only as entrypoints" is about *your* code, not about the boundary modules. `make`, `scope` and `lease` take functions because they **are** the entrypoint — they are where `try`/`catch` lives. taking a function is not the thing being warned against; sequencing with functions is.
- a function that cannot fail returns an unboxed value, not a result.
- narrowing owns every failure; what comes after it is total. that is why decoding never fails.
- a dependency is a resource that must be established once, like a connection — that gets an `init`. everything else is a **value** and travels as an argument, the way a schema and a zone do.

### comments

- source files carry `/** one line, lowercase, no period */` on exports and **no `//` comments at all**. no `@param`, no `@returns`, no `@example`.
- a doc comment says what a thing is *for*. the signature already says what it takes.
- the teaching goes in the spec: a `/* */` essay at the top, then narration above the lines it explains.
- lowercase prose everywhere. headings, commit messages, ci step names, comments.
- **no em dashes.** not in comments, not in the readme, not in commit messages, not in this file. use parentheses for an aside, a colon to introduce, a semicolon to join two clauses that belong together, or rewrite the sentence so it does not need one. the same goes for en dashes used as punctuation.

### specs

- the spec is a tutorial that happens to execute. flat `test()` calls from `node:test`, no `describe`, no hooks, no mocks — a closure is a fake.
- test names are capability sentences: `'safely navigate the unknown'`, not `'model() returns false for arrays'`.
- narrow with `if (!guard(x)) assert.fail()`, which demonstrates the technique instead of merely testing it.
- show the shape: a nested form declaration should read like the payload it describes.

## what to refuse

these are settled. do not propose them again without the author raising it first.

- a linter, a formatter, a bundler, another test framework
- `map`/`andThen`/`unwrap`/`match`, or anything else that sequences results
- guard combinators — `union`, `or`, `optional`, `refine`
- codecs that validate and convert in one step, `Either`, error accumulation
- a `types.ts`, a `utils.ts`, or grouping files by kind
- calendar-aware durations (`P1M`), local-time construction, or anything that resolves an ambiguity by guessing
- declared return types, `interface`, `any`

the test for a new helper: does it *compose* things, or does it only write lines the caller would have written identically? `form.nest` passes because it writes three fixed lines. a combinator fails. **write the boilerplate, don't invent an operator.**

## git

- lowercase, imperative, two to four words: `update result api`, `accept symbol as branch key`. no conventional-commit prefixes, no scopes, no bodies.
- one commit per decision. if a message describes half the diff, split it.
- version bumps are their own commit, named just the version. tags drive publishing.
- ci runs `npm test` before it builds and publishes. keep it that way.
- commit or push only when asked.
