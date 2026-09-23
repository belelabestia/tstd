# 07 the comment protocol working context

## intent

comments that carry forward work are a living channel, not a cleanup. this session writes the protocol for them: the markers, the channels they may sit in, how a sweep is scheduled, and how the coherence walk ignores a parked note on purpose. it then routes every parked note by that protocol, applies the postfix guard correction the author left at `../../DESIGN.md:164`, fixes the repetition note at `../../TUTORIAL.md:11`, and names the roadmap as the forward-work home (q3).

## inputs

- `../../TUTORIAL.md` (the two parked prompts at `:11` and `:17`).
- `../../DESIGN.md` (the postfix guard correction at `:164` and the voice prompt at `:187`).
- `../../src/coherence.spec.ts` (the html-comment blanking walk).
- `roadmap.md` (the forward-work home it proposes; its own parked note at `:16`).
- `../../../AGENTS.md` and `../../../STYLE-KB.md` (the comment rules the protocol lives inside).
- the parked notes in `../../constructs/*.spec.tz` and `../../examples/*.tz`, found by walking the tree.

## decisions

- 2026-09-22. **the markers are `#todo`, `#fixme`, `#prompt`; `# marco to agent` is retired.** the author wants a more organic channel: `todo` for a small task, `fixme` for a defect, and `prompt` for a note worth a whole session. all lowercase with the hash sigil, so one grep finds every note. rejected: keeping `# marco to agent` (the author ruled it out); bare `todo:`/`fixme:` (harder to grep, and the words appear in prose); uppercase `TODO`/`FIXME` (against the lowercase-everywhere rule).

- 2026-09-22. **a sweep runs at every session close, and it is a step of its own.** `how a session runs` gains a sweep before the close, so a note is a capture with a scheduled destination, not something carried in the author's head. rejected: sweeping at phase boundaries (notes age across a whole phase); an ad hoc sweep (that is the pre-protocol state the session exists to replace).

- 2026-09-22. **every parked note is routed tree-wide, and the note is removed once it lands.** step 1 says every parked prompt, and the six notes in the specs and examples are the same channel as the doc prompts. each route is do it now, a session, or the ledger. rejected: routing only the doc prompts (leaves six notes parked, against the sweep's whole point).

- 2026-09-22. **the coherence blanking stays, now deliberately.** a parked note names words the language does not own, and a reader should not meet it in a doc, so the walk blanks every html comment block on purpose. the comment now points at the protocol instead of describing a hack. rejected: blanking only the marker blocks (more machinery for nothing; any html comment in a doc is non-documentation, marker or not).

- 2026-09-22. **the postfix guard replacement is `const row = table[id] ?none return;`, and its prose is simplified.** the note is correct: `?none` reads presence, and the tail chooses the miss (exit, `ok`/`err`, a return value, or a capture), so the proposed postfix guard is the narrower spelling of a decision the language already carries. rejected: keeping the two-line `is.none(row) ?none return` replacement (the note prefers the one-liner and the tail's choice).

- 2026-09-22. **the remaining notes become ledger entries; the `?!` rewrite is applied.** the signup `?== false` becomes `?!` (session 06 already made `?! err` correct). the rest are not bounded fixes: q13 the useless `?(cond)` subject, q14 the effect against exit and value question, q15 the `? {}` subject type, and t1 the arrow deck coverage. rejected: applying the guard rewrite whose premise the author himself questions in the effect|exit|value note.

- 2026-09-22. **the `docs you own` principle is translated.** the note said the old wording meant nothing; the new line names the reader (`README.md`, `TUTORIAL.md`) and the rule (the plan is where planned work lands, not the docs). rejected: deleting the principle (it still governs phase 1).

## evidence

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 65 src pass plus 54 decks and examples pass.
- `tzc examples constructs`: exit 0.
- `tzx` spec (`node dist/tzx.js --test examples/signup.spec.tz constructs/**/*.spec.tz`): exit 0, 54 pass.
- `tzd examples constructs`: exit 0.
- no `<!--` remains in `README.md`, `DESIGN.md`, `TUTORIAL.md`; the blanking walk stays for future notes.

## open

nothing. q13, q14, q15 and t1 are routed and unassigned; q3 is resolved. the close step and the language fixes they imply are future sessions.

## close

- commits:
  - `write the comment protocol` (roadmap protocol, sweep step, principle, phase 1 blurb, ledger rename and q3, q13 to q15 and t1; coherence comment)
  - `route the parked notes` (TUTORIAL, DESIGN both prompt removals and the postfix guard correction, constructs, examples, sessions 08 and 09 noted as swept, session 09 keeps the "a language exists if people use it" intent)
  - `close the comment protocol session` (UPDATES, this context, the roadmap status flip)
- `../../UPDATES.md` entry: `## 2026-09-22: the comment protocol`
- roadmap: session 07 flipped to done; q3 resolved.
