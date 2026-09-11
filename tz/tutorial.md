# the typezig tutorial

a walk through the language: where it comes from, the typescript it keeps and the one it takes away, the constructs it adds, and the newest half: the `?` side matchers and the `form` and `call` constructs.

## where we come from

### typescript

typescript keeps every door open: classes, interfaces, enums, namespaces, decorators, generics, `any`, overloads, `switch`, `try`/`catch`, `this`, `new`. nothing is taken away. the overlap is the problem: when two features do the same job, a team picks one and argues about it, and the type system cannot tell you whether you picked well.

the claim here is not that typescript is bad. it is that most of it can be ignored, without suffering the lack at all. from the `tstd` readme: "javascript has many overlapping syntax constructs and language features; most of them can be completely ignored without suffering their lack at all". and: "typescript doesn't really make a good job in becoming scala, haskell or gleam, but it can do an excellent job in becoming go or zig, if you completely omit the topics of performance or memory management."

so the project starts with a question: what is the smallest consistent subset of typescript, and what does code written in that subset look like?

### tstd

`tstd` (type-standard) answers with code instead of an essay: a tiny library of a handful of modules, compressed into five principles, each of which becomes a hard rule:

- **master short-circuiting.** guards, early exiting, negative-space programming; handle the exceptional cases first and fall back to the general ones in a funnel. this is closely related to narrowing.
- **dry the syntax, not the code.** a static class is a module; a dynamic one is a closure with an `init`; inheritance becomes composition; hierarchies and enums become algebraic types.
- **treat features as such.** narrowing replaces validation libraries; proving a shape and mapping it are separate concerns.
- **maximize type inference.** a function that changes its return type should not break its signature; the callers should adjust. so return types are never declared, except in a type guard.
- **distrust what the types cannot say.** a signature is the whole contract, so anything carrying an invisible requirement is confined, not discouraged. a method's `this` requirement is invisible to its type, so a torn-off method typechecks and throws; a throw is invisible the same way. both get converted into a `Result` at exactly two boundaries: `make` and `call`.

the style that falls out is procedural, fallible-where-it-must-be, branch-shaped. tagged unions via `branch` and `Union`, type guards via `is`, results via `result`, resources via `scope`, wire shapes via `form`, state machines via `protocol`, time via `iso`.

### the transpiler idea

once the style rules are that strict, the language itself can enforce them. that is the tz idea, as the prototype readme puts it: "typescript with most of typescript taken away, plus a few constructs, transpiled back to typescript that imports `tstd`".

`tz` is a **sugar transpiler**: a token level rewriter that leaves every character it does not recognise alone. it never parses typescript, it lexes it. one line in makes one line out, so the line number is the whole source map. the emitter has no opinions, knows no types, and never writes an import.

two consequences to internalise before reading any tz:

- the emitter never writes an import. a tz file that says `ok` imports `result`, one that says `?none` imports `is`, one that says `call` imports `call`, one that writes a `form` imports `form`. forget one and `tsc` tells you, in the usual way, on the right line.
- a type-only import has to say `type`. the runtime loader leans on node's own type stripping, which cannot tell a type from a value, so write `import { result, type Result } from ...`.

the two commands mirror the typescript ecosystem. `tzc` mirrors `tsc`: it emits, runs `tsc` on the emit, and moves every diagnostic back onto the `.tz` line and column it came from. `tzx` mirrors `tsx`: a node loader hook turns `.tz` into typescript in memory and lets node strip the types, so nothing lands on disk.

```
node dist/tzc.js scratch                        # emit the .ts beside each .tz, then typecheck it
node dist/tzx.js --test scratch/signup.spec.tz  # run a spec
node dist/tzx.js scratch/main.tz                # run a program
```

the promise for the rest of this tutorial: everything tz does is sugar. every construct lowers to a hand-writable `tstd` pattern. tz writes it consistently, refuses the spellings that break the discipline, and both halves typecheck through the same `tsc`, so the sugar and the plain code never drift.

## how things are in typescript

before any tz, the scenarios the library documents, written in typescript under tstd's own rules. these are the patterns; tz is what they look like when a transpiler writes them. know them by heart before the sugar makes sense.

### the funnel: refuse a payload

validation in this style is narrowing, and narrowing owns every failure; what comes after a guard is total:

```ts
import { is, result } from '@belelabestia/tstd';

const shape = {
  email: is.string,
  age: is.number
} satisfies is.Schema;

const signup = (body: unknown) => {
  if (!is.model(body, shape)) return result.err('malformed body');
  if (body.age < 18) return result.err('under age');

  return result.ok(body);
};
```

the schema literal stays a schema through `satisfies` instead of widening, and `is.model` is a type guard, so past it `body.age` is a checked number. no casts, no parse step: the funnel, from exceptional to general.

### presence and absence

we never tell `null` and `undefined` apart. a value is either present or absent, and `is.some` / `is.none` are the only words needed. a table lookup that may miss:

```ts
const table: Record<string, string> = { '1': '{"name":"ada"}' };

const row = (id: string) => {
  const found = table[id];
  if (is.none(found)) return result.err(`no row ${id}`);

  return result.ok(found);
};
```

and a fallback that substitutes a value rather than failing:

```ts
const port = (env: Record<string, string>) => {
  const found = env.PORT;
  if (is.none(found)) return 8080;

  return found;
};
```

typescript would write these with `??`; tz refuses it (and the `?:` ternary), so the absence check is the only spelling, and "is it here" and "if not, what" stay separate lines.

### a branch worth naming

when presence and absence are not enough, you name an outcome: a tagged branch. the one rule from the readme: "use `branch` only if checking against presence or absence of a return value isn't enough". a two-side claim, refusing the side already taken:

```ts
const claimed: Record<string, boolean> = {};

const claim = (id: string) => {
  if (is.some(claimed[id])) return result.err(`already claimed: ${id}`);
  claimed[id] = true;

  return result.ok(id);
};
```

and a decision with more answers, where `branch(...)` is the literal notation for the value and `Union<{...}>` for the type:

```ts
const toughDecision = (n: number) => {
  if (n < 0.2) return branch('xs', { a: 1 });
  if (n < 0.4) return branch('s', 'hello');
  if (n < 0.6) return branch('m', 2);
  if (n < 0.8) return branch('l', [1, 2, 3]);
  return branch('xl');
};
```

no `else`, no `switch`, no single exit point; `branch('xl')` needs nothing, which is the point of `void` payloads.

### failure as a value

the rule of the house: **we do not throw. a panic is always something you did not write.** a throw is invisible to a signature, exactly like a method's `this` requirement, so throwing calls live in `make` and `call`, whose job is to turn the unsafety into a `Result`.

```ts
const url = make(URL, href);
if (url.branch === 'err') return url;
url.value.href;
```

```ts
const parsed = call.sync(() => JSON.parse(raw));
if (parsed.branch === 'err') return parsed;
parsed.value;
```

and the same boundary feeding a guard, which is the recipe the `call` keyword will compress:

```ts
const rowShape = { name: is.string } satisfies is.Schema;

const name = (id: string) => {
  const raw = row(id);
  if (raw.branch === 'err') return raw;

  const parsed = call.sync(() => JSON.parse(raw.value));
  if (parsed.branch === 'err') return parsed;

  if (!is.model(parsed.value, rowShape)) return result.err('not a row');

  return result.ok(parsed.value.name);
};
```

no `try` in business code, and no monadic api on `result`: no `map`, no `andThen`, no `unwrap`, no `match` on a branch. you check the tag and return; flow is never hidden behind data. a function that cannot fail returns the bare value, not a `Result`.

### resources, handed back in reverse

`scope` holds resources and hands them back in reverse, whatever happened: `close` on success, `abort` on failure, and whatever refuses to go back shows up in `leaked`:

```ts
const pool = {
  take: (name: string) => ({
    open: () => name,
    close: (conn: string) => void conn,
    abort: (conn: string) => void conn
  })
};

const both = (a: string, b: string) =>
  scope.sync(hold => {
    const one = hold(pool.take(a));
    if (one.branch === 'err') return result.err('cannot hold the first');

    const two = hold(pool.take(b));
    if (two.branch === 'err') return result.err('cannot hold the second');

    return result.ok(`${one.value} and ${two.value}`);
  });
```

the resource declares `open`, `close` and `abort`; `hold` acquires through `call`, so each acquisition is one guard line like every other narrowing. promise-returning resources use `scope.async`, where a mapped type turns `hold` into its `await`-ing twin.

### schemas without codecs

