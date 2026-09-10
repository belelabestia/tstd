# typezig

design notes. lives here until the language gets its own repo, and so does the prototype: a
top-level `tz/`, self-contained, moving out with these notes when it is mature enough.

typezig is typescript with most of typescript taken away, plus eight constructs, transpiled
back to typescript that imports `tstd`.
extension `.tz`. the ideas are the same ideas: short-circuiting, flow over data, types as the contract.
the language exists so the patterns `tstd` documents stop being boilerplate you retype.

## the shape of the thing

it is **not** a new language with a typescript backend. it is a **sugar transpiler**:
a token-level rewriter that leaves every character it does not recognise alone.
this single decision is what makes the rest cheap, so it is a hard constraint, not a phase.

### hard constraints

1. **one line in, one line out.** every `.tz` line emits exactly one `.ts` line.
   line numbers are the source map. columns get a per-line shift table, or nothing at all.
2. **never parse typescript.** lex it (strings, templates, comments, regex, braces), do not grammar it.
   the constructs are found at token positions and their spans are rewritten. everything else is copied.
3. **the emitter has no opinions.** it does not know types, does not know if a value is a `Result`.
   `tsc` is the typechecker. an emitter that guesses is an emitter that lies.
4. **the output is readable.** it is code a person could have written by hand, because it is
   exactly the code `src/scope.ts` already writes by hand.
5. **the emitter never writes an import.** `ok` compiles to `result.ok`, `protocol`
   compiles to `protocol.init` and `Union`, and a file that uses them imports them. an
   emitter that decides what your module imports has an opinion about your module, and the
   first time it guesses the wrong `tstd` it writes a bug that reads like a mystery.

## the constructs

### guard

`guard` states what must **hold**. its block runs when that fails, and the block leaves.
swift's polarity, without swift's `else`: the word itself is the marker.

```
if (condition for leaving) {   ->   guard (condition for staying) {
  stuff;                               stuff;
  return;                            }
}
```

the `return;` is gone because it is implied. **a guard block that does not end in an exit gets
a bare `return;` appended.** that is the whole definition: a guard is an `if` that returns at
the end.

which settles what a guard can leave with, and the answer is **nothing, or an error**:

| ends in | means |
| --- | --- |
| nothing | the implicit `return;`: absence |
| `err x` | a stated failure |
| `break`, `continue` | absence, one loop turn at a time |
| `return x`, `ok x` | **refused** |

a guard declines. absence and an error are the two ways to decline; a value is not a decline,
it is an answer, and an answer does not belong in the block you wrote to refuse one. so there
is no way to return a value from a guard, by construction.

that lands exactly on "never tell `null` and `undefined` apart, just presence and absence".
the bare form is the absence exit, and it is how an optional lookup reads:

```tz
const row = table[id];
guard (is.some(row));
return row;
```

with an error, in a function that returns a result:

```tz
const parse = (raw: string) => {
  const n = Number(raw);
  guard (is.number(n)) err `not a number: ${raw}`;
  ok n;
};
```

```ts
const parse = (raw: string) => {
  const n = Number(raw);
  if (!(is.number(n))) return result.err(`not a number: ${raw}`);
  return result.ok(n);
};
```

braces when a second statement wants them, and the implicit exit lands on the closing line so
the line count holds:

```tz
guard (is.number(n)) {
  log(raw);
}
```

```ts
if (!(is.number(n))) {
  log(raw);
return; }
```

with nothing to do at all, the body can be empty:

```tz
guard (is.number(n));
```

```ts
if (!(is.number(n))) return;
```

the implicit tail is the one part of `guard` that could plausibly be dropped, and dropping it
costs more than it saves. without it, that line is `guard (is.number(n)) return;`, which puts
a bare `return` back in tz source, and then `return` no longer means "an answer leaves here".
**the implicit tail and the bare-`return` ban are one decision, not two.** the guard says how
it fails when it has something to say, and says nothing when it has nothing.

**the implicit exit is a bare `return`, so it is illegal in a fallible body.** this is not a
second rule, it is the discipline check meeting the implicit tail: a guard with no explicit
exit contributes a bare `return`, and a body that uses `ok`, `err` or `try` may not contain one.

the reason is the whole reason the discipline exists. in a fallible body the implicit tail
would emit this:

```tz
const pick = (xs: string[], i: number) => {
  guard (i < xs.length);
  ok xs[i];
};
```

```ts
const pick = (xs: string[], i: number) => {
  if (!(i < xs.length)) return;
  return result.ok(xs[i]);
};
```

the inferred type is `Result<string, never> | undefined`, which is the silent union all over
again: the caller narrows the branch, forgets the `undefined`, and finds it at runtime. a
result-returning function has to say **how** it failed, and `guard (i < xs.length) err 'out of
range';` says it.

in an infallible body the same guard is exactly right:

```tz
const announce = (name?: string) => {
  guard (is.some(name));
  log(`hello ${name}`);
};
```

```ts
const announce = (name?: string) => {
  if (!(is.some(name))) return;
  log(`hello ${name}`);
};
```

no extra pass pays for this. the checker already walks each body to classify it, and an
implicit tail is just one more bare `return` in the tally.

it emits an `if`, so **typescript's narrowing does all the semantics**. the construct adds a
word and a check, not a behaviour. narrowing survives the inversion, including through a
conjunction: after `if (!(a && b))` typescript has both `a` and `b` narrowed, so `guard (a && b)`
composes the way a list of preconditions should.

### if

`if` answers. it does it as a statement or as an expression, and the two forms differ by
exactly one thing: **the expression form has an `else` and the statement form does not.**

#### the expression form, which replaces the ternary

```tz
const n = if (is.number(raw)) raw else 42;
```

```ts
const n = is.number(raw) ? raw : 42;
```

`else` is required here, because an expression has to produce a value on both sides. chains
work and nest the way you expect:

```tz
const label =
  if (n < 0) 'neg'
  else if (n == 0) 'zero'
  else 'pos';
```

```ts
const label =
  n < 0 ? 'neg'
  : n === 0 ? 'zero'
  : 'pos';
```

so `?:` is banned from tz source. one conditional expression, one spelling, and it is the
spelling that reads as words. `?.` is untouched. `??` is banned and `any:none` replaces it.

**both branches are expressions.** `const x = if (c) 42 else err 'no';` is refused: that is a
decline hiding in an answer, and `guard (c) err 'no';` already says it. the partition holds
here too, and it is what keeps the expression form from swallowing the whole language.

statement or expression is decided by the token before the `if`. after `=`, `return`, `ok`,
`err`, `(`, `,`, `[`, `:` or an operator it is an expression; after `;`, `{`, `}` or nothing
it is a statement. one token of lookbehind.

#### the statement form, which has no `else`

```tz
if (verbose) log(raw);
if (bad) return y;
if (bad) { log(raw); return y; }
```

unchanged from the ruling, and it keeps `if` polarity. no `else`: a statement that wants two
sides is either an expression (use the expression form) or a funnel that has not funnelled yet
(use a `guard`).

so the two constructs read in opposite directions and that is the point: `if` never inverts,
`guard` always does. the word in front of the paren tells you which, before you read the
condition.

#### a braced `if` may exit, but only with a value

that follows from the line above. a guard cannot hand back a value, so something has to, and
the shape it has to cover is "do a little work, then leave with an answer":

```tz
if (!is.number(n)) {
  log(raw);
  return fallback;
}
```

there is no guard spelling of that, on purpose. so the two constructs partition the exits by
**what leaves**, not by how they are written:

- `guard` leaves with nothing or an error. it declines.
- `if` leaves with a value, or does not leave at all.

every shape has exactly one spelling and none of them overlap:

```tz
guard (c);                        // leave, nothing
guard (c) { log(raw); }           // leave, nothing, after doing something
guard (c) err 'x';                // leave, error
guard (c) { log(raw); err 'x'; }  // leave, error, after doing something
if (bad) return y;                // leave, value
if (bad) { log(raw); return y; }  // leave, value, after doing something
if (verbose) log(raw);            // stay
```

