# the typezig tutorial

a walk through the language: where it comes from, the typescript it keeps and the one it takes away, the constructs it adds, and the rest of the surface: scope, protocol, form and call. design notes are in `tz/DESIGN.md`; the journal of decisions is in `tz/UPDATES.md`.

## where we come from

### typescript

typescript keeps every door open: classes, interfaces, enums, namespaces, decorators, generics, `any`, overloads, `switch`, `try`/`catch`, `this`, `new`. nothing is taken away. the overlap is the problem: when two features do the same job, a team picks one and argues about it, and the type system cannot tell you whether you picked well.

<!-- # marco to agent: repetition; either quote directly or indirectly, not both -->
the claim here is not that typescript is bad. it is that most of it can be ignored, without suffering the lack at all. from the `tstd` readme: "javascript has many overlapping syntax constructs and language features; most of them can be completely ignored without suffering the lack at all". and: "typescript doesn't really make a good job in becoming scala, haskell or gleam, but it can do an excellent job in becoming go or zig, if you completely omit the topics of performance or memory management."

so the project starts with a question: what is the smallest consistent subset of typescript, and what does code written in that subset look like?

<!--
  # marco to agent

  i was the one to first say "let's make a tutorial, and start from where we come from, and do all the journey". but i'm starting to wander: is it nice to explain the library when one wants to see the language?

  this sections goes on to explain all the patterns, but before showing the tz snippets, it kinda pretrains the reader on tstd code. i think showcasing all the tstd-based design patterns is one thing, and instead teaching the basics of tz is a different thing.

  ok, here's what i want:

  write a dissertation on how we should organize tutorials. how a tutorial is effective, what it shows and in what order etc. i want to discuss this assessment with an agent and envision a whole revamp of the teaching docs in this repo.

  a language exists if people use it. i truly believe that this language is amazingly smart, and i am very proud to be its designer. i want people to feel the same about this language as i feel.
 -->

### tstd

`tstd` (type-standard) answers with code instead of an essay: a tiny library of a handful of modules, compressed into five principles, each of which becomes a hard rule:

- **master short-circuiting.** guards, early exiting, negative-space programming; handle the exceptional cases first and fall back on the general ones in a funnel. this is closely related to narrowing.
- **dry the syntax, not the code.** a static class is a module; a dynamic one is a closure with an `init`; inheritance becomes composition; hierarchies and enums become algebraic types.
- **treat features as such.** narrowing replaces validation libraries; proving a shape and mapping it are separate concerns.
- **maximize type inference.** a function that changes its return type should not break its signature; the callers should adjust. so return types are never declared, except in a type guard.
- **distrust what the types cannot say.** a signature is the whole contract, so anything carrying an invisible requirement is confined, not discouraged. a method's `this` requirement is invisible to its type, so a torn-off method typechecks and throws; a throw is invisible the same way. both get converted into a `Result` at exactly two boundaries: `make` and `call`.

the style that falls out is procedural, fallible-where-it-must-be, branch-shaped. tagged unions via `branch` and `Union`, type guards via `is`, results via `result`, resources via `scope`, wire shapes via `form`, state machines via `protocol`, time via `iso`.

### the transpiler idea

once the style rules are that strict, the language itself can enforce them. that is the tz idea, as the prototype readme puts it: "typescript with most of typescript taken away, plus a few constructs, transpiled back to typescript that imports `tstd`".

`tz` is a sugar transpiler: how to run it (`tzc`, `tzx`) and what to import (the emitter never writes one; a type-only import says `type`) lives in `tz/README.md`, and why it is shaped this way lives in `tz/DESIGN.md`.

the promise for the rest of this tutorial: everything tz does is sugar. every construct lowers to a hand-writable `tstd` pattern. tz writes it consistently, refuses the spellings that break the discipline, and both halves typecheck through the same `tsc`, so the sugar and the plain code never drift.

## how things are in typescript