narrowing answers "is this the shape", but some values genuinely differ on the two sides: an instant is a timestamp on the wire and a `DateTime` in memory, and the two conversions must stay inverses forever. two functions that must stay inverses are declared in one place, or they drift apart the first time a field is renamed. that pairing is a **form**:

```ts
import { form, is, iso } from '@belelabestia/tstd';

const instant = {
  is: iso.timestamp,
  decode: (x: iso.Timestamp) => iso.fromTimestamp(x),
  encode: (x: iso.DateTime) => iso.toTimestamp(x)
} satisfies form.Field<iso.Timestamp, iso.DateTime>;

const user = { id: form.plain(is.string), seen: instant } satisfies form.Fields;

type encoded = form.Encoded<typeof user>;   // what travels and what gets stored
type decoded = form.Decoded<typeof user>;   // what you carry in memory
```

fields that read the same on both sides wrap in `form.plain`, ones that differ are a `{ is, decode, encode }` triple, a whole model nests with `form.nest`. proving the shape and mapping it stay two steps.

```ts
if (!form.model(raw, user)) return result.err('malformed wire format');
const me = form.decode(raw, user);    // cannot fail, the guard already ran
const wire = form.encode(me, user);   // a moment later, on the way out
```

this is not a codec: failure does not live in it. `decode` runs after the guard, so it returns the value unboxed; no `Either`, no error accumulation, none of the combinator tower those force on a library.

### machines as data

a union is a set of branches, a machine is a union that knows what follows what, and both are declared the same way: as functions. a parameter is the only slot in a value that states a type, so one object of functions states one type per key, and the runtime literal and its type cannot drift.

```ts
import { protocol, Union } from '@belelabestia/tstd';

const load = protocol.init({
  idle: () => ['loading'],
  loading: (value: { at: number }) => ['done', 'failed'],
  done: (value: string[]) => {},
  failed: (value: string) => ['loading']
});

type Load = Union<protocol.Model<typeof load>>;

const describe = (x: Load) => {
  if (x.branch === 'done') return `rows: ${x.value}`;
  if (x.branch === 'failed') return `failed: ${x.value}`;

  return 'still going';
};
```

nothing following anything is a union, something following is a machine, and `protocol.init` is the one call for both. the parameter declares what a branch carries, and the result names which branches may follow, or nothing.

## what tz takes away

the transpiler is a lexer, so it refuses unknown words line by line. every refusal is a readme decision, spelled as a diagnostic on the source line. the full table from `src/ban.ts`:

| banned | instead |
| --- | --- |
| `class` | a module, or a closure with an `init` |
| `function` | an arrow const |
| `this` | an argument |
| `new` | `make` |
| `interface` | `type` |
| `enum` | `Union` |
| `match` | `? {}` |
| `var` | `const`, or `let` |
| `namespace`, `module` | a file |
| `any` | `unknown` |
| `instanceof` | a guard |
| `yield` | a loop |
| `abstract`, `implements`, `private`, `protected`, `public`, `super`, `constructor` | gone with `class` |
| `throw` | `err` |
| `switch` | `? {}` |
| `guard` | a `?false` or `?none` decline |
| `catch`, `finally` | `call.sync`, `call.async`, or the tz `try` |
| `get`, `set` | a function wearing a hat |
| method shorthand `x() {}` | `x: () => {}` |

then the punctuation and shape refusals:

- `===` and `!==` are refused; you write `==` and `!=`, and they emit the strict ones. one spelling of equality, guarded by the transpiler instead of by habit.
- `??` is refused; the absence matchers say which half it is doing. `?:` is refused; answer with `?true => ... else ...`.
- comparing against `null` or `undefined` is refused; `is.some` and `is.none` say presence.
- a bare `return` is refused; every `return` is a decline, so it has to be a side matcher (`cond ?false return`, `val ?none return`).
- the `async` modifier is refused; an `await` in the body infers it, and `async x` states the rest of the story.
- `Promise.reject` is refused; a rejection is a throw on a later tick, so resolve with a `Result`.
- typescript's own `try { } catch { }` is refused; use `call.sync`, `call.async`, or the tz `try`.

naming the rejection is the point: each refusal is a rule you would otherwise keep in your head, and head-kept rules are the first a team forgets.

## what tz adds

