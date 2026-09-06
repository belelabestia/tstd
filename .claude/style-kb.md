# tstd style knowledge base

working notes toward `claude.md`. every entry is grounded in a real line of this repo.

two kinds of entry:

- **house** — the repo's way. my default would have differed; the repo wins. an agent should write the ✅ side.
- **open** — where i still think the repo is wrong. flagged, not applied. needs a ruling before it goes into `claude.md`.

---

## a. files & structure

### a1. one concept per file, named after its main export — house

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
src/iso.ts      -> Date, Time, DateTime, Duration, Timestamp, Zone, + guards, operations and init
src/form.ts     -> Field, Fields, Encoded, Decoded, plain, nest, model, decode, encode
```

a type and the factory that produces it are one concept, so they live in one file. there is no `types.ts` and there must never be one.

### a2. spec beside source, same basename — house

❌ instead of `test/branch.test.ts` or `src/__tests__/branch.spec.ts`

✅ do `src/branch.ts` + `src/branch.spec.ts`

the spec is the module's documentation; documentation lives next to what it documents.

### a3. flat `src/`, no folders until nesting earns it — house

five modules, zero directories. my instinct would be `src/core/`, `src/types/`, `src/guards/`. don't. the readme's rule is "for namespacing, prefer nesting over prefixing" — that is about *type and api* nesting (`result.success`), not directory nesting. add a directory only when a module genuinely grows sub-modules.

### a4. `index.ts` is api shaping only — house

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
export * from './result.js';

export * as is from './is.js';
export * as form from './form.js';
export * as iso from './iso.js';
```

`is`, `form` and `iso` are namespaced because their members are generic words (`number`, `string`, `date`, `model`, `decode`) that must not pollute the top level. everything else is flat because its names are already unique. the blank line separates the two policies — keep it.

### a5. relative sibling imports, no aliases — house

❌ instead of `import { Flat } from '@/flat'` or `'src/flat'`

✅ do `import { Flat } from './flat.js'`

no `paths` in tsconfig, no resolver config to explain. the `.js` extension is mandatory — the package is esm, `module` is `nodenext`, and the extension is what makes the emitted output loadable in node *and* directly in a browser. readme rule: "write the `.js` extension in relative imports: this is esm".

### a6. lowercase filenames, always — house

❌ instead of `Branch.ts`, `is.guards.ts`, `type-guards.ts`

✅ do `branch.ts`, `is.ts`

readme: "no one wants to use the shift key in order to guide intellisense". filenames follow the api container name exactly.

---

## b. naming

### b1. same word, case-distinguished, for type and factory — house

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

note the parameter is also called `branch`, shadowing the function inside its own body. that is deliberate — the name is the concept, and there is no third word to invent. same pattern in `Result`/`result`, `Flat`, `Brand`.

### b2. namespace by nesting the object, not by prefixing the name — house

❌ instead of:

