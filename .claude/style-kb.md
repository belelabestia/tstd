# tstd style knowledge base

working notes behind `CLAUDE.md`. every entry is grounded in a real line of this repo.

## open work

### `is.json` recurses forever on a cyclic graph of plain objects

filed 2026-09-08. the vacuity hole and the `NaN` hole that stood here are ruled and fixed (o17); this one is not. it is the single case where "what `JSON.stringify` tolerates" and "what the notation can spell" give the same answer, because both refuse a cycle.

```ts
const a: any = {}; a.self = a;
is.json(a) // RangeError: Maximum call stack size exceeded
```

every node in that graph is a plain record, so the prototype test passes and `json` calls itself until the stack runs out. a guard that throws is worse than one that lies: `is.json` sits on the boundary between unknown input and `Json`, so a self-referential payload takes the process down instead of being refused, and `f5` says business code has no `try`/`catch` to catch it with. `JSON.parse` cannot build a cycle, so the reachable case is a value assembled in memory and handed to `is.json` or `form.encode` directly.

the fix wants a ruling because the obvious one is forbidden. cycle detection needs a set of visited objects, and e4 says validation does not allocate. a depth limit allocates nothing but wants a second parameter, which would make `json` the one guard in the file that does not fit `TypeGuard<T>`. do not fix it by weakening the type.

the two designs that were open on 2026-09-06 are built and ruled: resources became `src/scope.ts` (o15, then o19 and o20), and the zoned form became a recipe in `src/form.spec.ts` with the machinery in `src/iso.ts` (o16).

---

two kinds of entry:

- **house**: the repo's way. my default would have differed; the repo wins. an agent should write the ✅ side.
- **open**: where i still think the repo is wrong. flagged, not applied. needs a ruling before it goes into `claude.md`.

---

## a. files & structure

### a1. one concept per file, named after its main export: house

❌ instead of grouping by kind:

```
src/types.ts        // Branch, Union, Result, Json, Schema...
src/utils/index.ts  // branch, result, make, scope
src/validators.ts
```

✅ do one concept, types and values together, file named after the export:

```
src/branch.ts   -> Branch, Union, branch
src/result.ts   -> Result, result, make, scope
src/brand.ts    -> Brand
src/flat.ts     -> Flat
src/is.ts       -> Json, TypeGuard, Schema, Model, Finite, + guards
src/iso.ts      -> Date, Time, DateTime, Local, Duration, Timestamp, Zone, Unambiguous, + guards and operations
src/form.ts     -> Field, Fields, Encoded, Decoded, plain, nest, model, models, decode, encode
src/scope.ts    -> Scope, Exit, scope
```

a type and the factory that produces it are one concept, so they live in one file. there is no `types.ts` and there must never be one.

### a2. spec beside source, same basename: house

❌ instead of `test/branch.test.ts` or `src/__tests__/branch.spec.ts`

✅ do `src/branch.ts` + `src/branch.spec.ts`

the spec is the module's documentation; documentation lives next to what it documents.

### a3. flat `src/`, no folders until nesting earns it: house

eight modules, zero directories. my instinct would be `src/core/`, `src/types/`, `src/guards/`. don't. the readme's rule is "for namespacing, prefer nesting over prefixing". that is about *type and api* nesting (`result.success`), not directory nesting. add a directory only when a module genuinely grows sub-modules.

### a4. `index.ts` is api shaping only: house

❌ instead of re-declaring or curating names:

```ts
import { branch } from './branch.js';
export const createBranch = branch;
```

✅ do pure re-export, and choose flat vs namespaced per module:

```ts
export * from './branch.js';
export * from './brand.js';
export * from './flat.js';
export * from './scope.js';
export * from './result.js';

export * as is from './is.js';
export * as form from './form.js';
export * as iso from './iso.js';
```

`is`, `form` and `iso` are namespaced because their members are generic words (`number`, `string`, `date`, `model`, `decode`) that must not pollute the top level. everything else is flat because its names are already unique. the blank line separates the two policies; keep it.

### a5. relative sibling imports, no aliases: house

❌ instead of `import { Flat } from '@/flat'` or `'src/flat'`

✅ do `import { Flat } from './flat.js'`

no `paths` in tsconfig, no resolver config to explain. the `.js` extension is mandatory: the package is esm, `module` is `nodenext`, and the extension is what makes the emitted output loadable in node *and* directly in a browser. readme rule: "write the `.js` extension in relative imports: this is esm".

### a6. lowercase filenames, always: house

❌ instead of `Branch.ts`, `is.guards.ts`, `type-guards.ts`

✅ do `branch.ts`, `is.ts`

readme: "no one wants to use the shift key in order to guide intellisense". filenames follow the api container name exactly.

---

## b. naming

### b1. same word, case-distinguished, for type and factory: house

❌ instead of disambiguating with affixes:

```ts
export type IBranch = ...
export type BranchType = ...
export const createBranch = ...
export const makeBranch = ...
```

✅ do the same word twice:

```ts
export type Branch<B extends string | symbol, V = void> = { branch: B, value: V; };
export const branch = <B extends string | symbol, V = void>(branch: B, value?: V) => ({ branch, value: value as V });
```

note the parameter is also called `branch`, shadowing the function inside its own body. that is deliberate: the name is the concept, and there is no third word to invent. same pattern in `Result`/`result`, `Flat`, `Brand`.

### b2. namespace by nesting the object, not by prefixing the name: house

❌ instead of:

```ts
export const successResult = ...
export const errorResult = ...
export const callSync = ...
export const callAsync = ...
```

✅ do an object literal as the container:

```ts
export const result = {
  success: <X = void>(x?: X) => branch('success', x),
  error: <X = void>(x?: X) => branch('error', x)
};

export const scope = {
  sync: ...,
  async: ...
};
```

reads as `result.success(...)`, `call.async(...)`. `async` is a legal property name, so the container buys you keyword-shaped members for free.

### b3. the container carries the prefix, the member does not: house

❌ instead of `isNumber`, `isString`, `isPresent`

✅ do `export const number = ...` in `is.ts`, consumed as `is.number`

this is why `is.ts` is exported with `export * as is` rather than flattened. it also means its members shadow global type names (`number`, `string`, `boolean`); that is fine and intended inside that module.

### b4. one word, no suffix nouns: house

❌ instead of `flattenType`, `validators`, `branding`, `resultUtils`, `typeHelpers`

✅ do `flat`, `is`, `brand`, `result`

if a name needs a category suffix to make sense, the concept is not sharp enough yet.

---

## c. declarations & keywords

### c1. export at the declaration, never in a trailing block: house

❌ instead of:

```ts
const present = (x: unknown) => ...;
const absent = (x: unknown) => ...;
export { present, absent };
```

✅ do:

```ts
export const present = (x: unknown): x is {} =>
  x !== undefined &&
  x !== null;
```

readme: "export module members individually while declaring them; avoid any other `export` syntax". the one exception is `index.ts`, whose entire job is `export ... from`.

### c2. arrow consts only: house

❌ instead of `export function branch(...) { ... }`

✅ do `export const branch = (...) => ...`

`function` is banned outright. so are `class`, `constructor`, `this`, `new`, `extends`, `super`.

### c3. `type`, never `interface`: house

❌ instead of `export interface Branch<B, V> { branch: B; value: V }`

✅ do `export type Branch<B extends string | symbol, V = void> = { branch: B, value: V; };`

the single `interface` in the repo is in `flat.spec.ts`:

```ts
interface A extends Complicated<{ a: number, b: string; }> { }
```

that is not style; it is the *specimen* being flattened, chosen because `interface extends` is exactly what produces unreadable tooltips. do not read it as permission.

### c4. `new` only through `make`: house

❌ instead of touching a constructor directly:

```ts
const url = new URL(href); // throws
```

✅ do:

```ts
const url = make(URL, href);
if (url.branch === 'error') return url;
url.value.href;
```

`make` owns **every** instantiation there is, native constructors included, even ones that provably cannot throw: `iso.ts` builds its `Date` through `make(Date, ms)` and branches on the error it knows will not come. the instance never escapes the module that built it; only a branded string does. readme rule: "`make` owns every class instantiation there is, native ones included; the instance never escapes the module that built it".

note `make(Date)` with no arguments does not typecheck (TS resolves the constructor to a multi-argument overload), so reach for a static like `Date.now()` instead, which is not instantiation at all.

the deeper reason for the rule is o18, not tidiness: a method carries a `this` requirement its type never states, so a constructor hands you an object whose methods cannot safely be taken apart.

its signature is the only place `new` appears in the source:

```ts
export const make = <Args extends unknown[], Instance>(c: new (...args: Args) => Instance, ...args: Args) => { ... }
```

### c5. `const` even when the value mutates; `let` only for reassignment by design: house