a dozen words and two sigils, each with one job. `?` tests a value where it stands, with `none`, `some`, `true`, `false`, `:tag`, a literal or `(cond)` saying what failed; `=>` yields a value and `else` names the miss; `:tag` builds a branch the same colon matches; `ok`, `err` and `async` answer a body under one discipline; `try` propagates a failure without naming it; `? {}` answers exhaustively where `tsc` checks totality; `scope` holds resources and hands them back; `protocol` declares a union or a machine in one block; `form` declares the wire shape and the domain shape in one place; `call` isolates foreign code that can throw. the sections below take each in turn, simplest shape first.

## what tz brings

with the removals in hand, the constructs. each one lowers to a typescript pattern above, demonstrated against the same scenarios.

### ok, err, async: one discipline per body

a body answers with exactly one of `return`, `ok`, `err` or `async`; the transpiler refuses a mix. a fallible body gets the implied `ok` at its end:

```tz
const row = (id: string) => {
  const found = table[id] ?none err `no row ${id}`;
  ok found;
};
```

an `await` in the body makes it a promise body; inference cannot say a promise that never suspends, so `async x;` states it, emitting `return Promise.resolve(x);`:

```tz
export const ready = (x: string) => {
  async x;
};
```

### answer with a chain, decline with a statement

when both boolean sides are meaningful, answer with `=>` and name the miss with `else`; an `else` holds another chain, so the subjects evaluate only on their miss:

```tz
export const label = (n: number) =>
  n < 0 ?true => 'below' else n == 0 ?true => 'nothing' else => 'above';
```

the miss answers like any matcher tail: `=> expression`, `=> { block }`, or an exit. a bare value answers nothing, so `else 'above'` is refused and reads `else => 'above'`. an exit in the final else flips the whole chain to a decline ladder: the value branches become returns, and the subjects evaluate only on their miss:

```tz
export const level = (n: number) =>
  n < 0 ?true => 'below'
  else n == 0 ?true => 'nothing'
  else return 'above';
```

captured, the chain binds once: the value branches assign to a temp, the decline branch leaves, and the binding reads the temp after the funnel:

```tz
export const look = (n: number) => {
  const tag = n < 0 ?true => 'below'
    else n == 0 ?true => 'nothing'
    else err 'above';
  ok tag;
};
```

as a statement the two sides share one subject with `else` between them: exactly one side runs, one line or one block per side like an `if`, and a scope is not a value, so there is no `=>` on them:

```tz
export const run = (cond: boolean) => {
  log('start');
  cond ?true {
    a();
    b();
  } else {
    c();
    d();
  };
  log('done');
};
```

more than two sides list every arm under a bare `?`, one per line, the statement form of an exhaustive answer:

```tz
export const react = (cond: boolean, seen: (x: string) => void) => {
  cond ? {
    true seen('yes');
    false seen('no');
  };
};
```

when the boolean is worth declining, answer with a statement, one with no `else`: an `else` after a decline means you missed a branch of the funnel, and the transpiler refuses to guess it for you.

```tz
export const clamp = (n: number) => {
  if (n < 0) return 0;
  if (n > 100) return 100;

  return n;
};
```

### ? {}: answer exhaustively

`? {}` answers over a value or over a branch: quoted and literal arms for values, `:tag` arms that bind the payload for branches, `(cond)` arms for computed cases. `_` is the open case, a last resort: when the arms cover the whole union `tsc` proves the block returns, and a missing branch lands as `| undefined`. exhaustiveness is `tsc`'s job, not the transpiler's:

```tz
export const say = (code: number) => code ? {
  200 => 'ok',
  400 => 'bad request',
  _ => 'something else'
};
```

```tz
export const describe = (x: Load) => x ? {
  :done (rows) => `rows: ${rows}`,
  :failed (why) => `failed: ${why}`,
  _ => 'still going'
};
```

a condition arm names no tag and binds nothing; it tests strictly, the hit meaning `=== true`. a block with only identity arms switches on the subject, the way `match` used to; a block containing a condition switches on `true` instead, so literals beside conditions become boolean cases and the first hit wins:

```tz
export const word = (code: number) => code ? {
  200 => 'ok',
  (code > 500) => 'down',
  _ => 'other'
};
```

### try: propagate without naming

`try` propagates a failure without naming it, and binds the unwrapped value. it is the prefix for anything that hands back a `Result`: a plain call, a `call` at the foreign boundary, a `hold` inside a scope. spelled out, `try x` is `x ?:err (e) err e`: on the err branch, decline with the payload it carried.