before any tz, know the `tstd` patterns by heart: the funnel and narrowing, presence and absence, named branches, failure as a value, resources handed back in reverse, schemas without codecs, and machines as data. they live where they are owned: the principles in `../README.md` and the demonstrations in the `../src/` specs. tz is what those patterns look like when a transpiler writes them.

## what tz takes away

the transpiler is a lexer, so it refuses unknown words line by line. every refusal is a readme decision, spelled as a diagnostic on the source line. the keyword bans live in one table in `tz/DESIGN.md` (`src/ban.ts` is the truth); what follows are the punctuation and shape refusals:

- `===` and `!==` are refused; you write `==` and `!=`, and they emit the strict ones. one spelling of equality, guarded by the transpiler instead of by habit.
- `??` is refused; `?none` says which half it is doing. `?:` is refused; use `? => ... else ...` instead.
- comparing against `null` or `undefined` is refused; `is.some` and `is.none` say presence.
- a bare `return` is refused; every `return` is an exit, so it has to be a side quest (`cond ?== false return`, `val ?none return`).
- the `async` modifier is refused; an `await` in the body infers it, and `async x` states the rest of the story.
- `Promise.reject` is refused; a rejection is a throw on a later tick, so resolve with a `Result`.
- typescript's own `try { } catch { }` is refused; use `call.sync`, `call.async`, or the tz `try`.

naming the rejection is the point: each refusal is a rule you would otherwise keep in your head, and head-kept rules are the first a team forgets.

## the vocabulary

three constructs, three names; this is the whole shape of the language.

- **exit**: leaving the scope. `return`, `err`, `ok`, `break`, `continue` all count. an exit carries a value when one is named.
- **arrow capture**: the `=>` form. it captures whatever is returned and stays in scope. an arrow capture is the spell for "produce a value without leaving".
- **side quest**: the `?` family. a side quest tests a value at the position where it stands and decides between an exit and an arrow capture based on what follows. the `?` is the "quest" of "side quest".

the three forms partition every line of tz. if a construct isn't an exit, isn't an arrow capture, and isn't a side quest, it isn't in the language.

## ok, err, async: one discipline per body

a body exits with exactly one of `return`, `ok`, `err` or `async`; the transpiler refuses a mix. a fallible body gets the implied `ok` at its end:

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

## arrow capture: produces a value without leaving

arrow capture is the spell for "produce a value, stay in scope". the `=>` form names it. an arrow capture sits where a value is expected: after an assignment, an `ok`, a `return`, a comma, a paren, or another arrow.

```tz
const port = process.env.PORT ?none => 8080;
```

an arrow capture is the only way a `=>` appears; there is no block that just lists answers. the body decides what an arrow capture does: when it has a `=>` and a value, it captures; when it has an exit keyword (`return`, `err`, `ok`, `break`, `continue`), it leaves.

## side quests: the `?` family

all the side quests are postfix, all under `?`:

| side quest | what it tests | example |
| --- | --- | --- |
| `?none` / `?some` | presence and absence | `table[id] ?none err 'no row'` |
| `?ok` / `?err` | the `Result` branches, payload unwrapped | `pay() ?err (e) err e` |
| `?:tag` | any named branch, the whole value boxed | `pay() ?:err return` |
| `?==`, `?!=`, `?>`, `?<`, `?>=`, `?<=` | a comparison against the subject | `x ?> 0 err 'not positive'` |
| `?&(...)` | every listed comparison holds | `x ?&(> 0, < 100) { print('in range'); }` |
| `?\|(...)` | any listed comparison holds | `x ?|(< 0, > 100) { print('out'); }` |
| `?(cond)` | a self contained boolean expression | `x ?(x % 2 == 0) => 'even'` |
| `?!(cond)` | the negation of a self contained boolean | `x ?!(is.valid(x)) err 'invalid'` |
| `?` | true, shorthand for `?== true` | `cond ? log('up')` |
| `?!` | false, shorthand for `?== false` | `cond ?! log('down')` |

