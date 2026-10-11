# 23 under pressure

phase: pressure
status: planned
resolves: q17, q18, q19, q20
blocked by: 17

## why

the guide is only as good as the programs an agent can write from it, and session 17 proved the method: a cold agent, pointed at `AGENTS.md` alone, reaches a program `tzc` accepts and, on the way, shows exactly where the language fights back. that data is the product, so the pass runs on the sessions that move the language and this one works the first batch it filed.

## what this session must produce

- each of q17 to q20 fixed or ruled, one commit each.
- the pass run again after the fixes, to confirm the traps are gone.

## in scope

- the four ledger items: the boundary's direct form (q17), a quest inside a `? {}` arm (q18), a tag written against a union-typed target (q19), a promise-returning resource method (q20).
- `tstd` where a fix lands there, since `call` and `branch` are its modules.

## out of scope

- new constructs beyond what the fixes need.
- the work of sessions 18 to 22.

## inputs

- `../context/17-onboard-agents.md` (the first passes and their findings).
- `../AGENTS.md`, `../../AGENTS.md` (the contract and the working rules).
- `../src/emit.ts`, `../src/ban.ts` (where a diagnostic or a rewrite lands).
- `../../../src/` (`tstd`: `call`, `branch`, `Union`).
- `../TUTORIAL.md`, `../DESIGN.md` (the teaching, if a fix changes it).

## steps

1. reproduce each of q17 to q20 with a cold agent, and confirm it still holds.
2. rule on each: fix it, or document it and close the item with the reasoning.
3. land the fixes, one commit each.
4. run the pass again, and file whatever the next batch is.

## acceptance

- each finding is fixed or ruled, the reasoning in the context file.
- a cold agent reaches a program `tzc` accepts without hitting any of the four.
- `npm test` is green at the root and in `tz/`, and `tzc` and `tzd` are clean.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the session 17 context, and this file. copy `session-context-template.md` to `context/23-under-pressure.md`. reproduce each of q17 to q20 with a cold agent, rule on each, and land the fixes one commit at a time. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/23-under-pressure.md` before starting.