✅ the canonical example, from `result.spec.ts`:

```ts
// we want to safely get a connection instance
let conn = call.sync(sdk.connect, true);
assert.equal(conn.branch, 'error');

// we can retry if it fails
conn = call.sync(sdk.connect, false);
```

`let` here because retry is the design. everything else in the repo is `const`.

---

## d. types

### d1. never declare a return type (except a type guard): house

❌ instead of:

```ts
export const branch = <B extends string, V>(branch: B, value?: V): Branch<B, V> => ...
```

✅ do:

```ts
export const branch = <B extends string | symbol, V = void>(branch: B, value?: V) => ({ branch, value: value as V });
```

rationale from the readme: if a function's return type changes, its signature should not break; the *callers* should. annotating the return type defeats that. the only legitimate annotation is `x is T`, because narrowing intent cannot be inferred:

```ts
export const string = (x: unknown): x is string =>
  typeof x === 'string';
```

### d2. tagged unions via a mapped record, not a hand-written union: house

❌ instead of:

```ts
type Result<S, E> =
  | { branch: 'success'; value: S }
  | { branch: 'error'; value: E };
```

✅ do:

```ts
export type Union<T extends Record<string, unknown>> = Flat<{ [P in keyof T]: Branch<Extract<P, string>, T[P]> }[keyof T]>;

export type Result<S, E> = Union<{ success: S; error: E; }>;
```

the record literal is the notation: `Union<{ xs: { a: number; }, s: string, m: number, l: number[], xl: void; }>`. keys are branch tags, values are payloads, `void` for an unqualified branch.

### d3. wrap anything a reader will hover in `Flat`: house

❌ instead of exposing composition chains in tooltips:

```ts
type X = Pick<Record<number, T[]>, 1 | 2 | 3>;  // hovers as the chain
```

✅ do:

```ts
export type Flat<T> = { [K in keyof T]: T[K] } & {};
```

the trailing `& {}` is load-bearing: it forces evaluation. `Union` already applies `Flat` internally, which is why branch unions hover legibly. apply it at every public type boundary.

### d4. brand the requirement, not the type: house

❌ instead of one branded type per validated shape:

```ts
type Trimmed = string & { readonly __brand: 'Trimmed' };
type Positive = number & { readonly __brand: 'Positive' };
```

✅ do a single reusable brand carrier, then compose with `&` and `|`:

```ts
declare const brand: unique symbol;
export type Brand<Name extends string> = { [brand]: Name };
```

```ts
type Truthy = Brand<'Truthy'>;
type Trimmed = string & Brand<'Trimmed'>;
type Valid = (number | Trimmed) & Truthy;
```

the point (from `brand.spec.ts`): a brand decoupled from a runtime type participates in type algebra. `Truthy` has no runtime type at all; it is a pure requirement.

### d5. brands are earned by guards, never by assertion: house

❌ instead of:

```ts
const valid = (x: unknown) => ... ;
veryStrictFunction(x as Valid);
```

✅ do, and note how boolean algebra mirrors type algebra one-for-one:

```ts
const valid = (x: unknown): x is Valid => (is.number(x) || is.trimmed(x)) && is.truthy(x);

if (valid(x1)) veryStrictFunction(x1);
```

`(A || B) && C` produces `(A | B) & C`. that correspondence is the whole technique: keep guard bodies as plain boolean expressions so it holds.

### d6. `satisfies` for schema literals, not an annotation: house

❌ instead of `const schema: is.Schema = { ... }`, which widens every guard to `TypeGuard<unknown>` and destroys `Model` inference

✅ do:

```ts
const schema = {
  a: is.number,
  b: (x: unknown) => is.model(x, {
    a: is.string,
    b: is.boolean
  })
} satisfies is.Schema;
```

same principle as d1: constrain without collapsing the inferred type.

### d7. values from outside are `unknown` and stay `unknown`: house

❌ instead of `catch (error: Error)` or `catch (e) { throw new AppError(e.message) }`

✅ do:

```ts
catch (error) {
  return result.error(error);
}
```

readme: "native errors and values from outside are `unknown` by design: don't try to fix this, just narrow their type". the error is carried, unwrapped, un-normalised, and narrowed by the caller if it cares.

---

### d8. a type is a comptime const: house

the governing idea behind every other entry in this section. a type is not documentation and not a declaration ceremony: it is an expression the compiler evaluates before your program runs. an alias is a `const` in that language, and its parameters are that const's arguments.

```ts
❌ instead of
sync: <U extends Result<unknown, unknown>>(work: (hold: <R>(x: {
  open: () => R,
  close: (r: R) => void,
  abort: (r: R) => void;
}) => Result<R, unknown>) => U) => { ... },
async: async <U extends Result<unknown, unknown>>(work: (hold: <R>(x: {
  open: () => Promise<R>,
  close: (r: R) => Promise<void>,
  abort: (r: R) => Promise<void>;
}) => Promise<Result<R, unknown>>) => Promise<U>) => { ... }

✅ do
type Resource<R> = {
  open: () => R,
  close: (r: R) => void,
  abort: (r: R) => void;
};

type Async<S> = { [K in keyof S]: S[K] extends (...args: infer A) => infer T ? (...args: A) => Promise<T> : never };

type Hold = <R>(x: Resource<R>) => Result<R, unknown>;
type Holds = <R>(x: Async<Resource<R>>) => Promise<Result<R, unknown>>;

sync: <U extends Result<unknown, unknown>>(work: (hold: Hold) => U) => { ... },
async: async <U extends Result<unknown, unknown>>(work: (hold: Holds) => Promise<U>) => { ... }
```

what follows from reading a type as a const:

- **a shape written twice is duplication**, exactly as a repeated expression is, and naming it costs one line. nobody would inline the same four-line object literal in two functions to avoid declaring a `const`.
- **naming and exporting are different decisions.** `Resource`, `Async`, `Release`, `Hold` and `Holds` are named and stay in `scope.ts`; only `Scope` and `Exit` leave it. the api surface rule is about what a caller can reach, not about what the author is allowed to name. the old wording of the naming rule ran the two together and said the argument record "stays inline and unnamed"; that was wrong and `CLAUDE.md` has been corrected.
- **a generic type is a function call.** `Async<Resource<R>>` reads as one, and it is the reason the async half is not a second copy of the sync one.
- **a computation is fine in a type.** a lookup like `Extract<U, Branch<'error', unknown>>['value']` is not cleverness; the alternative is `as` in the body, which loses what the compiler already knew (o19).
- **the same rules that govern values govern types**: one concept per name, no category suffixes, no `Type` on the end, lowercase file names, and no `types.ts`, because a const does not live in a `consts.ts` either.

## e. type guards

### e1. body is one boolean expression, one condition per line, operator leading: house

❌ instead of a statement body:

```ts
export const number = (x: unknown): x is number => {
  if (typeof x !== 'number') return false;
  return Number.isFinite(x);
};
```

✅ do:

```ts
export const number = (x: unknown): x is number =>
  typeof x === 'number' &&
  Number.isFinite(x);
```

and for a large one, group with parens on their own lines rather than reformatting into statements:

```ts
export const json = (x: unknown): x is Json =>
  typeof x === 'string' ||
  typeof x === 'number' ||
  typeof x === 'boolean' || (
    record(x) &&
    Object.values(x).every(json)
  ) || (
    array(x) &&
    x.every(json)
  ) ||
  absent(x);
```

the `|| (` … `) ||` shape is the house way to nest. it keeps the expression an expression, which is what preserves the algebra in d5.

### e2. compose guards with `&&`/`||`, never with combinator helpers: house

❌ instead of shipping `is.union(...)`, `is.or(...)`, `is.literal(...)`, `is.optional(...)`

✅ do let the caller write the boolean:

```ts
// there isn't a built-in `union` in tstd
// however, combining type guards is straightforward
const isUnion = (x: unknown): x is Union => is.string(x) || is.number(x);
```

`is.spec.ts` states this explicitly. adding combinators would rebuild zod, which is the thing being avoided. when a caller needs literals they write them:

```ts
const isBArrIncl = (x: unknown): x is 'a' | 'b' | 'c' => is.string(x) && ['a', 'b', 'c'].includes(x);
```

### e3. guard, blank line, work: house

✅ from `is.model`:

```ts
export const model = <T extends Schema>(x: unknown, schema: T): x is ... => {
  if (!record(x)) return false;

  for (const key in schema) if (!schema[key](x[key])) return false;
  return true;
};
```

the blank line after the guard clause is consistent across `model` and `models`. single-statement `if` bodies stay on one line: no braces, no wrapping.

### e4. narrow, don't parse: house

❌ instead of `(x: unknown) => x as T` or a decode step that returns a new object

