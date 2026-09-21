# 14 onboard agents

phase: onboarding
status: planned
resolves: the agent contract
blocked by: 12

## why

the author wants material that onboards agents as well as people, and tz is unusually suited to it: the ban list is already a machine-readable table, the vocabulary is three words, and the grammar is deliberately small. an agent that knows the rules can write tz well, which is not true of typescript at large.

the work is to say what an agent needs, and only that: the contract, the loop, the refusals, and where to look when unsure.

## what this session must produce

- an agent-facing guide: the language contract (the three construct names, the ban list and why, the refusals), how to run the toolchain, how to verify a change, and what to do when a construct is missing.
- a decision on the format: a document, or a `tz/AGENTS.md` for downstream repos, or both.
- the bootstrapping instruction an existing agent can be pointed at.

## in scope

- the agent contract and its home.
- making the ban list and the roles list legible to an agent without duplicating their truth.

## out of scope

- people onboarding (session 13).
- any change to the language.

## inputs

- `../../AGENTS.md`, the working-rules pattern this repo already uses.
- `../src/ban.ts`, `../src/emit.ts` (the roles list), `../src/scan.ts` (the vocabulary).
- `../TUTORIAL.md` after session 09.
- the session 12 friction journal, for the mistakes an agent made or would make.

## steps

1. list what an agent must know to write tz, and what it can look up.
2. choose the format and the home.
3. write it.
4. point an agent at it cold and see whether it can produce a running tz file.

## acceptance

- an agent given only the guide can write a program that `tzc` accepts.
- the guide points at the code as the truth for the ban list and the roles, rather than copying them.
- the author endorses the contract.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap, the session 09 docs, and this file. copy `session-context-template.md` to `context/14-onboard-agents.md`. write the agent-facing guide: the language contract, the toolchain loop, the refusals, and where to look when unsure. choose the format (document, a tz/AGENTS.md for downstream repos, or both) and point the guide at the ban list and roles list as the truth rather than copying them. test it by pointing an agent at the guide cold. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/14-onboard-agents.md` before starting.
