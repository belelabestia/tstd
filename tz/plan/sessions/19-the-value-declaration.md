# 19 the value declaration

phase: truth
status: planned
resolves: the declaration shape

## why

the author's realization: `export form signup { ... }` puts `form` where a `function` or `class` keyword sits, and that position promises a declaration whose name the keyword binds. but `form` is not a keyword and `signup` is not a name it binds; `form` builds a value out of an object literal, and the name belongs to a `const`. the spelling the author wants is

```tz
export const signup = form {
  email: is.string,
  age: is.number
};
```

no `=>`, because `{` here opens an object literal, not a scope. the same objection lands on `protocol`, which today reads `protocol load { ... }` and should read `const load = protocol { ... }`, or however the discussion settles the shape.

this is a shape complaint, not a feature: the construct is right, the position is wrong. it is the same family as the `if` overlap (session 18) and the naming rules: one spelling per idea, and the spelling should say what the thing is.

## the questions

1. **the target spelling.** `export const signup = form { ... }` and `const load = protocol { ... }`, or a parenthesised `form({ ... })` / `protocol({ ... })`? no `=>` either way; confirm that `{` is an object literal and opens no scope, and say what the trailing `;` does.
2. **the name it derives.** today `form signup` derives `SignupForm`/`Signup`, and `protocol load` derives `Load` and the `load` factory record. under `const signup`, does the derived type still capitalize the binding, and do the factories still read `signup.*`? the naming rule (same word, case-distinguished) is unchanged; where the name now comes from is the question.
3. **generics.** `export protocol outcome<T, E> { ... }` has no obvious home in `const outcome = protocol<T, E> { ... }`. settle the generic spelling, or the reason it cannot ride.
4. **what `export` exports.** `export const signup = form { ... }` exports the value; the derived type must travel too. is one `export` enough, or does the type need its own line.
5. **the recognition cost.** the lexer finds `scope` by lookahead and `protocol` by `protocol`, then a name, then `{`. `const x = protocol {` is a different follow set, and `form` and `protocol` become expression heads rather than declaration heads. inventory what moves: `scan.ts`, `emit.ts`, the `roles` list, `ban.ts`, the decks, the coherence claims, the docs.
6. **the relation to sessions 10 and 16.** session 10 names the base and touches `protocol` and `form` as leaky constructs; session 16 audits `form`'s emit. does this discussion gate them, feed them, or run after? this session decides, per the author's instruction that it owns its own schedule.

## what this session must produce

- a discussion, not an execution: the target spelling for `form` and `protocol`, and the ruling behind it.
- the rejected alternatives, with their costs.
- the list of what changes if it lands (lexer, emitter, roles, decks, coherence, docs, examples, constructs).
- the session or sessions that execute it, and their place in the roadmap. this discussion owns that schedule; nothing is planned here.

## in scope

- the declaration shape of `form` and `protocol`.
- the value-and-name story: `const`, `export`, derived types, factories, generics.
- the recognition cost, inventoried not implemented.

## out of scope

- implementing the change.
- scheduling the execution, beyond naming the session that will.
- any other construct's shape.

## inputs

- `../TUTORIAL.md`, the `form` and `protocol` sections.
- `../DESIGN.md`, the constructs and the recognition notes under `## the new words`.
- `../src/emit.ts` (`forming`, `protocoling`, `construct`), `../src/scan.ts` (the lookaheads), `../src/ban.ts`.
- `../constructs/form.spec.tz` and `../constructs/protocol.spec.tz`.
- session 10's design (the base dialect) and session 16's charge (the form line).

## steps

1. state the target spelling for both constructs, with the object-literal and no-scope reasoning.
2. work the name, `export` and generics story against the naming rule.
3. inventory the recognition and coherence cost.
4. take the author's ruling, and name the executing session(s) it authorizes.

## acceptance

- the author endorses a target spelling or defers it, in writing.
- every rejected alternative carries its reason.
- the execution cost is inventoried, even if the execution is deferred.
- nothing in the code or the docs changed by this session.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/19-the-value-declaration.md`. the author objects to `export form signup { ... }` and `protocol load { ... }`: `form` and `protocol` sit where `function`/`class` keywords sit, but they build values from object literals, so the shape should be `export const signup = form { ... }` with no `=>` (a `{` here is an object literal, not a scope). discuss the target spelling for both, the derived name and factory story, `export`, generics, and the recognition cost, then take the author's ruling. this is a discussion: change nothing, and let this session own the schedule of the execution it authorizes.

## context

copy `session-context-template.md` to `context/19-the-value-declaration.md` before starting.