so a braced `if` that ends in a bare `return;` is refused: that is a decline wearing an `if`,
and `guard` owns declines. it is the same check the guard tail already needs, read from the
other side.

what is left of the reading rule is weaker than "a `{` after `if` always continues", but it
still says something worth having: **a `guard` never answers and an `if` never declines.**

#### so what if a guard wants to return 42?

then it is not a guard. it is an `if`, and it says so:

```tz
if (!is.number(n)) return 42;
```

the objection that makes this rule worth defending is that `err` carries a payload too, so
why is one payload an answer and the other not. because an error is not an answer: it is a
refusal that says why. a `Result`'s error branch is "no value, and here is the reason", which
is why the branch exists at all. **a guard may say why, never what.**

and 42 usually wants one of the three spellings that already exist:

```tz
if (!is.number(n)) return 42;                  // an answer for a case you chose not to refuse
const n = if (is.number(raw)) raw else 42;     // a two-sided choice, which is an expression
const n = readPort() on:err (e) => 42;          // a failure you are deliberately swallowing
```

the last two are the honest ones. a fallback is a decision, not a refusal, and writing it as
a guard would have hidden that.

the partition falls out of the code without being enforced. nothing is declined here, so
there is not a guard in sight:

```tz
const clamp = (n: number) => {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};
```

and nothing is answered here until the end, so it is guards all the way down:

```tz
const send = (to?: string, body?: string) => {
  guard (is.some(to));
  guard (is.some(body));
  transport.write(to, body);
};
```

the de morgan cost is real and stays:

```tz
if (stale && !forced) {      ->    guard (!stale || forced) {
  log('skipping');                   log('skipping');
  return;                          }
}
```

it is narrow, though, and a condition worth naming can be named:

```tz
const skip = stale && !forced;
guard (!skip) log('skipping');
```

three shapes `guard` could have had are refused: a postfix `guard`, `if (c) guard <exit>`, and
a `guard` that answers. they are written up under why not.

#### a block answers with `return`

"do some work, then put a fallback in `x`" is a real need and it already has a spelling:
a block after the `=>`, which is an arrow body, which is what `=>` has introduced since the
day it existed. it is written up under `on:`.

so there is no when-to-use-which. **`=>` introduces an answer, and if that answer needs
statements it is a block that returns.** that is the arm of a `match`, the fallback of an
`on:`, and nothing else so far. `break <expr>` is the other spelling, and a block expression
in any position is the larger version of it; both are under why not.

#### and so `return` always carries a value

follow the partition to the end and the word `return` stops being ambiguous. it appears in
an `if`, or as the last line of a body, and in both places it hands back an answer. it never
appears in a `guard`, because a guard has nothing to hand back.

which means **a bare `return;` is banned from tz source**. every use of it is a decline, and
declines are guards:

| you want | you write |
| --- | --- |
| leave early with nothing | `guard (...)` |
| leave at the end with nothing | end the body |
| leave with a value | `return x` |
| leave with a result | `ok x`, `err x` |
| leave with a promise | `async x` |
| leave one turn of a loop | `break`, `continue` |

the emitter still writes bare returns, since that is what a guard compiles to. the source
never does. so `return` in a tz file means one thing, always: **an answer leaves here.**

### match

identity only. no patterns, no destructuring, no guards. `_` is required, always.

```tz
const role = match (name) {
  'root' => admin,
  'nobody' => guest,
  _ => deny(name),
};
```

```ts
const role = (() => { switch (name) {
  case 'root': return admin;
  case 'nobody': return guest;
  default: return deny(name);
} })();
```

**the subject is parenthesised** because `match` is a `switch` and a `switch` parenthesises
what it tests. it also makes the word cheap to find: see the new words.

**an arm may be a block**, since `=>` introduces an answer and a block after it is an arrow
body. it costs nothing here: the `match` already emits an iife, so an arm's `return` answers
the same function the short arms answer.

```tz
const role = match (name) {
  'root' => admin,
  'nobody' => {
    log('anonymous access');
    return guest;
  },
  _ => deny(name),
};
```

```ts
const role = (() => { switch (name) {
  case 'root': return admin;
  case 'nobody': {
    log('anonymous access');
    return guest;
  }
  default: return deny(name);
} })();
```

`ok`, `err` and `async` are refused in an arm, the same as in an `on:` fallback and for the
same mechanical reason: they would leave the iife rather than the function, so the exit would
go nowhere.

exhaustiveness is not the transpiler's job. `_` is mandatory precisely so it never has to be.
this respects the readme's "avoid `switch` unless the union is meaningful in all cases":
`match` is an expression, so it always produces a value, so the default always matters.

#### a quoted arm matches a value, an arm that starts with `:` matches a branch

```tz
const role = match (out) {
  :ok (user) => respond(201, user),
  :rejected => respond(402),
  _ (e) => respond(400, e)
};
```

```ts
const role = (() => { switch (out.branch) {
  case 'ok': { const user = out.value; return respond(201, user); }
  case 'rejected': return respond(402);
  default: { const e = out.value; return respond(400, e); }
} })();
```

the subject grows a `.branch` and each tag gets quoted. **the signal is syntactic**, so
constraint 3 holds: the emitter reads the arms, never the type. a bare word would not do the
job, because a `switch` case can be a variable, so `match (x) { admin => ... }` would silently
become `case 'admin'` when the author meant the `const admin`. the sigil has no second reading.

**the arm binds what the branch carries**, parenthesised and optional, the way `on:` binds and
`scope` binds. `_` binds too, and its payload is the union of whatever branches are left,
because `default:` narrows exactly that far.

the binding is not decoration. **an expression subject has no other spelling for the payload**,
since the thing holding it is a temp the source cannot name:

```tz
const role = match (register(req)) {
  :ok (user) => respond(201, user),
  _ (e) => respond(400, e)
};
```

```ts
const role = (() => { const $0 = register(req); switch ($0.branch) {
  case 'ok': { const user = $0.value; return respond(201, user); }
  default: { const e = $0.value; return respond(400, e); }
} })();
```

a subject that is one identifier gets no temp, because `out.branch` and `out.value` are the
lines a person would have written. anything longer gets `$0`, on the opening line, so the count
still holds. mixing quoted arms and `:tag` arms in one `match` is refused: it reads branches or
it reads values.

### ok, err and async

a function either returns a value, or a result, or a promise, and the keyword says which.

```tz
const pick = (xs: string[], i: number) => {
  guard (i < xs.length) err 'out of range';
  ok xs[i];
};
```

```ts
const pick = (xs: string[], i: number) => {
  if (!(i < xs.length)) return result.err('out of range');
  return result.ok(xs[i]);
};
```

three exits, one shape, each of them a `return` with the wrapping written for you:

| | emits |
| --- | --- |
| `ok x` | `return result.ok(x)` |
| `err e` | `return result.err(e)` |
| `async x` | `return Promise.resolve(x)` |

bare `ok;` emits `return result.ok();`, which is what a `Result<void, E>` wants, and bare
`async;` emits `return Promise.resolve();` for the same reason.

`async x` is the exit for a body that hands back a promise **without suspending**. a body with
an `await` in it is a promise already, so `async` there is redundant and refused: `return x` is
the spelling, and the emitter puts the `async` on the opening line itself. that is the lifts,
one section down.

together they buy the one static check that costs nothing:

**a function body answers with exactly one of `return`, `ok`/`err`, or `async`.** mixing them
is the way a return type quietly becomes `Result<S, E> | S` and only blows up at some distant
call site. the lexer catches it at the declaration, without knowing a single type.

`try` participates in the same rule: it returns an error branch, so a body containing `try`
is a fallible body, so it may not use bare `return` either. one discipline per body, checked
by counting tokens.

