# 13 the agent bootstrap

phase: onboarding
status: planned
resolves: the agent starting point

## why

tz is unusually suited to agent onboarding: the ban list is already a machine-readable table, the vocabulary is three words, and the grammar is deliberately small. an agent that knows the rules can write tz well, which is not true of typescript at large.

the build that battle-tests tz (session 14) wants an agent as a builder, so the agent needs a contract before the build, not only after it. this session writes the bootstrap: what an agent needs to write tz at all. session 16 hardens it into the tested contract, folding in the friction the build produces.

## what this session must produce

- an agent-facing bootstrap: the language contract (the three construct names, the ban list and why, the refusals), how to run the toolchain, how to verify a change, and what to do when a construct is missing.
- the format and the home: a document, a `tz/AGENTS.md` for downstream repos, or both.
- the one instruction an existing agent can be pointed at.
- it points at the code as truth for the ban list and the roles list, rather than copying them.

## in scope

- the bootstrap and its home.
- making the ban list and the roles list legible to an agent without duplicating their truth.

## out of scope

- the tested contract after the build (session 16).
- people onboarding (session 15).
- any change to the language.

## inputs

- `../../AGENTS.md`, the working-rules pattern this repo already uses.
- `../src/ban.ts`, `../src/emit.ts` (the roles list), `../src/scan.ts` (the vocabulary).
- `../TUTORIAL.md`.
- the session 12 target brief, so the bootstrap names the surface the build will stress.

## steps

1. list what an agent must know to write tz, and what it can look up.
2. choose the format and the home.
3. write it.
4. point an agent at it cold and see whether it can produce a running tz file.

## acceptance

- an agent given only the bootstrap can write a program that `tzc` accepts.
- the bootstrap points at the code as the truth for the ban list and the roles, rather than copying them.
- the author endorses the bootstrap.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the session 12 brief, and this file. copy `session-context-template.md` to `context/13-the-agent-bootstrap.md`. write the agent bootstrap: the language contract, the toolchain loop, the refusals, and where to look when unsure. choose the format (document, a `tz/AGENTS.md` for downstream repos, or both) and point it at the ban list and roles list as the truth rather than copying them. test it by pointing an agent at it cold. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/13-the-agent-bootstrap.md` before starting.
