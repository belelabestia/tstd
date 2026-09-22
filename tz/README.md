# tz - the typezig prototype

tz is a superset of a subset of typescript, with its own standard library, out of the box. `tstd` is the seed: the core library that carries every principle, and it works in plain typescript on its own. tz is the language built to optimize that usage to a point typescript alone could never reach. the design notes are in `tz/DESIGN.md`; the spec is in `tz/TUTORIAL.md`; the journal of decisions is in `tz/UPDATES.md`; the plan of action is in `tz/plan/roadmap.md`. this file is the entry point: how to run it and where the rest lives.

## a taste

one small program, and most of the language is in it: a `form` for the shape, a `scope` that holds the connection and gives it back, `try` to propagate without naming, `await call` at the foreign boundary, a side quest to refuse, and `ok` to answer.

```tz
import { call, form, is, result, scope } from '@belelabestia/tstd';

export form signup {
  email: is.string,
  age: is.number
}

export const submit = (raw: unknown, save: (conn: Conn, user: Signup) => Promise<string>) => scope (hold) => {
  const conn = try hold(connect());

  form.model(raw, signup) ?! err 'malformed signup';

  const user = form.decode(raw, signup);
  user.age ?< 18 err 'under age';

  const id = try await call => save(conn, user);

  ok `created ${id}`;
};
```

## running it

```
npm install
npm run build
npm test
```

then, from this directory:

```
node dist/tzc.js examples constructs             # emit the .ts beside each .tz, then typecheck both
node dist/tzx.js --test constructs/arrow.spec.tz # run a construct deck
node dist/tzx.js --test examples/signup.spec.tz  # run the example spec
node dist/tzx.js examples/main.tz                # run a program
node dist/tzd.js examples constructs             # the editor checks, headless: tzc parity plus the unranked warnings
```

`tzc` mirrors `tsc`: it emits, runs `tsc` on the emit, and moves every diagnostic back onto the `.tz` line and column it came from. `--out <dir>` mirrors the tree somewhere else and `--no-check` stops after the emit.

`tzx` mirrors `tsx`: a node loader hook turns `.tz` into typescript in memory and lets node strip the types, so nothing lands on disk. every argument goes through to node, which is why `--test` works. a relative `./x.js` import resolves to `x.tz` when one is there, so a tz file writes the same specifier the emit will.

two things to know when writing a `.tz` file:

- **the emitter never writes an import.** a file that says `ok` imports `result`, one that uses a side quest imports `is`. forget one and `tsc` tells you, in the usual way, on the right line.
- **a type only import has to say `type`.** `tzx` leans on node's own type stripping, which cannot tell a type from a value, so write `import { result, type Result } from ...`.

## the editor

`editor/` is a vs code extension with no code in it: a language for `.tz`, a grammar that is one include of `source.ts`, and an injection that adds the words typescript does not have. point your extensions directory at it and reload the window.

```
New-Item -Path "$env:USERPROFILE\.vscode\extensions\typezig" -ItemType Junction -Target .\editor
```

the words are an injection rather than a pattern in the grammar because an include of `source.ts` only reaches the top level of a file, and a side quest is always inside a body. an injection is merged into every rule at every depth instead, and `-comment -string` in its selector keeps it out of prose.

it knows `try`, `scope`, `protocol`, `form`, `call`, `else`, the `ok`, `err`, `async`, `return`, `break` and `continue` exits, the `?none`, `?some`, `?==`, `?:tag` and `?(cond)` side quests plus bare `?` and `?!`, the `:tag` construction, and the `:tag`, `==`, `else` and `(cond)` arms of a `? {}` block. inside a `protocol` declaration it colors the branch names and the `=>` targets, so a machine reads as arrows between names instead of a block of white.

two residues, both wontfix and cosmetic. typescript's grammar reads a `? {}` arm as an object literal key, so a quoted arm value loses string scope and the selector cannot see it; the grammar refuses any word with a quote against it instead. a tz word inside a template hole stays unhighlighted because the whole template is a string to the selector.

## what is here

- the side quest family, postfix on any value: `?none` / `?some`, `?==` / `?!=` / `?>` / `?<` / `?>=` / `?<=`, `?&(...)` / `?|(...)`, `?:tag`, `?(cond)`, bare `?` / `?!`, with an exit, an arrow capture, a block, or an `else` chain after them
- `? {}`, over a value, a branch, or `true`: quoted and literal arms for values, a `:tag` arm matching a branch and binding what it carries, `(cond)` arms for computed cases, and `_` for the open case, with `tsc` owning totality
- `:tag` construction, the literal notation for a branch, with or without its value
- `ok`, `err`, `async`, `return`, `break`, `continue`: the exit family, with the one discipline per body they buy
- `try`, and `call` for the foreign boundary it isolates
- `make`, the constructor that does not throw, so `new` stays off the table
- `form`, declaring the wire shape and the domain shape once
- `scope`, which holds resources and hands them back in reverse
- `protocol`, a union or a machine in one block, with `export` and generics
- the inferred lifts: an `await` makes a body async, an `ok` makes it fallible
- the implied `ok` at the end of a fallible body
- the ban list, `==` and `!=` emitting the strict ones
- `tzc`, `tzx`, and diagnostics that land on the source
- a coherence spec that walks the docs against the code, so drift fails the build

`constructs/` holds one deck per construct: a `spec.tz` of small use cases with walkthrough comments, so the construct can be read and run on its own. `examples/` holds the modules that solve whole problems, with `examples/signup.spec.tz` as their spec. `npm test` runs both, `tzc` and `tzd` emit and check both, so a construct that drifts out of the showcase fails the build.

## what is not

the lsp and the checks that need a type are next: conditions must be boolean, a `Result` statement must be `void` prefixed, and a `? {}` over a union must be exhaustive. none of them belong in the emitter and one of them cannot be there at all.

`tz` is self contained on purpose, so it can move to its own repo with a `git mv`. it depends on `tstd` the way any consumer does, through the package name.