✅ do `(x: unknown): x is T`

readme: "prefer type narrowing (`x is T`) to parsing (`return x as T`) for validation as it is a cheaper abstraction". validation never allocates; encoding/decoding is a separate concern the library does not own.

---

## f. flow

### f1. return early, in a funnel: house

✅ from `branch.spec.ts`:

```ts
const toughDecision = (n: number) => {
  if (n < 0.2) return branch('xs', { a: 1 });
  if (n < 0.4) return branch('s', 'hello');
  if (n < 0.6) return branch('m', 2);
  if (n < 0.8) return branch('l', [1, 2, 3]);
  return branch('xl');
};
```

no `else`, no intermediate variable, no single exit point. handle exceptional cases first, fall through to the general one.

### f2. no `else` unless both boolean cases are meaningful; no `switch` unless the union is total: house

❌ instead of `if (a) {...} else {...}` for a guard

✅ do the early return

`switch` appears once, on an exhausted two-branch union, and that is the sanctioned use:

```ts
switch (res.branch) {
  case 'big':
    assert.fail();
  case 'small':
    return;
}
```

### f3. absence beats a branch: house

❌ instead of tagging every outcome:

```ts
const f = (n: number) => {
  if (n > 0.8) return branch('big', n);
  if (n < 0.2) return branch('small', n);
  return branch('none');
};
```

✅ do return nothing for the trivial case:

```ts
const onlyQualifySomeBranches = (n: number) => {
  if (n > 0.8) return branch('big', n);
  if (n < 0.2) return branch('small', n);
};
```

readme: "use `branch` only if checking against presence or absence of a return value isn't enough". the caller then narrows with a guard clause, which is cheaper to read than a third tag.

### f4. presence/absence, never null-vs-undefined: house

❌ instead of `x !== undefined`, `x === null`, `typeof x === 'undefined'` scattered through code

✅ do:

```ts
export const present = (x: unknown): x is {} =>
  x !== undefined &&
  x !== null;

export const absent = (x: unknown): x is undefined | null =>
  x === undefined ||
  x === null;
```

`present` narrowing to `{}` (not `object`, not `NonNullable<T>`) is the trick: `{}` is "anything but null/undefined". `Json` including `undefined` follows from this same rule; it is not an oversight.

### f5. `try`/`catch` exists only inside `make` and `call`: house

❌ instead of try/catch at call sites, or a `Result`-returning wrapper per api

✅ do push the boundary into the two utilities and use flow everywhere else:

```ts
const res = call.sync(div, 1, 0);
if (res.branch === 'error') return res;
res.value;
```

```ts
const res = await call.async(fetchThing, url);
```

three constructs total: `make` for constructors, `call.sync`, `call.async`. business code contains no `try`. `scope` adds none of its own, it is built out of `call`. the reason this is a boundary and not a preference is o18: a throw is invisible to a signature, so it has to be converted into a `Result` somewhere, and these are the somewhere.

### f6. flow over callbacks; callbacks only as entrypoints: house

❌ instead of `result.map(...).andThen(...).unwrapOr(...)`

✅ do check the tag and return:

```ts
if (res.branch === 'error') return res;
```

there is deliberately no monadic api on `result`. do not add `map`, `andThen`, `unwrap`, or a `match` helper; the readme rejects that whole layer, and `branch`'s purpose is to "delegate decisions to the caller", not to sequence them.

this is now settled and in the readme, in two parts:

- "never hide flow behind data: no `map`, `andThen`, `unwrap` or `match` on a branch"
- "a function that cannot fail returns an unboxed value, not a result"

the second half answers what a `Result` with an impossible branch would mean: nothing, because you never write one. `Result<S, E>` carrying both branches is not over-modelling: a function returning it can genuinely do both, and one that cannot returns the bare value.

### f7. imperative loops over array callbacks in library code: house, with one open

✅ `model` and `models` both loop and return early:

```ts
for (const key in schema) if (!schema[key](x[key])) return false;
```

```ts
for (let i = 0; i < x.length; i++) if (!model(x[i], schema)) return false;
```

`for...in` for object keys, indexed `for` for arrays. see **o7** for the `is.json` inconsistency.

---

## g. comments

### g1. source files carry doc comments and nothing else: house

`branch.ts`, `brand.ts`, `flat.ts`, `is.ts`, `result.ts` contain **zero** `//` comments between them. every explanation is either a one-line `/** */` on an export or lives in the spec.

❌ instead of inline narration in source:

```ts
export const record = (x: unknown): x is Record<string, unknown> =>
  // typeof null is 'object', so exclude it
  typeof x === 'object' &&
  x !== null;
```

✅ do leave the source bare and explain in `is.spec.ts`.

### g2. one-line `/** */`, lowercase, no period, no tags: house

❌ instead of:

```ts
/**
 * Creates a branch object.
 * @param branch The branch tag.
 * @param value The payload.
 * @returns A Branch<B, V>.
 */
```

✅ do:

```ts
/** creates a branch object */
```

more examples, all verbatim: `/** the building block of our branching technique */`, `/** a particularly useful union type */`, `/** convenience factory api */`, `/** safely call functions */`, `/** a type-narrowing function */`. they say what the thing *is for*, never what its parameters are; the signature already does that. no `@param`, no `@returns`, no `@example`, ever.

the only multi-line doc comment states a philosophy, not an api:

```ts
/**
 * in tstd we only care about json types
 * everything else is considered custom
 */
```

### g3. the teaching comment goes at the top of the spec, as a block: house

❌ instead of a `docs/` folder or a long readme section per module

✅ do open the spec with a `/* */` essay:

```ts
/*
  a little bit of theory

  branching is a technique that never really got popularized enough in the js world;
  sure, we have many kinds of runtime type checks but they aren't really ergonomic at all.

  branching simplifies pattern matching by creating a flexible return type
  that makes it easy for ts to infer types while still relying on very basic runtime checks.
*/
```

note `/*` not `/**`: it is prose for a human reading the file, not api documentation. semicolons join clauses; sentences do not start with capitals.

### g4. spec comments are second-person teaching, placed above the line they explain: house

❌ instead of `// arrange` / `// act` / `// assert`

✅ do narrate:

```ts
// here we have an operation that might return in different ways:
```

```ts
// see how ts has inferred the return type of `toughDecision`;
// this inferred type signature can be assigned to a union-typed variable:
```

```ts
// now res might be undefined so you need to check
```

```ts
// i have a module that needs to be instantiated as a class
// but constructors can explode so i use the make utility instead of new
```

first person for motivation, second person for instruction, backticks around identifiers, trailing `:` when the next line is the payoff. the reader is a student, not a maintainer.

### g5. lowercase prose everywhere: house

readme headings (`## principles`, `### master short-circuiting`), commit messages, ci step names (`name: build and publish to github registry`), comments. no capitals at sentence start. `ts`, `js`, `c` lowercase too. keep it.

---

## h. specs

### h1. flat `test()` calls, no describe/hooks: house

❌ instead of:

```ts
describe('branch', () => {
  beforeEach(...);
  it('should return an object with branch and value', ...);
});
```

✅ do:

```ts
import { test } from 'node:test';
import * as assert from 'node:assert/strict';

test('branch everything', () => { ... });
```

`node:test` + `node:assert/strict`, imported with `import * as assert`. no jest, no vitest, no `expect`. no `describe`, no `beforeEach`, no fixtures.

### h2. test names are capability sentences: house

❌ instead of `'branch() returns { branch, value }'`

✅ do `'branch everything'`, `'branch something'`, `'brand stuff'`, `'safely navigate the unknown'`, `'validate model schemas'`, `'init safely with the make api'`, `'do resource management with the scope api'`

they read as chapter titles, because the file is a tutorial.

### h3. `assert.fail()` as a narrowing guard clause: house

❌ instead of:

```ts
assert.ok(is.number(a));
assert.equal(a as number, 1);
```

✅ do let the assertion do the narrowing:

```ts
if (!is.number(a)) assert.fail();
if (!is.string(b)) assert.fail();

// now a is a number, and b is a string
assert.equal(a, 1);
```

same shape as f1: the guard clause funnel, applied to tests. it demonstrates the technique instead of merely testing the function.

### h4. hand-rolled closures instead of mocks: house

❌ instead of `jest.fn()` / `sinon.stub()` / a `__mocks__` directory

✅ do an inline object literal of closures:

```ts
const sdk = {
  connect: (x: boolean) => {
    if (x) throw new Error();

    return {
      query: (x: boolean) => { if (x) throw new Error(); },
      close: (x: boolean) => { if (x) throw new Error(); }
    };
  }
};
```

a boolean parameter chooses success or failure. this doubles as the demonstration of "a dynamic module is just a closure".

### h5. assert the type by assignment or by argument passing: house (mechanism), open (enforcement)