this check is only cheap because of the ban list. with `function`, `class` and method
shorthand refused, a function body is exactly a `{` preceded by `=>`, and nothing else in
the language opens one. finding the enclosing function stops being parsing and becomes
brace counting.

#### the end of a fallible body is an implied ok

a guard block that does not end in an exit gets a bare `return;` appended. a body does the same
thing one level up, and so the trailing `ok;` nobody wants to write is not required:

```tz
const check = (x: number) => {
  guard (x > 0) err 'not positive';
};
```

```ts
const check = (x: number) => {
  if (!(x > 0)) return result.err('not positive');
return result.ok(); };
```

three lines in, three lines out: the closing line carries the appended exit, the way a
`protocol` closing line carries three statements. the type is `Result<void, string>`, which
every decline can read, so the success path can never be `undefined`. the lie is not banned,
it is unspellable.

falling off the end now means one thing everywhere:

| body | falls off the end | type |
| --- | --- | --- |
| infallible | nothing is appended | `void` |
| fallible | `return result.ok();` | `Result<void, E>` |

**falling off the end is the empty answer, in whatever shape the body answers.** the implicit
tail of a *decline* is untouched by this: a guard or an `on:` in a fallible body still may
not leave with nothing, because declining with a success is not a decline.

`err` and `on:err` are deliberately the same word twice: one produces the error, the other
reacts to one, and `try` passes it along.

### the lifts are inferred

nothing declares itself. **an `await` in a body makes that body async. an `ok`, `err` or `try`
in a body makes it fallible.** both are token counts the discipline check already does, and
both attach to the innermost body, which is a `{` preceded by `=>`.

```tz
const load = (id: string) => {
  const user = try await db.get(id);
  ok user.name;
};
```

```ts
const load = async (id: string) => {
  const $0 = await db.get(id); if ($0.branch === 'err') return $0; const user = $0.value;
  return result.ok(user.name);
};
```

one token added, on the opening line, and the line rule holds. attribution is per body, so an
`await` inside a nested arrow lifts that arrow and leaves its parent alone:

```tz
const outer = (xs: string[]) => {
  const run = (x: string) => {
    const r = try await fetch(x);
    ok r;
  };
  return xs.map(run);
};
```

**the modifier is banned**, because inference makes it a second spelling for the same thing.
the one claim it could make that inference cannot is "async with no `await`", and that claim
is `async x`.

a marker in the signature was on the table, a `task` keyword by analogy with `async`, and it is
refused under why not. `ok` and `err` already declare fallibility; they do it in the body, which
is where the decision is.

`scope` reads the same count: a body with an `await` picks `scope.async` and takes an async
callback, a body without one picks `scope.sync`. so there is no `scope async` spelling.

### on:

the primitive. `try` is sugar over it.

**`on:` names a branch you refuse.** `x on:err` declines when x is that branch and carries
`.value` when it is not, and nothing in that sentence mentions `Result`: it works on any union
at all, because the tag is written in the source and the emitter never has to know a type.

the sigil is a token pair: `on`, then `:`, then the tag, adjacent. so `on : err` is not the
construct, and `{ on: x }` in an object literal is still an object literal, because a sigil is
recognised only after something that ends an expression, which is where a value is landing.

**refusals chain, and one `if` holds them all:**

```tz
const rows = load(id) on:idle on:loading on:failed;
```

```ts
const $0 = load(id); if ($0.branch === 'idle' || $0.branch === 'loading' || $0.branch === 'failed') return; const rows = $0.value;
```

typescript narrows what is left of the union in one step, so `rows` is the payload of the one
branch nobody refused. the tail belongs to the whole chain rather than to each link, because
refusing three branches for three different reasons is three statements, not one.

`on:` is `guard` for a union, and the claim is literal, not a metaphor. a guard tests a
boolean and declines when it does not hold. an `on:` tests a branch and declines when it is
the one named. the polarity matches: `guard (c)` says c must hold, `x on:err` says x must not
be that branch, and in both the tail is the failure path.

| | `guard` | `on:` |
| --- | --- | --- |
| tests | a boolean | a branch of a union |
| emits | `if (!(c))` | `if ($0.branch === 'err')` |
| declines with | nothing, `err`, `break`, `continue` | the same |
| implicit tail | a bare `return;` | a bare `return;` |
| illegal in a fallible body | the implicit tail | the implicit tail |
| after it, you know | the narrowed type | the unwrapped value |
| binds | nothing | the payload, optionally |

the same function declines twice, once for absence and once for failure, and the two lines
read the same way:

```tz
const load = (id: string) => {
  const raw = table[id];
  guard (is.some(raw));
  const user = parse(raw) on:err;
  return user;
};
```

```ts
const load = (id: string) => {
  const raw = table[id];
  if (!(is.some(raw))) return;
  const $0 = parse(raw); if ($0.branch === 'err') return; const user = $0.value;
  return user;
};
```

one construct, two predicates. so why two words? because a guard is a statement and there is
no value in flight, while an `on:` sits in an initialiser and there is. that is also the
only asymmetry in the table: `on:` has an answering form and `guard` does not, because
substituting a value only means something when a value was expected in the first place.

everything else ruled for a guard is ruled here for the same reason. **the statement form
declines. the expression form answers.**

#### the statement form declines

**braces are not required.** one statement needs none:

```tz
const user = db.get(id) on:err (e) err `no user ${id}`;
```

```ts
const $0 = db.get(id); if ($0.branch === 'err') { const e = $0.value; return result.err(`no user ${id}`); } const user = $0.value;
```

**the binding is parenthesised** for the reason `catch (e)` is: a keyword on the failure path,
then the name it binds. every construct parenthesises what it tests or binds, `if (c)`,
`guard (c)`, `match (x)`, `on:err (e)`, `scope (hold)`. `protocol result { ... }` is the one
that does not, because it tests nothing and binds nothing: it declares a name, the way `const`
and `type` do, and those take no parens either. parens also keep the tail legible: `on:err (e)
err e` gives one job per token, where `on:err e err e` is three bare words in a row and the
reader has to sort out which is which.

the binding is optional when the error goes unused, and so is the whole tail: an `on:err` with
nothing after it gets the implicit bare `return;`, exactly as a guard does.

```tz
const conn = connect(url) on:err;
```

```ts
const $0 = connect(url); if ($0.branch === 'err') return; const conn = $0.value;
```

that is how an infallible body walks away from a failed result. a fallible body would use
`try` and hand the error on, and the implicit tail is illegal there for the usual reason.

braces come back only when a second statement does:

```tz
const user = db.get(id) on:err (e) {
  log(e);
  err 'lookup failed';
}
```

whatever follows the tag is **inlined into the enclosing function**, not wrapped in an arrow.
so `err` inside it leaves the function, which is the whole point and is why it cannot be
written as a callback. and like a guard it may leave with nothing, an `err`, a `break` or a
`continue`, never with a value.

#### the expression form answers

```tz
const port = readPort() on:err (e) => 8080;
```

```ts
const $0 = readPort(); const port = $0.branch === 'err' ? 8080 : $0.value;
```

no closure, no iife. the binding is not emitted at all: `e` is rewritten to `$0.value`
wherever the fallback mentions it, which is a token rename, which is the only thing this
transpiler does anyway.

```tz
const port = readPort() on:err (e) => defaultPort(e);
```

```ts
const $0 = readPort(); const port = $0.branch === 'err' ? defaultPort($0.value) : $0.value;
```

this is where a fallback belongs, and it is the only shape of `on:` that produces one.
it is an expression, so it sits with `if`/`else` and `match` on the answering side of the
language, and the earlier worry that it might not earn its keep is settled: without it,
`on:` could not answer at all.

the two forms are told apart by one token: `=>` right after the binding means value,
anything else means statement. no backtracking.

#### a fallback that needs statements is a block after the `=>`

```tz
const port = readPort() on:err (e) => {
  log(e);
  return 8080;
};
```

