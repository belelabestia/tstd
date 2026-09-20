# 02 survivor binding

phase: truth
status: planned
resolves: q1

## why

`scratch/machine.tz:26` declares `finished`, and `scratch/signup.spec.tz:66` expects `finished(branch('done', 'rows')) == 'rows'`. the emitted code (`scratch/machine.ts:27`) reads:

```
if (((x.branch === 'idle') || (x.branch === 'loading') || (x.branch === 'failed'))) return; const rows = x;
```

the survivor narrows to the `done` member, so `rows` is the whole branch box `{ branch: 'done', value: 'rows' }`, not the payload `'rows'`. the showcase spec disagrees with the showcase source. `../UPDATES.md` says a coloned test keeps the boxed shape and binds the whole subject, so the spec may simply be wrong, but that reading makes `finished` impossible to write as it reads.

this is exactly the sort of semantics call the author rules on. do not settle it by editing the spec to match the code.

## the question

after `const rows = x ?|(:idle, :loading, :failed) return;`, what does a later `x` name: the box, or the payload? and if it is the payload, where does the unwrap happen, given one line in and one line out?

## what this session must produce

- a ruling, recorded in `../UPDATES.md` and reflected in `../TUTORIAL.md` and `../DESIGN.md`.
- `machine.tz` and `signup.spec.tz` agreeing, with `tzc` and `tzx` green.
- a spec entry in `emit.spec.ts` that pins whichever answer is chosen.

## in scope

- the refusal form `?|(:tag, ...)` and what a surviving name binds.
- the neighboring forms (`?none`, `?some`, `?:tag`, `?ok`, `?err`) only where the ruling must stay coherent across them.

## out of scope

- the expression-subject chain defect (session 03).
- rewriting the tutorial (sessions 07 and 08).

## inputs

- `../scratch/machine.tz` and its emitted `../scratch/machine.ts`.
- `../scratch/signup.spec.tz:60`.
- `../TUTORIAL.md`, the side quest section and the narrowing paragraph.
- `../src/emit.ts`, the branch and bind paths.
- `../UPDATES.md`, the 2026-09-13 coloned entry and the 2026-09-16 chain entry.

## steps

1. establish what the language actually does today, by emitting the shapes rather than guessing.
2. state the two candidate rulings with their costs, and hand them to the author.
3. implement the winner, in the emit if the ruling changes it, in the docs and spec if the ruling restates it.
4. pin it with a spec.

## acceptance

- `tzx scratch/signup.spec.tz` passes the `finished` assertions, whatever they now read.
- `npm test` in `tz/` is green with the new spec entry.
- the tutorial says the same thing the emit does.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/02-survivor-binding.md`. the showcase source and spec disagree about what a name binds after `x ?|(:idle, :loading, :failed) return;`. establish the current behavior empirically, present the candidate rulings and their costs to the author, then implement the ruling. pin it with an emit spec. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/02-survivor-binding.md` before starting.
