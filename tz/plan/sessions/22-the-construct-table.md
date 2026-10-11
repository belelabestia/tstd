# 22 the construct table

phase: truth
status: planned
resolves: the construct landscape

## why

the author wants a table of the constructs in a crescendo of complexity, `try` and `make` and `call` on the way up and `scope` at the top. a reader deciding where to start has no ladder today. the closest thing is the construct matrix in `TUTORIAL.md`, but it lists the side-quest spellings by what they replace, not the constructs by how much they ask of the reader, so it answers "what does this replace" rather than "what do i reach for, and when".

this is a docs session with one artifact and one ordering rationale. it runs after the language work (18, 19, 20, 21), so the ladder describes the settled set rather than one about to move.

## what this session must produce

- the table: every construct, what it does in a line, the rung it sits on, and when to reach for it.
- the ordering, with one line of reasoning per rung.
- the pointers into it from the tutorial and the getting-started mental model.

## in scope

- the table and the ordering rationale.
- the tutorial and getting-started links that lead into it.

## out of scope

- the side-quest construct matrix, which stays as the "what it replaces" view.
- any language change.

## inputs

- `../src/emit.ts`, the `roles` list, the truth for the construct set.
- `../TUTORIAL.md`, the construct matrix and the per-construct sections.
- `../GETTING-STARTED.md`, the mental model.
- `../DESIGN.md`, the constructs.

## steps

1. list every construct from the `roles` list, the leaky set included.
2. order them by the reader's cost, from the plainest to the most asking.
3. write the table and the one-line rationale per rung.
4. point the tutorial and the getting-started mental model at it.
5. confirm the coherence walk and the tests stay green.

## acceptance

- every role in the `roles` list appears exactly once.
- the order is justified in one line per rung, and a reader can pick a starting point from it.
- the tutorial and the getting-started link into it, and `npm test` stays green.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the `roles` list in `src/emit.ts`, the tutorial's construct matrix, and this file. copy `session-context-template.md` to `context/22-the-construct-table.md`. the author wants the constructs in a table ordered as a crescendo of complexity, `try` and `make` and `call` below and `scope` at the top, which does not exist yet. write the table from the `roles` list, justify the order in one line per rung, and point the tutorial and the getting-started at it. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/22-the-construct-table.md` before starting.