```ts
const $0 = readPort(); const port = $0.branch === 'err' ? (() => {
  log($0.value);
  return 8080;
})() : $0.value;
```

that is not a new construct. it is an arrow body, which is what `=>` has introduced since the
day it existed, and the answer leaves it with `return`, which already means "an answer leaves
here". the iife is the cost of statements in an expression and it is visible in the source,
which is the right place for it to be visible.

it also costs the checker nothing. a function body is a `{` preceded by `=>`, and this `{` is
preceded by `=>`, so the discipline check already treats it as its own body without being told.

`ok`, `err` and `async` are refused inside it. the block answers the binding; a result there
would make `port` a `Result` and nobody means that. declining is the statement form's job, one
line up.

an `await` inside that block is allowed, and it is the one place the emitter writes an `await`
of its own, because the iife it wrote has to be awaited:

```tz
const port = readPort() on:err (e) => {
  log(e);
  return await fallback(e);
};
```

```ts
const $0 = readPort(); const port = $0.branch === 'err' ? await (async () => {
  log($0.value);
  return await fallback($0.value);
})() : $0.value;
```

that is not hidden suspension, which is the rule it has to answer to: there is an `await` on
the screen inside the block, and the enclosing body inferred `async` from it. the expression
form needs none of this, since a ternary holds an `await` on its own.

### try

`try x` is `x on:err` with the propagation written for you: it returns the error branch itself,
unchanged. it means what `x on:err (e) err e` means, and emits the cheaper thing, since the
branch it already holds carries the same tag and the same value.

```tz
const user = try db.get(id);
```

```ts
const $0 = db.get(id); if ($0.branch === 'err') return $0; const user = $0.value;
```

it returns the branch object, it does not rewrap. rewrapping allocates a second branch that
carries the same value and loses nothing but gains nothing. `src/scope.ts` already writes
`if (open.branch === 'err') return open;` five times; `try` is that line.

consequences, all of them deliberate:

- the enclosing function's inferred return type absorbs `Result<never, E>`. if the caller cannot
  handle that `E`, `tsc` says so at the call site. that is "maximize type inference" working.
- a function containing `try` returns a result. a function that cannot fail has no `try` in it.
- `try` on something that is not a branch is a `tsc` error about `.branch`. the emitter stays dumb.

**async is explicit**: `try await f()`. `try` never inserts an `await`. hidden suspension is
hidden flow, and the whole point is that flow is visible. the `await` you write is also what
lifts the body, so the `async` on the arrow is inferred from that one token and nothing else.

**position is restricted**: `try`, `on:` and `any:` appear only at the head of a statement, that is
a `const`/`let` initialiser, an `ok`/`err`/`async`/`return`, or an expression statement. `g(try f())`
is a syntax error. this keeps the desugar local to one statement and one line.

temps are `$0`, `$1`, ... numbered per function body.

### void

there are four things you can do with a result, and the fourth one has to be written down:

```tz
const user = try db.get(id);                     // propagate
const user = db.get(id) on:err (e) => anonymous;  // answer
save(user) on:err;                                // decline
void save(user);                                 // drop it, on the record
```

nothing in the emitter can see that the last line dropped a failure, because seeing it needs
the type of `save`. so it is a semantic rule: **a `Result`-typed expression statement is an
error unless it is `void`-prefixed.** with it, a failure cannot climb by accident; every
fallible call is one of those four lines, and each of them says which.

the marker is typescript's own and the emitter never touches it. it is what the ecosystem
already writes in front of a floating promise, and an unchecked result is that same bug in a
synchronous coat. the hole it leaves is a result bound and never read, `const out = save(user);`,
which is what `noUnusedLocals` is for, so `tz/` sets it.

### any:

the third decline, and the last one: `guard` tests a boolean, `on:` tests a branch,
`any:` tests for presence. it takes every form `on:` takes and for the same reasons, minus
the binding, because absence carries nothing to bind.

**`any:` takes `some` or `none`, and nothing else is legal.** it is a closed pair, not a
namespace, and the closure is the feature. the word is free because the ban list took it: `any`
is refused as a type, so the token can never still mean the old thing, which is the same reason
`async` in keyword position is always the exit.

`is:` was the other candidate and it is the worse one precisely because something *does* stand
behind it. `is:string`, `is:json` and `is:model(shape)` would all suggest themselves and none
of them works: the polarity inverts, since `is:string` would decline when a value *is* a
string; what survives is useless, since "not a string" is nothing to go on with; and
`is:model(shape)` needs the emitter to partially apply a two-argument guard, which means
knowing its arity, which means knowing a type. a prefix that advertises a module and delivers
two members is one member lying inside a syntax whose whole promise is generality. `any` has
no module behind it, so it can be closed and stay closed.

**`any:some` declines and never answers.** what survives it is absence, so there is nothing to
bind and nothing to substitute. it is the line that refuses a value already sitting there:
`cache[id] any:some err 'already claimed';`

**`any:none` replaces `??`, which is banned.** the operator is not good enough for the job: it
is silent about which of the two things it is doing, it cannot run a statement, and it has
precedence rules people get wrong. `any:none` says what happened and then lets you decline or
answer, exactly like the other two.

#### declining

```tz
const row = table[id] any:none;
```

```ts
const $0 = table[id]; if (is.none($0)) return; const row = $0;
```

which is the whole of `guard (is.some(row))` folded into the line that fetched it, and it is
the absence-shaped `try`: nothing to propagate, so nothing is written.

with a reason, in a fallible body, and with a block when a second statement wants one:

```tz
const row = table[id] any:none err `no row ${id}`;

const conn = pool[name] any:none {
  log(`no pool ${name}`);
  err 'unconfigured';
}
```

#### answering

```tz
const port = env('PORT') any:none => 8080;
```

```ts
const $0 = env('PORT'); const port = is.none($0) ? 8080 : $0;
```

that is the `??` line, and it costs one word more to read and nothing at all to understand.
statements go in a block after the `=>`, the same as `on:`:

```tz
const port = env('PORT') any:none => {
  log('defaulting the port');
  return 8080;
};
```

#### the three declines, side by side

| | tests | binds | emits |
| --- | --- | --- | --- |
| `guard (c)` | a boolean | nothing | `if (!(c))` |
| `x on:tag (e)` | any branch of any union | the payload, optionally | `if ($0.branch === 'tag')` |
| `x any:none` | presence | nothing | `if (is.none($0))` |

one shape, three predicates. each declines with nothing, an `err`, a `break` or a `continue`,
each takes a block when it needs statements, and the two that sit in an initialiser answer
with `=>`.

`is.none` has to be imported, like everything else the emitter names. see constraint 5.

### the two renames this depends on

both are changes to `tstd` itself rather than to typezig, both have landed, and this document
is written against the new names.

**`is.present` and `is.absent` became `is.some` and `is.none`.** they are the most typed
guards in the language and they were the two longest words in the file; `some` and `none` say
the same thing in four letters.

**`Result`'s branches became `ok` and `err`.** you write `ok x` and then you test the tag, and
with `success` there you were holding two names for one idea. now the vocabulary closes:
`ok x`, `result.ok(x)`, `out.branch == 'ok'`, `x on:err`, `:err => ...`. one word per concept
wherever it appears, which is the rule that drove the first rename too.

the one cost worth knowing: **a tag is data.** a stored branch carries `"branch":"err"` on the
wire and in the database for as long as the row lives, so unlike a keyword it is not cheap to
change later. that was weighed and taken.

### scope

```tz
scope (hold) => {
  const file = try hold(openFile(path));
  const conn = try hold(connect(url));
  ok read(file, conn);
}
```

```ts
scope.sync(hold => {
  ...
});
```

the opening line loses the parens around the binding and gains `scope.sync(`, the closing line
gains a `);`, and everything between is untouched, so the line count holds.

