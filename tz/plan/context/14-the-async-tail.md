# 14 the async tail working context

## intent

the author ruled that `async` is an exit like `return`, `ok` and `err`, so it is a matcher tail, and the emitter's refusal of it is a defect. this session adds `async` to the tail dispatch, removes the matcher-tail guards, keeps the guards that refuse `=> async` and an exit inside an arrow body, pins the output, extends the async deck, and corrects the tutorial and design.

## inputs

- `../sessions/14-the-async-tail.md` (the charge, the acceptance).
- `../roadmap.md` (the plan and the ledger).
- `../../DESIGN.md` (the exit family, the vocabulary, the constraints).
- `../../TUTORIAL.md` (the tail rule).
- `../src/emit.ts` (the tail dispatch, the guards, and `wraps`).
- `../src/emit.spec.ts` (the exit and tail cases).
- `../constructs/async.spec.tz` (the deck).
- `../../AGENTS.md` and `../../STYLE-KB.md` (voice and rules).

## decisions

all dated 2026-10-06, ruled by the author.

- **`async` is an exit, so it is a matcher tail.** `async x` emits `return Promise.resolve(x)`, the same shape `ok` and `err` take, so refusing it as a tail is an inconsistency in the emitter. rejected: keeping the refusal, which would leave the language saying one thing about `return` and another about `async`.

- **the fix is the tail lists, not a new path.** `scan.ts` and `ban.ts` already treat `async` as a tail candidate and the `exit` handler already wraps it, so `async` joins the three `tails` lists and the five matcher-tail guards are removed. the `=>`-answer and arrow-body guards stay, since the generic exit guards now cover them. rejected: a special `async` path in the dispatch, which would duplicate the exit handling the language already has.

## evidence

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 70 src plus 55 decks pass.
- `x ?err async 1`: `tzc` exit 0, emitting `if (x.branch === 'err') return Promise.resolve(1); const v = x.value;`.
- `x ?err return 1`: still exit 0.
- a tail `async` in a body that answers with `ok`: refused, `a body answers with one of return, ok and err, or async; this one mixes them`.
- `tzc examples constructs`: exit 0. `tzd examples constructs`: exit 0, no warnings.

## open

- none. the reading, the emit, the deck and the docs agree.

## close

- commit (planned; the author reviews before it lands):
  - `allow async as a tail` (`tz/src/emit.ts`, `tz/src/emit.spec.ts`, `tz/constructs/async.spec.tz`, `tz/TUTORIAL.md`, `tz/DESIGN.md`, `tz/AGENTS.md`, `tz/plan/` the restructure, `tz/UPDATES.md`, `tz/STATUS.md`)
- `../../UPDATES.md` entry: `## 2026-10-06: the async tail`
- roadmap: session 14 flipped to done.
