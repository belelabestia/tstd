# 18 the arrow capture working context

## intent

the author's change of mind: `call`, `make` and `scope` carry `=>`, and the same glyph is the side-quest capture, so a reader meets two readings of one arrow before meeting the one the language is built on. this session decides whether the three keep the arrow, what opens their body instead, and whether the side-quest expression-versus-statement arrow is load bearing at all. it rules before it changes.

## inputs

- `../sessions/18-the-arrow-capture.md` (the charge, the questions, the acceptance).
- `../roadmap.md` (the plan; q16 is this session, session 22 orders the constructs, session 19 takes the struct).
- `../../DESIGN.md` (the vocabulary, the constructs, `why not`, the block-expression note).
- `../../TUTORIAL.md` (arrow capture, the tail rule, `scope`, `call`, `make`, the construct matrix).
- `../../GETTING-STARTED.md` and `../../README.md` (the door and the dense mixed example, both spell the boundary arrows).
- `../src/scan.ts` (`classify`, `bareAfter`, the `?` tagging).
- `../src/emit.ts` (`roles`, `scoping`, `calling`/`wrapping`, `making`, `arrowing`).
- `../src/ban.ts` (the punctuation and shape refusals around `=>`).
- `../constructs/arrow.spec.tz`, `call.spec.tz`, `make.spec.tz`, `scope.spec.tz` (the four decks).
- `../plan/context/14-the-async-tail.md` (the exit family the tails were settled against).
- `../../AGENTS.md` and `../../STYLE-KB.md` (voice and rules).

## the analysis

### what `=>` does at each site