✅ the two idioms:

```ts
type Res = Union<{ xs: { a: number; }, s: string, m: number, l: number[], xl: void; }>;
const res: Res = toughDecision(0.3);          // inferred type is assignable to the protocol
```

```ts
const branchIsL = (res: Res) => res.branch === 'l';
assert.ok(branchIsL(toughDecision(0.6)));      // and passable as a protocol-typed argument
```

```ts
const veryStrictFunction = (_: Valid) => { };
if (valid(x1)) veryStrictFunction(x1);         // guard output satisfies the strict parameter
```

these are the real assertions in `branch.spec.ts`, `flat.spec.ts` and `brand.spec.ts`. see **o2**: nothing currently typechecks them.

---

## i. tooling & repo hygiene

### i1. `tsc` and nothing else: house

three devDependencies: `typescript`, `tsx`, `@types/node`. no eslint, no prettier, no bundler, no vitest, no husky, no changesets, no `.editorconfig`. formatting is delegated to the editor:

```json
{
  "javascript.format.semicolons": "insert",
  "typescript.format.semicolons": "insert",
  "editor.formatOnSave": true,
  "editor.formatOnType": true
}
```

❌ do not propose adding a linter or formatter. the readme says "i might provide an eslint ruleset at some point"; that is the author's call, not a gap to fill.

### i2. scripts are one-liners: house

```json
"start": "tsc --watch",
"test": "tsx --test src/**.spec.ts",
"build": "tsc"
```

❌ instead of `"build": "rimraf dist && tsc -p tsconfig.build.json && node scripts/postbuild.js"`

✅ keep each script a single command. if a step is needed, it is appended with `&&`, not moved into a script file.

### i3. commit messages: lowercase, imperative, two to four words: house

verbatim history: `update result api`, `update result`, `accept symbol as branch key`, `support symbol as branch key`, `make json type guard recursive`, `rename modules to src`, `update readme`.

❌ instead of `feat(result): add scope api for safe function invocation` or a body paragraph

✅ do `update result api`

no conventional-commit prefixes, no scopes, no body, no footers. version bumps are their own commit named just the version (`0.1.1`, `0.1.0`), and tags drive publishing.

### i4. ci is readable top to bottom: house

lowercase step names (`checkout`, `setup node`, `install deps`, `build`, `publish`), no matrix, no cache, no reusable workflows, pinned major action versions (`@v4`). additions must match that voice.

### i5. the wide project is `tsconfig.json`; the narrow one only emits: house

❌ instead of narrowing the default config to the entry point and putting the full source in a second one:

```json
// tsconfig.json      -> include: ["src/index.ts"]
// tsconfig.test.json -> include: ["src"]
```

✅ do the opposite:

```json
// tsconfig.json       -> include: ["src"]          the editor and `tsc --noEmit`
// tsconfig.build.json -> include: ["src/index.ts"] emit only, keeps specs out of dist
```

an editor only ever auto-loads `tsconfig.json`. a file outside its `include` lands in an *inferred* project with no `@types`, which reports `node:test` and `node:assert/strict` as missing while `npm test` stays green against the other config. whatever a human opens must be in `tsconfig.json`.

### i6. typescript 7 wants two things stated explicitly: house

the native compiler stopped inferring both of these, and the failures are loud but misleading:

```json
"types": ["node"],
"rootDir": "src",
```

- without `types`, `@types` is not auto-discovered and you get `TS2591: Cannot find name 'node:assert/strict'`, plus a cascade of narrowing failures downstream, because `assert.fail()` loses its `never` return and every `if (!guard(x)) assert.fail()` stops narrowing.
- without `rootDir`, `TS5011` refuses to guess the common source directory; left unset the emit lands in `dist/src/`, which silently breaks `main: ./dist/index.js`.

the `.js` emit is byte-identical to 5.9; only two `.d.ts` differ, by an alpha-rename and union member order. also pin the editor to the workspace compiler, or it will use its own bundled one and disagree with `npm test`:

```json
"js/ts.tsdk.path": "node_modules/typescript/lib"
```

---

## j. prose voice (for readme / docs / claude.md itself)

- lowercase throughout, including headings and sentence starts
- semicolons to join clauses rather than splitting into short sentences
- first person for positions: "in tstd we prefer", "we don't like", "i suggest you just copy my approach"
- name what is being rejected, explicitly: "typescript doesn't really make a good job in becoming scala, haskell or gleam, but it can do an excellent job in becoming go or zig"
- state rules as bullets in the imperative: "avoid `else` unless you're dealing with a boolean that's meaningful in both cases"
- backtick every identifier and keyword
- be honest about scope: the `## warning` section calling this a research project sets expectations instead of overselling

❌ instead of "This library provides a comprehensive set of utilities for type-safe error handling."

✅ do "`tstd` facilitates lean procedural code without sacrificing the overall type-safety and testability of the code."

---

## k. open: my dissent, not yet applied

these are the places where i think the code contradicts the readme. each needs a ruling before it becomes a rule.

**status:** every o entry is ruled and applied on `claude-onboarding`. o6 → o6b, `is.number` → o4b, schema validation → o12, forms → o13, time zones → o14.

### o1. published output does not resolve

`module: esnext` emits `export * from './branch'`; no `"type": "module"` in the manifest. verified: `import('./dist/index.js')` fails with `Cannot find module '...\dist\branch'`.

❌ instead of extensionless specifiers in source

✅ do write `from './branch.js'` in the `.ts` files and add `"type": "module"`. plus a smoke check that stays a one-liner: `"build": "tsc && node -e \"import('./dist/index.js')\""`.

### o2. type-level assertions are never checked

`tsconfig.json` has `"include": ["src/index.ts"]`, so `tsc` never sees a spec; `tsx` strips types without checking. every assertion in **h5** is currently a no-op.

✅ do add `tsconfig.test.json` (`{"extends": "./tsconfig.json", "include": ["src"]}`) and make `test` run `tsc --noEmit -p tsconfig.test.json && tsx --test src/**.spec.ts`.

and once tsc sees the specs, negative assertions become expressible in the house idiom: a comment, zero runtime:

```ts
// @ts-expect-error a symbol branch is not expressible as a Union member
const u: Res = branch(Symbol('x'), 1);
```

### o3. ci publishes without testing

`publish.yml` goes install → build → publish. one step, in the existing voice:

```yaml
      - name: test
        run: npm test
```

### o4. `branch` accepts symbols, `Union` cannot express them

two commits widened `branch` to `string | symbol`, but `Union<T extends Record<string, unknown>>` with `Extract<P, string>` discards them. verified: a symbol branch is assignable to no `Union`.

✅ do either widen (`Record<PropertyKey, unknown>` + `Extract<P, string | symbol>`) or revert `branch` to `string`. the halves must agree.

### o5. `is.record` accepts arrays

`typeof [] === 'object'`, so `is.record([1,2])` is `true` and hands back a `Record<string, unknown>`.

✅ do add the guard where the shape claim is actually made, in house style:

```ts
if (!record(x)) return false;
if (array(x)) return false;
```

### o6. `Model` re-implements `Flat` by hand

`{ [K in keyof Model<T>]: Model<T>[K] }` appears twice in `is.ts`, which does not import `flat`. `branch.ts` already imports it.

✅ do `x is Flat<Model<T>>`: a type guard is one of the two places d1 permits an annotation, so there is no tension, only duplication.

### o4b. brand what a guard checks but its type cannot say: house (ruled)

`is.number` is now branded, overriding my recommendation in o10:

```ts
/** a number that is neither nan nor infinity */
export type Finite = number & Brand<'Finite'>;

export const number = (x: unknown): x is Finite =>
  typeof x === 'number' &&
  Number.isFinite(x);
```

my legibility objection was wrong: declaration output renders the field as `a: is.Finite`, not as `number & Brand<"Finite">`, so `Flat` still reads cleanly. arithmetic and assignment to a plain `number` both keep working, because `Finite` is an intersection *with* `number`. what changes is that a function may now demand `is.Finite` and only a checked value satisfies it.

note narrowing applies to references, not to literal expressions: `if (is.number(2)) takesFinite(2)` does not compile. narrow a variable.

readme rule: "when a guard checks more than its type can say, brand the requirement, as `is.number` does with `Finite`".

### o7. `is.json` uses `.every` while `model`/`models` loop

f7 says imperative loops; `json` uses `Object.values(x).every(json)` and `x.every(json)`.

**ruled: keep `.every`, and state the exception.** a guard body has to stay an expression (e1), because that is what keeps boolean algebra matching type algebra (d5); a `for` would force a statement body and break it. so `.every` inside a guard is sanctioned, and everywhere else you loop and return early. it is now a rule in `CLAUDE.md` rather than an accident in one file, and per o6b it goes in the docs, not in a comment.