```tz
export const name = (id: string) => {
  const raw = try row(id);
  const parsed = try call => JSON.parse(raw);
  is.model(parsed, rowShape) ?false err 'not a row';
  ok parsed.name;
};
```

### scope

`scope` is sugar over `scope.sync` / `scope.async`: the resource body with the reverse-order release.

```tz
export const both = (first: string, second: string) => scope (hold) => {
  const a = try hold(pool.take(first));
  const b = try hold(pool.take(second));
  ok `${a} and ${b}`;
};
```

### protocol

a `protocol` declaration is the machine-and-union device as a literal instead of a call, with the derived things drawn in one place:

```tz
protocol load {
  idle => loading,
  loading<{ at: number }> => done | failed,
  done<string>,
  failed<string> => loading
}
```

angles declare what a branch carries, a list after `=>` the transitions, nothing after a leaf. the declaration reads as arrows between names, and the transpiler derives the union type, so the model call is never written twice. exported and generic protocols work the same way, `export protocol outcome<T, E> { ... }`, with factories to call: `outcome.pending(at)`, `outcome.done()`.

leaving a scope, substituting a value, and answering conditionally could be three constructs; overlap is what this project removes, so there is one postfix family under `?`. `form` and `call` are built against the same tstd modules.

### one rule decides exit, fallback, and answer

everything hangs on what follows the matcher. an exit keyword (`return`, `ok`, `err`, `break`, `continue`) leaves the scope, carrying a value along if one is given; `=>` yields a value, and always needs a land; a bare `{}` runs inline, declining when it exits; `else` names the miss branch of a `=>` answer. a bare value answers nothing: expressions answer with `=>`, or they are refused.

```tz
const user = db.find(id) ?none return;        // leaves the function
const user = db.find(id) ?none return 42;     // leaves it answering 42
const user = db.find(id) ?none err 'User not found';
```

```tz
const port = process.env.PORT ?none => 8080;  // yields a value in place, execution continues
```

a block after `=>` is an IIFE; `return` resolves it, here into `a`:

```tz
const a = x ?:err => {
  const val = getFallbackValue();
  log(val);
  return val;
};
```

effects plus an exit spell inline, the block emitting as written and the exit leaving the function:

```tz
x ?:err (e) {
  log(e);
  err e;
};
```

the difference between "leave, there is no answer" and "continue, with this instead" is the `=>`, not two constructs; the tail is parsed token level, like everything else.

### the matchers

seven matchers, all postfix, all under `?`:

| matcher | what it matches | example |
| --- | --- | --- |
| `?none` / `?some` | presence and absence | `table[id] ?none err 'no row'` |
| `?true` / `?false` | a boolean | `body.age >= 18 ?false err 'under age'` |
| `?:label` | a branch of a tagged union | `pay() ?:err (e) err why` |
| `?literal` | strict identity on a number or string | `x ?0 => -1` |
| `?(cond)` | a computed boolean, strictly | `n ?(n < 0) => 0` |

a literal collapses `x == 4 ?true` into `x ?4`: numbers glue their sign, strings take quotes, templates are refused in favor of quotes. a condition names the bare subject it tests, which the emit renames onto the temp; the hit is `=== true`, never truthiness, and conditions chain and mix like any other matcher. the decline's job splits between them: a boolean precondition declines with `?false`, a maybe-missing value with `?none`, an error branch with `?:err`. failures still narrow, and what follows stays total.

### bindings: name it or drop it

`?some` and `?:tag` carry a value, so they bind one in parens, and the name reaches everywhere the tail reaches, template holes included:

```tz
request.body.email ?some (email) sendMail(email);
```

```tz
const out = name(id) ?:err (why) err `no answer for ${id}: ${why}`;
```

a binding nothing uses is refused: `read() ?:err (e) => 'localhost'` does not compile, and neither does a `? {}` arm whose answer ignores its name. drop the parens and move on. `?none`, `?true` and `?false`, literals and conditions carry nothing, so they never bind at all.

and one split to keep straight: the binding lives on the match side. an `else` branch runs on miss, where the bound value names nothing, so `x ?:e (e) => 1 else f(e)` is refused alongside the unused ones. the same goes for a `? {}` arm: bind what the answer carries, or nothing.

### the scenarios, rewritten