a bare `?`, a `?!` and a trigger test a boolean; anything wider warns in the editor, so a string condition spells its comparison out.

place a `?` in the middle of a comparison and it captures the expression on its left and tests it against what follows on its right. the operator glues onto the `?`: `x ?== 2`, `x ?!= 3`, `x ?> 0`. the operators are exactly the boolean binaries: `==`, `!=`, `>`, `<`, `>=`, `<=`. `==` and `!=` emit the strict ones, the way they do everywhere else in tz:

```tz
x ?> 0 err 'not positive';
const speed = val ?>= 100 => 1.0 else 0.5;
```

`==` is mandatory on every test, even where the old spelling glued a value straight onto the `?`: `x ?5`, `x ?'hi'` and `x ?=y` are refused, and read `x ?== 5`, `x ?== 'hi'`, `x ?== y`. `?true` and `?false` retire the same way, and a bare `?` means `?== true` while `?!` means `?== false` (never `?!= true`, so a truthy non-boolean misses it), so a boolean subject just reads `cond ?` or `cond ?!`. arithmetic and bitwise quests go with them: there is no `?%`, and a modulo case spells `x ?(x % 2 == 0)` or moves the computation left, `x % 2 ?== 0`.

when the right side has more than one half, one combinator glues on plus parens joins them: `&` means every half holds, `|` means any half holds:

```tz
x ?&(> 0, < 100) { print('in range'); }
x ?|(< 0, > 100) { print('out of bounds'); }
```

each half carries its own operator, groups nest, and a group of one is refused, since the bare test already says it:

```tz
x ?|(?&(> 0, < 1), == 5) => 'small' else => 'big';
```

a group never mixes branch tags with comparisons: `:err` tests the branch while `== 1` tests the value, so `|(:err, == 1)` is refused. `?(` stays the escape hatch, a self contained boolean expression that may or may not mention the subject, and `?!(cond)` is its negation: `?(` refuses when the condition is false, `?!(cond)` when it is true. a custom side quest is `x ?!(is.valid(x)) err 'invalid'`: the condition is a third party predicate, and the expression on the left is the value the quest is about. when the condition never repeats that expression, the expression is the miss value alone, read once; an expression a condition does repeat is refused, because the test would read it a second time, so bind it to a name first. groups always carry their combinator, so `?&(`, `?|(`, `?(` and `?!( ` never collide. `?ok` and `?err` name the `Result` branches the short way and hand the payload back unwrapped; the coloned `?:tag` reads any branch by name with the subject left boxed, so the chain can test the same union twice. a coloned refusal keeps the box too, so reaching the branch that survived is one more step: `const rows = x ?|(:idle, :loading, :failed) return;` leaves `rows` boxed, and `rows.value` reads its payload, because the narrowing already proved which branch it is.

### the same heads in `? {}`

a `? {}` block lifts its subject once and every arm reuses it with the same heads an inline quest takes: `==` comparisons, `:tag` branches, `(cond)` expressions. `==` stays mandatory there too, so a bare `200 => 'ok'` is refused in favour of `== 200 => 'ok'`. arms are alternatives, first hit winning, with exactly one `else` naming the miss; it replaces the old `_`:

```tz
x ? {
  &(> 0, < 100) return 'in range',
  |(< 0, > 100) return 'out of range'
};
```

a group head shares one tail across its halves, and an explicit `(cond)` arm with `&&` is how an and reads where no group fits. a `? {` followed by arms is the block; followed by plain statements it is the hit tail of a bare `?`, and then `else` is required, since arms are recognised by their heads. the emit follows the heads: a block of only `==` arms switches on the subject internally, anything mixed cascades as written. the optimisation is invisible in the source either way.

### one rule decides exit and arrow capture

