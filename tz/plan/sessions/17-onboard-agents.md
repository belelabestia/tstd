# 17 onboard agents

phase: onboarding
status: planned
resolves: the agent contract
blocked by: 14

## why

the author wants material that onboards agents as well as people, and tz is unusually suited to it: the ban list is already a machine-readable table, the vocabulary is three words, and the grammar is deliberately small. an agent that knows the rules can write tz well, which is not true of typescript at large.

the bootstrap (session 13) already says what an agent needs: the contract, the loop, the refusals, and where to look when unsure. this session hardens it with the build (session 15), folding in the mistakes an agent actually made or would make, and proves the result by pointing an agent cold at it.

## what this session must produce

- the hardened agent guide: the session 13 bootstrap corrected by the build's friction, with the mistakes an agent actually made or would make.
- a decision on the format: a document, or a `tz/AGENTS.md` for downstream repos, or both, if the bootstrap left it open.
- the bootstrapping instruction an existing agent can be pointed at, proven against the finished build.

## in scope

- the agent contract and its home.
- making the ban list and the roles list legible to an agent without duplicating their truth.

## out of scope

- people onboarding (session 16).
- any change to the language.

## inputs

- the session 13 bootstrap.
- `../../AGENTS.md`, the working-rules pattern this repo already uses.
- `../src/ban.ts`, `../src/emit.ts` (the roles list), `../src/scan.ts` (the vocabulary).
- `../TUTORIAL.md` after session 09.
- the session 15 friction journal, for the mistakes an agent made or would make.

## steps

1. read the session 13 bootstrap and the session 15 friction journal.
2. fold the agent's mistakes and lookups into the contract.
3. settle the format and the home if the bootstrap left them open.
4. point an agent at the hardened guide cold and see whether it can produce a running tz file.

## acceptance

- an agent given only the guide can write a program that `tzc` accepts.
- the guide points at the code as the truth for the ban list and the roles, rather than copying them.
- the author endorses the contract.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the session 13 bootstrap, the session 15 friction journal, and this file. copy `session-context-template.md` to `context/17-onboard-agents.md`. harden the agent bootstrap with the build's friction: fold in the mistakes an agent actually made or would make, settle the format and home, and point the guide at the ban list and roles list as the truth rather than copying them. test it by pointing an agent at the guide cold. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/17-onboard-agents.md` before starting.