```ts
export const successResult = ...
export const errorResult = ...
export const scopeSync = ...
export const scopeAsync = ...
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

reads as `result.success(...)`, `scope.async(...)`. `async` is a legal property name, so the container buys you keyword-shaped members for free.

### b3. the container carries the prefix, the member does not — house

❌ instead of `isNumber`, `isString`, `isPresent`

✅ do `export const number = ...` in `is.ts`, consumed as `is.number`

this is why `is.ts` is exported with `export * as is` rather than flattened. it also means its members shadow global type names (`number`, `string`, `boolean`) — that is fine and intended inside that module.

### b4. one word, no suffix nouns — house

❌ instead of `flattenType`, `validators`, `branding`, `resultUtils`, `typeHelpers`

✅ do `flat`, `is`, `brand`, `result`

if a name needs a category suffix to make sense, the concept is not sharp enough yet.

---

## c. declarations & keywords

### c1. export at the declaration, never in a trailing block — house

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

### c2. arrow consts only — house

❌ instead of `export function branch(...) { ... }`

✅ do `export const branch = (...) => ...`

`function` is banned outright. so are `class`, `constructor`, `this`, `new`, `extends`, `super`.

### c3. `type`, never `interface` — house

❌ instead of `export interface Branch<B, V> { branch: B; value: V }`

✅ do `export type Branch<B extends string | symbol, V = void> = { branch: B, value: V; };`

the single `interface` in the repo is in `flat.spec.ts`:

```ts
interface A extends Complicated<{ a: number, b: string; }> { }
```

that is not style — it is the *specimen* being flattened, chosen because `interface extends` is exactly what produces unreadable tooltips. do not read it as permission.

### c4. `new` only through `make` — house

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

`make` owns **every** instantiation there is, native constructors included, even ones that provably cannot throw — `iso.ts` builds its `Date` through `make(Date, ms)` and branches on the error it knows will not come. the instance never escapes the module that built it; only a branded string does. readme rule: "`make` owns every class instantiation there is, native ones included; the instance never escapes the module that built it".

note `make(Date)` with no arguments does not typecheck — TS resolves the constructor to a multi-argument overload — so reach for a static like `Date.now()` instead, which is not instantiation at all.

its signature is the only place `new` appears in the source:

```ts
export const make = <Args extends unknown[], Instance>(c: new (...args: Args) => Instance, ...args: Args) => { ... }
```

### c5. `const` even when the value mutates; `let` only for reassignment by design — house

✅ the canonical example, from `result.spec.ts`:

```ts
// we want to safely get a connection instance
let conn = scope.sync(sdk.connect, true);
assert.equal(conn.branch, 'error');

// we can retry if it fails
conn = scope.sync(sdk.connect, false);
```

`let` here because retry is the design. everything else in the repo is `const`.

---

## d. types

### d1. never declare a return type — except a type guard — house

❌ instead of:

```ts
export const branch = <B extends string, V>(branch: B, value?: V): Branch<B, V> => ...
```

✅ do:

```ts
export const branch = <B extends string | symbol, V = void>(branch: B, value?: V) => ({ branch, value: value as V });
```

rationale from the readme: if a function's return type changes, its signature should not break — the *callers* should. annotating the return type defeats that. the only legitimate annotation is `x is T`, because narrowing intent cannot be inferred:

```ts
export const string = (x: unknown): x is string =>
  typeof x === 'string';
```

### d2. tagged unions via a mapped record, not a hand-written union — house

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

### d3. wrap anything a reader will hover in `Flat` — house

❌ instead of exposing composition chains in tooltips:

```ts
type X = Pick<Record<number, T[]>, 1 | 2 | 3>;  // hovers as the chain
```

✅ do:

```ts
export type Flat<T> = { [K in keyof T]: T[K] } & {};
```

the trailing `& {}` is load-bearing — it forces evaluation. `Union` already applies `Flat` internally, which is why branch unions hover legibly. apply it at every public type boundary.

### d4. brand the requirement, not the type — house

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

the point (from `brand.spec.ts`): a brand decoupled from a runtime type participates in type algebra. `Truthy` has no runtime type at all — it is a pure requirement.

### d5. brands are earned by guards, never by assertion — house

❌ instead of:

```ts
const valid = (x: unknown) => ... ;
veryStrictFunction(x as Valid);
```

✅ do — and note how boolean algebra mirrors type algebra one-for-one:

```ts
const valid = (x: unknown): x is Valid => (is.number(x) || is.trimmed(x)) && is.truthy(x);