| site | source | emitted | the arrow's job |
| --- | --- | --- | --- |
| typecore arrow | `(x) => x + 1`, `() => { ... }` | as written | a function literal; `=> expr` versus `=> { }` is expression body versus block body |
| side-quest capture | `env.PORT ?none => '8080'` | `const $0 = env.PORT; const port = $0 === undefined ? '8080' : $0;` | names the expression half of a tail, against an exit or an inline block |
| `call` body | `call => JSON.parse(raw)` | `call.sync(JSON.parse, raw)` | opens the closure; the block form needs it |
| `make` body | `make => URL(href)` | `make(URL, href)` | separates the keyword from the constructor call |
| `scope` body | `scope (hold) => { ... }` | `scope.sync(hold => { ... })` | keeps the block a function body (the discipline check's invariant) and marks the construct |

### the readings a reader holds

- **expression in statement position.** the typecore arrow and the side-quest capture are the same reading: the `=>` says "an expression follows where a statement could stand", so `=> expr` is a value and `=> { }` or an exit is a statement. one reading covers both.
- **a body opener that is not that.** `make => C(...)` is neither a function literal nor a capture: `make` is a keyword, not a parameter, so the arrow reads as a lambda header and lies. `call` and `scope` open a real closure, so their arrow is the typecore reading, not a third one.

the third reading is `make`'s alone. `call` and `scope` use the arrow function reading the language already has.

### the side-quest arrow is load bearing

a tail after a side quest is an exit, an inline block, or an expression. without the arrow, an expression is an effect, not a capture: `cond ? console.log('up')` is the side-effect trigger. the arrow is what turns the same position into a capture, and a bare value is refused.

```
env.PORT ?none 8080        refused: an arrow body answers with =>
cond ? console.log('up')   emits if (cond === true) console.log('up');  (an effect)
env.PORT ?none => '8080'   captures the value
```

so removing the side-quest arrow makes an expression and a statement indistinguishable. it stays.

### the three constructs, tested

- `make => C(...)`: the arrow is a pure separator and reads as a lambda parameter. `make C(...)` reads as "make a C(...)" and is what the emit already wants.
- `call`: the arrow is **decorative**. `call => f(a)` and `call f(a)` emit byte-identical `call.sync(f, a)`; `call => a + b` and `call a + b` both emit `call.sync(() => a + b)`; `await call => fetch(url)` and `await call fetch(url)` both emit `call.async(fetch, url)`. the arrow adds nothing but the block opener, and the scan already classifies a `{` after `call` as a body.
- `scope (hold) => { }`: the arrow keeps the block a function body, which is the discipline check's one sentence ("a function body is a `{` preceded by `=>`"), and it marks the construct against a foreign `scope(x)` call. dropping it costs one `classify` case, symmetric with the `call` case that already exists.

### the author's question: whose `return` is it

the author's reflection reopens the ruling. `return` means one thing in `call`'s body and another in a side-quest inline block, and the reader has to infer which:

```
call => { return v; }        return leaves the callback call.sync invokes
cond ? { log(); return v; }  return leaves the enclosing function
```

the difference is the arrow. the rule is one sentence: **`return` (and `ok`/`err`) leaves the nearest body, and a body is a `{` preceded by `=>`.** so:

- `call => { return v; }` and `scope (hold) => { ok x; }` open function bodies; their exits leave the callback the boundary calls.
- `cond ? => { return v; }` opens a function body too (an iife); its `return` resolves the capture.
- `cond ? { log(); err e; }` opens no body; it is inline, and its exits leave the enclosing function.

the arrow is exactly what tells the two `{ return }` blocks apart. drop it from `call` and `scope` and the difference is no longer readable: `call { return v; }` and `cond ? { return v; }` would be the same shape with different meaning. that is the inconsistency the author is sensing.

`make` is the one site with no body at all. `make => C(...)` emits `make(C, ...)`, no closure, so the arrow there is a separator that reads as a lambda header (`make` as a parameter). `make C(...)` is what the emit already wants.

the author's temptation, "make all conditionals expressions", fails on the funnel: `x ?none return;` must leave the function, so the conditional tail is a statement context. the arrow is the switch out of it, into an expression body, and the boundary constructs sit on the expression side because a fallible entrypoint needs a closure to catch the panic.

## the author's direction (2026-10-12)

the arrow in the boundaries is a function-expression lookalike: `scope (hold) => {}` is a keyword glued to a lambda, and the honest arrow-function spelling `scope hold => {}` would be valid javascript too. `call () => {}` would be the consistent spelling, so `call => {}` and `call {}` are both just shorthands. the arrow has no home in the three.

the side quests are where it earns its keep, and for a nameable reason: a block after `?` can be inline (statements; exits leave the function) or a value (a body; its `return` is its own). the arrow is the only thing that says which. the author proposes to say it with a word instead: a produced-value exit (`call { yield v; }`, `x = cond ? { yield v; }`) against `return` leaving the function (`cond ? { return v; }`). then the arrow is redundant everywhere.

### opinion

- the arrow out of `call`, `make` and `scope` is right: `make C(...)`, `call { ... }`, `scope (hold) { ... }`.
- the produced-value exit is the right *shape* of fix, but it is not a vocabulary change. it rewrites what `return` means, and it re-explains `ok`/`err` as the fallible form of the same "answer the nearest body" move. session 14 settled the exit family; this is its own session, not this one.
- the word is the open part. `yield` is currently refused (`yield: 'a loop'`), so unbanning it is a real move, and it is javascript's generator word; tz would own it with a new meaning. a session on the produced value should rule the word, not this one.
- interim, with the arrow gone from the three and kept on the side quests: `call { return v; }` and `cond ? { return v; }` are told apart by the construct. `call`'s block is a body because `call` implies one; a `?` block is inline unless an arrow opens a body. that is the rule the tutorial needs either way.

## proposal (the agent's opening reading, before the author's reflection)

- **`make` drops the arrow: `make C(...)`.** it is the only site with no body; rejected: `make => C(...)` (reads as a lambda whose parameter is `make`); `make(C(...))` (an ordinary call look that hides the boundary).
- **`call` drops the arrow: `call expr` / `call { ... }`.** rejected: `call => { ... }`, a function-expression lookalike; `call(expr)`, an ordinary call look.
- **`scope` drops the arrow: `scope (hold) { ... }`.** rejected: `scope (hold) => { ... }`, the same lookalike, and `scope hold { ... }`, which drops the binding parens the rest of the language keeps.
- **the side-quest arrow stays for now**, the marker of a value body against an inline block. the produced-value exit that would replace it is a new session.
- **the produced-value exit (`yield` or another word) is filed as its own session**, because it rewrites `return` and the exit family session 14 settled.

## decisions

all dated 2026-10-12, ruled by the author.

- **the boundary arrow goes.** `make C(...)`, `call expr` / `call { ... }`, `scope (hold) { ... }`. the arrow read as a function expression: `scope (hold) => {}` is a keyword glued to a lambda, and `call () => {}` would be the honest spelling, so `call => {}` and `call {}` are both shorthands. the construct says the body is its own, so it needs no glyph. rejected: keeping the arrow in the three (a glyph with a third job, against one reading per form); `call(expr)` and `make(C(...))` (ordinary call looks that hide the boundary); `scope hold { ... }` (drops the binding parens the rest of the language keeps).

- **the side-quest arrow stays.** it is load bearing: a bare expression after a quest is an effect (`cond ? console.log('up')` emits an `if`), and the arrow is what makes the same position a capture (`env.PORT ?none 8080` is refused). rejected: dropping it, which would make a capture and an effect indistinguishable, and would leave the tail with no expression marker.

- **the produced value is filed as session 24, ledger q21.** the author's proposal: a body leaves the function with `return` and answers the nearest construct body with a produced value (`call { yield v; }`, `x = cond ? { yield v; }`), so the arrow leaves the side quests too and `=>` is a typescript arrow function and nothing else. it rewrites what `return` means and re-explains `ok` and `err`, which answer the nearest body already, and session 14 settled the exit family, so it is a language change and not a vocabulary one. rejected: doing it here (it would smuggle an exit-family rewrite into an arrow session); leaving the side quests to the arrow forever (the two `{ return }` blocks stay told apart by the construct name, which the author finds weak). the word is open; `yield` is refused today, so unbanning it is a move.

- **the plan runs to 25.** session 24 is the produced value and `retire the plan` shifts to 25, because it still runs last.

## evidence

- `npm test` (root): exit 0, 44 pass.
- `npm test` (tz): exit 0, 70 src plus 56 deck tests.
- `tzc` probe, `call => JSON.parse(raw)` vs `call JSON.parse(raw)`: both exit 0, both emit `call.sync(JSON.parse, raw)`.
- `tzc` probe, `call => a + b` vs `call a + b`: both exit 0, both emit `call.sync(() => a + b)`.
- `tzc` probe, `await call => fetch(url)` vs `await call fetch(url)`: both exit 0, both emit `call.async(fetch, url)`.
- `tzc` probe, `call { return JSON.parse(raw); }`: exit 1, `a call block takes =>; return answers the closure it opens`.
- `tzc` probe, `make URL(href)`: exit 1, `make takes =>; name the constructor after it`.
- `tzc` probe, `scope (hold) { ... }`: exit 1, `a file has no body to leave; wrap it in an arrow` (the bare block is not a body).
- `tzc` probe, `env.PORT ?none 8080`: exit 1, `an arrow body answers with =>`; `cond ? console.log('up')` emits an effect, not a capture.
- probes removed; `git status` clean.

## open

- none. the produced value moved to session 24 with its question (q21); everything else landed.

## close

- commit: `drop the boundary arrow` (`tz/src/emit.ts`, `tz/src/scan.ts`, `tz/src/typecore.ts`, `tz/src/emit.spec.ts`, `tz/src/smell.spec.ts`, the four construct decks and the example modules, `tz/TUTORIAL.md`, `tz/DESIGN.md`, `tz/AGENTS.md`, `tz/README.md`, `plan/`, `tz/UPDATES.md`, `tz/STATUS.md`).
- `../UPDATES.md` entry: `## 2026-10-12: the arrow capture`.
- roadmap: session 18 flipped to done, q16 resolved, session 24 added (q21), `retire the plan` shifted to 25.
