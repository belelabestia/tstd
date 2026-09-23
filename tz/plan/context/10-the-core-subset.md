# 10 the core subset working context

## intent

`tstd` and tz sit on a shared floor: a subset of typescript that omits the overlap. the docs have called it around the gap ("the lowered core", "plain typescript", "a subset"), and without a name the story defaults to "tz is sugar over typescript", the framing session 08 rejected. the author named the floor **corescript** in review. this session settles what that name means, how it is enforced in plain typescript (the eslint ruleset the readme promised), how the two ban engines stay in step, and the gradient word for the library side. it then lands the `tzd` smell warning, or schedules the session that does, and applies the dual-nature framing across the docs.

## inputs

- `../sessions/10-the-core-subset.md` (the charge and the acceptance).
- `../context/09-the-educational-rewrite.md` (the formula, the naming ruling, the warning ruling).
- `../context/08-the-teaching-dissertation.md` (deprecation by default, the leakiness axis).
- `../../DESIGN.md`, `../../TUTORIAL.md`, `../../README.md`, `../../../README.md` (the docs the framing lands on).
- `../../src/ban.ts` (the table), `../../src/coherence.spec.ts` (the tie to the lexer), `../../src/tzd.ts` and `../../src/lsp.ts` (the warning join).
- `../../../README.md` (the promised eslint ruleset), `../../../STYLE-KB.md` and `../../../AGENTS.md` (voice and rules).

## decisions

all dated 2026-09-23, all ruled in review before any edit.