if (valid(x1)) veryStrictFunction(x1);
```

`(A || B) && C` produces `(A | B) & C`. that correspondence is the whole technique — keep guard bodies as plain boolean expressions so it holds.

### d6. `satisfies` for schema literals, not an annotation — house

❌ instead of `const schema: is.Schema = { ... }` — which widens every guard to `TypeGuard<unknown>` and destroys `Model` inference

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

### d7. values from outside are `unknown` and stay `unknown` — house

❌ instead of `catch (error: Error)` or `catch (e) { throw new AppError(e.message) }`

✅ do:

```ts
catch (error) {
  return result.error(error);
}
```

readme: "native errors and values from outside are `unknown` by design: don't try to fix this, just narrow their type". the error is carried, unwrapped, un-normalised, and narrowed by the caller if it cares.

---

## e. type guards

### e1. body is one boolean expression, one condition per line, operator leading — house

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

### e2. compose guards with `&&`/`||`, never with combinator helpers — house

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

### e3. guard, blank line, work — house

✅ from `is.model`:

```ts
export const model = <T extends Schema>(x: unknown, schema: T): x is ... => {
  if (!record(x)) return false;

  for (const key in schema) if (!schema[key](x[key])) return false;
  return true;
};
```

the blank line after the guard clause is consistent across `model` and `models`. single-statement `if` bodies stay on one line — no braces, no wrapping.

### e4. narrow, don't parse — house

❌ instead of `(x: unknown) => x as T` or a decode step that returns a new object

✅ do `(x: unknown): x is T`

readme: "prefer type narrowing (`x is T`) to parsing (`return x as T`) for validation as it is a cheaper abstraction". validation never allocates; encoding/decoding is a separate concern the library does not own.

---

## f. flow

### f1. return early, in a funnel — house

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

### f2. no `else` unless both boolean cases are meaningful; no `switch` unless the union is total — house

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

### f3. absence beats a branch — house

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

### f4. presence/absence, never null-vs-undefined — house

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

`present` narrowing to `{}` (not `object`, not `NonNullable<T>`) is the trick: `{}` is "anything but null/undefined". `Json` including `undefined` follows from this same rule — it is not an oversight.

### f5. `try`/`catch` exists only inside `make` and `scope` — house

❌ instead of try/catch at call sites, or a `Result`-returning wrapper per api

✅ do push the boundary into the two utilities and use flow everywhere else:

```ts
const res = scope.sync(div, 1, 0);
if (res.branch === 'error') return res;
res.value;
```

```ts
const res = await scope.async(fetchThing, url);
```

three constructs total — `make` for constructors, `scope.sync`, `scope.async`. business code contains no `try`.

### f6. flow over callbacks; callbacks only as entrypoints — house

❌ instead of `result.map(...).andThen(...).unwrapOr(...)`

✅ do check the tag and return:

```ts
if (res.branch === 'error') return res;
```

there is deliberately no monadic api on `result`. do not add `map`, `andThen`, `unwrap`, or a `match` helper — the readme rejects that whole layer, and `branch`'s purpose is to "delegate decisions to the caller", not to sequence them.

this is now settled and in the readme, in two parts:

- "never hide flow behind data: no `map`, `andThen`, `unwrap` or `match` on a branch"
- "a function that cannot fail returns an unboxed value, not a result"

the second half answers what a `Result` with an impossible branch would mean: nothing, because you never write one. `Result<S, E>` carrying both branches is not over-modelling — a function returning it can genuinely do both, and one that cannot returns the bare value.

### f7. imperative loops over array callbacks in library code — house, with one open

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

### g1. source files carry doc comments and nothing else — house

`branch.ts`, `brand.ts`, `flat.ts`, `is.ts`, `result.ts` contain **zero** `//` comments between them. every explanation is either a one-line `/** */` on an export or lives in the spec.

❌ instead of inline narration in source:

```ts
export const record = (x: unknown): x is Record<string, unknown> =>
  // typeof null is 'object', so exclude it
  typeof x === 'object' &&
  x !== null;
```

✅ do leave the source bare and explain in `is.spec.ts`.

### g2. one-line `/** */`, lowercase, no period, no tags — house

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

more examples, all verbatim: `/** the building block of our branching technique */`, `/** a particularly useful union type */`, `/** convenience factory api */`, `/** safely call functions */`, `/** a type-narrowing function */`. they say what the thing *is for*, never what its parameters are — the signature already does that. no `@param`, no `@returns`, no `@example`, ever.

the only multi-line doc comment states a philosophy, not an api:

```ts
/**
 * in tstd we only care about json types
 * everything else is considered custom
 */
```

### g3. the teaching comment goes at the top of the spec, as a block — house

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

note `/*` not `/**` — it is prose for a human reading the file, not api documentation. semicolons join clauses; sentences do not start with capitals.

### g4. spec comments are second-person teaching, placed above the line they explain — house

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

### g5. lowercase prose everywhere — house

readme headings (`## principles`, `### master short-circuiting`), commit messages, ci step names (`name: build and publish to github registry`), comments. no capitals at sentence start. `ts`, `js`, `c` lowercase too. keep it.