everything hangs on what follows a side quest. an exit keyword (`return`, `ok`, `err`, `break`, `continue`) leaves the scope, carrying a value along if one is given; `=>` arrow-captures a value, and always needs a land; a bare `{}` runs inline, exiting when it exits; `else` names the miss branch of an arrow capture. a bare value after a side quest captures nothing: expressions capture with `=>`, or they are refused.

```tz
const user = db.find(id) ?none return;        // exits the function
const user = db.find(id) ?none return 42;     // exits it carrying 42
const user = db.find(id) ?none err 'User not found';
```

```tz
const port = process.env.PORT ?none => 8080;  // arrow captures a value in place, execution continues
```

a block after `=>` is an iife; `return` resolves it, here into `a`:

```tz
const a = x ?err => {
  const val = getDefaultValue();
  log(val);
  return val;
};
```

effects plus an exit spell inline, the block emitting as written and the exit leaving the function:

```tz
x ?err (e) {
  log(e);
  err e;
};
```

the difference between "leave, there is no value" and "continue, with this instead" is the `=>`, not two constructs; the tail is parsed token level, like everything else.

### chains take `else`

when both boolean sides are meaningful, arrow capture one side and name the miss with `else`; an `else` takes `=>` and an expression, which may hold another chain, so the subjects evaluate only on their miss:

```tz
export const label = (n: number) =>
  n ?< 0 => 'below' else => n ?== 0 => 'nothing' else => 'above';
```

when the next test reads the same subject, the `else` carries the quest itself and the subject stays locked: one chain, one subject, and the miss yields it, so the final `else` is optional:

```tz
export const sign = (n: number) =>
  n ?== 0 => 'zero'
  else ?< 0 => 'neg'
  else => 'pos';
```

an `else` answer may still nest a chain of its own with `else =>`, and that chain locks its own subject; nesting is composition, not rebinding, and each chain still answers its own miss. a quest with no chain behind it answers nothing: `?(n < 0) => 'neg'` standing alone is refused, since a miss would have no value to yield. in a decline the `else` keeps answering: a quest after `else` continues an answering chain, never a decline.

a side quest reads as "but if": yield the subject, but if the test holds, do this instead. when a bare boolean carries a value `else`, the subject is only the final value, so the whole thing is the inverted form of testing that value: `pred ? => hit else => miss` is refused in favour of `miss ?!(pred) => hit`, which reads "yield `miss`, but if `pred` is false, yield `hit`". the `else` value moves to the front, the condition moves into the parens, and the two say the same thing in the order the machine runs: test first, value on the miss. a bare condition with no `else` keeps its own subject (`pred ? => hit` yields `pred` on the miss), and an exit `else` or a chained `else` is not a plain value, so each keeps its own spelling.

the miss side arrow-captures like any side quest tail: `=> expression`, `=> { block }`, or an exit. a bare value after `else` captures nothing, so `else 'above'` is refused and reads `else => 'above'`. an exit in the final else flips the whole chain to an exit ladder: the value branches become exits, and the subjects evaluate only on their miss:

```tz
export const level = (n: number) =>
  n ?< 0 => 'below'
  else => n ?== 0 => 'nothing'
  else return 'above';
```

captured, the chain binds once: the value branches assign to a temp, the exit branch leaves, and the binding reads the temp after the funnel:

```tz
export const look = (n: number) => {
  const tag = n ?< 0 => 'below'
    else => n ?== 0 => 'nothing'
    else err 'above';
  ok tag;
};
```

as a statement the two sides share one subject with `else` between them: exactly one side runs, one line or one block per side like an `if`, and a scope is not a value, so there is no `=>` on them:

```tz
export const run = (cond: boolean) => {
  log('start');
  cond ? {
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
    == true seen('yes');
    == false seen('no');
  };
};
```

when the boolean is worth refusing, exit with a statement, one with no `else`: an `else` after an exit means you missed a branch of the funnel, and the transpiler refuses to guess it for you.

