# 17 onboard agents working context

## intent

harden `tz/AGENTS.md` from a document written ahead of the build into the tested contract: fold in the friction the first build produced (session 15) and the mistakes a cold agent actually makes, confirm the format and the home session 13 settled, keep the guide pointing at the ban table and the `roles` list as the truth rather than copying them, and prove the result by pointing a fresh agent at the guide alone and getting a program `tzc` accepts.

## inputs

- `../sessions/17-onboard-agents.md` (the charge, the acceptance).
- `../context/13-the-agent-bootstrap.md` (what the bootstrap left open, the cold test that produced it).
- `../context/15-the-first-build.md` (the friction journal, the mistakes a builder makes).
- `../context/16-onboard-people.md` (the human path, so the two do not overlap).
- `../roadmap.md` (the phases, the ledger, the sessions 18 to 22 that carry the language friction).
- `../AGENTS.md` (the artifact this session hardens).
- `../src/typecore.ts`, `../src/ban.ts` (the ban table and the pass, the truth).
- `../src/emit.ts` (the `roles` list, the truth for the constructs).
- `../src/scan.ts` (the vocabulary).
- `../src/coherence.spec.ts` (what the docs walk checks, and that `AGENTS.md` is outside it).
- `../../AGENTS.md`, `../../STYLE-KB.md` (voice and rules).

## decisions

- **2026-10-11. the four traps go in the contract, and the async-scope shape also lands in `TUTORIAL.md`.** the cold tests show the guide's shape is sound (three agents reached `tzc` exit 0 from it), so the work is the gaps: the import map, the `if`/`else` enforcement claim, the boundary block form, and the async resource. rejected: keeping the contract clean and routing every trap to the tutorial or the ledger, because the contract already carries a "the sample does not say outright" list, so the traps are contract material; fixing only the two factual errors, because each behavioural trap cost a cold agent a compile round trip.

- **2026-10-11. the unenforced ban is a statement `if`, not a statement `else`.** the guide said `else` and it is wrong. compiled: a statement `else` is refused (`TZ0001: else after an if statement is refused`), a statement `if` compiles (exit 0), and session 21 is the `if` ban. the sentence now names `if` and records that its `else` is already refused.

- **2026-10-11. the import paragraph states the rule and a per-construct map.** verified by compiling each construct with no import: `:tag` gives `TS2304: Cannot find name 'branch'`, `scope` gives `TS2304: Cannot find name 'scope'`, `make` gives `TS2304: Cannot find name 'make'`; a plain `try f(x)` needs nothing, because it inlines the branch check. rejected: naming only the modules the sample happens to use, which is what the guide did and what the cold agents had to work around.

- **2026-10-11. the async-scope resource shape is taught in `TUTORIAL.md`, not only in the contract.** the tutorial said an async body picks `scope.async` and left the resource alone; `scope.async` actually wants every step to answer a promise, and the acquisition is `try await hold(...)`. the contract carries the same fact in one line; the tutorial carries the teaching and a short async sample.

- **2026-10-11. the findings become roadmap todos, and the pass runs on the sessions that move the language.** the author ruled that what the cold agents noticed is the product, not a side effect: every finding is filed as a `q` in the ledger, and a new phase, pressure, holds the loop and its exit (a cold agent carries a real project in tz without hitting a blocker, which is when the author starts using it). the pass is one cold agent on the surface that changed, run when the session moved the language, the emitter or the contract, so the cost stays bounded. one session, `23 under pressure`, works the first batch, because the four findings share one method and are small; a finding that grows splits into its own session then. the close moves to 24. rejected: several sessions now, which would spend a session each on four traps before their size is known; a pass on every session regardless of what changed, which buys nothing when the language has not moved and costs an agent each time.

## evidence

- `npm test` (root): exit 0, 44 pass.
- `npm test` (tz): exit 0, 70 src plus 56 decks and examples.
- `tzc examples constructs`: exit 0.
- `tzd examples constructs`: exit 0.
- cold test 1, the reader (`form` plus a boundary read): `tzc` exit 0; the trap it hit was `try call => readFileSync(path, 'utf8')` resolving to the `string | NonSharedBuffer` overload.
- cold test 2, the machine (`protocol` plus a `? {}` block): `tzc` exit 0; it had to find the `branch` import and the `?|(...)` group spelling in the decks.
- cold test 3, the scope (sync and async): `tzc` exit 0; it discovered the async resource shape only from the `TS2345` diagnostics.
- cold test 4, after the hardening (`:tag`, a presence quest, an async scope): `tzc` exit 0. it caught a slip in the first draft of the trap: `hold` takes the resource object, not `open()`, so the line now reads `try await hold(resource)`.
- the import claims, compiled one at a time: `:tag` alone, `scope` alone and `make` alone each fail with `TS2304`; `try f(x)` alone needs no import.
- the `else`/`if` claim, compiled: statement `else` exit 1 (`TZ0001`), statement `if` exit 0.
- the four findings, reproduced one at a time: q17 `TS2345` (`string | NonSharedBuffer`) from `try call => readFileSync(path, 'utf8')` fed to `JSON.parse`, exit 1, against the block form's exit 0; q18 `TZ0001` on the inner `else` of a quest in a `? {}` arm, exit 1; q19 `TS2322` on `const x: Sky = :clear;`, exit 1, against the bound form's exit 0; q20 the async resource shape, exit 0 only once `open`, `close` and `abort` all answer promises and the hold is awaited.

## open

the findings are filed, not open-ended: each is a `q` in `../roadmap.md` and is worked by `23 under pressure`, so the list below is a pointer, not a parking lot.

- **q17, the boundary's direct form.** `try call => f(...)` can resolve a different overload than the call you wrote; the contract carries the block-form workaround. session 23.
- **q18, a quest inside a `? {}` arm.** an arm cannot hold a quest, and the refusal names the `else` rule instead of the nesting. session 23.
- **q19, a tag written against a union-typed target.** the inline `:tag` infers its payload from every member, so a `void`-carrying tag cannot be annotated at the binding. session 23.
- **q20, a promise-returning resource method.** the `async` modifier is refused, so the step has no spelled form in the contract. session 23.

## close

- commits (planned; the author reviews before any of them land):
  - `harden the agent contract` (`tz/AGENTS.md`, `tz/TUTORIAL.md`)
  - `schedule the pressure phase` (`tz/plan/roadmap.md`, `tz/plan/sessions/23-under-pressure.md`, `tz/plan/sessions/24-retire-the-plan.md`)
  - `record the onboarding session` (`tz/plan/context/`, `tz/UPDATES.md`, `tz/STATUS.md`)
- `../UPDATES.md` entry: `## 2026-10-11: onboard agents`
- roadmap: session 17 flipped to done, the pressure phase and session 23 added, the close moved to 24, q17 to q20 filed; status dashboard: sessions 17/24, phases 3/5, onboarding done, pressure underway.
