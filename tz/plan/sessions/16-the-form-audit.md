# 16 the form audit

phase: battle
status: planned
resolves: q8

## why

the author has mixed feelings about `form`, and the concrete charge is inconsistency: some code is emitted automatically, some is not, and the line between them is arbitrary. a reader cannot predict which half writes itself.

the current split, from `../TUTORIAL.md` and the emitter: a `form` block emits the fields record, the `Encoded` type and the `Decoded` type, while `form.plain`, `form.as`, `form.nest` and every conversion come from the library and are written by hand inside the block. so the block emits its skeleton and then defers its substance. the question is whether that is a principle (the emitter owns declarations, the library owns behavior) or an accident the construct never resolved.

this session runs the same kind of audit session 05 ran on the showcase, but on `form`: inventory every field form, every emitted piece, every hand-written piece, and decide where the line belongs. it is a design session first, an implementation session second.

## the question

where is the line between what `form` emits and what the caller writes, and is the current line derivable from a rule rather than chosen case by case? candidate rules, to be tested against the audit:

- emit exactly what cannot be inferred (the types), write everything that can (the fields and conversions).
- emit every field the same way, triple or plain, so `form.plain` disappears and a bare guard becomes a plain field by rule.
- emit nothing beyond the type, and make the block a pure declaration the caller fills.
- the opposite: emit the conversions too, since a triple already names its two functions.

## what this session must produce

- an inventory: every field spelling, what the emitter writes, what the caller writes.
- the ruling, with the rejected alternatives.
- the emitter and doc changes the ruling implies, or a session split if it grows.
- a note on `protocol` if adjacent findings surface while reading the same code.

## in scope

- `form`, its fields, its emitted skeleton, and `../src/form.ts`.
- the form section of `../TUTORIAL.md` and `../DESIGN.md`.
- the `roles` entry and its `form` deck.

## out of scope

- `protocol`, unless the audit uncovers a `protocol` inconsistency worth its own entry (that would become q12 and its own session).
- codecs, `Either`, error accumulation, which stay refused.

## inputs

- `../src/form.ts` and `../src/form.spec.ts`.
- `../TUTORIAL.md`, the form section.
- `../DESIGN.md`, the form decision.
- `../src/emit.ts`, the `forming` handler.
- `../constructs/form.spec.tz`, the deck.

## steps

1. build the inventory from the emitter and the library.
2. state two or three candidate lines, each with the rule behind it.
3. take the author's ruling.
4. implement the ruling, or write the session that does.
5. update the deck, the docs, and the coherence expectations.

## acceptance

- every field spelling has one predictable rule.
- the rule is stated in one sentence and holds across the deck.
- `npm test` in `tz/` is green.
- the docs describe the shipped behavior.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/16-the-form-audit.md`. the author's charge is that `form` is inconsistent: some code is emitted, some is written by hand, and the line is arbitrary. inventory every field spelling and every emitted piece, propose candidate rules for where the line belongs, take the author's ruling, then implement it or write the session that does. note any `protocol` finding separately. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/16-the-form-audit.md` before starting.
