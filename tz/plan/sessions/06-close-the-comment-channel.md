# 06 close the comment channel

phase: ownership
status: planned
resolves: q3

## why

three `# marco to agent` prompts live inside the docs, parked as html comments: `../TUTORIAL.md:11` and `:16`, and `../DESIGN.md:164` and `:186`. the coherence spec (`../src/coherence.spec.ts:32`) blanks html comment blocks on purpose, because a prompt names words the language does not own.

the result is a conversation sitting inside the artifact it is about. the author cannot read the docs and know them to be true, and forward work has no home except a comment. this session ends that channel.

## what this session must produce

- every parked prompt removed from `../TUTORIAL.md` and `../DESIGN.md`.
- the postfix guard example corrected per the prompt at `../DESIGN.md:163`: `const row = table[id] ?none return;` replaces the shape that said the same thing twice, and the surrounding prose simplified.
- the tutorial and design prompts relocated: the dissertation to session 07, the voice rewrite to session 08, anything else to this plan.
- the coherence spec's comment-blanking walk reviewed. if no parked comment remains, decide whether to keep the walk as a guard or drop it.
- the roadmap ratified as the single home for forward work (q3).

## in scope

- the two docs and the parked prompts.
- the postfix guard section in `../DESIGN.md`.
- the coherence spec's blanking logic.

## out of scope

- the actual tutorial reorganization and voice rewrite (sessions 07 and 08). this session moves the prompts to their sessions; it does not answer them.

## inputs

- `../TUTORIAL.md:11` and `:16`.
- `../DESIGN.md:163` and `:185`.
- `../src/coherence.spec.ts`.
- `roadmap.md`.

## steps

1. list every parked prompt and route it: action here, or a session.
2. apply the postfix guard correction and clean its prose.
3. remove the prompts.
4. review the coherence walk.
5. confirm the coherence spec is green with the prompts gone.

## acceptance

- no `marco to agent` remains in the tree.
- the postfix guard example reads as the author ruled.
- `npm test` in `tz/` is green.
- the roadmap is named in `../UPDATES.md` as the forward-work home.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/06-close-the-comment-channel.md`. three `marco to agent` prompts are parked in TUTORIAL.md and DESIGN.md. route each one (the postfix guard correction is actioned here; the dissertation goes to session 07 and the voice rewrite to session 08), remove the prompts, and review the coherence spec's comment-blanking walk now that no prompt remains. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/06-close-the-comment-channel.md` before starting.