---

## h. specs

### h1. flat `test()` calls, no describe/hooks — house

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

### h2. test names are capability sentences — house

❌ instead of `'branch() returns { branch, value }'`

✅ do `'branch everything'`, `'branch something'`, `'brand stuff'`, `'safely navigate the unknown'`, `'validate model schemas'`, `'init safely with the make api'`, `'do resource management with the scope api'`

they read as chapter titles, because the file is a tutorial.

### h3. `assert.fail()` as a narrowing guard clause — house

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

same shape as f1 — the guard clause funnel, applied to tests. it demonstrates the technique instead of merely testing the function.

### h4. hand-rolled closures instead of mocks — house

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

### h5. assert the type by assignment or by argument passing — house (mechanism), open (enforcement)

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

these are the real assertions in `branch.spec.ts`, `flat.spec.ts` and `brand.spec.ts`. see **o2** — nothing currently typechecks them.

---

## i. tooling & repo hygiene

### i1. `tsc` and nothing else — house

three devDependencies: `typescript`, `tsx`, `@types/node`. no eslint, no prettier, no bundler, no vitest, no husky, no changesets, no `.editorconfig`. formatting is delegated to the editor:

```json
{
  "javascript.format.semicolons": "insert",
  "typescript.format.semicolons": "insert",
  "editor.formatOnSave": true,
  "editor.formatOnType": true
}
```

❌ do not propose adding a linter or formatter. the readme says "i might provide an eslint ruleset at some point" — that is the author's call, not a gap to fill.

### i2. scripts are one-liners — house

```json
"start": "tsc --watch",
"test": "tsx --test src/**.spec.ts",
"build": "tsc"
```

❌ instead of `"build": "rimraf dist && tsc -p tsconfig.build.json && node scripts/postbuild.js"`

✅ keep each script a single command. if a step is needed, it is appended with `&&`, not moved into a script file.

### i3. commit messages: lowercase, imperative, two to four words — house

verbatim history: `update result api`, `update result`, `accept symbol as branch key`, `support symbol as branch key`, `make json type guard recursive`, `rename modules to src`, `update readme`.

❌ instead of `feat(result): add scope api for safe function invocation` or a body paragraph

✅ do `update result api`

no conventional-commit prefixes, no scopes, no body, no footers. version bumps are their own commit named just the version (`0.1.1`, `0.1.0`), and tags drive publishing.

### i4. ci is readable top to bottom — house

lowercase step names (`checkout`, `setup node`, `install deps`, `build`, `publish`), no matrix, no cache, no reusable workflows, pinned major action versions (`@v4`). additions must match that voice.

### i5. the wide project is `tsconfig.json`; the narrow one only emits — house

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

### i6. typescript 7 wants two things stated explicitly — house

the native compiler stopped inferring both of these, and the failures are loud but misleading:

```json
"types": ["node"],
"rootDir": "src",
```

- without `types`, `@types` is not auto-discovered and you get `TS2591: Cannot find name 'node:assert/strict'` — plus a cascade of narrowing failures downstream, because `assert.fail()` loses its `never` return and every `if (!guard(x)) assert.fail()` stops narrowing.
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

## k. open — my dissent, not yet applied

these are the places where i think the code contradicts the readme. each needs a ruling before it becomes a rule.

**status:** every o entry is ruled and applied on `claude-onboarding`. o6 → o6b, `is.number` → o4b, schema validation → o12, forms → o13, time zones → o14.

### o1. published output does not resolve

`module: esnext` emits `export * from './branch'`; no `"type": "module"` in the manifest. verified: `import('./dist/index.js')` fails with `Cannot find module '...\dist\branch'`.

❌ instead of extensionless specifiers in source

✅ do write `from './branch.js'` in the `.ts` files and add `"type": "module"`. plus a smoke check that stays a one-liner: `"build": "tsc && node -e \"import('./dist/index.js')\""`.

### o2. type-level assertions are never checked

`tsconfig.json` has `"include": ["src/index.ts"]`, so `tsc` never sees a spec; `tsx` strips types without checking. every assertion in **h5** is currently a no-op.

