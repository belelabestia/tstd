# tz - the typezig prototype

typescript with most of typescript taken away, plus a few constructs, transpiled back to
typescript that imports `tstd`. the design notes are in `.claude/typezig.md`; this is the
thing they describe, far enough along to write code in. the language walkthrough is in
`tutorial.md`.

it is a **sugar transpiler**: a token level rewriter that leaves every character it does not
recognise alone. it never parses typescript, it lexes it. one line in makes one line out, so
the line number is the whole source map. the emitter has no opinions, knows no types, and
never writes an import.

## running it

```
npm install
npm run build
npm test
```

then, from this directory:

```
node dist/tzc.js scratch                        # emit the .ts beside each .tz, then typecheck it
node dist/tzx.js --test scratch/signup.spec.tz  # run a spec
node dist/tzx.js scratch/main.tz                # run a program
```

`tzc` mirrors `tsc`: it emits, runs `tsc` on the emit, and moves every diagnostic back onto
the `.tz` line and column it came from. `--out <dir>` mirrors the tree somewhere else and
`--no-check` stops after the emit.

`tzx` mirrors `tsx`: a node loader hook turns `.tz` into typescript in memory and lets node
strip the types, so nothing lands on disk. every argument goes through to node, which is why
`--test` works. a relative `./x.js` import resolves to `x.tz` when one is there, so a tz file
writes the same specifier the emit will.

two things to know when writing a `.tz` file:

- **the emitter never writes an import.** a file that says `ok` imports `result`, one that says
  `?none` imports `is`. forget one and `tsc` tells you, in the usual way, on the right line.
- **a type only import has to say `type`.** `tzx` leans on node's own type stripping, which
  cannot tell a type from a value, so write `import { result, type Result } from ...`.

## the editor

`editor/` is a vs code extension with no code in it: a language for `.tz`, a grammar that is one
include of `source.ts`, and an injection that adds the words typescript does not have. point
your extensions directory at it and reload the window.

```
New-Item -ItemType Junction -Path "$env:USERPROFILE\.vscode\extensions\typezig" -Target .\editor
```

the words are an injection rather than a pattern in the grammar because an include of
`source.ts` only reaches the top level of a file, and a matcher is always inside a body. an
injection is merged into every rule at every depth instead, and `-comment -string` in its
selector keeps it out of prose.

it knows `try`, `scope`, `protocol`, `form`, `call`, `else`, the `ok`, `err`, `async`, `return`,
`break` and `continue` exits, the `?none`, `?some`, `?true`, `?false`, `?:tag` and `?(cond)`
matchers, the `:tag` construction, and the `:tag`, `_`, literal, quoted and `(cond)` arms of a
`? {}` block, and inside a `protocol` declaration it colors the branch names and the `=>`
targets, so a machine reads as arrows between names instead of a block of white.

two residues, both cosmetic. typescript's grammar reads a `? {}` arm as an object literal key,
so a word in a quoted arm value arrives with no string scope on it and the selector cannot see
it; the grammar refuses any word with a quote against it, which covers every spelling that
occurs. and a tz word inside a template hole is not highlighted, because the whole template is
a string to the selector.

## what is here

- the `?` side matchers, postfix on any value: `?none` / `?some`, `?true` / `?false`,
  `?:tag`, `?literal`, `?(cond)`, with an exit, an expression, a block, or an `else`
  after them, and a bare `?` block listing every arm; `=>` answers only where its value
  lands, so a statement never uses it; `?some` and `?:tag` bind what they carry, and a
  binding nothing uses is refused
- the statement `if` with no `else`, for declining without a matcher
- `? {}`, over a value, a branch, or `true`: quoted and literal arms for values, a `:tag`
  arm matching a branch and binding what it carries, `(cond)` arms for computed cases,
  `_` always required; identity blocks switch on the subject, condition blocks on `true`
- `:tag` construction, the literal notation for a branch, with or without its value
- `ok`, `err`, `async`, and the one discipline per body they buy
- `try`, and `call` for the foreign boundary it isolates
- `form`, declaring the wire shape and the domain shape once
- `scope`, which holds resources and hands them back in reverse
- `protocol`, a union or a machine in one block, with `export` and generics
- the inferred lifts: an `await` makes a body async, an `ok` makes it fallible
- the implied `ok` at the end of a fallible body
- the ban list, `==` and `!=` emitting the strict ones
- `tzc`, `tzx`, and diagnostics that land on the source

`scratch/` shows every one of them and both commands run over it.

## what is not

the lsp and the checks that need a type are next: conditions must be boolean, a `Result`
statement must be `void` prefixed, and a `? {}` over a union must be exhaustive. none of them
belong in the emitter and one of them cannot be there at all.

`tz` is self contained on purpose, so it can move to its own repo with a `git mv`. it depends
on `tstd` the way any consumer does, through the package name.
