# 19 the struct and the codec

phase: battle
status: planned
resolves: q8, the struct, the codec

## why

a friend of the author's made the realization that `form` is what other libraries call a `struct`: it declares an object, and the name should say so. the sample is also half the story. validation decides whether a payload is a list or an object, and a tuple has no home at all. the author wants the single smart convenience construct that solves the core problem (a shape, its proof, and its encode and decode) and leaves the rest to ordinary programming, even if that means changing `tstd`.

this session absorbs two planned ones, because they are the same charge seen from three sides. the form audit (q8) charged that the line between emitted and hand-written code is arbitrary. the value declaration charged that `export form signup { ... }` puts `form` where a `function` or `class` keyword sits, so it should read `export const signup = struct { ... }` with no `=>`. the codec charge is the third: validation, encode and decode are not right yet. one block decides all three, because the name, the shape and the codec are the same declaration.

## the questions

1. **the name.** does `form` become `struct`, and does `protocol` follow it to `const load = protocol { ... }`.
2. **the declaration shape.** `export const signup = struct { ... }`, with no `=>`, since a `{` here opens an object literal rather than a scope. the derived type still capitalizes the binding, and the factories still read `signup.*`. settle `export` and generics too.
3. **the line between emitted and written.** which half the emitter owns, derivable from a rule rather than chosen case by case: the skeleton only, or the conversions too, since a field triple already names its two functions.
4. **the collection.** a list, an object, a tuple. one convenience (`struct.list(...)`?) and a rule for the rest, or a rule with no convenience at all; the test is whether the construct composes or only writes the boilerplate the caller would write identically.
5. **the codec.** where validation ends and encode and decode begin, whether `struct.model` proves and `struct.decode` carries unboxed, and what has to change in `tstd` for the boundary to be right.

## what this session must produce

- the name and the declaration shape, with the derived name and factory story, `export` and generics.
- the collection rule: how a list, an object and a tuple are declared, and what stays ordinary programming.
- the codec boundary, and the `tstd` changes it needs (allowed, and expected).
- the emitter, library, deck and doc changes the rulings imply, or the sessions they split into.

## in scope

- `form` (`struct`), its fields, its emitted skeleton, and the library conversions.
- `protocol`, as far as the same declaration shape reaches it.
- the validation and codec boundary, across `tz` and `tstd`.

## out of scope

- codecs that validate and convert in one step, `Either`, error accumulation: those stay refused.
- any construct other than `form` and `protocol`.

## inputs

- `../src/form.ts` (tz) and `../../src/form.ts`, `../../src/is.ts`, `../../src/protocol.ts` (the library).
- `../TUTORIAL.md` and `../DESIGN.md`: the `form` and `protocol` sections.
- `../src/emit.ts`, the `forming` and `protocoling` handlers, and the `roles` entries.
- `../constructs/form.spec.tz` and `../constructs/protocol.spec.tz`.
- `../plan/context/15-the-first-build.md`, friction 1 and 3: `form` cannot declare an array of a nested form, and `form.models` proves a list but nothing decodes one.

## steps

1. build the inventory: every field spelling, what the emitter writes, what the caller writes.
2. state the candidate rules for the name, the shape and the emit line, each with its reasoning.
3. answer the collection and codec questions against the library, naming the `tstd` changes.
4. take the author's ruling, then implement it, or write the session that does.
5. update the library, the emitter, the deck, the docs and the coherence expectations.

## acceptance

- every field spelling has one predictable rule, stated in a sentence and holding across the deck.
- the name and the declaration shape are ruled, with the rejected alternatives and their costs.
- a list, an object and a tuple each have a spelling or a written reason they stay ordinary code.
- the codec boundary is described in the docs as shipped, and `npm test` is green at the root and in `tz/`.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the `form` and `protocol` sections of the tutorial and design, the form and protocol specs at the root and in `tz/`, and this file. copy `session-context-template.md` to `context/19-the-struct-and-the-codec.md`. the author's charges, folded into one session: `form` is a `struct` and should be named so; its declaration should read `export const signup = struct { ... }` with no `=>`; the line between emitted and hand-written code is arbitrary; and validation and encode and decode are not right yet, with `tstd` open to change. answer the name, the shape, the emit line, the list/object/tuple rule and the codec boundary, take the author's ruling, then implement it or write the sessions it splits into. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/19-the-struct-and-the-codec.md` before starting.
