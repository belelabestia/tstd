# 18 the arrow capture

phase: truth
status: done
resolves: q16

## why

the author's change of mind: `call`, `make` and `scope` carry a `=>`, and the arrow is annoying and misleading there. the same glyph has two jobs. it is the capture the side quests use, "produce a value, stay in scope", and it is the body opener the three boundary constructs carry, where it reads as "open a scope and return from it without breaking the outer flow". a developer meets `scope (hold) => { ... }`, `make => C(...)` and `call => f(...)` and learns a second reading of `=>` before the one the language is built on.

the author's instinct is that a developer should know these are all captures, and that the arrow is one capture spelling a side quest uses to tell an expression from a statement. but the author has no final stance on whether that distinction is needed at all, so this session rules before it changes. it is a vocabulary session, the same family as the `if` overlap (session 21) and the declaration shape (session 19): one glyph, one meaning.

## the questions

1. **do `call`, `make` and `scope` keep `=>`.** if the arrow belongs to capture, what opens their body instead: a paren, a bare block, a bound name, or nothing.
2. **is the side-quest `=>` load bearing.** a side quest decides between an exit and an expression by what follows the `?`, and the arrow is how it names the expression half. does the tail already say which it is, so the arrow is redundant, or does removing it make an expression and a statement indistinguishable.
3. **the replacement.** for each construct and for the side-quest tail, the spelling that reads without the arrow, tested against the decks.
4. **the cost.** what moves: `scan.ts` lookaheads, `emit.ts` handlers, the `roles` entries for `=>`, `call`, `make` and `scope`, the `arrow`, `call`, `make` and `scope` decks, the coherence claims, the tutorial, design and getting-started.

## what this session must produce

- a ruling on the arrow in `call`, `make` and `scope`, with the spelling that replaces it if it goes.
- a ruling on the side-quest expression and statement arrow, kept or dropped, with the reason.
- each rejected alternative and its cost.
- the changes the ruling implies, or the session that makes them.

## in scope

- the `=>` on `call`, `make` and `scope`, and in side-quest tails.
- the capture vocabulary and how many readings `=>` carries.

## out of scope

- the rest of the side quest family, which session 08 settled.
- the exit spelling, which session 14 settled.
- any other construct's shape.

## inputs

- `../TUTORIAL.md`: arrow capture, side quests, `call`, `make`, `scope`.
- `../DESIGN.md`: the vocabulary and the constructs.
- `../src/scan.ts`, `../src/emit.ts` (the `roles` list, the `arrowing`, `calling`, `making`, `scoping` handlers).
- `../constructs/arrow.spec.tz`, `call.spec.tz`, `make.spec.tz`, `scope.spec.tz`.
- `../plan/context/14-the-async-tail.md`, for the exit family the tails were just settled against.

## steps

1. state what `=>` means at each site: the side-quest capture, the `call` body, the `make` body, the `scope` body.
2. list the readings a developer has to hold at once, with the deck lines that force each.
3. propose the spellings that read without the arrow, and test each against the four decks.
4. take the author's ruling, and write the reason for every rejected spelling.
5. land the changes, or write the session that does.

## acceptance

- one reading of `=>` survives, or the arrow leaves the three boundary constructs with a named replacement.
- the side-quest expression and statement question is answered either way, in writing.
- every rejected spelling carries its cost.
- `npm test` in `tz/` stays green through any probe.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the tutorial's arrow-capture and `call`/`make`/`scope` sections, and this file. copy `session-context-template.md` to `context/18-the-arrow-capture.md`. the author objects to the `=>` on `call`, `make` and `scope`: it is the side-quest capture glyph used as a body opener, so the same arrow carries two readings before the reader meets the one the language is built on. decide whether those three keep the arrow and what opens their body instead, and whether the side-quest arrow is load bearing at all. test each candidate against the four decks, take the author's ruling, then land the change or write the session that does. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/18-the-arrow-capture.md` before starting.
