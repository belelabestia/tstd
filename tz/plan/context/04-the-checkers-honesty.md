# 04 the checker's honesty working context

## intent

make `TZL0003` honest. `tzd scratch` was exiting 0 while emitting 65 warnings, and every one was false: the dropped-value check shipped at its untyped fallback, where any naked expression statement with no tz head read as a drop. this session measures that rate, takes the author's ruling (type the check now; warn on any non-none value), moves the dropped-value path behind the interim checker, and makes the code, `../DESIGN.md` and `../UPDATES.md` say the same thing.

## inputs

- `../src/lsp.ts`, the dropped-value path at its untyped fallback (`checkVoid`), and the session that shells out to `tsc`.
- `../src/check.ts`, the checker seam (`behind`, `openCheck`) and the two checks that already read types.
- `../src/check.spec.ts` and `../src/lsp.spec.ts`, the checker and editor specs.
- `../src/ban.ts`, `../src/scan.ts`, `../src/emit.spec.ts` for the assignment ruling.
- `../scratch/*.tz` and the `.tzd` mirrors, to measure false positives and type the drops.
- `../DESIGN.md` lsp section, `../UPDATES.md` 2026-09-14 checker entry.
- `../../AGENTS.md` and `../../STYLE-KB.md` before writing anything.

## decisions

- 2026-09-21. **type the dropped-value check now; do not withdraw it.** the interim surface already types `TZL0002` and `TZL0004`, so the seam exists and the stable 7.1 swap rewrites one module either way. a check that says nothing costs nothing but teaches nothing; the fix is to make it right. rejected: withdraw `TZL0003` until 7.1 (loses a documented check for a surface change the seam already absorbs).

- 2026-09-21. **the predicate is any value that carries something.** `TZL0003` resolves the dropped expression and warns unless the type is none (`void`, `undefined`, `null`, `never`). the author's reason: a branched result must never be lost silently, so every discard is explicit. rejected: warn only on `Result` (the rule is about the discard, not about one product); spare `Promise<void>` (author: "warn on any expression; if it goes `void test(...)`, so be it").

- 2026-09-21. **a bare assignment is a statement, so the check spares it; `ban` refuses it as an expression.** `void` binds tighter than `=`, so `void claimed[id] = true` is a syntax error and the only spelling is `void (claimed[id] = true)`. instead, `expressed` refuses an assignment that is not the outermost operation of a statement: `a = b = 2`, `if (a = n)` and `f(a = n)` are refused, while `a = n`, `o.x = 1`, `for (let i = 0; ...)`, a default parameter and any assignment inside a declaration pass. rejected: parenthesised `void` (unreadable, and the rule is about the value being incidental); leave the assignment totally unflagged (then "statement, not a value" is a wish, not a rule).

- 2026-09-21. **the mirror opens a widened project.** `lsp.ts` writes `.tzd/tsconfig.json`, extending the workspace config and including `**/*.ts`, and passes it to `openCheck`. measured: opening the workspace config alone left `.tzd` mirrors in an inferred project with no `node:` types, so `test` and `assert` were error types; the widened project resolves them, and a `test(...)` promise is seen. rejected: stay on the inferred project (the check would be silent exactly where the author wanted truth); generate the config inside `check.ts` (`lsp.ts` already owns the mirror, so it writes the config beside it).

- 2026-09-21. **the quest skip is depth-aware.** a matcher nested inside a call's arguments no longer silences the dropped call, so a `test(...)` callback full of quests is still a drop. rejected: keep the whole-statement skip (it hid all thirteen `test(...)` drops, which is why the old count was 56 and not 65).

- 2026-09-21. **the showcase voids its true positives.** after the fix `tzd scratch` shows fifteen: thirteen `test(...)`, one `ping(...)`, one `out.push(...)`. the author voids them rather than leaving warnings, so the showcase conforms to the rule it demonstrates. rejected: leave them as explained true positives (the acceptance allows it, but the showcase should model the discipline).

## evidence

- the false-positive measurement, before: `node dist/tzd.js scratch` printed 65 lines, `signup.spec.tz` 56 (13 `test`, 43 `assert.*`), `main.tz` 5 and `fallback.tz` 2 (`console.log`), `load.tz` 1 (`claimed[id] = true`), `signup.tz` 1 (`out.push(row)`). zero true positives under the stated rule.
- feasibility, probed over `.tzd/scratch`: `getTypeAtPosition` at the callee end resolves a call's return type (`out.push` -> `number`, `console.log` -> `void`, `test` -> `Promise<void>`, `ping` -> `boolean`), and the widened project is what makes `node:` resolve; the inferred project returned the error type for `test` and `assert`.
- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 1; 63 src pass (was 62, plus the assignment and drop cases), 13 scratch with 12 pass and the one pre-existing remote fixture at `scratch/signup.spec.tz` (session 05).
- `tzc scratch`: exit 0. `tzd scratch`: exit 0, no note. `tzx` spec: fails only on the session-05 fixture.

## open

- `loud(x ? {...})` in `scratch/chains.tz` drops a string but stays silent: the emitter hoists the nested quest, so the call moved off its source line and the line-keyed probe never finds it. a whole-file search would fix it but risks matching a declaration's position, so the check says nothing rather than guessing. a true positive left unreported.
- the probe matches the callee by line identity and source text, so any statement the emitter moves across lines is silent; a future session could map with the anchors instead.

## close

- commit: `type the dropped value check`, `refuse assignment expressions`, `void the showcase drops`, and the docs with them (one decision per commit).
- `../UPDATES.md` entry: `## 2026-09-21: the checker tells the truth`
- roadmap: session 04 flipped to done, q2 ruled.
