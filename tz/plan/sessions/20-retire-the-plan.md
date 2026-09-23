# 20 retire the plan

phase: close
status: planned
resolves: the plan itself

## why

the plan is a working aid, not a product. the roadmap opens by saying the principles live in `README.md` and this file is the future, and the comment protocol says a swept note is removed once it lands because the plan is the home and git keeps the memory. the same logic applies to the plan at the end: once every session is done, `plan/` is a directory of notes-to-self that a reader should not meet when they come to the code. `UPDATES.md` is the durable journal, and git keeps the history, so the roadmap, the sessions and the context files can retire without losing a decision.

one thing must outlive the plan. the comment protocol is a living channel rather than a phase, and its markers, channels and sweep are today written in this roadmap. deleting the plan without moving them would retire a working practice with it. so the session relocates the protocol into `AGENTS.md` first, then sweeps every pointer at `plan/`, then deletes the plan.

## what this session must produce

- the comment protocol moved whole into `AGENTS.md`: the three markers, the channels a note may sit in, the sweep at every session close, and the coherence walk's deliberate blanking.
- a sweep of every remaining reference to `plan/` (the docs, `AGENTS.md`, ci, `.vscode`, `package.json`, the editor, source comments), so nothing points at a directory that is gone.
- the deletion of `plan/roadmap.md`, `plan/sessions/`, `plan/context/` and `plan/session-context-template.md`, and the empty `plan/` directory.
- a final `UPDATES.md` entry that closes the plan and records where its living parts went.

## in scope

- the protocol relocation and the pointer sweep.
- the deletion of the plan files.
- the closing journal entry.

## out of scope

- any language work, and any session from 01 to 19.
- changing the protocol's content beyond moving it.

## inputs

- `../roadmap.md`, the protocol and the session table this session is the last line of.
- `../../AGENTS.md`, where the protocol lands.
- `../../UPDATES.md`, the journal the closing entry joins.
- the tree-wide grep for `plan/`, the pointers to sweep.

## steps

1. move the comment protocol into `AGENTS.md`, whole, in the house voice.
2. sweep every reference to `plan/` and repoint or remove it.
3. confirm every session in the table is done, so the plan has nothing left to plan.
4. delete the plan files and the directory.
5. record the closing entry in `UPDATES.md`, and commit.

## acceptance

- no file in the repo points at `plan/`.
- `AGENTS.md` carries the comment protocol whole.
- every session in the table is done before anything is deleted.
- `npm test` is green at the root and in `tz/`.
- `UPDATES.md` names where the plan's living parts went.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/20-retire-the-plan.md`. the plan has done its job and should not outlive its work. move the comment protocol into `AGENTS.md` (it is a living channel, not a phase), sweep every pointer at `plan/`, confirm every session is done, then delete `plan/roadmap.md`, `plan/sessions/`, `plan/context/` and `plan/session-context-template.md`, and write the closing entry in `UPDATES.md`. do not commit until the author reviews.

## context

copy `session-context-template.md` to `context/20-retire-the-plan.md` before starting.
