# 14 the async tail

phase: truth
status: planned
resolves: the async exit as a matcher tail

## why

`async` is an exit. `async x` emits `return Promise.resolve(x)`, the same way `ok` emits `return result.ok(...)`, so a matcher tail that takes an exit should take `async` too. the emitter disagrees. the tail dispatch carries local lists spelled `['return', 'ok', 'err', 'break', 'continue']`, which omit `async`, and five guards refuse it outright with `async states a promise body, not a matcher tail`. so `x ?err async 1` is refused, while `x ?err return 1` compiles.

the author raised it: "return and async are exits just as much as ok and err. and if the language doesn't say that now, then the language is wrong." the refusal is an inconsistency in the emitter, not a capability gap: `scan.ts` and `ban.ts` already treat `async` as a tail candidate, and the `exit` handler already owns the `wraps` rewrite for it.

## the question

is `async` a matcher tail, and if so, does the one-discipline check still hold? a tail `async` marks the body `promises`, so a body that also answers with `ok`/`err` or `return` is refused by the existing check. the fix must not weaken that.

## what this session must produce

- the fix: `async` joins the tail lists and dispatches to `exit`, and the matcher-tail guards for `async` are removed. the guards that refuse `=> async` (after an arrow answer) and an exit inside an arrow body stay, because those are different mistakes.
- an `emit.spec` case pinning `x ?err async 1` to `return Promise.resolve(1)`, and the discipline interaction (a tail `async` in a body that answers with `ok` is refused).
- the `async` deck extended to a tail use.
- the docs corrected: the tutorial's tail list gains `async`, and `DESIGN.md`'s "async for bodies" gains the tail.

## in scope

- the tail dispatch in `../src/emit.ts`.
- `../src/emit.spec.ts` for the pinning cases.
- `../constructs/async.spec.tz`, the deck.
- `../TUTORIAL.md` and `../DESIGN.md` for the reading.

## out of scope

- the build (now session 15).
- any new construct.

## inputs

- `../src/emit.ts`, the matcher and tail handlers, and `wraps`.
- `../src/emit.spec.ts`, the existing exit and tail cases.
- `../constructs/async.spec.tz` and the roadmap.
- `../../AGENTS.md` and `../../STYLE-KB.md` before writing anything.

## steps

1. reproduce each exit as a tail, and record where `async` diverges.
2. add `async` to the tail lists and remove the matcher-tail guards, keeping the `=>` and arrow-body guards.
3. pin the output with emit cases, extend the deck, run the chain.
4. correct the docs.

## acceptance

- `x ?err async 1` compiles and emits `return Promise.resolve(1)`.
- a tail `async` in a body that answers with `ok`/`err` is still refused.
- the `async` deck exercises a tail.
- `npm test` in `tz/` is green and the root suite stays green.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/14-the-async-tail.md`. `async x` emits `return Promise.resolve(x)`, so it is an exit and every exit is a matcher tail; the emitter refuses it in five places and omits it from three tail lists. add it to the tails, remove the matcher-tail guards while keeping the `=>`-answer and arrow-body guards, pin the output, extend the deck, and correct the tutorial and design. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/14-the-async-tail.md` before starting.
