# AGENTS.md

cross-tool onboarding for ai coding agents. claude code reads `CLAUDE.md` and the notes under `.claude/`; other tools read this file.

## read first

- `README.md`: the principles and the style rules. the binding spec for the library.
- `CLAUDE.md`: the working rules for an agent that touches this repo. the code rules, the commit rules, the things to refuse.
- `.claude/STYLE-KB.md`: the worked entries. the examples that ground the rules. read before writing anything.

## for `tz/` work

- `tz/README.md`: the entry point. commands and editor setup.
- `tz/DESIGN.md`: the design notes. why tz looks like this; the hard constraints, the vocabulary, the ban list, the refused shapes.
- `tz/TUTORIAL.md`: the spec. how to write tz, with the patterns each construct replaces.
- `tz/UPDATES.md`: the journal of decisions. the history of what was tried and ruled.

## do not

- do not add a linter, a formatter, a bundler, another test framework.
- do not write `map`, `andThen`, `unwrap`, `match` on a branch, or any other combinator that hides flow behind data.
- do not write a guard combinator (`union`, `or`, `optional`, `refine`).
- do not declare return types; do not write `interface`; do not write `any`.
- do not introduce a `types.ts`, a `utils.ts`, or any grouping of files by kind.
- do not decide things the readme says are settled; ask the author.

## key commands

```
npm test     # tsc --noEmit over all of src, then tsx --test
npm run build
npm start    # tsc --watch, emit only
```
