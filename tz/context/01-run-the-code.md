# 01 run the code in the build working context

## intent

`npm test` typechecks the emit and tests the emitter, but never runs the emitted program, so `tzx scratch/signup.spec.tz` is red while the suite is green. this session lands the smallest run step that makes a failing showcase fail the build. it does not fix the two failures; it makes them visible. those are sessions 02 through 05.

## inputs

- `../plan/roadmap.md` and `../plan/sessions/01-run-the-code.md`: the session's mandate and acceptance.
- `../AGENTS.md` and `../../STYLE-KB.md`: the binding working rules, read before writing.
- `../README.md`: what the toolchain claims, and the documented `tzx` invocation.
- `../package.json`: the current test chain, where the run step lands.
- `../src/register.ts`, `../src/hook.ts`, `../src/tzx.ts`: how a `.tz` file is made runnable, and why the loader needs `dist`.
- `../src/tzd.ts`: how the headless session already walks a directory, precedent for a run step.

## decisions

- 2026-09-20: append the run step to the `test` script rather than add a `node:test` spec that spawns `tzx`. reasoning: the smallest change, the documented command verbatim, tz line numbers print directly, and the `scratch/**/*.spec.tz` glob auto-includes a future scratch spec. rejected: a `src/scratch.spec.ts` wrapper, which nests two test reporters and puts a `scratch/` concern in `src/`.
- 2026-09-20: emit with `tsc -p tsconfig.build.json` and place the run last, after the src suite. reasoning: the loader's `register('./hook.js')` only resolves against the emitted `dist`, so a build is required before the run; running last keeps the 59 tz tests visible when the showcase is red. rejected: `npm run build`, which re-runs its `prebuild` root build a second time per `npm test`; rejected: the run before the src suite, which masks the src suite on a red showcase.

## evidence

- `npm test` (tz), before: exit 0, 59 tz pass.
- `node dist/tzx.js --test scratch/signup.spec.tz`, before: exit 1, 10 pass 2 fail at `signup.spec.tz:66:10` and `97:56`.
- `npm test` (tz), after: exit 1. the src suite runs first, 59 pass; the scratch suite reports 12 tests, 10 pass, 2 fail, naming `scratch\signup.spec.tz:60:1` and `:84:1` (the test starts) with the assertion frames at `66:10` and `97:56`.
- all 11 non-spec scratch `.tz` files run through `tzx` and exit 0; `scratch/main.tz` prints its program output.

## which scratch files are exercised

- exercised by the run step: `signup.spec.tz` (the only file carrying assertions).
- exercised transitively as its imports: `branches`, `calls`, `chains`, `fallback`, `forms`, `load`, `machine`, `signup`.
- runnable but not exercised: `main.tz` (a program, prints output), `copy.tz` and `outcome.tz` (modules, load clean and exit 0).
- none are non-runnable. the distinction is only whether anything asserts over them.

## open

- phase 0 stays intentionally red until sessions 02 through 05 fix the two failures and the expression-subject chain defect. this session is the harness that catches them.
- only `signup.spec.tz` asserts anything about `scratch/`; whether the showcase grows a program-level check is session 05's call.

## close

- commit: `run the showcase`
- `../UPDATES.md`: `## 2026-09-20: the build runs the showcase`
- roadmap: session 01 `planned` to `done`
