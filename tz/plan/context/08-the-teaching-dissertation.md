# 08 the teaching dissertation working context

## intent

the tutorial teaches `tstd` before it teaches tz: `../TUTORIAL.md:5-37` opens with "where we come from" (typescript's overlap, the five `tstd` principles, the transpiler idea) and a whole section, "how things are in typescript", that shows no tz at all. the author questions whether that pretrains the reader on the library when they came to see the language. this session is a discussion: mark every place the tutorial teaches `tstd`, propose two or three organizations for the teaching docs, and settle one the author endorses. it produces a written design, not edits; session 09 executes it.

## inputs

- `../TUTORIAL.md` (read in full; 663 lines).
- `../DESIGN.md` (what is already explained where).
- `../README.md` (the entry point and what is here).
- `../../README.md` and `../../STYLE-KB.md` (the `tstd` side).
- `../../AGENTS.md` (the doc style rules).
- the author's stated taste: zig, comptime, `orelse`, `catch`, `try`.

## findings

the tutorial's teaching, sorted by whose material it is:

- **teaches `tstd`** (no tz construct): the whole of `where we come from` except the transpiler paragraph (`:5-25`), and the whole of `how things are in typescript` (`:35-37`), which only points at `../../README.md` and `../../src` specs.
- **teaches tz by naming its `tstd` target**: `scope` is sugar over `scope.sync` (`:372-409`), `protocol` over `protocol.init` (`:411-448`), `form` over `form.ts` (`:450-507`), `call` over `call.sync` (`:509-591`), `make` (`:593-621`). the sugar is the product; the target is the justification.
- **teaches tz alone**: `what tz takes away` (`:39-52`) onward, barring the tstd references above.
- **teaches neither**: `scope, honestly` (`:661-663`) is a pointer to the other docs.

so the braid is two chapters at the top (`:5-37`, about a third of the preamble) plus a `tstd` target named at every construct. a reader who came for the language meets 33 lines of library and style first.

## design

the one-page organization the author endorsed. session 09 executes it.

### the framing

tz is presented as a language with a standard library, 50 years from now, not as sugar over typescript. the lowered core (`ts` + `tstd`) never introduces a construct: it appears only as what a construct replaces, in the decks and `DESIGN.md`. the docs never say "x writes y under the hood"; a construct is a language feature.

### deprecation by default

the difference from c#: c# ships sugar and the old form as peers and blesses both; tz deprecates every construct it can replace. what the language owns is banned (`if`, `switch`, `?:`, `??`, the strict-equality spellings): the old form is gone. what the library owns (`protocol.init`, `branch`, `result.ok`, `scope.sync`, `call.sync`, `make`) cannot be banned, so it is deprecated by the editor (the `tzd` smell warning).

### the leakiness axis

constructs split by how much `tstd` shows through, and the docs render each class differently:

- **closed** (pure language): the side quests, arrow capture, the exit family, `try`. taught as a feature; a refactoring lookup table is reference, never the intro.
- **leaky** (bonded to a module): `scope` -> `scope.sync`, `protocol` -> `protocol.init`/`Union`, `form` -> the field triple, `call` -> `call.sync`, `make`. taught as a feature with the bond marked: this module, these members. `form` is the deepest leak.

### audience

- **the ts developer tired of the overlap**, first. tz is the tidy-up, and the reader arrives already convinced, so the docs show rather than argue.
- **the daily writer**, second; the matrix is the lookup.
- **the agent**: `../../AGENTS.md`, `../DESIGN.md`, the ban list.
- **the `tstd` reader**: `../../README.md` and the `../../src` specs.

### order

language first. the tutorial's sections:

1. what tz is: the formula (a ts subset, a few constructs, `tstd` as its standard library, transpiled back), and a pointer to `README.md` for the quickstart.
2. the vocabulary: exit, arrow capture, side quest.
3. what tz takes away: the refused spellings.
4. the constructs, closed first (exits, arrow capture, side quests, `try`), then leaky (`scope`, `protocol`, `form`, `call`, `make`), each introduced by the smell it replaces and, when leaky, its bond.
5. the whole pipeline.
6. the construct matrix.

the genesis (`where we come from`, `:5-25`) and `how things are in typescript` (`:35-37`) leave the tutorial. the ts overlap, the five `tstd` principles and the transpiler idea move to `DESIGN.md`, as the why.

### separation

- **`../README.md`**: the formula, the dense example, the setup, the pathways. self-contained.
- **`../../README.md`**: the master path, `tstd`'s principles and style; the hierarchy is stated in both.
- **`../TUTORIAL.md`**: the language surface.
- **`../DESIGN.md`**: the why: the frustration, the five principles, the constraints, the ban list, the lowered core, the refusals.
- **`constructs/` decks**: the equivalence and the lowering, opt-in close reading.
- **`../UPDATES.md`**: the journal.

### entry points

`../README.md` is the door: the formula, one dense mixed example (`scope`, `hold`, `try`, `await call`, side quests, `ok`), the setup, and pathways. the tutorial assumes it. `../../README.md` is the second door, for the library.

### file structure

one file, `../TUTORIAL.md`. the genesis leaves it; the leaky bonds and refactoring tables enter, so the 550 to 580 target is revisited in 09.

## decisions

- 2026-09-22. **the teaching is language-first, and the genesis moves to `DESIGN.md`.** the tutorial's first job is a reader who came to see tz, so `where we come from` and `how things are in typescript` leave it; the ts overlap and the five `tstd` principles join the constraints in `DESIGN.md`, which already answers "why tz looks like this". the transpiler idea goes with them. rejected: keeping the genesis and compressing it (still library-first in miniature, the order is the complaint, not the length); deleting the genesis (the why is real and `DESIGN.md` is its home).

- 2026-09-22. **the quickstart lives in `README.md`, not the tutorial.** the shortest path is install, write one `.tz`, run it with `tzx`, see the output, and the entry point is where a reader meets it. the tutorial then assumes it. rejected: opening the tutorial with the running program (it belongs at the door, and the tutorial is construct teaching); pointing at `examples/main.tz` alone (a whole program is not a first program).

- 2026-09-22. **the tutorial stays one file.** the genesis leaves it; the leaky bonds and refactoring tables enter, so the 550 to 580 line target is revisited in 09. rejected: splitting a second reference file (a new surface to keep coherent, and the matrix already reads as a lookup).

- 2026-09-22. **tz is taught 50 years from now: a language with a standard library, not sugar over typescript.** the lowered core appears only as what a construct replaces, in the decks and `DESIGN.md`, and the docs never say "x writes y under the hood". the c# analogy is the cooperation of a language and its standard library (`using` is `try`/`finally`, LINQ is the method chain), so the sugar is a language feature and the library call is the same language written plainly. rejected: teaching each construct by its emit (a transpiler tour, which makes the tutorial a two-language lesson); hiding the library entirely (dishonest, the library is used directly).

- 2026-09-22. **deprecation by default: the overlap is a gradient, not a wall.** what the language owns is banned (`if` joins `switch`, `?:`, `??`); what the library owns cannot be banned (it is the standard library, and interop and incremental adoption need it), so it is deprecated by a `tzd` smell warning (`protocol.init` -> `protocol`, `branch` -> `:tag`, `result.ok` -> `ok`, `scope.sync` -> `scope`, `call.sync` -> `call`, `make` -> `make =>`). this is the c# difference: c# blesses both forms, tz deprecates the replaceable one. rejected: banning the library calls (a ban would refuse the standard library in its own language); a pragma (the ban list stays non-negotiable).

- 2026-09-22. **the leakiness axis organizes the constructs and the docs.** closed constructs (side quests, arrow capture, exits, `try`) are taught as pure language, with a refactoring lookup table only as reference; leaky constructs (`scope`, `protocol`, `form`, `call`, `make`) are taught as features with the `tstd` bond marked. `form` is the deepest leak and the author finds it inelegant; the marking is the honest alternative to hiding it, and it names what a future tz might absorb. the author leaves the marking to the session where it fits. rejected: presenting all constructs uniformly (it would either fake the closed ones or bury the leaky ones).

- 2026-09-22. **`if` is banned, in its own session.** `switch` already is (`src/ban.ts:26`); `if` is not (`DESIGN.md:61` bans only a statement `else`), yet every `if` is replaceable by a side quest (`n ?< 0 return 0;`, `guard ?! assert.fail();`) and `if` is a second spelling the language does not need. the blast radius is real: `examples/signup.tz:40-41`, `constructs/return.spec.tz:14-15`, and the spec guard clauses `if (!form.model(...)) assert.fail()` in `signup.spec.tz` and `form.spec.tz`, plus the tutorial's clamp example. the change is a session (`roadmap.md` 17), not part of 09. rejected: folding it into 09 (a language change among doc edits, harder to review and to pin with specs).

## evidence

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 65 src pass plus 54 decks and examples pass (the `tzx` spec runs inside it).
- `tzc examples constructs`: exit 0.
- `tzx` spec: exit 0, 54 pass (inside the tz suite).
- `tzd examples constructs`: exit 0.

## open

the `if` ban is settled and scheduled as roadmap session 17, not executed here. the leaky-bond marking is placed by the session where it fits (09 or 15). the 550 to 580 line target is revisited in 09, since the leaky bonds and refactoring tables add surface.

## close

- commits:
  - `fix the boolean spelling in docs` (`TUTORIAL.md` rule, table, examples and matrix; `examples/forms.tz`, `examples/load.tz`, `constructs/form.spec.tz`)
  - `close the teaching dissertation` (`plan/context/08-the-teaching-dissertation.md`, `plan/roadmap.md` session 17 and the 08 status flip, `UPDATES.md`)
- `../UPDATES.md` entry: `## 2026-09-22: the teaching dissertation`
- roadmap: session 08 flipped to done; session 17 (the `if` ban) added.
