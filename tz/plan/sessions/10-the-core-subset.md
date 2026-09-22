# 10 the core subset

phase: ownership
status: planned
resolves: the base dialect

## why

`tstd` and tz share a floor: a subset of typescript that omits the overlap, and both the library and the language are built on it. that floor has no name. the docs have been calling it around the gap, "the lowered core", "plain typescript", "a subset", and the readme's old sentence, "typescript with most of typescript taken away", has been carried forward past its usefulness. without a name the story defaults to "tz is sugar over typescript", which is the framing session 08 rejected.

the author's framing: `tstd` is the seed, the core, the root of every principle; tz is the language built to optimize using it to a point typescript alone could never reach. the shared floor is a superset of a subset, and it wants a name.

## the questions

1. **what is the base called?** the author ruled it in review: **corescript** is the name, and `cts` was only a candidate extension. no extension is spent. files stay `.ts` and tz files stay `.tz`, because `.cs` collides with c#, `.cts` collides with typescript's own CommonJS flavour since 4.7, and the subset is a conformance profile rather than a file type. open: the author's condition is "unless it conflicts with something existing", and a search turns up a dotnet `corescript` from 2018 and the "RPG Maker MV CoreScript" engine, so confirm the name is safe enough or pick around them.
2. **what does `tstd` mean?** the author wonders whether `tstd` could read as "it's typescript, with this eslint ruleset baked in". the leaning here: keep the three things distinct, corescript (the base dialect), `tstd` (the standard library, the seed), and tz (the language that optimizes both); folding the ruleset into `tstd` blurs the seed, which the author himself framed as the root. settle it.
3. **what enforces it?** the ban list, shipped as the eslint ruleset the readme has long promised, so plain typescript can be held to the base. tz then bases on the base, and its own ban pass becomes defensive rather than the definition.
4. **the two engines.** an eslint ruleset reads the ts ast; tz's ban pass reads tokens. they must agree or drift, and today `coherence.spec.ts` ties the ban list to the lexer. decide the canonical table and the guard against drift (one ported from the other, or a shared source).
5. **the gradient vocabulary.** the author ruled the library side deserves a word of its own, not "deprecated". language spellings are **banned**; library spellings are **warned** (proposed). settle the word.
6. **the warning becomes real work.** `tzd` ships three warnings today (non-boolean guard, non-exhaustive `? {}`, dropped value needing `void`). add the smell warning: each library spelling (`protocol.init`, `branch`, `result.ok`, `scope.sync`, `call.sync`, `make`) warns with the tz form it should be (`protocol`, `:tag`, `ok`, `scope`, `call`, `make =>`). this session lands it, or splits it into its own.

## what this session must produce

- the name confirmed as corescript, with the extension question closed: a profile, files staying `.ts`.
- the meaning of `tstd` settled against the baked-in-ruleset reading.
- the ruling on the eslint ruleset: ship it, and who owns the table it reads.
- the gradient vocabulary: banned, and the word for warned.
- the smell warning in `tzd`, or the session that builds it.
- the dual-nature framing applied across `../TUTORIAL.md`, `../DESIGN.md` and `../README.md`.

## in scope

- the naming and the enforcement split.
- the `tzd` smell warning, first cut.
- the docs' framing, once the name is ruled.

## out of scope

- renaming modules or files.
- changing the contents of the ban list.

## inputs

- `../DESIGN.md`, the constraints, the ban list and the lsp section.
- `../src/ban.ts`, the table, and `../src/coherence.spec.ts`, the tie to the docs.
- `../src/tzd.ts`, the three checks the warning joins.
- `../../README.md`, the promised eslint ruleset.
- session 08's deprecation-by-default ruling.

## steps

1. put the name candidates beside the collision facts and take the author's ruling.
2. decide the enforcement split and the canonical table.
3. settle the gradient vocabulary.
4. land the smell warning, or write the session that does.
5. apply the name and the framing across the docs.

## acceptance

- the base has a name the docs use everywhere, with the extension question closed.
- the ruleset's owner and drift guard are written.
- the warning warns on each library spelling, or is scheduled with a file.
- `npm test` in `tz/` is green.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, session 08's design, and this file. copy `session-context-template.md` to `context/10-the-core-subset.md`. `tstd` and tz sit on a shared subset of typescript that has no name. settle it: the name and whether it is an extension or a profile, the eslint ruleset that enforces it in plain ts, the two-engine drift, and the gradient word (banned for the language, something else for the library). then land the `tzd` smell warning for the library spellings, or split it into its own session. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/10-the-core-subset.md` before starting.