```tz
export const clamp = (n: number) => {
  if (n < 0) return 0;
  if (n > 100) return 100;

  return n;
};
```

### `? {}`: arrow capture exhaustively

`? {}` arrow captures over a value or over a branch: `==` arms for values, `:tag` arms that bind the payload for branches, `(cond)` arms for computed cases. `else` is the open case, a last resort: when the arms cover the whole union `tsc` proves the block exits, and a missing branch lands as `| undefined`. the editor names the missing member on the `?` line; exhaustiveness stays `tsc`'s job, not the transpiler's:

```tz
export const say = (code: number) => code ? {
  == 200 => 'ok',
  == 400 => 'bad request',
  else => 'something else'
};
```

```tz
export const describe = (x: Load) => x ? {
  :done (rows) => `rows: ${rows}`,
  :failed (why) => `failed: ${why}`,
  else => 'still going'
};
```

a condition arm names no tag and binds nothing; it tests strictly, the hit meaning `=== true`. a comparison arm elides the subject it already holds, so `> 500` tests the lifted subject and a repeated `(code > 500)` is refused; `(cond)` stays for foreign expressions that mention other values. a block with only `==` arms switches on the subject internally; a block containing a condition cascades instead, and the first hit wins either way:

```tz
export const word = (code: number) => code ? {
  == 200 => 'ok',
  > 500 => 'down',
  else => 'other'
};
```

### try: propagate without naming

`try` propagates a failure without naming it, and binds the unwrapped value. it is the prefix for anything that hands back a `Result`: a plain call, a `call` at the foreign boundary, a `hold` inside a scope. spelled out, `try x` is `x ?err (e) err e`: on the err branch, exit with the payload it carried.

```tz
export const name = (id: string) => {
  const raw = try row(id);
  const parsed = try call => JSON.parse(raw);
  is.model(parsed, rowShape) ?== false err 'not a row';
  ok parsed.name;
};
```

### bindings: name it or drop it

the branch tests carry what they found: `?ok` and `?err` hand the payload back unwrapped, `?:tag` hands the whole subject boxed, `?some` the found value. they bind one in parens, and the name reaches everywhere the tail reaches, template holes included:

```tz
request.body.email ?some (email) sendMail(email);
```

```tz
const out = name(id) ?err (why) err `no answer for ${id}: ${why}`;
```

a binding nothing uses is refused: `read() ?err (e) => 'localhost'` does not compile, and neither does a `? {}` arm whose answer ignores its name. drop the parens and move on. `?none`, comparisons, groups and conditions carry nothing, so they never bind at all.

and one split to keep straight: the binding lives on the match side. an `else` branch runs on miss, where the bound value names nothing, so `x ?:e (e) => 1 else f(e)` is refused alongside the unused ones. the same goes for a `? {}` arm: bind what the answer carries, or nothing.

### branches built with a colon

the same colon that matches a branch in a `? {}` arm constructs one, in any value position: after `(`, `,`, `[`, `=`, `=>`, another `:`, `return`, `ok` or `err`. `:idle` is a branch with nothing to carry, `:failed(why)` one with a value:

```tz
const idle = :idle;
const failed = (why: string) => :failed(why);
```

exactly one value or nothing: `:err()` and `:err(a, b)` are both refused. and never in type position, where a colon already has a job. the pairing is the point: what `:tag(...)` builds is what a branch test reads, and a `? {}` arm exits with either. `?ok` / `?err` unwind the common case; the coloned `?:tag` reads any branch by name and leaves the value boxed for the chain.

### in-argument unwrapping

the side quest is postfix on any expression, so it works inside argument lists, where a statement never could: the failure is enforced at the point of value initiation, which was always the goal, kept this time:

```tz
const receipt = processPayment(
  cart[userId] ?none err 'Cart empty',
  token ?none err 'Missing token'
) ?err (e) err `Payment failed: ${e}`;
```

### the side-effect trigger