✅ do add `tsconfig.test.json` (`{"extends": "./tsconfig.json", "include": ["src"]}`) and make `test` run `tsc --noEmit -p tsconfig.test.json && tsx --test src/**.spec.ts`.

and once tsc sees the specs, negative assertions become expressible in the house idiom — a comment, zero runtime:

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

✅ do `x is Flat<Model<T>>` — a type guard is one of the two places d1 permits an annotation, so there is no tension, only duplication.

### o4b. brand what a guard checks but its type cannot say — house (ruled)

`is.number` is now branded, overriding my recommendation in o10:

```ts
/** a number that is neither nan nor infinity */
export type Finite = number & Brand<'Finite'>;

export const number = (x: unknown): x is Finite =>
  typeof x === 'number' &&
  Number.isFinite(x);
```

my legibility objection was wrong: declaration output renders the field as `a: is.Finite`, not as `number & Brand<"Finite">`, so `Flat` still reads cleanly. arithmetic and assignment to a plain `number` both keep working, because `Finite` is an intersection *with* `number`. what changes is that a function may now demand `is.Finite` and only a checked value satisfies it.

note narrowing applies to references, not to literal expressions: `if (is.number(2)) takesFinite(2)` does not compile — narrow a variable.

readme rule: "when a guard checks more than its type can say, brand the requirement, as `is.number` does with `Finite`".

### o7. `is.json` uses `.every` while `model`/`models` loop

f7 says imperative loops; `json` uses `Object.values(x).every(json)` and `x.every(json)`. pick one. i would keep `.every` in `json` (it is an expression, and e1 requires the body stay an expression) and note the exception explicitly — but it should be a stated exception, not an accident.

### o8. `scope.sync(instance.method, ...)` silently loses `this`

`result.spec.ts` demonstrates `scope.sync(conn.value.query, true)`, which works only because the fake `sdk` returns closures. against a real class-based sdk it throws, and the throw is swallowed into `result.error`, disguising a wiring bug as a domain failure.

✅ do keep the signature and fix the teaching line:

```ts
// we can then use it; note that methods bound to `this` must be wrapped,
// as scope.sync calls f detached — one more reason we don't write classes
const res = scope.sync(() => conn.value.query(true));
```

### o9. small stuff

- `result.spec.ts:2` imports `'../src/result'`; every other spec uses `'./x'`. make it `'./result'`.
- `"test": "tsx --test src/**.spec.ts"` — `src/**.spec.ts` does not match nested directories, so the first nested module's spec silently stops running. `src/**/*.spec.ts`.
- no `LICENSE` and no `license` field on a published package. "copy my approach" reads as an invitation but is not a grant.
- `## installation` does not say how to install — no `.npmrc` registry line, no note that github packages needs a token.
- typos in spec comments: `comples types`, `unkown`, `significanly`, `isBBool` (it checks `'a' | 'b' | 'c'`).

### o10. things i would not change, for the record

so the reasoning is on file: `Result<S, E>` always carrying both branches even for infallible functions (**ruled**: infallible functions return the unboxed value, so the situation never arises — see f6); the absence of `map`/`andThen`/`unwrap` (**ruled**: in the readme now, permanent); `Json` including `undefined` (**ruled**: presence/absence comes first); `is.number` rejecting `NaN` without a brand (**overruled** — it is branded now, see o4b, and my legibility objection did not survive contact with the declaration output); `branch`'s single `value as V` cast (ruled: see o6b); `Brand`'s unexported `unique symbol` (emits correctly into `brand.d.ts`).

### o6b. `as` where nothing else works — house (ruled)

readme rule: "`as` is allowed exactly where it's the only way to obtain a peculiar typescript behavior, as in `branch`". it goes in no comment — the rule lives here and in the readme, so the source stays bare per g1.

the canonical instance:

```ts
export const branch = <B extends string | symbol, V = void>(branch: B, value?: V) => ({ branch, value: value as V });
```

i tried to remove it and could not. what fails, so nobody retries it blindly:

```ts
// destructured conditional rest tuple — V is inferred fine, but value comes out V | undefined
(branch: B, ...[value]: V extends void ? [] : [V]) => ({ branch, value })

// indexed instead of destructured — identical failure, TS collapses the tuple to [] | [V]
(branch: B, ...rest: V extends void ? [] : [V]) => ({ branch, value: rest[0] })
```