**the `=>` is not decoration.** that block *is* a function body: `try` returns from it, `ok`
and `err` are its exits, and the emit is an arrow. writing the `=>` says so, and it keeps the
discipline check to one sentence, since a function body stays exactly a `{` preceded by `=>`
with no second case for `scope`. it also settles the recognition: `scope(x) => {}` is not
valid javascript, so a call to somebody else's `scope` can never be read as the construct.

an async body picks `scope.async` and an async callback, and the count that decides it is the
same one that decides everything else, an `await` in the body. see the lifts.

#### hold is a value, not a keyword

`hold` binds, the way `catch (e)` and `on:err (e)` bind, so it takes the parens the rest of the
language takes. what it does not take is keyword status. `hold x` would read as syntax, and
then the emitter has to answer which scope the resource belongs to, which is the one question a
token-level rewriter has no business answering. as a value it answers nothing: `hold` is a
parameter name copied through, and `hold(x)` is a call the emitter never looks at.

nesting is where that pays, because two names reach two lifetimes:

```tz
scope (session) => {
  const conn = try session(connect(url));

  const out = scope (page) => {
    const buf = try page(alloc(size));
    const tmp = try session(openTemp());
    ok render(conn, buf, tmp);
  };

  guard (out.exit.branch == 'done') err 'panicked';
  ok try out.exit.value;
}
```

`buf` is released at the inner brace and `tmp` at the outer, and the line that took it says
which. a keyword could only ever mean the nearest scope, so `tmp` would have no spelling at
all. the cost is that reusing the name shadows it, exactly as a nested arrow parameter does:
**name the binding after the lifetime** and the shadow never comes up.

### protocol

one declaration, three names in the emit, and the line rule survives because the closing
brace is a line and a line can hold more than one statement.

a parameter says what a branch carries. a transition list says where it may go. nothing
following anything is a union; something following is a machine; it is one construct for both,
exactly as `protocol.init` is one call for both.

#### a union

```tz
export protocol result<S, E> {
  success(S),
  error(E)
}
```

```ts
const $result = <S, E>() => ({
  success: (value: S) => {},
  error: (value: E) => {}
}); export type Result<S, E> = Union<protocol.Model<typeof $result<S, E>>>; export const result = protocol.init($result());
```

that is `src/result.ts` character for character, minus the retyping. four lines in, four lines
out: the shape function takes the block, and the two declarations that read it ride the
closing line.

#### a machine

```tz
protocol loader {
  idle() => loading,
  loading({ at: number }) => success | error,
  success(string[]),
  error(unknown) => loading
}
```

```ts
const $loader = () => ({
  idle: () => ['loading'],
  loading: (value: { at: number }) => ['success', 'error'],
  success: (value: string[]) => {},
  error: (value: unknown) => ['loading']
}); type Loader = Union<protocol.Model<typeof $loader>>; const loader = protocol.init($loader());

```

`=> a | b` is the transition list and `|` is deliberate: it reads as "or" and it is already
the character a reader associates with a set of alternatives. empty parens carry nothing, and
emit no parameter at all, because `Carries` reads `[]` as `void`.

#### the three names

| name | what it is | who writes it |
| --- | --- | --- |
| `$loader` | the declaration literal | the emitter, hidden |
| `Loader` | the union, as data | the emitter, from the name |
| `loader` | the factories | the emitter, from the name |

the capitalisation is not a convention the language invented. `claude.md` already says: the
same word, case-distinguished, for a type and its factory. `Branch`/`branch`, `Result`/`result`,
`Loader`/`loader`. so the block needs one name and the emit derives the other two.

`Loader` is the **data** form, `Union<protocol.Model<...>>`, which is what `result.ts` names
and what you store. the live form, the one carrying `to`, stays `protocol.Of<typeof loader>`
at the use site, the way `protocol.spec.ts` writes it. one name for the thing you put away,
an expression for the thing you are walking.

`export protocol` exports the type and the value. the shape function is never exported: it is
scaffolding and it never escapes the file, which is the same rule `make` follows for instances.

#### how it lexes

`protocol`, a name, optional `<...>`, then `{`. inside, each entry is a name, a parenthesised
type, an optional `=> a | b`, and a comma. the type between the parens is copied verbatim, so
`success(Map<string, number>)` needs no angle-bracket matching at all: the parens delimit it
and the comma that separates entries is the one at paren depth zero.

#### the import is yours

the emit says `protocol.init`, `Union`, `result.ok`. none of those arrive by magic:
**the emitter never writes an import.** a tz file that says `ok` imports `result`, one that
declares a `protocol` imports `protocol` and `Union`, and one that forgets gets told by `tsc`
in the usual way.

this is constraint 3 again. an emitter that decides what your module imports is an emitter
with opinions about your module, and the first time it guesses the wrong `tstd` (a re-export,
a local shim, a vendored copy) it will have written a bug that reads like a mystery.

## the language in use

six shapes that come up constantly. the emit is shown where it says something; where it is
the obvious rewrite it is left out.

### validating something from outside

the funnel, top to bottom, with the guards doing the narrowing and `ok` at the end.

```tz
const shape = {
  email: is.string,
  age: is.number
} satisfies is.Schema;

const signup = (body: unknown) => {
  guard (is.model(body, shape)) err 'malformed body';
  guard (body.age >= 18) err 'under age';
  ok body;
};
```

```ts
const shape = {
  email: is.string,
  age: is.number
} satisfies is.Schema;

const signup = (body: unknown) => {
  if (!(is.model(body, shape))) return result.err('malformed body');
  if (!(body.age >= 18)) return result.err('under age');
  return result.ok(body);
};
```

the second guard reads `body.age` because the first one narrowed `body`. that is typescript
doing it, not the transpiler: `guard` emits an `if` and gets narrowing for free.

### chaining calls that can fail

`try` on every step, and the function is fallible because it says `ok` at the end.

```tz
const register = (req: Request) => {
  const body = try await read(req);
  const user = try signup(body);
  const saved = try await db.insert(user);
  ok saved;
};
```

```ts
const register = async (req: Request) => {
  const $0 = await read(req); if ($0.branch === 'err') return $0; const body = $0.value;
  const $1 = signup(body); if ($1.branch === 'err') return $1; const user = $1.value;
  const $2 = await db.insert(user); if ($2.branch === 'err') return $2; const saved = $2.value;
  return result.ok(saved);
};
```

three lines of `.tz`, three lines of `.ts`, and the error type of `register` is the union of
the three error types, inferred. nobody wrote it down. neither is the `async` on the opening
line: the two `await`s put it there.

### deciding what to do with a branch

`match` on the tag. identity only, which is all a tag needs.

```tz
const serve = (req: Request) => {
  const out = await register(req);

  return match (out.branch) {
    'ok' => respond(201, out.value),
    _ => respond(400, out.value)
  };
};
```

```ts
const serve = async (req: Request) => {
  const out = await register(req);

  return (() => { switch (out.branch) {
    case 'ok': return respond(201, out.value);
    default: return respond(400, out.value);
  } })();
};
```

`out.value` is the saved user in the first arm and the error in the second, because the switch
narrows the union. again: typescript's job, not the transpiler's.

### a value with a fallback

four fallbacks, four shapes, and which one you use says what you meant.

```tz
const host = env('HOST') on:err (e) => 'localhost';

const port = env('PORT') on:err (e) => {
  log(e);
  return 8080;
};

const zone = process.env.TZ any:none => 'utc';

const mode = if (is.some(flag)) flag else 'production';
```

the first swallows a failure on purpose. the second swallows it and says so out loud. the
third is not a failure at all, just something that was not there, which is the line `??`
used to write. the fourth is not about either: it is a two-sided choice, so it is an
expression with an `else`.

### walking a list

`guard` with `continue`, which is the loop's version of leaving with nothing.

```tz
const active = (rows: Row[]) => {
  const out: Row[] = [];

  for (const row of rows) {
    guard (is.some(row.email)) continue;
    guard (row.status == 'active') continue;
    out.push(row);
  }

  return out;
};
```

