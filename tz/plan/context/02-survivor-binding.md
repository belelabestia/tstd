# 02 survivor binding working context

## intent

settle q1: after `x ?|(:idle, :loading, :failed) return;`, does a later `x` name the branch box or its payload? the showcase source `scratch/machine.tz` and its spec `scratch/signup.spec.tz` disagree, and the emit currently keeps the box. the ruling must keep the refusal form coherent with `?ok`/`?err`, `?:tag` and the chains that read the same union twice, then the source, the docs and an emit spec must all say the same thing.

## inputs

- `../scratch/machine.tz` and its emitted `../scratch/machine.ts`, the disagreeing pair.
- `../scratch/signup.spec.tz:60`, the `finished` assertions.
- `../src/emit.ts`, the `quest`, `grouped` and `kept` paths.
- `../src/emit.spec.ts:33`, the existing decline spec that pins the current shape.
- `../TUTORIAL.md`, the side quest table and the bindings section.
- `../DESIGN.md`, the shapes section, especially the `.value` paragraph.
- `../UPDATES.md`, the 2026-09-13 coloned entry and the 2026-09-16 chain entry.
- `../../AGENTS.md` and `../../STYLE-KB.md` before writing anything.

## decisions

- 2026-09-20. **a coloned refusal keeps the subject boxed; the payload of the branch that survived is `.value`.** the survivor is the complement of the tested tags, and the complement is not always one branch: `?:loading` on the four-member `Load` leaves three members, some carrying nothing, so an implicit unwrap does not typecheck. `?ok` and `?err` are the only tests that unwrap because the complement of one branch of a two-member union is always the other branch, and that one always carries the payload. the emitter is syntactic and knows no union, so it cannot decide a group's complement. rejected: unwrapping the survivor (unsound in general, needs type info, breaks multi-member survivors, the void members and the `x ?:loading ?:err` chain); moving the showcase to a positive answer form (loses the "refusing the rest" idiom and its comment). the fix is in the source, not the spec: `machine.tz` reads `return rows.value;` and `signup.spec.tz` is untouched.

## evidence

- `node dist/tzc.js --no-check` over four probe shapes (grouped coloned refusal, single coloned refusal, `?ok` refusal, coloned capture):
  ```
  refused   if (((x.branch === 'idle') || (x.branch === 'loading') || (x.branch === 'failed'))) return; const rows = x;
  coloned   if (x.branch === 'failed') return; const rows = x;
  unwrapped if (x.branch === 'ok') return; const rows = x.value;
  captured  const rows = ((x.branch === 'idle') || (x.branch === 'loading') || (x.branch === 'failed')) ? x : x;
  ```
  so today: every coloned refusal binds the box; only `?ok`/`?err` bind `.value`.
- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 1, 59 src pass, 12 scratch with 11 pass and 1 fail, the pre-existing `scratch\signup.spec.tz:84` remote fixture (session 05). the `finished` test at `scratch\signup.spec.tz:60` now passes.
- `tzc scratch`: exit 0.
- `tzx` spec: `node dist/tzx.js --test scratch/signup.spec.tz` exit 1 on `:84` only; `reach one branch by refusing the others` passes.
- `tzd scratch`: exit 0, `TZL0003` warnings only.
- `emit.spec.ts`: 59 pass, including the new group-refusal case.

## open

none for this session. the `:84` remote fixture belongs to session 05.

## close

- commit: `keep the survivor boxed`
- `../UPDATES.md` entry: `## 2026-09-20: a survivor keeps its box`
- roadmap: session 02 flipped to done.