### o8. `call.sync(instance.method, ...)` silently loses `this`

`result.spec.ts` demonstrates `call.sync(conn.value.query, true)`, which works only because the fake `sdk` returns closures. against a real class-based sdk it throws, and the throw is swallowed into `result.error`, disguising a wiring bug as a domain failure.

✅ do keep the signature and fix the teaching line:

```ts
// we can then use it; note that methods bound to `this` must be wrapped,
// as call.sync calls f detached (one more reason we don't write classes)
const res = call.sync(() => conn.value.query(true));
```

### o9. small stuff

- `result.spec.ts:2` imports `'../src/result'`; every other spec uses `'./x'`. make it `'./result'`.
- `"test": "tsx --test src/**.spec.ts"`: `src/**.spec.ts` does not match nested directories, so the first nested module's spec silently stops running. `src/**/*.spec.ts`.
- no `LICENSE` and no `license` field on a published package. "copy my approach" reads as an invitation but is not a grant.
- `## installation` does not say how to install: no `.npmrc` registry line, no note that github packages needs a token.
- typos in spec comments: `comples types`, `unkown`, `significanly`, `isBBool` (it checks `'a' | 'b' | 'c'`).

### o10. things i would not change, for the record

so the reasoning is on file: `Result<S, E>` always carrying both branches even for infallible functions (**ruled**: infallible functions return the unboxed value, so the situation never arises; see f6); the absence of `map`/`andThen`/`unwrap` (**ruled**: in the readme now, permanent); `Json` including `undefined` (**ruled**: presence/absence comes first); `is.number` rejecting `NaN` without a brand (**overruled**: it is branded now, see o4b, and my legibility objection did not survive contact with the declaration output); `branch`'s single `value as V` cast (ruled: see o6b); `Brand`'s unexported `unique symbol` (emits correctly into `brand.d.ts`).

### o6b. `as` where nothing else works: house (ruled)

readme rule: "`as` is allowed exactly where it's the only way to obtain a peculiar typescript behavior, as in `branch`". it goes in no comment: the rule lives here and in the readme, so the source stays bare per g1.

the canonical instance:

```ts
export const branch = <B extends string | symbol, V = void>(branch: B, value?: V) => ({ branch, value: value as V });
```

i tried to remove it and could not. what fails, so nobody retries it blindly:

```ts
// destructured conditional rest tuple: V is inferred fine, but value comes out V | undefined
(branch: B, ...[value]: V extends void ? [] : [V]) => ({ branch, value })

// indexed instead of destructured: identical failure, TS collapses the tuple to [] | [V]
(branch: B, ...rest: V extends void ? [] : [V]) => ({ branch, value: rest[0] })
```

both produce `value: { a: number } | undefined`, which is not assignable to a `Union` branch's `value: { a: number }`. overloading a typed const does not help either: the arrow implementation must itself be assignable to the overload, so the cast just moves. making `Branch`'s `value` optional would fix the void branch and break every consumer that reads `.value` (`url.value.href` in `result.spec.ts` for one).

so: an optional parameter is `V | undefined`, and no single arrow signature turns that back into `V`. the assertion is the price of `branch('xl')` and `branch('xs', { a: 1 })` being one function.

### o12. narrow, then map: house (ruled, and now built)

the answer to schema validation, and to why tstd has no codecs. a codec like `NumberFromString` fuses two questions: *is this parseable* and *what is the value*. split them:

> **narrowing owns every failure. mapping receives a proven value, so it is total and returns it unboxed.**

the brand is the receipt that carries the proof from step one to step two. the payoff is that one schema declares the wire form, the db form and the memory form at once, because they are the same type:

```ts
const user = { id: is.string, created: iso.datetime, every: iso.duration } satisfies is.Schema;
type user = Flat<is.Model<typeof user>>;
```

that model is `Json` by construction, so it round-trips through `JSON.parse`/`stringify` untouched, and it is still branded, so it maps without being validated again.

rules that came out of building `iso.ts`:

- **name a conversion after its source, never its destination**: there are many ways to reach a number, so `fromTimestamp`, not `toNumber`. a destination name is fine only when exactly one route exists (`toTimestamp`, `dateOf`).
- **name a module after the notation it speaks**, as `Json` does: `iso` covers date, time, datetime and duration because all four are iso 8601 lexical forms.
- **there is no in-memory form to convert to.** an instant is a branded string on the wire and in memory alike. what other libraries call a view model is just the representation that happens to suit memory better, and it is data too, not presentation.
- **durations are milliseconds, a branded number**: `number` is `Json` anyway, and `P1M` is not a fixed amount of time, so an ISO duration string would force `add` to make calendar decisions on the caller's behalf. anything calendar-aware belongs in its own module.
- **casts are expected here**: one per branded return, each branding a computation the input's brand already proved. this is o6b working as designed, not abuse of it.
- **partiality is absence**: `add` can only fail by leaving representable time, which needs no explanation, so it returns `DateTime | undefined` rather than a `Result`.
- **one canonical spelling per form, plus one explicit door.** an offset or a seconds-precision time is rejected by the guard, because a guard that silently accepted three spellings of the same instant would be deciding for the caller. normalising is a separate, deliberate call:

  ```ts
  /** the instant a foreign spelling points at, or nothing if there is none */
  export const parse = (x: string) => canonical(Date.parse(x)) as DateTime | undefined;
  ```

  strictness at the boundary was never about time zones. it is about spelling, and a foreign spelling denotes the same instant, so `parse` loses nothing; it just has to be asked for.

### o14. a zone is a value, so it travels as an argument: house (ruled, and now built)

an instant is absolute; the day it falls on is not. `2024-01-01T23:30:00.000Z` is already the second in rome, so `dateOf` has no answer until someone names a zone.

```ts
const rome = 'Europe/Rome';
if (!iso.zone(rome)) assert.fail();

iso.dateOf(x, rome);   // 2024-01-02
iso.dateOf(x);         // 2024-01-01, utc is the answer that needs no decision
```

**this was built as `iso.init(zone)` first, and that was wrong.** the readme's init rule reads like it applies, but `init` is for a *resource that has to be established once*, like a connection or a configured sdk, which is what "a dynamic one is just a closure" means. a zone is a **value**, and every configured operation in this library takes its value as a trailing argument: `is.model(x, schema)`, `is.models(x, schema)`, `form.model(x, forms)`, `form.decode(x, forms)`, `form.encode(x, forms)`, `make(c, ...args)`, `call.sync(f, ...args)`. `iso.init` was the only `init` in the whole codebase: a single exception, written by following the readme's letter against the codebase's unanimous practice.

the rule that reconciles them, now in the readme: "a dependency is a resource that has to be established once, like a connection; everything else is a value and travels as an argument, the way a schema does".

**how to tell**: if you would keep it in a variable and pass it around, it is a value. if it holds a socket, a handle, or a file, it is a resource. when in doubt, argument; a closure is the heavier choice and the readme already says to keep dynamic modules "short-lived and narrow-scoped", which is a warning, not an invitation.

note the shape this produces: an optional trailing parameter with a guard clause for its absence, defaulting to the answer that needs no decision.

```ts
export const dateOf = (x: DateTime, zone?: Zone) => {
  if (is.absent(zone)) return x.slice(0, 10) as Date;

  const part = parts(x, zone);
  return `${part.year}-${part.month}-${part.day}` as Date;
};
```

the pattern this settles, and it is the same one as everywhere else:

- **the zone is narrowed, not trusted**: `iso.zone` brands a name this runtime actually knows, so the operation receives a proven value and cannot fail. the failing step stays at the boundary, where it belongs.
- **so the operations are total**. building the `Intl` formatter goes through `make`, and one load-bearing cast reads the value the brand already proved is there.
- **utc stays the module's default.** a zone is a decision, so it is the caller's; the undecorated `dateOf` and `timeOf` answer in utc and say so.
- **reading only, at the time this was written.** o16 later added `iso.fromLocal`, which builds an instant from a local spelling without guessing: the guard refuses the ambiguous and the nonexistent ones, so what reaches the conversion names exactly one instant. the principle stands (ambiguity is never resolved by guessing); it turned out to be satisfiable.
- **narrowing applies to references, not to literals**: `if (iso.zone('Europe/Rome')) iso.dateOf(x, 'Europe/Rome')` does not compile. bind it to a variable first. same trap as o4b.

the guards need no regex; a string is a canonical instant exactly when it round-trips:

```ts
export const datetime = (x: unknown): x is DateTime =>
  is.string(x) &&
  canonical(Date.parse(x)) === x;
```

### o13. a form is the pairing, not a codec: house (ruled, and now built)