no `filter`, no predicate composition, no combinator. two refusals and a push, in the order a
person would say them out loud.

### holding resources

`scope` takes the callback because it **is** the entrypoint, and `try` works inside it exactly
as it does anywhere else.

```tz
const copy = (from: string, to: string) => scope (hold) => {
  const src = try hold(openRead(from));
  const dst = try hold(openWrite(to));
  ok pump(src, dst);
};
```

```ts
const copy = (from: string, to: string) => scope.sync(hold => {
  const $0 = hold(openRead(from)); if ($0.branch === 'err') return $0; const src = $0.value;
  const $1 = hold(openWrite(to)); if ($1.branch === 'err') return $1; const dst = $1.value;
  return result.ok(pump(src, dst));
});
```

and reading what came back, at the caller:

```tz
const out = copy('a', 'b');
for (const leak of out.leaked) log(leak);
guard (out.exit.branch == 'done') err 'panicked';
const written = try out.exit.value;
ok written;
```

### declaring a machine and walking it

the declaration is the type, so nothing states it twice.

```tz
protocol loader {
  idle() => loading,
  loading({ at: number }) => success | error,
  success(string[]),
  error(unknown) => loading
}

const settle = (x: protocol.Of<typeof loader, 'loading'>, out: Result<string[], unknown>) => {
  guard (out.branch == 'success') return x.to.error(out.value);
  return x.to.success(out.value);
};
```

wait: that guard leaves with a value, which is refused. it is an answer, so it is an `if`:

```tz
const settle = (x: protocol.Of<typeof loader, 'loading'>, out: Result<string[], unknown>) => {
  if (out.branch == 'err') return x.to.error(out.value);
  return x.to.success(out.value);
};
```

which is what `protocol.spec.ts` already writes, line for line. the partition is not a rule
you have to remember here; the code was already on the right side of it.

### a spec

specs are `.tz` too, and the narrowing idiom from `claude.md` becomes one line.

```tz
test('refuse a payload that is not a signup', () => {
  const out = signup({ email: 'a@b.c' });

  guard (out.branch == 'err') assert.fail();
  assert.equal(out.value, 'malformed body');
});
```

```ts
test('refuse a payload that is not a signup', () => {
  const out = signup({ email: 'a@b.c' });

  if (!(out.branch === 'err')) { assert.fail(); return; }
  assert.equal(out.value, 'malformed body');
});
```

`assert.fail()` is a call, not an exit, so the guard appends its implicit `return;`. the line
reads as the sentence it is: this must be an error, otherwise fail the test. and `out.value`
on the next line is the error, narrowed.

## equality, and what a condition is allowed to be

### one equality, and it is the safe one

`==` emits `===`. `!=` emits `!==`. and `===` and `!==` are refused in tz source, so there is
no choice to get wrong and no habit to unlearn: you type the short one and you get the strict
one.

```tz
if (u.branch == 'ok') return u.value;
```

```ts
if (u.branch === 'ok') return u.value;
```

this is the cheapest rule in the language. it is two token rewrites and two bans, it removes
the single most common javascript footgun, and it makes the short spelling the correct one,
which is the only way a rule like this ever actually gets followed.

one consequence to know: `x == null` no longer means "null or undefined". it emits
`x === null` and catches exactly null. **so comparing against `null` or `undefined` is
refused too**, and `is.none(x)` and `is.some(x)` are the spelling. that is the readme's
rule already ("do not waste time telling `null` and `undefined` apart"), and here it is the
difference between a guard that works and a guard that half works.

writing `null` as a value stays legal. it is part of `Json`, and refusing to let a payload
contain one would be a language deciding what your data looks like.

### conditions must be boolean, and the emitter cannot enforce it

`if (name)` and `if (xs.length)` are the truthiness bugs worth killing, and killing them
needs a type. two emit-time tricks look like they would do it, and both were tried against
`tsc` rather than reasoned about. **both destroy narrowing**, which is the one thing the
language cannot trade:

```ts
if (!((isStr(x)) satisfies boolean)) return;   // x is still unknown after this
const $0: boolean = isStr(x); if (!$0) return; // and after this
```

```ts
if (!(isStr(x))) return;                       // x is string
const $0 = isStr(x); if (!$0) return;          // x is string, aliased conditions work
```

the annotation and the `satisfies` both replace the expression's type with plain `boolean`,
and a type predicate is exactly what gets thrown away when that happens. an aliased `const`
with no annotation keeps it, which is what the `try`/`on:err` temps rely on, and inline
negation keeps it too, including through a conjunction: after `if (!(a && b)) return;`
typescript has narrowed both. all four lines above were compiled; the two that work, work.

a syntactic approximation is no good either. "the condition must be a call or a comparison"
refuses `if (verbose)`, which is correct code, and there is no token-level way to tell a
boolean `verbose` from a string `name`.

so this rule is **semantic and it waits for the language server**, with the rest of the
checks that need a type. there it is easy: ask the `LanguageService` for the type of the
condition node and require `boolean`. that is one call, and it is the reason the staging puts
the lsp before the semantic pass rather than after it.

## the ban list

yes, and this is the part that makes typezig a language instead of a preprocessor.

a lexer that can find `match` can just as easily refuse `class`. the readme says an eslint
ruleset "might come at some point"; this is that ruleset, delivered as a syntax error, at
zero extra cost, with nothing to configure and no way to switch it off.

### refused outright

| word | why | replacement |
| --- | --- | --- |
| `class` | hierarchies, and a method carries a `this` the type never states | a module, or a closure with `init` |
| `function` | arrow consts only | `const f = () => {}` |
| `this` | invisible requirement | an argument |
| `new` | `make` owns every instantiation | `make(C, ...args)` |
| `try` `catch` `finally` (the ts ones) | a throw is invisible to a signature | `call.sync`, `call.async`, or tz `try` |
| `interface` | `type` covers everything | `type` |
| `enum` | a hierarchy in disguise | `Union` |
| `var` | reassignment is a design decision, `let` states it | `const`, or `let` |
| `namespace` `module` | files are modules | a file |
| `any` | it is not a type, it is the absence of one; the ban is what frees `any:` | `unknown` |
| `instanceof` | there are no classes to be an instance of | a guard |
| `function*` `yield` | flow hidden in a protocol | a loop |
| `abstract` `implements` `private` `protected` `public` | class vocabulary | gone with `class` |
| `else` after an `if` **statement** | the funnel is the flow | `guard`, or the `if` expression |
| `?:` | one conditional expression is enough | `if (c) a else b` |
| `??` | silent about which half it is doing, and cannot hold a statement | `any:none` |
| `switch` | | `match` |
| `throw` | we do not throw | `err` |
| `get x()` `set x()` `x() {}` in an object | a method is a `function` wearing a hat | `x: () => {}` |
| a bare `return;` | every one of them is a decline | `guard`, or end the body |
| `===` `!==` | `==` and `!=` already emit them | `==`, `!=` |
| `== null` `!= undefined` and friends | presence and absence, never which one | `is.some`, `is.none` |
| `async` as a **modifier** | inferred from `await`, so it is a second spelling | nothing, or `async x` |
| `Promise.reject` | a rejection is a throw that happens later | resolve with a `Result` |

`extends`, `super` and `constructor` need no rule: they are unreachable once `class` is gone.
`extends` stays legal where it is a type operator (`<B extends Protocol<B>>`, conditional types),
which is the only place tz can still spell it.

**no statement `else`.** a boolean with two meaningful cases is an expression, which is where
a two-sided choice belongs, and the `if` expression is exactly that. a statement-level `else`
is a funnel that refused to funnel: its `else if` chains are early returns nobody wrote, and
`match` is there for the case that is really a table.

