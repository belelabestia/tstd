# 05 scratch, the showcase working context

## intent

make the showcase honest, then irreducible. `../../README.md` claimed `scratch/` showed every construct and both commands ran over it; the claim was false twice. the `remote` fixture in the spec failed, and the cause was not the `data:` url the roadmap suspected but a torn-off method (`remote` emitted `call.async(res.text)`, so `this` was lost and the call threw); separately, six constructs in the `roles` list of `../../src/emit.ts` were never reached by the running spec, and `make` was missing from the README's own list. the author ruled the reorganization: `scratch/` becomes `examples/` (whole programs, one spec), and a new sibling `constructs/` holds one deck per construct, a `spec.tz` of simple use cases with walkthrough comments, run by the same test chain. this session repairs the fixture, writes all 22 decks, wires a coherence check that requires a deck per role, and rewrites the README claim.

## inputs

- `../../scratch/<file>.tz` and the emitted `.ts`, renamed to `../../examples/`, to see what ran and what the emitter produced.
- `../../src/emit.ts` roles list, the vocabulary the decks are measured against.
- `../../src/coherence.spec.ts`, which caught doc drift and construct-to-spec drift but never a missing deck.
- `../../README.md:61`, the false claim, and the construct list at lines 47 to 59.
- `../../TUTORIAL.md`, for the exact shape of every construct, since each deck must be faithful.
- `../../src/highlight.spec.ts` and `../../src/lsp.spec.ts`, which name example files by path.
- `../../../AGENTS.md` and `../../../STYLE-KB.md` before writing anything.

## decisions

- 2026-09-21. **the `remote` failure is the o8 trap, not a `data:` limitation.** node 24 fetch returns 200 for `data:text/plain,hi`, `data:application/json,{"a":1}` and `data:text/plain,oops`; probed directly, `call.async(res.text)` returns `err TypeError: Illegal invocation` while `call.async(() => res.text())` returns `ok`. the fix wraps the torn-off method, and the extra `.value` reads the boxed survivor of the coloned refusal. rejected: replace the fixture with a local fake (the boundary is the point of `call`, so exercising it against the real fetch is worth keeping, and the fixture was never broken by the url).

- 2026-09-21. **two folders: `examples/` and `constructs/`.** `scratch/` is renamed to `examples/` (whole programs that solve a problem, with `examples/signup.spec.tz` as their spec); `constructs/` is a sibling holding one deck per construct. the split keeps "real-world scenarios" and "use cases for each construct" from mixing, which was the author's objection to a single folder. rejected: a flat `scratch/` with a `deck-` name prefix (the author wants directories); `decks/` beside `scenarios/` (the author named `constructs/` and `examples/`).

- 2026-09-21. **a deck is a `.spec.tz`, like a tstd spec.** node:test, flat `test()` calls, a `/* */` walkthrough essay at the top, small examples, second-person narration above the lines, capability sentences as names. this reuses the existing test chain (`node dist/tzx.js --test constructs/**/*.spec.tz examples/**/*.spec.tz`), so no new framework and no new script. rejected: a plain `.tz` demo run by `tzx` with no assertions (a demo cannot fail the build); a module plus a spec per construct (double the files for no gain).

- 2026-09-21. **all 22 decks land in this session.** the roles list is the vocabulary, so every role gets a deck now, and the "every construct" claim becomes true in one move. rejected: deck only the six uncovered constructs and defer the rest (the claim stays partial and the backlog grows).

- 2026-09-21. **the roles list carries the deck name.** a `deck` field on each role makes the vocabulary and the deck set one source: `coherence.spec.ts` asserts every role's `<deck>.spec.tz` exists and contains the role's `match`, so deleting a deck or dropping a construct from a deck fails the build. rejected: infer the filename from the construct name (`? {}` and `=>` do not spell as filenames).

- 2026-09-21. **the `?!` exit defect is filed, not fixed here.** `cond ?! err 'a'` emits `if (cond === false) err 'a';`, an unreWritten `err`, while the equivalent `cond ? err` and `cond ?== false err` rewrite correctly. the deck uses `?!`'s working forms (a bare trigger and `cond ?! return`) and the defect goes to the ledger for its own session. rejected: fix it in this session (it is an emitter bug in the `?!` tail path, outside a showcase session, and a rushed fix risks the stable emit).

## evidence

- the failure is not `data:`: node 24 fetch returns 200 for all three data urls; `call.async(res.text)` returns `err TypeError: Illegal invocation`, `call.async(() => res.text())` returns `ok`.
- roles with no occurrence anywhere in `scratch/*.tz` before: `make`, `break`, `?(cond)`. roles present but never reached by the running spec: `scope`, the `protocol` factories, `async`.
- every deck runs clean: 22 `constructs/*.spec.tz` exit 0 individually and under the chain.
- `npm test` (tz): exit 0, 65 src pass and 53 scratch pass (22 decks, 13 examples, the coherence checks). was exit 1 with 12 pass 1 fail.
- `npm test` (root): exit 0, 43 pass.
- `tzc examples constructs`: exit 0. `tzd examples constructs`: exit 0, no note.
- the new coherence checks fail when a deck is missing, when a deck does not contain its construct, and when an example file disappears.

## open

- `cond ?! err 'x'` emits an unreWritten `err`: the `?!` tail does not go through the `wraps` rewrite the `?` and `?==` tails do. found while writing the `not` deck; the deck uses the working forms. this wants its own session, with an emit spec and a doc note.
- `declare` inside a deck (for `?`) produces a false `TZL0002`, while `const` does not; the `?literal` deck uses `const`.
- a doc comment inside a `?` tail (`x ? //c\n log(x);`) loses the comment and becomes a semicolon; found while drafting `not.spec.tz` and avoided.

## the author's notes at close

the author raised three things while reviewing this session, and each now has a home:

- **the comment channel is a living protocol, not a phase.** he will always leave comments in the code and sweep them periodically; that is the no-debt approach. session 06 is reframed from "close the comment channel" to "the comment protocol", and the roadmap carries a `## the comment protocol` section as the standing shape until 06 writes it in full.
- **mixed feelings about `form`.** the concrete charge: some code is emitted, some is written by hand, and the line is arbitrary. scheduled as q8, session 14, an audit first. a `protocol` note may follow from the same reading and would take its own ledger entry.
- **a `test` keyword like zig's**, in the file it tests, reaching module internals; the author hedges on feasibility. scheduled as q9, session 15, an exploration with a compiled probe and a house-rule amendment.

## close

- commit: `rename the showcase to examples`, `add a deck per construct`, `require a deck for every role`, `fix the fetched payload fixture`, `state the showcase in the readme` (one decision per commit).
- `../../UPDATES.md` entry: `## 2026-09-21: a deck for every construct`
- roadmap: session 05 flipped to done, the `?!` defect added to the ledger.