the signup funnel keeps its shape and loses its wrapper:

```tz
const signup = (body: unknown) => {
  is.model(body, shape) ?false err 'malformed body';
  body.age >= 18 ?false err 'under age';
  ok body;
};
```

the looked-up row and the claimed key both drop one layer:

```tz
const row = (id: string) => {
  const found = table[id] ?none err `no row ${id}`;
  ok found;
};

const claim = (id: string) => {
  claimed[id] ?some err `already claimed: ${id}`;
  claimed[id] = true;
  ok id;
};
```

and one refusal per turn of the loop, exits included:

```tz
export const active = (rows: string[]) => {
  const out: string[] = [];

  for (const row of rows) {
    row ?none continue;
    row.length > 0 ?false continue;
    out.push(row);
  }

  return out;
};
```

a branch answer: refuse the branch that carries the failure, binding what it carries to say why, and keep the value:

```tz
const say = (id: string) => {
  const who = name(id) ?:err (why) err `no answer for ${id}: ${why}`;
  ok `hello ${who}`;
};
```

and the inline fallback, the `??` replacement, spelling what the absence check used to take two lines to say:

```tz
const port = process.env.PORT ?none => 8080;
```

and presence with something to do is a trigger, binding what was there the way `:err` binds `(why)`:

```tz
request.body.email ?some (email) sendMail(email);
```

what the matchers cover: declines (`?false return`, `?none err`, `?:err err`, `?0 return`), fallbacks (`?none => dflt`, `?0 => -1`), conditions (`?(n < 0) => 0`), one-sided reactions (`?true log`, `?true { ... }`), two-sided statements (`?true a else b`), exhaustive statements (`? { true a; false b; }`, chaining with `else if` under conditions), conditional answers (`?true => a else => b`, with an exit allowed on the miss side), exhaustive answers (`? { 200 => a, (x > 500) => b, _ => c }`), and inline declines (`?true { log(); return; }`). `? {}` stays for the closed-world exhaustive case, where `tsc` checks totality.

### in-argument unwrapping

the matcher is postfix on any expression, so it works inside argument lists, where a statement never could: the failure is enforced at the point of value initiation, which was always the goal, kept this time:

```tz
const receipt = processPayment(
  cart[userId] ?none err 'Cart empty',
  token ?none err 'Missing token'
) ?:err (e) err `Payment failed: ${e}`;
```

### the side-effect trigger

one side is all you care about: `?true` (or `?false`) with a single expression, no exit, no unwrap:

```tz
status != 'ready' ?true log('going down');
```

the single-branch `if (cond) { ... }` from typescript, kept because it reads forward: condition, then what fires, on one line. an expression must always be captured, so `=>` as a statement is refused: a statement runs an expression or a block. a `=>` block as a statement is refused too, scopes do not take `=>`; `break` and `continue` are exits like any other on a matcher tail, but a `=>` block is a function boundary, so they are refused on it. longer reactions take the bare block form, one line or one block per side with `else` between them, and longer matches list every arm under a bare `?`.

### branches built with a colon

the same colon that matches a branch constructs one, in any value position: after `(`, `,`, `[`, `=`, `=>`, another `:`, `return`, `ok` or `err`. `:idle` is a branch with nothing to carry, `:failed(why)` one with a value:

```tz
const idle = :idle;
const failed = (why: string) => :failed(why);
```

exactly one value or nothing: `:err()` and `:err(a, b)` are both refused. and never in type position, where a colon already has a job. the pairing is the point: `?:tag` binds what `:tag(...)` builds, and a `? {}` arm answers with either.

### what the matchers refuse

the flip side of the ladder, in one place. an expression answers with `=>` and must always be captured, so `=>` as a statement is refused and a bare value after a matcher in an answer is refused; a statement runs an expression or a block, with `else` between its two sides and a bare `?` block listing every arm of a longer match; a matcher after a consumed tail belongs to no subject, so chain with `else` or start a new statement; matchers do not nest, so bind the inner value first; one `else` per answer; exits never hide in arrow bodies, `=>` blocks or `? {}` arms, and `try` never shares a statement with a matcher; bindings name values, not keywords, and the miss branch cannot borrow them. each refusal points at the line that needs restructuring, and `tsc` never sees the confusion.

### summary of the construct matrix