one side is all you care about: a comparison with a single expression, no exit, no unwrap:

```tz
status ?!= 'ready' log('going down');
```

the single-branch `if (cond) { ... }` from typescript, kept because it reads forward: condition, then what fires, on one line. a trigger stays bare under the widened `void` rule: the `?` head already marks the effect, so `void` is only for naked statements with no tz head. an expression must always be captured, so `=>` as a statement is refused: a statement runs an expression or a block. a `=>` block as a statement is refused too, scopes do not take `=>`; `break` and `continue` are exits like any other on a side quest tail, but a `=>` block is a function boundary, so they are refused on it. longer reactions take the bare block form, one line or one block per side with `else` between them, and longer matches list every arm under a bare `?`.

### what side quests refuse

the flip side of the ladder, in one place. an expression captures with `=>` and must always be captured, so `=>` as a statement is refused and a bare value after a side quest in an arrow capture is refused; a statement runs an expression or a block, with `else` between its two sides and a bare `?` block listing every arm of a longer match; a side quest after a consumed tail belongs to no subject, so chain with `else` or start a new statement; side quests do not nest, so bind the inner value first; one `else` per arrow capture; exits never hide in arrow bodies, `=>` blocks or `? {}` arms, and `try` never shares a statement with a side quest; bindings name values, not keywords, and the miss branch cannot borrow them. binary quests add their own: glued values (`?5`, `?'hi'`, `?=y`), `?true` and `?false`, arithmetic tails, single-item groups, groups mixing `:tag` with comparisons, bare arm values, and `_` arms are all refused; a gap between `?` and its operator is refused too, and so is a missing one between the operator and its operand, so `? == 5` reads `?== 5` and `?==5` reads `?== 5`. the `!` glues onto the `?` the same way, so `? !` reads `?!` and `?!` takes only an exit, `=>`, or a block, since it means `?== false`. each refusal points at the line that needs restructuring, and `tsc` never sees the confusion.

### summary of the construct matrix

| construct | syntax | role | replaces |
| --- | --- | --- | --- |
| postfix exit | `val ?none err 'msg'`, `cond ?== false return` | early exit from scope on failure | an early `return`, an `if (!cond) return` clause |
| postfix arrow capture | `val ?none => dflt`, `cond ?== false => 'guest'` | inline value substitution, with an exit allowed on the miss side | `??` |
| arrow capture chain | `cond ? => a else => b` | capture one of two values | ternary `?:` |
| inline exit | `a ? { log(); return; }` | effects plus an exit, inline | `if` with effects and an early exit |
| side-effect trigger | `cond ? log('ok')`, `cond ? { ... }` | run on match, keep going | single-branch `if` |
| two-sided statement | `cond ? a else b` | run one of two sides | two-branch `if`/`else` |
| exhaustive statement | `cond ? { == true a; == false b; }` | run one of many sides, chaining with `else if` under conditions | `if`/`else` chains |
| exhaustive arrow capture | `x ? { == 200 => a, (x > 500) => b, else => c }` | total coverage over values, branches, and conditions | `switch`, `if/else` chains |

## scope

`scope` is sugar over `scope.sync` / `scope.async`: the resource body with the reverse-order release.

```tz
export const both = (first: string, second: string) => scope (hold) => {
  const a = try hold(pool.take(first));
  const b = try hold(pool.take(second));
  ok `${a} and ${b}`;
};
```

the opening line loses the parens around the binding and gains `scope.sync(`, the closing line gains a `);`, and everything between is untouched, so the line count holds.

the `=>` is not decoration. that block is a function body: `try` exits from it, `ok` and `err` are its exits, and the emit is an arrow. writing the `=>` says so, and it keeps the discipline check to one sentence, since a function body stays exactly a `{` preceded by `=>` with no second case for `scope`. it also settles the recognition: `scope(x) => {}` is not valid javascript, so a call to somebody else's `scope` can never be read as the construct.