both produce `value: { a: number } | undefined`, which is not assignable to a `Union` branch's `value: { a: number }`. overloading a typed const does not help either: the arrow implementation must itself be assignable to the overload, so the cast just moves. making `Branch`'s `value` optional would fix the void branch and break every consumer that reads `.value` — `url.value.href` in `result.spec.ts` for one.

so: an optional parameter is `V | undefined`, and no single arrow signature turns that back into `V`. the assertion is the price of `branch('xl')` and `branch('xs', { a: 1 })` being one function.

### o12. narrow, then map — house (ruled, and now built)

the answer to schema validation, and to why tstd has no codecs. a codec like `NumberFromString` fuses two questions: *is this parseable* and *what is the value*. split them:

> **narrowing owns every failure. mapping receives a proven value, so it is total and returns it unboxed.**

the brand is the receipt that carries the proof from step one to step two. the payoff is that one schema declares the wire form, the db form and the memory form at once, because they are the same type:

```ts
const user = { id: is.string, created: iso.datetime, every: iso.duration } satisfies is.Schema;
type user = Flat<is.Model<typeof user>>;
```

that model is `Json` by construction, so it round-trips through `JSON.parse`/`stringify` untouched, and it is still branded, so it maps without being validated again.

rules that came out of building `iso.ts`:

- **name a conversion after its source, never its destination** — there are many ways to reach a number, so `fromTimestamp`, not `toNumber`. a destination name is fine only when exactly one route exists (`toTimestamp`, `dateOf`).
- **name a module after the notation it speaks**, as `Json` does — `iso` covers date, time, datetime and duration because all four are iso 8601 lexical forms.
- **there is no in-memory form to convert to.** an instant is a branded string on the wire and in memory alike. what other libraries call a view model is just the representation that happens to suit memory better, and it is data too, not presentation.
- **durations are milliseconds, a branded number** — `number` is `Json` anyway, and `P1M` is not a fixed amount of time, so an ISO duration string would force `add` to make calendar decisions on the caller's behalf. anything calendar-aware belongs in its own module.
- **casts are expected here**: one per branded return, each branding a computation the input's brand already proved. this is o6b working as designed, not abuse of it.
- **partiality is absence** — `add` can only fail by leaving representable time, which needs no explanation, so it returns `DateTime | undefined` rather than a `Result`.
- **one canonical spelling per form, plus one explicit door.** an offset or a seconds-precision time is rejected by the guard, because a guard that silently accepted three spellings of the same instant would be deciding for the caller. normalising is a separate, deliberate call:

  ```ts
  /** the instant a foreign spelling points at, or nothing if there is none */
  export const parse = (x: string) => canonical(Date.parse(x)) as DateTime | undefined;
  ```

  strictness at the boundary was never about time zones. it is about spelling, and a foreign spelling denotes the same instant, so `parse` loses nothing — it just has to be asked for.

### o14. what needs a zone goes behind `init` — house (ruled, and now built)

an instant is absolute; the day it falls on is not. `2024-01-01T23:30:00.000Z` is already the second in rome, so `dateOf` has no answer until someone names a zone. that is a dynamic dependency, and the readme already says what to do with one: "whenever a module has a dynamic dependency, make it dynamic as well by exporting an `init` function".

```ts
const where = 'Europe/Rome';
if (!iso.zone(where)) assert.fail();

const rome = iso.init(where);

rome.dateOf(x);   // 2024-01-02
iso.dateOf(x);    // 2024-01-01, the module itself always answers in utc
```

the pattern this settles, and it is the same one as everywhere else:

- **the zone is narrowed, not trusted** — `iso.zone` brands a name this runtime actually knows, so `init` receives a proven value and cannot fail. the failing step stays at the boundary, where it belongs.
- **so `init` is total**, and everything it returns is total. building the `Intl` formatter goes through `make`, and one load-bearing cast reads the value the brand already proved is there.
- **utc stays the module's default.** a zone is a decision, so it is the caller's; the undecorated `dateOf` and `timeOf` answer in utc and say so.
- **reading only.** building an instant from a local date and time is deliberately absent, because a local wall clock time can be ambiguous or nonexistent across a dst boundary — the same reason `Duration` refuses `P1M`. ambiguity is what this library declines to guess at.
- **narrowing applies to references, not to literals** — `if (iso.zone('Europe/Rome')) iso.init('Europe/Rome')` does not compile. bind it to a variable first. same trap as o4b.

