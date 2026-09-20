# 08 the educational rewrite

phase: ownership
status: planned
resolves: author voice
blocked by: 07

## why

the prompt at `../DESIGN.md:186` asks for the docs to be training material rather than regulation, and for the author's taste to be legible: the path from c++ and c# through typescript and rxjs to f# and haskell, the love of zig's comptime and its `orelse`, `catch` and `try`, and the way this language could have been many other languages and was chosen to be this one.

the current docs describe the rules correctly and communicate none of that. they read like a spec because they are one. a reader should feel why the choices were made, not only what they cost.

## what this session must produce

- the teaching docs rewritten to the organization settled in session 07.
- the voice: educational, journalistic, short subject-verb-object sentences, examples over assertions, the author's reasons visible.
- the coherence spec green throughout, and the line budget respected.
- no rule weakened. the rewrite changes how a rule is explained, never what it is.

## in scope

- `../TUTORIAL.md`, and the prose of `../DESIGN.md` where the voice change applies.
- the `why not` section of `../DESIGN.md`, which is already the most narrative part and is the model for the rest.

## out of scope

- changing the language, the emitter, the ban list, or the role list.
- `../UPDATES.md`, which is a journal and keeps its voice.

## inputs

- the organization from session 07.
- `../DESIGN.md`, especially `why not`.
- `../../README.md` and `../../STYLE-KB.md`.
- `../src/coherence.spec.ts`, for the constraints the prose must satisfy.

## steps

1. work file by file, section by section, against the session 07 design.
2. keep every backticked identifier a known construct; run the coherence spec often.
3. check the line budget.
4. read the result aloud once, for the voice.

## acceptance

- a reader can feel why the language is shaped this way.
- coherence, `npm test` in `tz/`, is green.
- the line budget is met.
- no claim contradicts the code.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap, session 07's design, and this file. copy `session-context-template.md` to `context/08-the-educational-rewrite.md`. rewrite the teaching docs to the organization from session 07, in an educational, journalistic voice that carries the author's taste: the languages he passed through, the love of zig's comptime and its orelse, catch and try, and why this subset over the other subsets it could have been. change no rule and no behavior. keep the coherence spec green and the line budget met. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/08-the-educational-rewrite.md` before starting.