**no `?:`.** the `if` expression replaces it, so the ban is about having one spelling, not
about the operator. `?.` is untouched (`??` is banned on its own account, see `any:none`).
the lexer tells a conditional from an
optional marker by the token after the `?`: a `:` means an optional (`name?: string`),
anything else means a ternary. the one place it cannot tell is a conditional **type**
(`A extends B ? C : D`), so the ban is lifted inside a `type` declaration, and an inline
conditional type in a value annotation has to be named first. the style asks for that anyway.

**no `throw`.** nothing in tz code raises. panics still exist, because the platform still throws
(a native constructor, a library, the runtime running out of something), and that is exactly why
`scope` has a `panic` branch and `call` and `make` exist at all. the ban makes the meaning exact:
**a panic is always something you did not write.** an error you did write is an `err`.

**no `Promise.reject`.** `throw` is banned because nothing in tz code raises; a rejection is
the same event on a later tick, so it goes with it. a promise in tz always resolves, and an
async operation that can fail resolves with a `Result`. the rest of `Promise` is untouched:
`Promise.all` and friends are safe precisely *because* nothing rejects, which is the payoff.
`Promise.resolve` stays legal too, it is only bait in return position, where `async x` says it.

two honest notes. this is the first **banned member**, two tokens rather than a keyword, and
aliasing evades it, which is consistent with a check that would rather miss a ban than invent
one. and it makes *your* promises safe, not the platform's: awaiting a foreign promise can
still throw and no token check can tell foreign from yours. `call.async` is where you cross,
the same way `make` is where a constructor crosses.

the method-shorthand ban is not pedantry. a method carries a `this` requirement its type never
states, so a torn-off method typechecks and throws (o18); the object-literal form is the same
trap in a smaller hat. it also pays for itself: see the `ok`/`err` discipline check.

### how a ban is checked

a word is banned in **keyword position** only. the previous significant token decides:
after `.` or `?.` it is a property, and a property named `class` is somebody else's json.
everything else is a ban.

the check is deliberately conservative. a missed ban is a style rule that slipped through;
a wrong ban is a valid program the compiler refuses. only the second one is a bug, so when
in doubt the lexer allows it. `tsc` still runs on the output either way.

**there is no pragma.** a comment that turns a ban off for one line makes the ban list
negotiable, and then the discipline check has to read comments to know what the language is.
the escape hatch is a **file**: code that genuinely needs `class` or `this` for interop lives in
a `.ts` file, which tz never touches, and the import boundary says where the hostile part is. a
file boundary is visible in a way a comment is not.

### the new words

none of `guard`, `match`, `scope`, `protocol`, `on`, `any`, `ok` or `err` is reserved in
javascript, and two of them are already `tstd` exports: `scope.sync(...)` and
`protocol.init(...)` appear in real code today. those four are **contextual**, recognised by
what follows them:

- `match` then `(`, its matching `)`, then `{`
- `scope` then `(`, its matching `)`, then `=>`
- `protocol` then a name then `{`
- `on` or `any` then `:` then a tag, all three adjacent, after something that ends an expression

the sigils are the one place the language is whitespace sensitive, and it is confined to a
token pair on purpose. `on : err` is three tokens and not the construct; `{ on: x }` is an
object literal because the `on` follows a `{` rather than a value. a general `:tag` sigil
everywhere would have cost more, since `{a:success}` would change meaning.

a `:tag` inside a `match` arm needs none of that, because an arm cannot start with a `:` for
any other reason.

`scope.sync` is followed by `.`, so it stays an identifier. one token of lookahead, no backtracking.

`match` and `scope` are the ones that want more than a token, and the parens are what make that
bearable: scan to the matching `)`, which is paren depth the lexer already tracks, then look at
one more token. hunting a `{` through an unparenthesised expression was the alternative.

`scope` has no residue at all, because the token it needs is `=>` and no call is ever followed
by one. `match` keeps a thin one: a call to somebody's own `match(...)` whose statement is
followed by a bare block, and a bare block means nothing in tz.

`async` needs no context either, in the other direction. the modifier is banned, so the word
in keyword position is always the exit, and after a `.` it is somebody's property.

`guard`, `ok` and `err` do not get that treatment. they are **reserved outright**, because
they start a statement and a statement can also start with a call: `guard(x);` is exactly
`guard (x);`, and no follow set can separate them. three more reserved words is the honest
price, and the one that stings is `err`, which is everybody's favourite name for an error
binding. use `e`, as the examples here do.

`try` is the exception and needs no context: it is a reserved word already, and with `catch`
refused the typescript form is dead, so tz simply takes the word.

## why not

each of these is a good idea somewhere else, and each one was on the table. they fail the same
test: the shape buys a line or a character, and it costs a rule that held everywhere. a rule that
holds everywhere is the product, so the trade is never close. one of them is parked rather than
refused, and it says so.

### shapes `guard` could have had

**a postfix `guard`**, in the initialiser, symmetric with `on:err`:

```tz
const row = table[id] guard (is.some(row));
```

it works. it emits `const $0 = table[id]; if (!(is.some($0))) return; const row = $0;` and
narrowing flows through `$0`, so `row` lands narrowed. it is refused anyway, because it is
character for character the same decision as the two lines it replaces:

```tz
const row = table[id];
guard (is.some(row));
```

`on:err` needs the postfix position; that is not a preference. the value you want from it is
`.value`, not what the expression produced, so the unwrapping has to happen where the binding
happens and there is no statement form that can do it. `guard` transforms nothing, so its
statement form is already complete and a postfix spelling is a second way to say one thing.
that is the thing the braced-exiting-`if` ruling removed.

**`if (c) guard <exit>`**, reading `guard` as the `else` branch in disguise. it is a nice
sentence and it costs the language a word that means two things: a construct in one place, a
marker in another. `guard (c) <exit>` says the same in fewer tokens and one meaning.

**an answering `guard`**, `const n = parse(raw) guard (is.number(n)) => 0;`, the way `on:err`
answers with `=>`. this one is not the same as the lines it replaces, so the argument above
does not touch it: the two-line spelling needs an extra name for the value being tested.

```tz
const p = parse(raw);
const n = if (is.number(p)) p else 0;
```

it is refused for the partition instead. **a guard never answers** is the sentence that makes
the flow model readable in one pass, and one saved name does not buy it back.

`on:err` answering is not the counter-example it looks like. a failed result cannot be carried
forward: you either decline or you substitute, and those are the only two moves, so `on:err`
needs both forms to be complete. a guarded value is already sitting there usable. choosing
against it is not a refusal, it is a choice, and a choice is `if`/`else`.

### zig's block expression, and `break <expr>`

`break <expr>` is the other way to spell "a block answers", and tz does not take it. `break`
means one thing here and should keep meaning it: leave a loop. zig can overload the word
because zig labels its blocks (`break :blk v` names which one it leaves); without labels,
`break 8080;` inside a loop inside a block is a real question about where control goes and the
reader has no token to answer it with. `return` has no such problem, because it already means
exactly the right thing: **an answer leaves here.** a block is an arrow body or an iife, and in
both, `return` answers the block. source and emit agree without inventing anything.

a **general** block expression, `const n = { ... };` in any expression position, is the
remaining piece of zig's `break :blk`, and it is **parked, not refused**. its one real cost:
a `{` in expression position becomes a body boundary, so "a function body is a `{` preceded by
`=>`" grows a second case and the discipline check has to learn it. cheap, but not free, and
the `=>` form covers everything that has come up.

### a `task` keyword

**a marker in the signature for fallibility**, the way `async` marks suspension, and a rule
that `ok` and `err` are only legal inside one. it is the symmetry it looks like, and it is
checked exceptions: add a `try` to a leaf and you hand-edit every declaration between there
and `main`, which is churn a type system already does for free.

it also has nothing to declare. `ok` and `err` *are* the marker; they sit in the body instead
of the signature, and the body is where the decision happens. under inference the same is true
of `async`, so neither lift gets a word, and the one thing a marker could have said that
inference cannot, "a promise with no `await`", is `async x`.