- **the base subset is typecore.** the shared floor (`tstd` and tz both sit on it) is **typecore**. it is a conformance profile, not a file type: no extension is spent, files stay `.ts`, tz files stay `.tz`. the author first named it corescript, then rejected it on collision, then proposed typego and goscript (both occupied in the ts space: Microsoft's TypeScript-Go/`tsgo` and two Go-to-TypeScript transpilers), then subtype (the standard type-theory term), and ruled **typecore**. the bar: clear in the ts/web/language space. a search found no named `typecore` in that space. rejected: corescript, typego, goscript, subtype, and a descriptive phrase with no name.

- **three things stay distinct.** typecore is the base dialect; `tstd` is the standard library (the seed), usable in typecore on its own; tz is the language that adds the constructs and enforces the profile. `tstd` does **not** mean "typescript with the ruleset baked in": folding the ruleset into the seed blurs the seed, which the author framed as the root. rejected: tstd as the ruleset carrier.

- **the canonical table is a shared profile, one source.** the refused words and the warned library spellings live in one table, `src/typecore.ts`. tz's ban pass (`src/ban.ts`) and its editor warning (`src/smell.ts`) both read it, so the two engines cannot drift. the eslint ruleset that holds plain typescript to typecore reads the same table; it is a consumer, not a second definition. the ruleset's own home (its package and the profile's shared location, most likely the seed) is scheduled with it, because shipping the ruleset is what makes moving the table worth it. the tz ban pass becomes defensive: it insists, the profile decides. rejected: a coherence spec that compares two separate tables (a second source to keep in step); one engine ported from the other (two tables, one derived).

- **the gradient is banned vs warned.** a spelling the language owns is **banned** (a diagnostic, no pragma). a spelling the library owns cannot be banned, because it is the standard library and interop needs it, so the editor **warns** with the tz form. "deprecated" is retired as the word; **warned** is the word. rejected: softening the language side to "by convention"; calling the library side "deprecated" (the author wants a word of its own).

- **the smell warning lands in `tzd` now.** the fourth unranked check reads the source tokens and warns on each library spelling (`protocol.init`, `branch`, `result.ok`, `result.err`, `scope.sync`/`scope.async`, `call.sync`/`call.async`, `make`), naming the tz form. it is token-level, not type-level, so it does not wait on the checker. rejected: splitting it into its own session; reading types to find it.

- **a `.tz` file reads as tz, so the lowering comparisons go.** the author's follow-up ruling: since the files carry a `.tz` extension, the tautological lowering examples should not be there, because they are for a reader of the lowered output, not someone reading tz. the four files that carried a library spelling were migrated: `result.ok`/`result.err` became `:ok`/`:err`, `branch('x', ...)` became `:x(...)`, and the `assert.deepEqual(x, branch('x'))` comparisons became property reads (`.branch`, `.value`) that prove the shape without the library call. the `branch` role's coherence anchor moved from `branch(` to `:idle`, because `branch(` was exactly the library spelling the walk required the deck to contain; the new anchor names the tz form and still matches the input line in `emit.spec.ts`. `examples/branches.tz` keeps its coverage through the property reads. rejected: deleting `examples/branches.tz` (its coverage survives), and leaving the decks to warn (the author wants a `.tz` file to read as tz).

- **the eslint ruleset is ruled and its ownership written, not built here.** building it would add eslint to this repo, which `../../../AGENTS.md` forbids ("do not add tooling"). the ruleset ships to `tstd` consumers (plain typescript), so it is its own package and its first step is extracting the shared profile. this session records the owner and the drift guard in `DESIGN.md` and does not add the dependency. rejected: adding eslint here to build the ruleset now (breaks the no-tooling rule); leaving the promise unruled.

## findings

- **collision check, corescript.** a web search turns up three existing uses: a dotnet scripting language "corescript" by Stephan Bruny (2018, 18 stars, dormant); "RPG Maker MV CoreScript" (a javascript game engine, 325 stars, not a language); and Roblox's `CoreScript` class. none is in the typescript or web-development space, and none owns the `.ts`/`.tz` world. the author's condition was "unless it conflicts with something existing".
- **placeholder scope.** "plain typescript" stands in the docs at `DESIGN.md:3,15,27`, `TUTORIAL.md:3,17`, `tz/README.md:3`, root `README.md:51`. the formula sentence "a superset of a subset of typescript, with its own standard library, out of the box" is repeated in five places.
- **the two engines.** `src/ban.ts` holds the token table (`instead`, `banned`, `absent`), and `src/coherence.spec.ts` ties the docs to the lexer, but nothing ties a future eslint ruleset to either. the ruleset is a ts-ast reader; the ban pass is a token reader.
- **the warning today.** `tzd` ships `tzc`-parity diagnostics plus three unranked checks (`booleans`, `ladders`, `drops`) through `lsp.ts` and `check.ts`. the smell warning is a fourth, over the emitted code: `protocol.init`, `branch(`, `result.ok`, `result.err`, `scope.sync`, `scope.async`, `call.sync`, `call.async`, `make(`.

## evidence

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 69 src pass plus 54 decks and examples pass.
- `tzc examples constructs`: exit 0.
- `tzx` spec (every deck plus `examples/signup.spec.tz`): exit 0, 54 pass.
- `tzd examples constructs`: exit 0, no warnings after the deck migration.
- `npx tsc --noEmit --pretty false` (tz): exit 0.
- `coherence.spec.ts`: 6 pass, exit 0.

## open

- **the eslint ruleset.** ruled to ship, with the drift guard written (one profile, both read it). it is not built here: adding eslint to this repo is against `AGENTS.md`, and the ruleset targets plain typescript (`tstd` consumers), so it is its own package. its first step is giving `src/typecore.ts` a home both tz and the ruleset can reach, most likely the seed. scheduled, not done.
- **the `.tz` rule is now implicit.** a `.tz` file should read as tz, so the library spellings do not appear in one. the smell warning enforces it at `warned`; whether that belongs in `AGENTS.md` or a doc line is a small follow-up.

## close

- commits (planned; the author reviews before any of them land):
  - `name the base typecore` (`README.md`, `tz/README.md`, `tz/TUTORIAL.md`, `tz/DESIGN.md`, `tz/src/emit.spec.ts`)
  - `share the typecore profile` (`tz/src/typecore.ts`, `tz/src/ban.ts`, `tz/src/coherence.spec.ts`)
  - `warn the library spellings` (`tz/src/smell.ts`, `tz/src/smell.spec.ts`, `tz/src/lsp.ts`, `tz/src/lsp.spec.ts`, `tz/DESIGN.md` lsp and staging notes)
  - `drop the lowering comparisons` (`tz/src/emit.ts` the role anchor, `tz/constructs/block.spec.tz`, `tz/constructs/branch.spec.tz`, `tz/constructs/tag.spec.tz`, `tz/examples/signup.spec.tz`)
  - `close the core subset` (`tz/plan/roadmap.md`, `tz/plan/context/10-the-core-subset.md`, `tz/UPDATES.md`)
- `../../UPDATES.md` entry: `## 2026-09-23: the core subset`
- roadmap: session 10 flipped to done.
