# 08 the teaching dissertation

phase: ownership
status: planned
resolves: tutorial organization

## why

the question once parked at `../TUTORIAL.md:16` is a real one, not a chore. the tutorial starts from "where we come from" and explains the `tstd` library and its patterns before showing any tz. the author now wonders whether that pretrains the reader on the library when they came to see the language. teaching `tstd` and teaching `tz` are different jobs, and the tutorial currently braids them.

the author wants a discussion, not a rewrite: a dissertation on how the teaching docs should be organized, what they show, and in what order.

## what this session must produce

a written design, short and concrete, covering:

- **audience.** who the reader is, and whether there is more than one (a person evaluating the language, a person writing it daily, an agent).
- **order.** what comes first: the language, the library, the transpiler idea, or a running program.
- **separation.** what belongs in the tutorial, what belongs in `../DESIGN.md`, what belongs in `../README.md`, and what belongs in a reference.
- **the entry points.** where a reader starts, and the shortest path to a first running program.
- **the file structure.** whether the tutorial stays one file or splits, and the new-line budget.

this is a discussion session. it ends with a design the author approves, not with edited docs. session 09 executes it.

## in scope

- the shape and order of the teaching material.
- the relationship between tz docs and `tstd` docs.

## out of scope

- the rewrite itself (session 09).
- the parked prompts, which session 07 removes.

## inputs

- `../TUTORIAL.md` in full.
- `../DESIGN.md`, for what is already explained where.
- `../README.md`.
- `../../README.md` and `../../STYLE-KB.md`, for the `tstd` side.
- the author's stated taste: zig, comptime, `orelse`, `catch`, `try`.

## steps

1. read the tutorial end to end and mark every place it teaches `tstd` rather than tz.
2. propose two or three organizations, with the tradeoffs.
3. discuss with the author and settle one.
4. write it down in the session context.

## acceptance

- the author has an organization they endorse.
- it names the audience, the order, the separations, and the file structure.
- it fits in one page.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/08-the-teaching-dissertation.md`. the tutorial teaches tstd before tz, and the author questions that order. this is a discussion session: propose two or three organizations for the teaching docs, covering audience, order, separation of tutorial and design and reference, entry points, and file structure, then help the author settle one. produce a design, not edits. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/08-the-teaching-dissertation.md` before starting.