an async body picks `scope.async` and an async callback, and the count that decides it is the same one that decides everything else, an `await` in the body.

hold is a value, not a keyword. `hold` binds, the way `catch (e)` and `?:err (e)` bind, so it takes the parens the rest of the language takes. what it does not take is keyword status. `hold x` would read as syntax, and then the emitter has to answer which scope the resource belongs to, which is the one question a token-level rewriter has no business answering. as a value it answers nothing: `hold` is a parameter name copied through, and `hold(x)` is a call the emitter never looks at.

nesting is where that pays, because two names reach two lifetimes:

```tz
scope (session) => {
  const conn = try session(connect(url));

  const out = scope (page) => {
    const buf = try page(alloc(size));
    const tmp = try session(openTemp());
    ok render(conn, buf, tmp);
  };

  if (out.exit.branch == 'done') err 'panicked';
  ok try out.exit.value;
}
```

`buf` is released at the inner brace and `tmp` at the outer, and the line that took it says which. a keyword could only ever mean the nearest scope, so `tmp` would have no spelling at all. the cost is that reusing the name shadows it, exactly as a nested arrow parameter does: name the binding after the lifetime and the shadow never comes up.

## protocol

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

a parameter says what a branch carries. a transition list says where it may go. nothing following anything is a union; something following is a machine; it is one construct for both, exactly as `protocol.init` is one call for both.

there are two shapes, one construct. a block inlines into `protocol.init`, because only an inline object literal gets its transition arrays typed as tuples: a hand-written `$loader` const would infer `string[]` and fail init's constraint. a generic block gets the shape function, because its parameters have to bind somewhere, and a shape with no transitions compiles the way `src/result.ts` already proves. the data type reads the factory record either way, and `Union<protocol.Model<typeof loader>>` is the line `protocol.spec.ts` already writes.

for a generic block there are three, and the first is scaffolding:

| name | what it is | who writes it |
| --- | --- | --- |
| `$result` | the shape function, only to bind the generics | the emitter, hidden |
| `Result` | the union, as data | the emitter, from the name |
| `result` | the factories | the emitter, from the name |

a plain block has two, because there is no shape to hide: the literal sits in the init call, and the type reads the factory record it produces.

the capitalisation is not a convention the language invented. `AGENTS.md` already says: the same word, case-distinguished, for a type and its factory. `Branch`/`branch`, `Result`/`result`, `Loader`/`loader`. so the block needs one name and the emit derives the other two.

`Loader` is the data form, `Union<protocol.Model<...>>`, which is what `result.ts` names and what you store. the live form, the one carrying `to`, stays `protocol.Of<typeof loader>` at the use site, the way `protocol.spec.ts` writes it. one name for the thing you put away, an expression for the thing you are walking.

`export protocol` exports the type and the value. where there is a shape function it is never exported: it is scaffolding and it never escapes the file, which is the same rule `make` follows for instances.

`protocol`, a name, optional `<S, E>`, then `{`. inside, each entry is a name, a payload in angle brackets, an optional `=> a | b`, and a comma. a branch with nothing to carry spells nothing. the payload's type is copied verbatim through a depth count, so `c<Array<string>>` reads the `>>` as two closes and emits `c: (value: Array<string>)`: only the last character of the run becomes the factory's `)`.

the import is yours. the emit says `protocol.init`, `Union`, `result.ok`. none of those arrive by magic: the emitter never writes an import. a tz file that says `ok` imports `result`, one that declares a `protocol` imports `protocol` and `Union`, and one that forgets gets told by `tsc` in the usual way.

## form: declare the two forms once

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

`UserForm` is what travels and gets stored, `User` what you carry in memory, from the same object, so the field names are written once. the decoding discipline is unchanged, only spelled with the side quest:

