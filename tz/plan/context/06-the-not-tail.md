# 06 the not tail working context

## intent

`cond ?! err 'x'` emits an undeclared `err`, while `cond ? err` and `cond ?== false err` rewrite through `wraps`. the session reproduces every `?!` tail form, finds where the landing tail skips the rewrite, fixes it without touching the working forms, pins the emitted output with an emit case, and extends the `not` deck to the tail it used to avoid.

## inputs

- `../../src/emit.ts`, the matcher and tail handlers, to trace where `?`/`?==` reach `wraps` and `?!` does not.
- `../../src/scan.ts`, the statement-start pass, since the tail token has to be a statement start for the exit pass to see it.
- `../../src/emit.spec.ts`, the existing quest cases, for the pinning shape.
- `../../constructs/not.spec.tz`, the deck that avoids the defect.
- `../../TUTORIAL.md` and `../../DESIGN.md`, to check whether the shipped reading was already right.
- `../../../AGENTS.md` and `../../../STYLE-KB.md` before writing anything.

## decisions

- 2026-09-22. **the defect is a statement-start, not a tail rewrite, so it is fixed in `scan.ts`.** the bare `?!` is lexed as `?` then a glued `!`. in `scan.ts` the `?` sets `start = true` (line 375), and the very next token, the `!`, consumes it (line 347): `starts[!] = true`, then the punct branch skips on, leaving `starts[err] = false`. for bare `?` the token after the `?` is the tail itself, so `starts[err] = true` and the later `exit` pass rewrites it. the fix makes the glued `!` of a bare quest transparent to the statement-start state, so the start lands on the token after it, exactly where `?` puts it. rejected: patching `declining` to rewrite a `?!` exit tail in place (it duplicates the `wraps` logic, and it leaves `frames[at].fallible` and `.answers` unset because both key off `starts` too: the symptom would move, not close); treating `?!` as a single two-character token in the lexer (a wider change to the token stream than the defect needs, and the deck and grammar already read `?` and `!` apart).

- 2026-09-22. **the shipped reading was right, so the docs get a note, not a fix.** `TUTORIAL.md` already says a bare `?` means `?== true` and `?!` means `?== false`, and `DESIGN.md` already has `?!` in the side-quest family. the emitter was the liar, not the prose. a clause is added to each saying a `?!` heads the same tail family, with `cond ?! err 'x'` landing the error `cond ? err` does. rejected: rewriting the quest section (that is phase 1 work, sessions 08 and 09).

## evidence

- repro before the fix, `node dist/tzc.js --no-check`:
  - `cond ? err 'x';` -> `if (cond === true) return result.err('x');`
  - `cond ?== false err 'x';` -> `if (cond === (false)) return result.err('x');`
  - `cond ?! err 'x';` -> `if (cond === false) err 'x';` (the defect)
  - `cond ?! ok 'x';` -> `if (cond === false) ok 'x';`
  - `cond ?! return 'unset';` -> `if (cond === false) return 'unset';` (a working form)
  - `cond ?! log('down');` -> `if (cond === false) log('down');` (a working form)
  - `cond ?! { ... }` -> unchanged, a working form.
- the scan dump confirmed the cause: `starts[err] = true` for `? err` and `starts[err] = false` for `?! err`, with `starts[!] = true`.
- repro after the fix:
  - `cond ?! err 'x';` -> `if (cond === false) return result.err('x');`
  - `cond ?! ok 'x';` -> `if (cond === false) return result.ok('x');`
  - `cond ?! return 'unset';`, `cond ?! log('down');`, `cond ?! { ... }` all byte-identical to before.
- `npm test` (tz): exit 0, 65 src pass and 54 decks/examples pass (was 65 and 53; the `not` deck gains one test).
- `npm test` (root): exit 0.
- `tzc examples constructs`: exit 0. `tzd examples constructs`: exit 0.
- `node dist/tzx.js --test constructs/**/*.spec.tz examples/**/*.spec.tz`: exit 0.

## open

nothing. the two other emit findings session 05 filed (q10 the deck `declare` false positive, q11 the tail comment) stay unassigned, untouched.

## close

- commit: `fix the not tail` (scan.ts, emit.spec.ts, not.spec.tz), `note the not tail in the docs` (TUTORIAL.md, DESIGN.md). one decision per commit.
- `../../UPDATES.md` entry: `## 2026-09-22: the not tail lands its value`
- roadmap: session 06 flipped to done; q7 resolved.
