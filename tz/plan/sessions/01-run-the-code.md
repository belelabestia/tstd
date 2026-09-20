# 01 run the code in the build

phase: truth
status: planned
resolves: the suite runs the showcase

## why

`npm test` typechecks the emit and tests the emitter, but it never executes the emitted program. `node dist/tzx.js --test scratch/signup.spec.tz` exits 1 with two failing tests, and both suites stay green. the showcase is the proof that the language works, so a broken showcase and a green build are a contradiction.

this session builds the harness that removes the contradiction. it does not fix the failures; it makes them fail the build, which is the point. the failures are sessions 02 through 05.

## what this session must produce

a test path in which a failing scratch assertion exits non-zero. the shape is open: a `node:test` spec that drives `tzx` over the scratch spec, or a script the test chain runs. it must not add a framework (see `../AGENTS.md`), and it must keep the existing `tsc --noEmit` gate.

## in scope

- choosing and implementing the run step.
- wiring it so a runtime failure of the showcase fails the build.
- recording which scratch files are exercised, and which are not runnable and why.

## out of scope

- fixing the two failures, the chain defect, the checker, or the fixtures. those are 02 through 05.
- any new construct.

## inputs

- `../README.md`: what the toolchain claims to do.
- `../package.json`: the current test chain.
- `../src/register.ts`, `../src/hook.ts`, `../src/tzx.ts`: how a `.tz` file is made runnable.
- `../src/tzd.ts`: how the headless session already runs a directory.

## steps

1. decide the harness shape. prefer the smallest change that makes a broken spec fail.
2. implement it.
3. run it and confirm it goes red on the current failures, then stays red until 02 through 05 close.
4. note the runnable and non-runnable scratch files.

## acceptance

- `npm test` in `tz/` fails when the scratch spec fails at runtime.
- the failure names the failing tz line, not just a node stack.
- no new dependency, no new framework.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/01-run-the-code.md`. the suite typechecks the emit but never runs it, so `tzx scratch/signup.spec.tz` is broken while `npm test` is green. design and land the smallest run step that makes a failing showcase fail the build. do not fix the failures; make them visible. verify by running the chain and reporting exit codes. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/01-run-the-code.md` before starting.
