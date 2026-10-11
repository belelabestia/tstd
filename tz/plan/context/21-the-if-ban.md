# 21 the `if` ban working context

## intent

close the last documented ban that is not enforced. `switch` is refused and `if` is not, yet every `if` is a side quest, so the language says two things about the same shape and checks only one of them. the session adds `if` to the refused table, retires the emitter's now-dead `if`-expression refusal so there is one refusal and not two, keeps the side-quest statement's `else` arm (it is the replacement, not the thing refused), pins the refusal and the replacement with an emit spec, and sweeps every `if` from the decks, the examples and the teaching docs.

## inputs

- `../sessions/21-the-if-ban.md` (the charge, the acceptance).
- `../context/08-the-teaching-dissertation.md` (the ruling, the blast radius).
- `../roadmap.md` (the `if` overlap, the ledger).
- `../src/typecore.ts` (the refused table), `../src/ban.ts` (the pass).
- `../src/emit.ts` (the `if`-expression refusal and the `else`-after-`if` refusal).
- `../TUTORIAL.md`, `../DESIGN.md` (the statement forms, the ban table).
- `../constructs/`, `../examples/` (the `if` the sweep removes).
- `../../AGENTS.md`, `../../STYLE-KB.md` (voice and rules).

## decisions

- **2026-10-12. the ban is one table row, and the emitter's own `if`-expression refusal retires with it.** `emit` runs `ban` before the walk, so once `if` is in `refused` the emitter's `conditional` check is unreachable; leaving it would be a second refusal for one word, exactly the overlap the session removes. `if: 'a side quest'` joins the table and the `conditional` helper and its call site are deleted. rejected: leaving the emit check in place (two refusals for `if`, one of them dead, and a reader cannot tell which is live).

- **2026-10-12. the sweep replaces each `if` with the side quest its shape asks for.** the clamp funnels (`examples/signup.tz`, `constructs/return.spec.tz`, the tutorial) become `n ?< 0 return 0; n ?> 100 return 100;`, and the spec guard clauses (`constructs/form.spec.tz`, `examples/signup.spec.tz`) become `form.model(raw, user) ?! assert.fail();`. the emitted code is the same `if (cond) ...`, so narrowing survives; verified by compiling, not by reading.

- **2026-10-12. the assignment-as-expression spec changes its vehicle from `if` to `while`.** the case `if (a = n) return a;` proved an assignment read as a condition is refused; with `if` banned the ban fires first, so the case now reads `while (a = n) a = a - 1;`, which reaches the same `expressed` check in a condition position that is still legal. rejected: dropping the case (the rule would lose its only condition-position proof); a call argument (`g(a = n)`), which is a different position than the one the original case covered.

- **2026-10-12. the ban list in `DESIGN.md` and `tz/AGENTS.md` gains the row.** the docs are the product, so the teaching table and the contract both name `if` with its replacement, and the contract drops the "not enforced yet" sentence it carried since session 17.

- **2026-10-12. the reader's vocabulary matches the language, so `if` leaves `scan.tails` and `check.heads`, and `new` leaves `scan.words`.** a banned construct is not the reader's job to special-case: the precedent is `switch`, which `scan` and `check` do not mention anywhere. `if` in `tails` only shaped a braceless `if` body and `frames.last`, and `if` in `heads` only skipped a statement the checker never sees (it runs on accepted files only), so both are dead now. `new` in `words` was inert (`new {` is not a shape), and `git blame` puts the entry in the original prototype commit, so it was a leftover from the first keyword list, not a rule. verified by the full suite and by recompiling the refusal. rejected: keeping them because the scanner runs before the ban, since the scan output for a refused file is discarded (ban returns at the `if` token; `smell` reads only `before` and `after`; `check` never runs on a refused file).

## evidence

- `npm test` (root): exit 0, 44 pass.
- `npm test` (tz): exit 0, 70 src plus 56 decks and examples.
- `tzc examples constructs`: exit 0.
- `tzd examples constructs`: exit 0.
- the refusal, compiled: a scratch file with `if (n < 0) return 0;` gives `TZ0001: if is refused; use a side quest`, exit 1.
- the replacement, compiled: a scratch file with `cond ? seen.push('yes') else seen.push('no');` is exit 0, so the side-quest statement keeps its `else`.
- the sweep, grepped: no `.tz` file writes an `if`; no doc line starts a tz code block with `if (`.

## open

none. the `else` after an `if` statement stays refused (now unreachable for that shape, still the sentence for a bare `else`), and the side-quest `else` arm is untouched, both as the session's out of scope states.

## close

- commits (planned; the author reviews before any of them land):
  - `ban the if statement` (`tz/src/typecore.ts`, `tz/src/emit.ts`, `tz/src/emit.spec.ts`)
  - `trim the reader vocabulary` (`tz/src/scan.ts`, `tz/src/check.ts`)
  - `sweep the ifs` (`tz/examples/`, `tz/constructs/`, `tz/TUTORIAL.md`, `tz/DESIGN.md`, `tz/AGENTS.md`)
  - `record the if ban` (`tz/plan/context/`, `tz/UPDATES.md`, `tz/STATUS.md`, `tz/plan/roadmap.md`)
- `../UPDATES.md` entry: `## 2026-10-12: the if ban`
- roadmap: session 21 flipped to done; status dashboard: sessions 18/24, truth 8/10.