o12 split validation off. what stayed unsolved is the **third** job a codec does: `DateFromNumber` validates, converts forward, *and* remembers how to convert back. the two conversions are inverses of each other, and two functions that must stay inverses have to be declared in one place or they drift apart the first time a field is renamed. that pairing is a **form**.

```ts
export type Field<E extends is.Json, D> = {
  is: is.TypeGuard<E>,
  decode: (x: E) => D,
  encode: (x: D) => E;
};
```

declare it once, get both shapes:

```ts
const instant = {
  is: iso.timestamp,
  decode: (x: iso.Timestamp) => iso.fromTimestamp(x),
  encode: (x: iso.DateTime) => iso.toTimestamp(x)
} satisfies form.Field<iso.Timestamp, iso.DateTime>;

const user = { id: form.plain(is.string), seen: instant } satisfies form.Fields;

type encoded = form.Encoded<typeof user>;   // what travels and what gets stored
type decoded = form.Decoded<typeof user>;   // what you carry in memory
```

`form.model` / `form.decode` / `form.encode` mirror `is.model`: a record and two walkers, which is precedent the library already had. **this is not a codec, because failure does not live in it**: by the time `decode` runs the value has been narrowed, so it cannot fail and returns unboxed. no `Either`, no error accumulation, and therefore none of the combinator tower those two things force on a library. there is no `and`, `or`, `optional` or `refine`, and tstd ships no forms of its own; you write the four lines.

what to know when writing one:

- **the constraint cannot be `Record<string, Field<Json, unknown>>`**: a parameter is contravariant, so every real field is rejected. the trick, which needs its comment because it looks like a mistake:

  ```ts
  export type Fields = Record<string, {
    is: is.TypeGuard<unknown>,
    decode: (x: never) => unknown,
    encode: (x: never) => is.Json;
  }>;
  ```

  `never` in the parameter position accepts every field there is. no `any` anywhere in the module.
- **`satisfies` fires at the declaration site**, so an `encode` that stops being the inverse of `decode` is an error where you wrote it, not where you used it. verified, along with: the decoded side is not assignable to the encoded side, and a non-`Json` encoded side (a `Map`, say) is refused outright.
- **nest by calling, not by combining**: a form for a whole model is a form whose two directions call the walkers. that is always the same three lines with the same arguments, so `nest` writes them:

  ```ts
  export const nest = <T extends Fields>(forms: T) => ({
    is: (x: unknown): x is Encoded<T> => model(x, forms),
    decode: (x: Encoded<T>) => decode(x, forms),
    encode: (x: Decoded<T>) => encode(x, forms)
  });
  ```

  nest the declarations, not just the payload: a form written inline ends up shaped exactly like the json it describes, which is the whole point of it:

  ```ts
  const audit = {
    when: instant,
    of: form.nest({
      at: instant,
      by: form.nest(user)
    })
  } satisfies form.Fields;
  ```

  an inline literal and a named model nest the same way, so mixing them is free: declare a model once where it is reused, and inline the levels that exist only here.

  nesting nests, because a nested model is a field like any other, and inference survives the descent: `form.decode(x, audit).of.by.seen` is a `DateTime` three levels down, verified in both directions. this is still not a combinator: `nest` composes nothing and adds no algebra, it only writes lines you would have written yourself. that is the test to apply before adding anything else of the kind (a `list` for arrays of models, say): **write the boilerplate, don't invent an operator**.
- **`plain` covers the common case**: most fields need no form at all, because o12 made the wire type and the memory type the same type. forms are for the genuinely different in-memory shape, like an instant stored as a timestamp.

on the name: **`form`** is the author's own word for the concept ("declare their form in memory or in json"), and it passes the literalness test `Json` and `iso` set, since the module declares the form a value takes on each side. `io` was the runner-up and was rejected because it names an activity the module never performs (it reads no file and opens no socket; it is a pure function on a value someone else moved) and because it invites the io-ts comparison this design inverts. the type is `Field`, not `Form`, so `satisfies form.Field<...>` does not stutter.

### o15. a lease is a lifetime, and it branches per step: house (built by a subagent, superseded by o20)

**`lease` no longer exists.** o20 replaced it with `scope`; this entry stays because the reasoning about `close` and `abort` survived the replacement unchanged.

`make` covers building what throws, `call` covers calling it; **`lease` covers holding something you must give back**. four steps, every one of which can throw, passed as one record:

```ts
lease.sync({
  open: () => sdk.connect(false),
  use: conn => conn.query(false),
  close: conn => conn.close(false),
  abort: conn => conn.close(false)
});
```

- **`close` and `abort`, never a `finally`.** zig's `defer`/`errdefer` split, renamed: `abort` names what happens to the *resource*, where `errdefer` names *when the callback fires*. commit/rollback maps onto close/abort exactly. when the two really are the same, pass the same named function twice; that states the sameness instead of hiding it, and a single release parameter would decide it for the caller.
- **the outcome is a free branch union, not a `Result`**: `Union<{ success: V, open: unknown, use: unknown, close: unknown, abort: unknown }>`. one branch per step that can throw. `Result<V, unknown>` would erase the distinction the module exists to make: "the use failed" versus "you no longer hold the resource". every non-success payload is `unknown`, so the funnel still collapses in one line when a caller does not care.
- **decide, never accumulate.** use ok + close throws → branch `close`, and the used value is dropped. use throws + abort throws → branch `abort`, and the use error is lost: the failed call is over, the resource is still out there. that loss is the price of refusing error accumulation, and the spec says so in prose rather than hiding it.
- taking four functions is **not** the callback rule being broken. `lease` is a boundary module like `make` and `call`; it is where `try`/`catch` lives, so it is an entrypoint by construction. this was the one thing the subagent had to guess at; it is now stated in `CLAUDE.md`.

### o16. a zoned form, and the brand that names its zone: house (ruled, built by a subagent)

storing an instant the way a zone writes it down, rather than the way utc does. the kb sketched this as easy on the `encode` side and hard on `decode`; that was backwards in an instructive way.

**`decode` was solved exactly as predicted.** the field's `is` is an ordinary function, so it closes over the zone and rejects a local spelling that is ambiguous (the repeated hour) or nonexistent (the skipped one) in it. `decode` then receives a value already proven to name one instant, so it stays total and the invariant holds: narrowing owns every failure.

**`encode` was not easy.** instant to local spelling is not injective: during a repeated hour two distinct instants share one spelling, so an unbranded `encode(x: DateTime)` would claim a return type it cannot prove. the decoded side is branded too, and a caller narrows an instant before storing it.

**a bare brand was not enough.** `Brand<'Unambiguous'>` records that some zone was checked, never which one, so a spelling proven in chatham typechecked against a rome field and decoded to the first of two candidates without complaint: the silent guess this library refuses, wearing a brand that looked like proof. verified, then closed by naming the zone in the brand:

```ts
export type Unambiguous<Z extends string> = Brand<`unambiguous in ${Z}`>;

export const unambiguous = <T extends DateTime | Local, Z extends string>(x: T, zone: Z & Zone): x is T & Unambiguous<Z> => ...
export const fromLocal = <Z extends string>(x: Local & Unambiguous<Z>, zone: NoInfer<Z> & Zone) => ...
```

`NoInfer` on the trailing zone is load bearing. without it typescript has two inference sites for `Z`, reconciles them at `string`, and every cross zone call compiles again. with it, `Z` is fixed by the value and the zone argument has to match. a zone narrowed from a literal keeps its literal type, so `rome` carries `'Europe/Rome'` and gets the protection.

**a zone read at runtime does not, and the first version of this entry was wrong about it.** with a config zone `Z` infers `string`, the brand degrades to a template that matches anything, `NoInfer` has nothing left to constrain, and the cross zone call compiles again. that is not "today's behaviour": `fromLocal` was returning `instants(x, zone)[0]` from an empty array, so it handed back `undefined` wearing a proof brand, which is worse than the silent guess this entry was written to close. found by a review agent, verified, and fixed: `fromLocal` now guards on the length and admits absence. the totality it used to claim belongs to the caller that closes over one zone for both the guard and the conversion, which is what the `zoned` recipe does and says.

**the factory is not shipped.** `form.zoned` lived in `form.ts` briefly and was moved into `form.spec.ts` as a recipe, because o13 says tstd ships no forms of its own and `form.ts` has no business importing `iso.ts`. the spec is documentation, so demonstrating the four lines is its job. `nest` is not a precedent for shipping this: `nest` composes forms with forms and reaches outside nothing.

**there is no date only field**, deliberately. storing `'2024-01-02'` drops the time of day, so `decode(encode(x))` is not `x` and never can be, while every other field round trips exactly. worse, the brand would have to mean "the start of an unambiguous day in this zone" rather than "this spelling and that instant name each other", and typescript would treat the two as interchangeable because the brand string matches. two claims under one name, mutually assignable, is the lie brands exist to prevent. **dropped**, not deferred: it is not to be built unless the author asks for it, and the reasoning above is here so it does not get proposed again.