what is genuinely lost is reading fallibility off the declaration without opening the body.
that belongs to the editor, an inlay hint in step 6, not to every signature in the program.

### postfix `try` and postfix `await`

**`db.get(id) try`, chainable**, the way rust replaced `try!(x)` with `x?`. the motivation is
real, and the two halves of it come apart.

postfix at statement scope is free, and `on:err` is the proof: its operand is delimited on the
left by the `=` or the statement start, so the emitter scans forward to the `;` and never scans
back. `const user = db.get(id) try;` would cost nothing to emit.

chaining is not statement scope, and it is the half that asks for a grammar. `f() try .g() try`
makes the emitter find where the left operand *starts*, and `a() try + b() try` makes it decide
how tightly `try` binds. both of those are parsing typescript. chaining also lifts the position
restriction, since a `try` in an argument list leaves the enclosing function from inside an
argument list, which is what `g(try f())` was refused for.

so the chainable spelling is the one that cannot be had, and the affordable one is paid for in
word order: `x on:err` reads "x, on error", where `x try` reads backwards. rust got away with it
because `?` is punctuation and punctuation has no word order. the postfix `guard` above was refused
for saying the same thing twice; this one is refused for what it costs the lexer.

`await` is refused ahead of all of that, because it is **typescript's token**. tz adds words and
bans words; it has never respelled one. postfix leaves two spellings for one thing, or bans the
prefix, and then the lexer rewrites awaits wherever they appear, `(await f()).y` included, and
the one-statement desugar is over. the two only look alike anyway: `await` unwraps a promise the
types already track, `try` unwraps a branch and leaves.

what survives of the idea is already here. `x try` is `x on:err (e) err e`, so writing the tail
out **is** the postfix spelling, and `try` is its prefix shorthand.

## toolchain

### what makes this small

not parsing typescript. the grammar of typescript is enormous and none of it is ours.
a lexer that knows tokens but not grammar is a few hundred lines and never goes out of date
when typescript grows a feature.

### rough sizes, first version

- lexer (strings, templates with nested `${}`, comments, regex vs divide, brace depth): ~400 loc
- rewriter (the four constructs): ~600 loc
- cli (`tz build`, `tz watch`): ~150 loc
- diagnostics: run `tsc`, map lines back: ~200 loc
- node loader hook so `.tz` runs under `node --test`: ~100 loc
- lsp: ~500 loc

this is weekend-scale for something that works, not month-scale. it stops being weekend-scale
the moment a construct needs to know a type.

### diagnostics

`tsc` on the emitted `.ts`, then rewrite each diagnostic's file and position back to the `.tz`.
with one line in, one line out, the line is already correct and only the column shifts.
worst case, report the line and underline the whole line: still usable.

do not use the compiler api to typecheck in-memory at first. shell out to `tsc --pretty false`,
read the exit code, parse the lines. `claude.md` already says judge a typecheck by its exit code.

### lsp

the cheap path is a **proxy**, not a language server. the extension transpiles the buffer to a
virtual `.ts` on each keystroke, hands it to typescript's `LanguageService`, and maps positions
back. completions, hovers, go-to-definition, rename and diagnostics all come from tsserver for free.

volar (`@volar/language-core`) exists to do exactly this and is what vue, mdx and astro use.
it is the fast path but it is a framework and a dependency tree. given the line-preserving
constraint, the mapping is nearly trivial, so hand-rolling on top of the `typescript` package
is realistic and keeps the dependency list at one entry.

syntax highlighting is built, and it is not the grammar this said it would be. an include of
`source.ts` only reaches the top level of a file, and every word tz adds lives inside a body, so
the words are a second grammar **injected** into `source.tz` at every depth. that is the whole
trick: `tz.tmLanguage.json` is three lines and `tz-words.tmLanguage.json` is the six patterns.

the one surprise is that typescript's grammar reads a match arm as an object literal key, so a
quoted arm value reaches the injection with no string scope on it and `-comment -string` cannot
refuse it. a word with a quote against it is refused instead. it is written up in `tz/readme.md`
along with the other residue.

### staging

1. lexer plus `guard` and `match`. smallest constructs, prove the pipeline, prove line preservation.
2. the ban list. it is a lexer walk with a table, it is what makes the language a language,
   and every later check gets cheaper once `function` and method shorthand are gone.
3. `ok`, `err`, `async`, `try`, `on:err`, `any:none`, the one-discipline-per-body check, the two
   inferred lifts and the implied `ok`. the reason the language exists.
4. cli, loader hook, diagnostics mapping. now it is usable for real code.
5. `scope` and `protocol`.
6. lsp, and with it the three code actions: `return result.ok(x)` to `ok x`, `return
   Promise.resolve(x)` to `async x`, and an object literal with a `branch` to `branch(...)`.
7. the semantic pass, on the `LanguageService` the lsp already holds.

the equality rewrite rides along with step 2, and so does `Promise.reject`: token rewrites and
table rows, nothing more.

step 7 is where the checks that need a type live: **conditions must be boolean**, `match`
exhaustive over a union, "is this actually a `Result`", and **a `Result`-typed expression
statement is an error unless it is `void`-prefixed**. none of them belong in the emitter, and
one of them cannot be there at all, which is written up under equality.

## rulings needed

two. the other two that stood here are ruled and built: `on:` and `any:` replaced `on:err` and
`any:none` and generalised the first of them to any union, `:tag` arms read a branch inside a
`match`, and `Result` became `ok`/`err` so the vocabulary closes.

### an answering guard

`guard (c) => 4;` for `if (!(c)) return 4;`, and `guard (c) => { return 4; }` for the block.
this is **not** the answering guard refused under why not: that one was postfix and
substituted a value in an initialiser, this one is a statement with an answering tail. it
removes the de morgan cost from the one case that still pays it.

what it costs is the partition. "a guard never answers and an if never declines" is what lets
the first word of a line say what leaves; with an answering tail `guard` means "leaves, with
anything", and in the block form `guard (c) { ... }` and `guard (c) => { ... }` sit two
characters apart and both are followed by a brace. `if (bad) return y;` also becomes a second
spelling of one statement, which is what the postfix guard was refused for.

three ways: refuse it; take the expression form only, so the token after the `)` is a four way
sign (`;`, `err`, `{`, `=>`) and only the second objection stands; or take both and rewrite
the partition as polarity, which is swift's language, is coherent, and gives up the one pass
read.

### what a file top level is

a `guard` at module top emits a `return` outside a function, which is not a program. wrapping
the module in an iife would break `export`, hoisting and every top level `const`, which is an
emitter with an opinion about your module. so **the prototype refuses declines and exits at
file top level** and says to wrap them in an arrow, which is the shape real code has anyway.
that is the cheapest answer; it may be the wrong one for a scratch file.

### ruled and built

the fallible body's tail, answered by the implied `ok`; the ban list's escape hatch, answered
by the file boundary; `on:`, `any:` and `:tag` arms, which are in the emitter; and both
`tstd` renames, which have landed.

## next session

two things the prototype got wrong or left out, ahead of what was already staged.

- **the emit does not belong next to the source.** `tzc` writes `x.ts` beside `x.tz`, so the
  directory lists everything twice and the generated half is the louder one. `--out` already
  mirrors the tree somewhere else, so the question is what the default should be, and whether
  the emit is something you keep at all now that `tzx` never writes one.
- **syntax highlighting is urgent.** it sat at step 6 behind the lsp and that is the wrong
  order: reading tz without it is what makes the language feel unfinished, and it is the one
  thing that costs nothing to have. a textmate grammar that includes `source.ts` and adds the
  words is about thirty lines and needs no language server at all. it moves to the front.
  **built**, as `tz/editor/`, and the shape it wanted is written up under lsp.

then `scope` and `protocol`, which are the last two constructs, and after those the lsp and
the semantic pass that needs it. the extension is already the place the lsp goes, so it stops
being a new thing to stand up.