```tz
const processPayload = (raw: unknown) => {
  form.model(raw, user) ?== false err 'malformed wire format';
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

## call: the boundary that does not throw

a throw is converted into a `Result` at two boundaries; this is the second one, promoted to a keyword. `call` isolates foreign or non-typezig code, sync or async, into an explicit, non-throwing `Result`:

when the `Result` is the whole answer, exit with it directly: no `try`, no `ok`. an expression that is exactly one call passes the function and its arguments straight to the boundary — `call.sync(f, a)` — and any other expression is tucked into the closure the emit opens, which is the value the body carries:

```tz
export const parse = (raw: string) => call => JSON.parse(raw);
```

which emits, one line in one line out:

```ts
export const parse = (raw: string) => call.sync(JSON.parse, raw);
```

`try` is for when work continues after the boundary: it unwraps left, so `try call` takes `=>` the way a side quest does:

```tz
const raw = try call => JSON.parse(file.readToString());
```

which emits, one line in one line out:

```ts
const $0 = call.sync(JSON.parse, file.readToString());
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

an arrow with no block cannot lift, so there `await` forwards the promise itself: `=> await call => fetch(url)` emits `=> call.async(fetch, url)`, the same `Promise` of `Result` the `async`/`await` variant carries, with nothing to suspend:

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

the keyword still needs the import, the way `ok` needs `result`: the emit calls `call.sync`, and the emitter never writes an import. a block answers with its `return`, so a block that falls off the end is refused, and `try`, `ok` and `err` stay outside it: the boundary converts the panic, nothing else does. and since a bare `call` answers instead of throwing, an uncaptured one dangles: a `call` with no land is refused, so `return` (or a binding) carries it, never silence. a call that captures nothing spells `void`, which discards the boundary on purpose and passes through:

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

## make: the constructor that does not throw

`new` is banned, and its replacement takes `=>` like `call` does, because a constructor is the other thing that panics: platform and library constructors throw. `make` names the constructor, keeps the args where they are, and the boundary becomes a `Result`:

```tz
const url = make => URL(href);
```

which emits, one line in one line out:

```ts
const url = make(URL, href);
```

`try make` unwraps left exactly like `try call`:

```tz
const url = try make => URL(href);
```

which emits:

```ts
const $0 = make(URL, href);
if ($0.branch === 'err') return $0;
const url = $0.value;
```

a constructor only syncs, so there is no async side of this boundary: an `await` in front of `make` is refused, and so is a make that dangles, the way a call dangles. `new` is gone, but the constructor itself is foreign the same way a throwing function is foreign: if your own code would have used `new`, `make` is the crossing, and `class` stays banned.

## the whole pipeline

the constructs working together:

```tz
export form configForm {
  port: is.number,
  host: is.string
}

const loadConfig = (filePath: string) => scope (hold) => {
  const file = try hold(openFile(filePath));

  const raw = try call => JSON.parse(file.readToString());

  form.model(raw, configForm) ?== false err `invalid configuration structure in ${filePath}`;

  const config = form.decode(raw, configForm);

  ok config;
};
```

and its consumer, the same side quests on the way out: a scope ends with an `exit`, not a `Result`, so `serve` refuses the panic first and propagates the work's answer after:

```tz
const serve = (filePath: string) => {
  const held = loadConfig(filePath);
  const done = held.exit ?:panic (why) err `panic: ${why.value}`;
  const config = try done;
  config.port ?<= 0 err `a port has to be positive`;
  start(config);
  ok 'listening';
};
```

trace each line: `scope` holds the file and gives it back whatever happens; `try hold` acquires it, one guard; `try call` runs foreign code and turns the panic into a `Result`; `form.model` proves the shape, which lets `form.decode` be infallible and carry the config unboxed. on the way out one side quest refuses the panic, `try` unwraps the work, and one more refuses an impossible port.

## scope, honestly

what is missing lives in the other two docs: the lsp and the type-aware checks are next in `tz/DESIGN.md`, and the self containment that lets `tz` move with a `git mv` is in `tz/README.md`.