the algorithm was fuzzed over a year at thirty minute granularity against an independent read back, across rome, santiago, lord howe (a thirty minute dst shift), chatham (a forty five minute offset), kolkata, st johns, apia and utc: no false accepts, no false refusals, no round trip failures.

### o11. line endings: ruled and fixed

`core.autocrlf=true` with CRLF blobs turned every one-line edit into a whole-file rewrite. fixed with `.gitattributes`:

```
# keep line endings stable regardless of platform or core.autocrlf
* text=auto eol=lf
```

plus one `git add --renormalize` pass, isolated in its own commit. a hard re-checkout is now clean even with `core.autocrlf=true` still set, so the repo is immune regardless of anyone's git config. **do not** change a global or system git setting to work around this; the attributes file is the fix.

### o17. `Json` is a notation, so its guard tests fidelity, not throw-safety: house (ruled, and now fixed)

the author raised the definition behind the bug that used to head this file: "to me, `Json` is simply something that could be passed to `JSON.stringify` and not break it", plus a doubt that it can throw at all. it can, five ways, all verified:

```
cyclic structure       TypeError: Converting circular structure to JSON
a BigInt anywhere      TypeError: Do not know how to serialize a BigInt
a toJSON that throws   propagates
a getter that throws   propagates
deep enough nesting    RangeError: Maximum call stack size exceeded
```

**ruled: throw-safety is the wrong definition, and fidelity is the right one.** three reasons, in ascending order of weight.

it is not narrowable under this repo's own rules. of those five, only `BigInt` is a cheap `typeof`. cycle detection needs a visited set, which e4 forbids; a throwing getter can only be found by invoking it, and invoking it is the side effect that separates parsing from narrowing. "does not break `stringify`" has exactly one honest implementation, `try { JSON.stringify(x) } catch`, and f5 puts `try`/`catch` only in `make` and `call`.

it is too weak to fix anything. `Date` becomes a string, `Map`, `Set` and `RegExp` become `{}`, a class instance becomes its bare enumerable fields, `NaN` and `Infinity` become `null`, `undefined` and function and symbol values get their keys dropped, an array hole becomes `null`, `-0` becomes `0`. none of that throws. throw-safety would have blessed the bug rather than closed it.

and the repo had already ruled it, for numbers. `JSON.stringify(NaN)` returns `null` without complaint, so under throw-safety `is.number` would accept `NaN` and `Finite` would have no reason to exist. it exists because a value belongs in `Json` when the notation can spell it and it comes back unchanged. the name says the same thing: `Json` is js object notation, and a notation is a set of spellings.

so the `Json` type was always right and `is.json`'s contract was always right; only the body was loose, in two places rather than the one on file. the number arm tested `typeof x === 'number'` directly instead of calling `number(x)`, declared four lines above it, so `is.json(NaN)`, `is.json(Infinity)` and `is.json({ a: NaN })` were all `true`, contradicting `Finite` inside the same module.

**the prototype objection dissolves once the definition is fidelity.** this entry used to call `Object.getPrototypeOf` "machinery this library avoids". it is not imported machinery: the prototype is the thing that distinguishes a record from an instance, so testing it is the direct test of the claim the guard makes. both arms are needed, because a null-prototype record still spells a plain object:

```ts
/** whether a record is a plain one, and not an instance of something else */
const plain = (x: Record<string, unknown>) =>
  Object.getPrototypeOf(x) === Object.prototype ||
  Object.getPrototypeOf(x) === null;
```

module private, above its first user, per the `canonical` precedent in `iso.ts`. `record` is untouched, so o5 stands. the order of the disjunction is load bearing: an array fails `plain` (its prototype is `Array.prototype`) and falls through to the `array` arm, which is where it was always handled.

what remains is the cycle case, at the top of this file. it is not a variant of this bug: fidelity says a cycle is not `Json`, and the guard agrees with that, it just says so by exhausting the stack instead of returning `false`.

### o18. constructors and `try` are avoided for the same reason: house (ruled, and now in the readme)

the readme used to justify the keyword bans with "they provide redundant constructs", which is true and much too weak. the author's ruling: state the real reason, which is that both constructs carry a requirement the type system cannot express, and say it in the readme where the principles live. it is now `### distrust what the types cannot say`.

a method's `this` requirement does not appear in its type. compiled, not assumed:

```ts
class Conn { host = 'h'; query(x: boolean) { return this.host + x; } }
const c = new Conn();

// typeof c.query is `(x: boolean) => string`, with no trace of Conn
const nonGeneric = (f: (this: void, x: boolean) => string) => f(true);
nonGeneric(c.query); // exit 0, and throws at runtime
```

`this: void` on the receiving parameter is the obvious defence and it does not work, which was worth finding out before writing it down as advice. it rejects only a function that declares its `this` explicitly:

```ts
const declared = function (this: Conn, x: boolean) { return this.host + x; };
const wants: (this: void, x: boolean) => string = declared;
// error TS2322: the 'this' types of each signature are incompatible
```

a class method never declares one, so nothing in the assignment is contravariant on anything. `strict` was on for both runs.

**so there is no `is.selfless`**, which the author asked about and this entry answers. `this` usage is not observable at runtime: `Function.prototype.toString` exposes source text, and source text is defeated by a closure, by a nested arrow inheriting an outer `this`, by `eval`, and by a method that touches `this` on one branch only. a guard built on it would claim more than it checks, which is the one thing d5 and o4b forbid, and the brand would be exactly the kind that o16 caught being unsound. do not propose it again.

a throw is invisible for the same reason: `(x: string) => number` says nothing about failing. that symmetry is the entry: `make` and `call` are not conveniences for tidiness, they are the two places where an unsafety the signature cannot state gets converted into one it can. o8 is the same bug seen from the call site, and it stays as it is, because the fix there is the wrapping closure and not a type.

### o19. a lease hands your result back whole, and never mixes it with a throw: house (ruled, superseded by o20)

**`lease` no longer exists.** o20 replaced it with `scope`, which keeps every conclusion below and drops the module they were about.

the hole filed on 2026-09-08 and ruled the next day. `use` was typed `(r: R) => V`, so business code that returned `result.error(...)` handed the lease an ordinary `V`: the close path ran, `abort` never did, and `Lease<V>` said nothing about a failure the value was carrying. the ruling boxes the use, and separates a failure you named from a throw nobody did.

```ts
export type Lease<U> = Union<{
  done: U,
  panic: Union<{
    open: unknown,
    use: unknown,
    close: { thrown: unknown, done: U; },
    abort: { thrown: unknown, after: Cause<U>; };
  }>;
}>;
```

- **`Result` stays binary.** a `panic` branch on `Result` itself was the first idea and it is wrong: every existing caller branches on `'success' | 'error'`, and a third member would break the two-way funnel the whole library is built on. `panic` lives on `Lease`, which is a different union with a different question to ask.
- **the union is what saves the type.** folding a throw into the error side gives `E | unknown`, which *is* `unknown`: the named error is swallowed by the thing that carries no information. separate branches are the only shape where a named failure survives next to an unnamed one. `type Panic<V> = Result<V, unknown>` was floated as a name for what `call` returns and declined: nothing would use it, since return types are never declared.
- **the lease reads your result but does not unwrap it.** it looks at the branch to pick the release, `close` when the use succeeded and `abort` when it did not, and then returns the result exactly as it was returned. flattening it into `success`/`error` branches of the lease's own union was built first and rejected: it is the `andThen` shape the refusal list bans, and it made `lease` the one place in the library that unwraps a `Result`. the caller branches twice now, on two genuinely different questions: did the resource behave, and did your call succeed.
- **only `use` is boxed.** `open` returns the resource plainly and `close`/`abort` return nothing. an `open` that fails in a way you can name has produced nothing to release, so it is a branch the caller takes before asking for a lease at all; a release that fails has nothing to say but that it failed. this keeps the readme's rule intact: a step that cannot fail in a named way stays unboxed.
- **a named failure aborts, exactly like a throw.** both failure paths run `abort`. that is the case a lease exists for, and it was the original bug.
- **`abort` is told why, `close` is not.** zig's `errdefer |err|` capture, ported: `abort: (r: R, why: Cause<U>) => void`, where `Cause<U>` is `Union<{ error: Fail<U>, panic: unknown }>`. the union is what makes it expressible at all; one parameter carrying both would be `E | unknown` again. `close` is told nothing, because it runs only when nothing failed. an `abort` that does not care declares one parameter and typescript accepts it against the two-parameter type, so the reason costs nothing to ignore.
- **the release wins the branch and keeps what it interrupted.** a failed `close` is still branch `close`, because a resource you no longer hold is the thing to act on, but its payload is `{ thrown, done }`: the use succeeded, so its result is still true and a caller can log the leak and go on with the value instead of losing work to a connection that would not shut. a failed `abort` carries `{ thrown, after }`, where `after` is the same `why` the abort was handed. this narrows o15's "decide, never accumulate": what gets decided is the branch, not what is kept, and the two payloads are different kinds of fact rather than two errors of the same kind.
- **the reusable part of a lease is a value, not a wrapper.** three of the four steps belong to the resource and one belongs to the caller, so a `transaction` is an object holding `open`, `close` and `abort`, spread in at the call site: `lease.sync({ ...transaction, use: work })`. a generic `transaction(work)` function was written first and replaced: it added a type parameter and a closure to say what a spread already says, and it hid the four steps behind a name instead of naming three of them. a shared `abort` can still read `why.branch`; only an `abort` that wants the named payload has to know which use it belongs to.