| construct | syntax | role | replaces |
| --- | --- | --- | --- |
| postfix exit | `val ?none err 'msg'`, `cond ?false return` | early exit from scope on failure | an early `return`, an `if (!cond) return` clause |
| postfix fallback | `val ?none => fallback`, `cond ?false => 'guest'` | inline value substitution, with an exit allowed on the miss side | `??` |
| conditional chain | `cond ?true => a else b` | answer one of two values | ternary `?:`, the `if` expression |
| inline decline | `a ?true { log(); return; }` | effects plus an exit, inline | `if` with effects and an early exit |
| side-effect trigger | `cond ?true log('ok')`, `cond ?true { ... }` | run on match, keep going | single-branch `if` |
| two-sided statement | `cond ?true a else b` | run one of two sides | two-branch `if`/`else` |
| exhaustive statement | `cond ? { true a; false b; }` | run one of many sides, chaining with `else if` under conditions | `if`/`else` chains |
| exhaustive answer | `x ? { 200 => a, (x > 500) => b, _ => c }` | total coverage over values, branches, and conditions | `switch`, `if/else` chains |

### form: declare the two forms once

the `form` construct is the frontend for `form.ts`: one block instead of a wire type, a domain type, a guard, a decoder and an encoder. each field is either a guard, a triple, or a triple renamed with `as`:

```tz
export form user {
  id: is.string,
  created_at: {
    is: iso.timestamp,
    decode: iso.fromTimestamp,
    encode: iso.toTimestamp
  } as createdAt,
  roles: is.array,
  address: form.nest(addressForm)
}
```

no `as`, no rename: `id` and `roles` are plain fields when the value is a guard, identical on both sides, wrapped in `form.plain(...)`. a triple is already a field, so it passes through untouched; `as` carries the memory key the way `form.as` does underneath. fields separate with a comma or a semicolon, the way an object literal accepts both. the conversions borrow their signatures straight from the library, no lambdas and no annotations; a hand-written lambda annotates its parameters the way any signature does. the `=>` spelling is retired: the guard and the type it implied are both inferable, so only the rename is declared.

the derived forms come out on the closing line, named after the declaration:

```ts
export const user = {
  id: form.plain(is.string),
  created_at: form.as({
    is: iso.timestamp,
    decode: iso.fromTimestamp,
    encode: iso.toTimestamp
  }, 'createdAt'),
  roles: form.plain(is.array),
  address: form.nest(addressForm)
};
export type UserForm = form.Encoded<typeof user>;
export type User = form.Decoded<typeof user>;
```

`UserForm` is what travels and gets stored, `User` what you carry in memory, from the same object, so the field names are written once. the decoding discipline is unchanged, only spelled with the matcher:

```tz
const processPayload = (raw: unknown) => {
  form.model(raw, user) ?false err 'malformed wire format';
  const u = form.decode(raw, user);
  log(`created at: ${u.createdAt}`);
  const payload = form.encode(u, user);
  ok payload;
};
```

the field variations, in one table:

| field | syntax | emitted |
| --- | --- | --- |
| plain | `id: is.string` | `id: form.plain(is.string)` |
| triple | `seen: { is, decode, encode }` | a `seen` field, as written |
| renamed | `raw: { is, decode, encode } as name` | `raw: form.as({ is, decode, encode }, 'name')` |
| nested | `address: form.nest(addressForm)` | `address: form.nest(addressForm)` |

the emitter parses no typescript types here; field assignments and blocks are token structures. the whole transpiler design, applied to the one construct that looks like a declaration. three refusals keep it honest: no generics on the declaration, no `=>` in a field, and no rename without a key; conversion bodies stay ordinary typescript, so the bans apply inside them too.

### call: the boundary that does not throw

a throw is converted into a `Result` at two boundaries; this is the second one, promoted to a keyword. `call` isolates foreign or non-typezig code, sync or async, into an explicit, non-throwing `Result`:

when the `Result` is the whole answer, answer it directly: no `try`, no `ok`, the closure the emit already opens is the value the body hands back:

```tz
export const parse = (raw: string) => call => JSON.parse(raw);
```

which emits, one line in one line out:

```ts
export const parse = (raw: string) => call.sync(() => JSON.parse(raw));
```

`try` is for when work continues after the boundary: it unwraps left, so `try call` takes `=>` the way a side matcher does:

```tz
const raw = try call => JSON.parse(file.readToString());
```

