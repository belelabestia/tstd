# 03 expression-subject chains

phase: truth
status: planned
resolves: the 2026-09-16 defect

## why

`../UPDATES.md:9` records the open defect: an arrow-body chain over an expression subject, `f(x) ?== 0 => 'zero' else => 'pos'`, emits garbled code, duplicating the subject around the temp application. a named subject emits cleanly, which is why the docs currently say matchers test names. that caveat is a workaround papered over a bug.

## what this session must produce

- the emit fixed so an expression subject chains cleanly.
- an `emit.spec.ts` case that pins the fixed output, including the temp handling.
- a decision on the docs caveat: remove it if the fix makes it obsolete, or keep it and say why.

## in scope

- the chain path in `../src/emit.ts` and its temp application.
- arrow-body chains over expressions, the `else` continuation, and the locked-subject rule from 2026-09-16.

## out of scope

- survivor binding (session 02), though the two touch the same code and should not conflict.
- new chain spellings.

## inputs

- `../UPDATES.md:9`: the defect, and the 2026-09-16 entry that locked the subject.
- `../scratch/chains.tz`.
- `../src/emit.ts`, the chain, temp and `else` paths.
- `../src/emit.spec.ts`, the chain cases.

## steps

1. reproduce the garble with a minimal input and show the bad emit.
2. find where the subject is duplicated around the temp.
3. fix it, preserving the one-line-in-one-line-out constraint and the locked-subject rule.
4. pin the fixed output.
5. rule on the docs caveat.

## acceptance

- an expression subject emits the same clean shape a named subject emits.
- `npm test` in `tz/` is green.
- `../scratch/chains.tz` still runs.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/03-expression-subject-chains.md`. reproduce the documented defect, where an arrow-body chain over an expression subject duplicates the subject around the temp, fix the emit, and pin the fixed output with a spec. keep one line in and one line out, and keep the locked-subject rule. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/03-expression-subject-chains.md` before starting.
