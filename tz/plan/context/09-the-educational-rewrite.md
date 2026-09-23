# 09 the educational rewrite working context

## intent

the tutorial teaches rules capably and the author's taste not at all. this session executes the organization session 08 settled: the teaching is language-first, the genesis moves to `DESIGN.md`, the constructs split by leakiness, and the prose turns educational and journalistic, carrying the reason behind each choice. no rule changes, only how it is explained. the stake is the one the swept prompt named: a language exists if people use it, and a reader should feel the pull toward this design, not merely follow its rules.

## inputs

- `../sessions/09-the-educational-rewrite.md` (the charge and the acceptance).
- `../context/08-the-teaching-dissertation.md` (the endorsed organization and the rulings).
- `../../TUTORIAL.md` and `../../DESIGN.md` (the two files rewritten here).
- `../../README.md` (the door the tutorial assumes).
- `../../../README.md` and `../../../STYLE-KB.md` (the `tstd` principles and the prose voice).
- `../../src/coherence.spec.ts` (the constraints the prose must satisfy).
- `../../UPDATES.md` (the journal; out of scope, keeps its voice).

## decisions

- 2026-09-22. **the tutorial is language-first, and the genesis leaves it for `DESIGN.md`.** the new opening states the formula (a ts subset, a few constructs, `tstd` as the standard library, transpiled back), frames the c# analogy and deprecation by default, and points at `tz/README.md` for the quickstart. `where we come from` and `how things are in typescript` move to a new `## where we come from` in `DESIGN.md`, as the why. this is session 08's ruling, executed. rejected: leaving a compressed genesis in the tutorial (the reader came for the language), and putting the genesis in the readme (the readme is the door, not the why).

- 2026-09-22. **the lowered core leaves the tutorial; the bond replaces it.** session 08 says the lowered core appears only as what a construct replaces, in the decks and `DESIGN.md`, and the docs never say "x writes y under the hood". so the `which emits ...` transcriptions are gone from the tutorial, along with the `form` derived-`.ts` block, the `protocol` `$result`/`Result`/`result` scaffold table, and the payload depth-count sentence. each leaky construct instead marks its bond as this module, these members (`scope.sync`, `protocol.init`/`Union`, `form.ts`, `call.sync`/`call.async`, `make`). rejected: keeping the transcriptions (a two-language transpiler tour, which 08 refused).

- 2026-09-22. **the construct matrix moves to the end, and the exits, side quests, and `try` are the closed block before the leaky ones.** the order is session 08's: what tz is, the vocabulary, what tz takes away, the closed constructs (exits, arrow capture, side quests, `try`), the leaky constructs (`scope`, `protocol`, `form`, `call`, `make`), the whole pipeline, the matrix. the old `scope, honestly` pointer folds into one closing line. rejected: leaving the matrix mid-document (it is reference, and 08 put it last).

- 2026-09-22. **`using` joins the coherence prose whitelist.** the c# analogy backticks `using` the way `try`/`finally` are backticked, and the walk flagged it: one foreign keyword the docs legitimately name. rejected: unbackticking it (it is code), or a comment-side exception (the whitelist exists for exactly this).

- 2026-09-22. **the line budget is 578, inside 08's 550 to 580 target.** the genesis removal and the emit-transcription removal paid for the leaky bonds and the new framing, so the tutorial shrank from 663 to 578 rather than growing. `DESIGN.md` grew from 226 to 248, all of it the genesis. rejected: reusing the freed lines to expand the leaky sections (the target is reviewable documentation, not volume).

- 2026-09-22. **the formula becomes "a superset of a subset of typescript, with its own standard library, out of the box".** the author retired the carried-forward "typescript with most of typescript taken away" line: tstd is the seed that carries every principle and works in plain typescript, and tz is the language built to optimize that usage past what typescript alone reaches. applied to `TUTORIAL.md` and `DESIGN.md`. rejected: keeping the old formula (its read is sugar over typescript, the framing 08 rejected).

- 2026-09-22. **an exit's value clause is narrowed, and "not in the language" becomes "plain typescript".** `return`, `err` and `ok` carry a value when one is named; `break` and `continue` only leave. the partition sentence now says anything that is none of the three forms is plain typescript, left as it is. both applied to `TUTORIAL.md` and `DESIGN.md`. rejected: leaving "an exit carries a value" (it reads `break` and `continue` into carrying) and "it isn't in the language" (too strong: the base is typescript).

- 2026-09-22. **the library side is warned, not banned, and the warning becomes real work.** the language spellings are banned; the library spellings (`protocol.init`, `branch`, `result.ok`, `scope.sync`, `call.sync`, `make`) are warned by the editor, a word of their own rather than "deprecated". the `tzd` smell warning that 08 ruled is no longer intent: it is scheduled. rejected: softening the docs to "by convention" (the author wants the warning built).

- 2026-09-22. **the base subset gets a session, moved ahead of the battle phase.** both `tstd` and tz sit on a nameless subset of typescript; the author names it **corescript**, with `cts` only a candidate extension. no extension is spent: `.cs` collides with c#, `.cts` with typescript's own CommonJS flavour, and the subset is a profile, so files stay `.ts`. the idea: ship the ban list as the eslint ruleset the readme promised, so plain typescript can be held to the base, and tz bases on the base with a defensive pass. the session also settles whether `tstd` reads as "typescript with the ruleset baked in", lands the enforcement split, the gradient vocabulary and the smell warning. it is session 10; sessions 10 to 17 shifted to 11 to 18. rejected: numbering it 18 with a "high priority" label (the label would lie at that distance); spending `.cs` or `.cts` on an extension (both are taken).

## evidence

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 65 src pass plus 54 decks and examples pass.
- `tzc examples constructs`: exit 0.
- `tzx` spec (every deck plus `examples/signup.spec.tz`): exit 0, 54 pass.
- `tzd examples constructs`: exit 0.
- `coherence.spec.ts`: 6 pass, exit 0 (every backticked identifier known, every role claim matching, every construct with a spec, a deck, and a `DESIGN.md` mention).
- line budget: `TUTORIAL.md` 578 lines, inside 550 to 580; `DESIGN.md` 248.

## open

- the base subset's name is corescript, ruled in review, but the docs still say "plain typescript" as a placeholder; session 10 applies the name and settles whether `tstd` reads as "typescript with the ruleset baked in".
- the editor smell warning is scheduled as real work in session 10, so the tutorial's "warned by the editor" line describes the design, not yet the shipped `tzd`.
- the voice is the author's after review; the structure executes 08 and the wording rulings are in.

## close

- commits:
  - `rewrite the tutorial language-first` (`TUTORIAL.md`)
  - `move the why into the design notes` (`DESIGN.md`, `README.md`, `tz/README.md`, `src/emit.spec.ts`, `src/coherence.spec.ts`)
  - `plan the core subset` (`plan/sessions/` the new 10 and the 10 to 17 shift, the prompt path sweep, `plan/context/09-the-educational-rewrite.md`)
  - `close the educational rewrite` (`plan/roadmap.md` session 10 and the 09 status, `UPDATES.md`)
- `../../UPDATES.md` entry: `## 2026-09-23: the educational rewrite`
- roadmap: session 09 flipped to done; session 10 added; sessions 10 to 17 shifted to 11 to 18.
