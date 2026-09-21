# 06 the not tail

phase: truth
status: planned
resolves: q7

## why

`cond ?! err 'x'` does not emit what the language says. the docs and the deck promise `?!` the same tail family as `?` and `?== false`: the condition tests, and the tail is an exit, a block, or an `=>` answer. the emitter agrees for every tail but one. `cond ? err` and `cond ?== false err` rewrite `err` through `wraps` into `return result.err(...)`, while `cond ?! err 'x'` emits `if (cond === false) err 'x';`, an `err` javascript never declared.

found while writing the `not` deck in session 05. the deck routes around it: it uses `?!`'s working forms (a bare trigger and `cond ?! return 'unset'`) and never exercises a `?!` tail that lands a value. so the construct reads one way and emits another, and the build stays green because nothing runs the broken spelling.

## the question

is the hole the `?!` tail only, or the whole tail path? the fix must keep `?!` reading as the negation of `?`, the rule the side-quest work established, while routing its landing tails through the same `wraps` rewrite every other quest uses.

## what this session must produce

- a minimal reproduction, with the emitted javascript for each `?!` tail form.
- the fix, so every `?!` tail that lands a value rewrites through `wraps` the way `?` and `?==` do.
- an `emit.spec` case pinning the emitted output for a `?!` tail that lands a value and for the working forms, so the defect cannot return.
- the `not` deck extended to the tail it now avoids.
- a note in `../TUTORIAL.md` and `../DESIGN.md` only if the shipped reading was already right; a doc fix if the reading itself was wrong.

## in scope

- the `?!` tail in `../src/emit.ts`.
- `../src/emit.spec.ts` for the pinning case.
- `../constructs/not.spec.tz`, the deck.

## out of scope

- the two other emit findings session 05 filed (q10, q11), which are not the tail.
- the tutorial reorganization and rewrite (sessions 08 and 09).

## inputs

- `../src/emit.ts`, the matcher and tail handlers.
- `../src/emit.spec.ts`, the existing quest cases.
- `../constructs/not.spec.tz` and the roadmap's q7 entry.
- `../../AGENTS.md` and `../../STYLE-KB.md` before writing anything.

## steps

1. reproduce each `?!` tail form and record the emitted javascript.
2. trace the tail path to the point where `?` and `?==` call `wraps` and `?!` does not.
3. fix it, keeping the negation reading and the locked-subject rule.
4. pin the output with an emit case, extend the deck, run the chain.

## acceptance

- `cond ?! err 'x'` emits a declared `err`, matching `cond ? err`.
- the `not` deck exercises a `?!` tail that lands a value.
- `npm test` in `tz/` is green and the root suite stays green.
- the fix changes only the broken tail, not the working forms.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/06-the-not-tail.md`. `cond ?! err 'x'` emits an undeclared `err`, while `cond ? err` and `cond ?== false err` rewrite through `wraps`. reproduce every `?!` tail form, find where the tail skips the rewrite, fix it without touching the working forms, and pin the emitted output with an emit case. extend the `not` deck to cover the tail. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/06-the-not-tail.md` before starting.
