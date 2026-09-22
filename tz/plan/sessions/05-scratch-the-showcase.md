# 05 scratch, the showcase

phase: truth
status: planned
resolves: the remote fixture

## why

`../README.md:61` says `scratch/` shows every construct and both commands run over it. that claim is currently false twice over. `signup.spec.tz:97` fails because `remote` over a `data:` url comes back `err`, and nothing guarantees that every construct in the roles list is exercised end to end, only that it has a spec entry.

the showcase is the language's proof. it should be exhaustive and it should run.

## what this session must produce

- the `remote` fixture fixed or rewritten to something deterministic. `data:` url support is not something the language owns, so if node's fetch does not carry it, the test should not depend on it.
- an audit: every construct in the roles list is exercised by a runnable scratch file, or is listed as not runnable with the reason.
- `../README.md` describing what scratch actually proves.

## in scope

- `../scratch/calls.tz` and `../scratch/signup.spec.tz`.
- the mapping between the roles list in `../src/emit.ts` and the scratch files.
- `../README.md`'s claim about scratch.

## out of scope

- the two defects already scheduled (sessions 02 and 03).
- adding constructs.

## inputs

- `../scratch/*.tz`.
- `../src/emit.ts`, the roles list.
- `../src/coherence.spec.ts`, which already checks spec and design coverage but not runtime coverage.
- `../README.md:61`.

## steps

1. run every scratch spec and record what passes and fails.
2. fix or rewrite the `remote` fixture.
3. build the coverage map and close the gaps.
4. correct the README claim.

## acceptance

- every runnable scratch file runs clean under `tzx`.
- the coverage map has no unexplained gap.
- `npm test` in `tz/` is green.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/05-scratch-the-showcase.md`. the remote fixture in `scratch/signup.spec.tz` depends on a `data:` fetch that does not hold, and the showcase may not exercise every construct at runtime. repair the fixture, build the coverage map against the roles list, close the gaps, and correct the README's claim about scratch. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/05-scratch-the-showcase.md` before starting.