the guards need no regex — a string is a canonical instant exactly when it round-trips:

```ts
export const datetime = (x: unknown): x is DateTime =>
  is.string(x) &&
  canonical(Date.parse(x)) === x;
```

### o13. a form is the pairing, not a codec — house (ruled, and now built)

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

`form.model` / `form.decode` / `form.encode` mirror `is.model` — a record and two walkers, which is precedent the library already had. **this is not a codec, because failure does not live in it**: by the time `decode` runs the value has been narrowed, so it cannot fail and returns unboxed. no `Either`, no error accumulation, and therefore none of the combinator tower those two things force on a library. there is no `and`, `or`, `optional` or `refine`, and tstd ships no forms of its own — you write the four lines.

what to know when writing one:

- **the constraint cannot be `Record<string, Field<Json, unknown>>`** — a parameter is contravariant, so every real field is rejected. the trick, which needs its comment because it looks like a mistake:

  ```ts
  export type Fields = Record<string, {
    is: is.TypeGuard<unknown>,
    decode: (x: never) => unknown,
    encode: (x: never) => is.Json;
  }>;
  ```

  `never` in the parameter position accepts every field there is. no `any` anywhere in the module.
- **`satisfies` fires at the declaration site**, so an `encode` that stops being the inverse of `decode` is an error where you wrote it, not where you used it. verified, along with: the decoded side is not assignable to the encoded side, and a non-`Json` encoded side (a `Map`, say) is refused outright.
- **nest by calling, not by combining** — a form for a whole model is a form whose two directions call the walkers. that is always the same three lines with the same arguments, so `nest` writes them:

  ```ts
  export const nest = <T extends Fields>(forms: T) => ({
    is: (x: unknown): x is Encoded<T> => model(x, forms),
    decode: (x: Encoded<T>) => decode(x, forms),
    encode: (x: Decoded<T>) => encode(x, forms)
  });
  ```

  nest the declarations, not just the payload — a form written inline ends up shaped exactly like the json it describes, which is the whole point of it:

  ```ts
  const audit = {
    when: instant,
    of: form.nest({
      at: instant,
      by: form.nest(user)
    })
  } satisfies form.Fields;
  ```

  an inline literal and a named model nest the same way, so mixing them is free — declare a model once where it is reused, and inline the levels that exist only here.

  nesting nests, because a nested model is a field like any other, and inference survives the descent — `form.decode(x, audit).of.by.seen` is a `DateTime` three levels down, verified in both directions. this is still not a combinator: `nest` composes nothing and adds no algebra, it only writes lines you would have written yourself. that is the test to apply before adding anything else of the kind (a `list` for arrays of models, say) — **write the boilerplate, don't invent an operator**.
- **`plain` covers the common case**: most fields need no form at all, because o12 made the wire type and the memory type the same type. forms are for the genuinely different in-memory shape, like an instant stored as a timestamp.

on the name: **`form`** is the author's own word for the concept — "declare their form in memory or in json" — and it passes the literalness test `Json` and `iso` set, since the module declares the form a value takes on each side. `io` was the runner-up and was rejected because it names an activity the module never performs (it reads no file and opens no socket; it is a pure function on a value someone else moved) and because it invites the io-ts comparison this design inverts. the type is `Field`, not `Form`, so `satisfies form.Field<...>` does not stutter.

### o11. line endings — ruled and fixed

`core.autocrlf=true` with CRLF blobs turned every one-line edit into a whole-file rewrite. fixed with `.gitattributes`:

```
# keep line endings stable regardless of platform or core.autocrlf
* text=auto eol=lf
```

plus one `git add --renormalize` pass, isolated in its own commit. a hard re-checkout is now clean even with `core.autocrlf=true` still set, so the repo is immune regardless of anyone's git config. **do not** change a global or system git setting to work around this — the attributes file is the fix.
