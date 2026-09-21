# 07 the comment protocol

phase: ownership
status: planned
resolves: q3

## why

three `# marco to agent` prompts live inside the docs, parked as html comments: `../TUTORIAL.md:11` and `:16`, and `../DESIGN.md:164` and `:186`. the coherence spec (`../src/coherence.spec.ts:32`) blanks html comment blocks on purpose, because a prompt names words the language does not own.

the author's ruling: this is not a phase to resolve and delete. the author will always want to leave comments in the code and the docs, and to sweep through them every now and then to address what accumulated. that is part of the no-debt approach: a note parked where the work lives is cheaper than carrying it in his head. so the code channel stays, and this session gives it a protocol instead of a cleanup.

## what this session must produce

- a written protocol for comments that carry forward work: which markers exist, what channels they are allowed in (source `//` comments are banned by `../../AGENTS.md:g1`, so the channel is doc comments, specs, and the plan), how a sweep is scheduled, and how the coherence walk treats a parked note so a prompt does not fail the doc walk the way the current blanking hack exists to prevent.
- the parked prompts routed by the new protocol: the ones that are actionable now, the ones that become sessions (the dissertation at 07, the voice at 08), and the ones that become ledger entries.
- the postfix guard example corrected per the prompt at `../DESIGN.md:163`: `const row = table[id] ?none return;` replaces the shape that said the same thing twice, and the surrounding prose simplified.
- the coherence spec's comment-blanking walk reviewed against the protocol. if notes stay, the walk must keep ignoring them deliberately rather than by accident.
- the roadmap ratified as the single home for scheduled work (q3), with the comment protocol named in `../UPDATES.md`.

## in scope

- the two docs and the parked prompts.
- the postfix guard section in `../DESIGN.md`.
- the coherence spec's blanking logic.
- the protocol itself, as a settled rule in the plan.

## out of scope

- the actual tutorial reorganization and voice rewrite (sessions 08 and 09). this session routes the prompts to their sessions; it does not answer them.
- new source-comment syntax. the source ban stands; the protocol works within it.

## inputs

- `../TUTORIAL.md:11` and `:16`.
- `../DESIGN.md:163` and `:185`.
- `../src/coherence.spec.ts`.
- `roadmap.md`, the forward-work home it proposes.
- `../../AGENTS.md` and `../../STYLE-KB.md`, for the comment rules the protocol must live inside.

## steps

1. list every parked prompt and route it by the protocol.
2. settle the protocol: markers, allowed channels, sweep cadence, and the coherence walk's rule.
3. apply the postfix guard correction and clean its prose.
4. move the prompts to their sessions or ledger entries under the new protocol.
5. confirm the coherence spec is green with the protocol in place.

## acceptance

- the protocol is written, and `../UPDATES.md` names it.
- every parked prompt is routed, and the actionable one is applied.
- the postfix guard example reads as the author ruled.
- `npm test` in `tz/` is green.
- the roadmap is named in `../UPDATES.md` as the forward-work home.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/07-the-comment-protocol.md`. this is not a cleanup: the author rules that comments carrying forward work are a living channel, part of the no-debt approach. write the protocol for them (markers, allowed channels, sweep cadence, how the coherence walk ignores a parked note on purpose), route the three parked prompts by it, apply the postfix guard correction, and review the coherence blanking walk. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/07-the-comment-protocol.md` before starting.