which emits, one line in one line out:

```ts
const $0 = call.sync(() => JSON.parse(file.readToString()));
if ($0.branch === 'err') return $0;
const raw = $0.value;
```

multi-line work takes the block form, and an async foreign call takes `await call`:

```tz
const raw = try call => {
  const content = file.readToString();
  return JSON.parse(content);
};
```

```tz
const response = try await call => fetch(url);
```

an `await` inside the closure picks `call.async` and the async closure on its own, keyword or no keyword, and the body lifts to `async` either way:

```tz
const response = try call => {
  return await fetch(url);
};
```

an arrow with no block cannot lift, so there `await` forwards the promise itself: `=> await call => fetch(url)` emits `=> call.async(() => fetch(url))`, the same `Promise` of `Result` the `async`/`await` variant hands back, with nothing to suspend:

```tz
export const get = (url: string) => await call => fetch(url);
```

the boundary matrix, each row the same three lines of emitted typescript:

| mechanism | syntax | target |
| --- | --- | --- |
| sync expression | `call expr` | `JSON.parse`, `fs.readFileSync` |
| sync block | `call => { ... }` | multi-line sync foreign work |
| async expression | `await call => expr` | `fetch`, third-party sdks |
| async block | `await call => { ... }` | multi-line async foreign work |

the keyword still needs the import, the way `ok` needs `result`: the emit calls `call.sync`, and the emitter never writes an import. a block answers with its `return`, so a block that falls off the end is refused, and `try`, `ok` and `err` stay outside it: the boundary converts the panic, nothing else does. and since a bare `call` already wraps the closure, an uncaptured one dangles: a `call` with no land is refused, so `return` (or a binding) carries it, never silence. a call that yields nothing spells `void`, which discards the boundary on purpose and passes through:

```tz
export const forget = (save: (x: string) => void, x: string) => {
  void call => save(x);
  ok 'saved';
};
```

`try` lands its ok, so a bare `try` statement is refused: the deliberate drop spells `void try`, which propagates the err and voids the ok on the record. the two spellings differ in exactly one thing, whether the failure climbs:

```tz
void call => save(x);   // drops the whole result, failure and all
void try call => save(x);   // propagates the err, drops the ok
```

the deeper rule is type-level and belongs to the lsp, not the emitter: any expression statement whose value is a `Result` or a promise needs the `void`, whatever produced it. the emitter only catches the constructs that announce their product themselves, `call`, `scope` and `try`; whether some other dropped value, a plain call or an unwrapped `x.value`, hides a result is a question of types, and the lsp is where it gets asked.

### the whole pipeline

the four newest pieces working together:

```tz
export form configForm {
  port: is.number,
  host: is.string
}

const loadConfig = (filePath: string) => scope (hold) => {
  const file = try hold(openFile(filePath));

  const raw = try call => JSON.parse(file.readToString());

  form.model(raw, configForm) ?false err `invalid configuration structure in ${filePath}`;

  const config = form.decode(raw, configForm);

  ok config;
};
```

and its consumer, the same matchers on the way out: a scope ends with an `exit`, not a `Result`, so `serve` refuses the panic first and propagates the work's answer after:

```tz
const serve = (filePath: string) => {
  const held = loadConfig(filePath);
  const done = held.exit ?:panic (why) err `panic: ${why}`;
  const config = try done;
  config.port > 0 ?false err `a port has to be positive`;
  start(config);
  ok 'listening';
};
```

trace each line: `scope` holds the file and gives it back whatever happens; `try hold` acquires it, one guard; `try call` runs foreign code and turns the panic into a `Result`; `form.model` proves the shape, which lets `form.decode` be infallible and return the config unboxed. on the way out one matcher refuses the panic, `try` unwraps the work, and one more refuses an impossible port.

## scope, honestly

two things are missing and both are by design.

the lsp and the type-aware checks are next: boolean conditions, `void`-prefixed `Result` statements, exhaustive `? {}` over unions. none belong in the emitter, which has no types; the exhaustiveness check needs `tsc`, and `tsc` is already there, with diagnostics moved back onto the tz source.

`tz` is self contained on purpose, so it can move to its own repo with a `git mv`. it depends on `tstd` like any consumer, and the sugar never gets ahead of the library: every construct is a hand-written tstd pattern, one step from the plain typescript it lowers to.