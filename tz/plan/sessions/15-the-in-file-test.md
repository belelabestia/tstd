# 15 the in-file test

phase: battle
status: planned
resolves: q9

## why

the author wants a `test` keyword like zig's: a test written in the file it tests, able to reach what is internal to the module. today every assertion lives in a sibling `.spec.ts` and imports the module's exports, so a private helper or a value that never leaves the file cannot be tested where it lives.

the author's own hedge: "i'm not sure this is entirely feasible". so this is an exploration session before it is an implementation session. the question is what an in-file test can mean when tz is a token-level transpiler whose output is a single typescript file, and when the house rules already ban a second test framework.

open ground to survey:

- **what zig's test is.** a `test "name" { ... }` block in the file, compiled into a separate test binary, reaching the module's private names because it is the same compilation unit. the reach into privates is the point.
- **what tz's emitter could do.** emit the test block as a `test(...)` call the existing runner already understands, keeping it in the emitted typescript so it can see unexported locals by closure. that would make an in-file test runnable by the same `tsx --test` / `tzx --test` chain with no new tool.
- **what it costs.** a `test` keyword enters the vocabulary and the ban list, `test` becomes a reserved name, the emitter must know which file is a test target, and the docs grow a construct. the `roles` list, the coherence checks and a deck all follow.
- **the runner split.** the house rule bans "another test framework", not the runner already in use. an in-file `test` that compiles to the same `node:test` call is the same framework, not a second one. that distinction has to be written down or the keyword looks like a violation.
- **the blank form.** `test { ... }` vs `test "name" { ... }`; whether the name is required or inferred; how a test that is not run by default is invoked.

## what this session must produce

- a written answer to feasibility: can an in-file test reach module internals through the emit, and is the runner the same one.
- if feasible, the syntax, the emitted form, and the session that builds it.
- if not, the reason, written so it is not retried blindly.
- the house-rule amendment that permits it, or the ruling that it stays refused.

## in scope

- the feasibility of an in-file `test` keyword.
- the emitted shape and the runner it compiles to.
- the vocabulary, ban-list and coherence consequences.

## out of scope

- building the runner or the assertions; those already exist.
- a second test framework, which stays banned.
- `describe`, hooks and mocks, which stay banned.

## inputs

- `../src/emit.ts`, the keyword handlers, and how a construct becomes emitted typescript.
- `../src/ban.ts`, for how a new keyword joins the ban list.
- `../package.json`, the `test` script, for the runner an in-file test would target.
- `../../AGENTS.md` and `../../STYLE-KB.md`, the spec rules an in-file test would touch.
- the author's stated taste: zig, and a test that lives in the file it tests.

## steps

1. read how zig's in-file test reaches privates, and state it precisely.
2. test whether the emit can place a `test(...)` call in the same module scope, reaching unexported locals.
3. list the vocabulary, ban-list, `roles` and coherence changes the keyword forces.
4. take the author's ruling on feasibility and syntax, or the refusal.
5. write the design, and the session that builds it if it passes.

## acceptance

- feasibility is answered with a compiled probe, not a guess.
- if feasible, the syntax, the emitted form, and the runner are named, and the house-rule amendment is written.
- if refused, the reason is written and the idea moves to the parked list.
- `npm test` in `tz/` stays green through any probe.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/15-the-in-file-test.md`. the author wants a `test` keyword like zig's, living in the file it tests and reaching module internals, and is unsure it is feasible. probe whether the emit can put a `test(...)` call in module scope that sees unexported locals, name the runner and the syntax if it can, and write the house-rule amendment that permits it (the ban is on a second framework, not the one already in use). if it cannot, write why. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/15-the-in-file-test.md` before starting.