**the inference finding, which shaped the signature.** `Branch<B, V>` names its payload `value` in every branch, so inferring `V` and `E` out of a returned `Result<V, E>` cross-contaminates them: typescript feeds both members' payloads to both slots.

```ts
declare const f: <A, B>(x: () => Result<A, B>) => [A, B];
const q = (x: boolean) => x ? result.error('cannot query' as const) : result.success('rows');

f(q) // [string, string], not [string, 'cannot query']
```

verified against `Result`, against `Union<{ success: A, error: B }>`, and against a hand-written `Branch<'success', A> | Branch<'error', B>`: all three widen the same way, so this is the branch shape and not the `Flat` wrapper. **do not use `Result<V, E>` as an inference site.** take the returned union whole, as `U extends Result<unknown, unknown>`, and look inside it afterwards with `Extract`. narrowing `U` in the body loses the payload, because a generic narrows to its constraint and the constraint says `unknown`; the fix is not `as` but an annotated `const`, which is allowed where a declared return type is not.

```ts
type Fail<U> = Extract<U, Branch<'error', unknown>>['value'];

const fail: Result<unknown, Fail<U>> = done;
if (fail.branch === 'error') ... // fail.value is the named error, done is still whole
```

**`scope` became `call`.** it takes a function and calls it; `unsafe`, `bound` and `catcher` all name how it works rather than what it is, and `call` passes the literalness test `Json` and `iso` set. o15's second bullet is superseded here: the outcome is no longer one `Result` whose error side is a step union.

**the argument record is named now.** `Steps<R, U>` is declared in `lease.ts` and never exported, with `Async<S>` mapping each step to its promise-returning twin, so the four lines are written once instead of twice. the old wording of the naming rule said the record "stays inline and unnamed", which confused *where a name is exported* with *whether a shape is repeated*; only the first is a rule. `CLAUDE.md` says so now.

### o20. a scope holds many resources without nesting, and `lease` is gone: house (ruled)

`lease` held exactly one resource, so two of them meant a lease inside a use and three meant three levels of lambda. that is the shape every language reaches for (`try`/`finally`, `with`, `withConnection(conn => ...)`), and it makes the code's indentation follow the number of things you hold rather than what you are doing. **`lease` was deleted, not deprecated**; `src/scope.ts` replaces it.

```ts
scope.sync(hold => {
  const one = hold(first);
  if (one.branch === 'error') return result.error('cannot hold the first' as const);

  const two = hold(second);
  if (two.branch === 'error') return result.error('cannot hold the second' as const);

  return result.success(one.value.name + ' and ' + two.value.name);
});
```

- **the work is handed `hold`, not an object with a `hold` on it.** there was no second member worth adding: zig's bare `defer` is the only candidate, and it is `hold` with nothing to open, which means you opened the thing somewhere else, which is the leak `hold` exists to prevent. an optional `open` was considered for the same reason and refused, since it would make `hold` return a `Result` that cannot fail.
- **acquisition stays flat.** `hold` runs the open through `call` and returns a `Result`, so taking a resource is one line and one guard, exactly like every other narrowing in the library. resources nest without scopes nesting, which is the whole point of the module.
- **the outcome is two facts, not one union.** two independent things happen: the work exits, and the releases either go back or leak. `Scope<U>` is `{ exit: Exit<U>, leaked: unknown[] }`, where `Exit<U>` is `Union<{ done: U, panic: unknown }>`. trying to say both in one union is what produced `lease`'s `panic/close` payload of `{ thrown, done }` and its `after`: all of that disappears here.
- **`leaked` is a list, and that is not error accumulation.** the refusal is about accumulating errors from one failing operation; these are n resources each failing to go back, and reporting one would hide the rest. the count is runtime data, so it is an array and not a tuple: `hold` is called dynamically, so no arity exists at the type level.
- **unwinding never stops early.** a release that throws costs you that resource and nothing else; the rest of the list still goes back, in reverse order.
- **the mutable list is the price.** `taken` is a `const` array that grows, which c5 allows, and it is the one piece of state in the library. the guarantee it buys is the one a merged `open` cannot give: if the second resource refuses, the first is already held and is released on the way out.


### o21. a declaration is written as functions, because a parameter is the only slot in a value that states a type: house (ruled)

`protocol.Model` is one type and it is the whole device:

```ts
export type Model<T> = { [K in keyof T]: Parameters<Extract<T[K], (...args: never[]) => unknown>> extends [infer V] ? V : void };
```

a value cannot state a type. an object literal holds a number, and nothing in it says the slot is a number and only ever will be. the one exception is a function parameter, a slot inside a value whose type is written by hand and kept, so an object of functions states one type per key and `Model` reads them back, which is the same job `is.Model` does for a schema of guards: the type a runtime object describes.

- **the point is not brevity.** a type declaration exists only at compile time and a plain object exists only at runtime; a declaration written as functions is there at both. one literal can be walked for its keys and read for its types, so what you build by walking it is typed by what it declared, and the two halves cannot drift.
- **the result is runtime data.** `protocol.init` calls the factory of every branch it enters, with that branch's own value, and what comes back is the list `to` is built from. the call is not argument-less and nothing there is faked.
- **the parameter is the declaration.** an honest one ignores it. it is there so that what a branch carries is written once.
- **there is one way to say a branch goes nowhere: return nothing.** the result type is a non-empty list or `void`, so `=> []` is refused, and no empty tuple is allocated per entry into a leaf.
- **two residues, both real.** nothing checks that the parameter goes unread, and a factory that varied its tags by value would leave the type a superset of what `to` actually holds. a declaration returns a constant list.

### o22. one declaration is a union or a machine, and `protocol.init` is the only call: house (ruled)

```ts
const payment = protocol.init({
  success: (value: number) => {},
  rejected: () => {}
});

const loader = protocol.init({
  idle: () => ['loading'],
  loading: (value: { at: number; }) => ['success', 'error'],
  success: (value: string[]) => {},
  error: (value: unknown) => ['loading']
});
```

- **the rule.** the parameter declares what a branch carries, and the result is for whatever else there is to say, which is which branches may follow. that is one rule for both shapes rather than one each.
- **a union and a machine are one declaration.** where a branch names nothing after it, it is data alone and the family is a union; where it names others, it carries the factories for exactly those, and what comes back carries its own, which is a machine: the fixed point of the same declaration. so `init` is a single call and what you get is what you declared.
- **three shapes were tried and refused, in order.** returning the value instead of the tags, which cannot apply to a machine whose result already carries them, and would have taught "the value is the parameter" in one module and "the value is the result" in the other. two modules, `machine` and `protocol`, which are the same idea with two entry surfaces. two constructors, `protocol.union` and `protocol.machine`, which is the same circle again: an all-void machine **is** the union, so one of them is redundant.
- **the word.** a protocol is an agreed sequence of exchanges, so it implies ordering and cannot be the umbrella for the orderless case. it is the umbrella for the *declaration*, and a union and a machine are the two things you can declare with one. a machine is a union that knows what follows what, which is what `machine.spec.ts` said in its first line before any of this was built.
- **`unknown` is how a declaration says "whatever the caller brings".** a declared value is fixed, so `init` reads `unknown extends Declared<B>[K]` and hands back a generic factory instead. `src/result.ts` is built that way, and rebuilding its hand-written factories through `init` left every existing spec passing, which is what a replacement has to show.
- **two types come off the factories, not off the declaration**, since the declaration is written inline in the call and has no name: `protocol.Of<typeof loader>` is every state and `protocol.Of<typeof loader, 'loading'>` is one, which is what a react `useState` or any other holder is written against. `Union<protocol.Model<typeof loader>>` is the same states as plain branches, which is the storage shape, and it stays a composition rather than a third export.
