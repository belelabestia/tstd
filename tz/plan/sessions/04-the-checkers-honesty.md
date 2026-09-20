# 04 the checker's honesty

phase: truth
status: planned
resolves: q2

## why

`tzd scratch` exits 0 but emits roughly sixty `TZL0003` warnings, and nearly all of them are false. they land on void-returning calls such as `assert.equal` and `test`, because the dropped-value check ships at its untyped fallback: any naked expression statement with no tz head reads as a drop. a checker that cries wolf on every assertion spends the trust the editor checks exist to earn.

the other two checks, `TZL0002` and `TZL0004`, are typed through the interim typescript surface and stay silent when they cannot pair a test back. this session decides the standard: a check either tells the truth or says nothing.

## the question

type the dropped-value check against the interim checker now, or withdraw `TZL0003` until the stable surface lands? the stable surface (typescript 7.1) is not here and its shape is promised to change.

## what this session must produce

- a ruling from the author.
- the code follows: either `TZL0003` reads the real type of a call and spares what returns `void`, or it ships off and `tzd scratch` is quiet.
- `../DESIGN.md` and `../UPDATES.md` say the same thing the code does.
- `tzd scratch` output reviewed line by line; every remaining warning explained.

## in scope

- `../src/check.ts`, the dropped-value path.
- the seam the checker sits behind, so a later swap to the stable surface is one module.
- the spec expectations in `../src/check.spec.ts`.

## out of scope

- `TZL0002` and `TZL0004`, beyond confirming they behave.
- completions, hover, goto, rename, and the in-memory keystroke loop; those wait on the stable surface.

## inputs

- `../src/check.ts` and `../src/check.spec.ts`.
- `../DESIGN.md`, the lsp section.
- `../UPDATES.md`, the 2026-09-14 checker entry.

## steps

1. measure the false-positive rate on scratch, precisely.
2. state the two candidate rulings. if typing is chosen, find whether the interim surface can resolve a call's return type reliably for this check.
3. implement the winner and re-run `tzd scratch`.
4. update the docs.

## acceptance

- `tzd scratch` is either clean or every warning is a true positive on a line a person would agree about.
- `npm test` in `tz/` is green.
- the lsp docs describe the shipped behavior.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/04-the-checkers-honesty.md`. `tzd scratch` emits dozens of false `TZL0003` warnings on void calls. measure the false-positive rate, present the choice between typing the check now and withdrawing it until the stable surface, then implement the author's ruling and make `tzd scratch` honest. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/04-the-checkers-honesty.md` before starting.
