# 21 the `if` ban

phase: truth
status: planned
resolves: the `if` overlap

## why

`switch` is already banned and `if` is not, yet every `if` is replaceable by a side quest and the language does not need a second spelling for the same shape. the overlap is the last documented ban that is not enforced: the pass refuses an `else` after an `if` statement (`TZ0001`, `else after an if statement is refused; the funnel is the flow`) and lets the `if` itself through, so the language says two things about the same construct and only one of them is checked.

the line the ban draws is narrow. the side-quest statement's `else` arm is the replacement, not the thing refused, so it stays: `cond ? { ... } else { ... }` is exactly the two-sided statement an `if`/`else` was reaching for, and `DESIGN.md` already refuses the `else` only when it follows a bare `if`. the session bans the `if` statement and touches nothing else.

## what this session must produce

- `if` added to the refused words with its replacement, in `src/typecore.ts`.
- an emit spec pinning the refusal and the side-quest statement form that replaces it.
- the sweep of the decks, the examples and the docs that still write an `if` (the clamp funnels, the spec guard clauses).

## in scope

- the `if` statement ban and its spec.
- the sweep of every `if` in the showcase and the teaching docs.

## out of scope

- the side-quest statement's `else` arm, which stays: it is the replacement for the banned `else`, not the thing being banned.
- the `else` after an `if` statement, already refused by the pass.
- any other construct.

## inputs

- `../roadmap.md` (the `if` overlap, ruled in session 08, and the ledger).
- `../src/typecore.ts` (the refused table), `../src/ban.ts` (the pass).
- `../src/emit.ts` (the `else`-after-`if` refusal already lives there).
- `../TUTORIAL.md`, `../DESIGN.md` (the statement forms, the refusal table).
- `../constructs/`, `../examples/` (the `if` the sweep removes).
- `../plan/context/08-the-teaching-dissertation.md` (the ruling and the blast radius).

## steps

1. add `if` to the refused table with its replacement, the side quest.
2. pin the refusal and the side-quest statement form with an emit spec, so the `else` arm stays proven.
3. sweep every `if` from the decks, the examples and the docs.
4. verify: `npm test` at the root and in `tz/`, `tzc` and `tzd`.

## acceptance

- a statement `if` is refused with its replacement, and a side-quest statement with `else` still compiles.
- no deck, example or doc writes an `if`.
- `npm test` is green at the root and in `tz/`, and `tzc` and `tzd` are clean.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the session 08 context, and this file. copy `session-context-template.md` to `context/21-the-if-ban.md`. ban the `if` statement, keep the side-quest statement's `else` arm, pin both with an emit spec, and sweep every `if` from the showcase and the docs. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/21-the-if-ban.md` before starting.
