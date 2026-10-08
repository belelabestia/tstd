# AGENTS.md

the contract for writing `tz`, for an agent and for a person. the language is small on purpose, so this file is short: the three names every line is built from, the spellings tz refuses, how to run the toolchain, and what to do when a construct is missing. the code is the truth; where this file and the code disagree, the code wins and this file is the bug.

the working rules for the repo are in `../../../AGENTS.md`; this file is the tz half of them. the language is taught in `TUTORIAL.md`, the why is in `DESIGN.md`, and the history is in `UPDATES.md`.

## read first

- this file: the contract.
- `src/typecore.ts`: the ban table. the refused words and the warned library spellings, one row each, with the replacement. the truth for the ban list.
- `src/ban.ts`: the pass that enforces the table, plus the punctuation and shape refusals the table cannot hold.
- `src/emit.ts`: the `roles` list. every construct, its role, its deck and its handler. the truth for the constructs.
- `src/scan.ts`: the vocabulary, the truth for the words tz adds.
- `TUTORIAL.md`: how to write the language, one construct at a time.
- `constructs/` and `examples/`: a deck per construct, and the whole programs.

## the language contract

the syntax is built from three forms; everything else tz adds is a construct that bonds to a `tstd` module.

- **exit**: leaving the scope. `return`, `err`, `ok`, `break`, `continue`. a body answers one way: `return`, or the fallible `ok`/`err`, or `async`; mixing those is refused (`ok` and `err` are one discipline and sit together).
- **arrow capture**: the `=>` form. it captures whatever is returned and stays in scope. it replaces `??` and `?:`.
- **side quest**: the `?` family. it tests a value where it stands and decides between an exit and an arrow capture by what follows it. it replaces the early-return `if`, the two-branch `if`/`else`, the ternary and the `switch`.

the constructs beyond the three are the language forms of `tstd` modules: `scope`, `protocol`, `form`, `call`, `make`, and `try`, plus the `:tag` construction. the `roles` list in `src/emit.ts` is the truth for the whole set; everything not in it is typecore, left as-is.

## the ban list

the ban list is split, so read both files; do not copy the rows, they drift.

the refused **words** are the table in `src/typecore.ts`: `class`, `function`, `this`, `new`, `interface`, `enum`, `var`, `namespace`, `module`, `any`, `instanceof`, `yield`, the class modifiers (`abstract`, `implements`, `private`, `protected`, `public`, `super`), `throw`, `switch`, `catch`, `finally`. `extends` and `constructor` need no row: they are unreachable once `class` is gone.

the refused **punctuation and shapes** are in `src/ban.ts`: `===`/`!==`, `??`, a comparison against `null`/`undefined`, an assignment used as an expression, `?:` (write a side quest), the gluing mistakes around `?`, a typescript `try {`, a bare `return;`, the `async` modifier, `Promise.reject`, `get`/`set`, and the method shorthand, which hides a `this` its type never states.

every refusal's diagnostic names the replacement. a spelling the library owns rather than the language (`protocol.init`, `result.ok`, `scope.sync`, `call.sync`, `branch`, `make`) is warned by the editor, not banned, because interop needs it. one documented ban is not enforced yet: a statement `else`, which is the `if` overlap (session 20).

## running it

```
npm install
npm run build
npm test
```

then, from `tz/`:

```
node dist/tzc.js examples constructs    # emit the .ts beside each .tz, then typecheck both
node dist/tzx.js examples/main.tz       # run a program
node dist/tzx.js --test constructs/arrow.spec.tz   # run a construct deck
node dist/tzd.js examples constructs    # the editor checks, headless
```

`tzc` takes a file or a directory, mirrors `tsc`, and moves a diagnostic back onto the `.tz` line. `tzx` mirrors `tsx`, and `tzd` is the editor checks.

the emitter never writes an import; the imports are yours: `ok` and `err` need `result`, a `form` declaration needs `form` and the guards it names (`is`), and a `protocol` needs `protocol` and `Union`. a type only import has to say `type`, because `tzx` leans on node's own type stripping.

## verifying

- judge a typecheck by its **exit code**, never by grepping its output. typescript 7 colourises, so a grep for `error TS` finds nothing; run `npx tsc --noEmit --pretty false` and read `$?`.
- a spec is the type assertion. assert a type positively by assignment, and negatively with `// @ts-expect-error`, which fails the build when the type stops being wrong.
- never say inference works without having compiled it. a scratch spec, checked and deleted, is the cheap way.

## when a construct is missing

write the boilerplate, do not invent an operator. if the language truly cannot say it, that is friction, and friction is the product: record it with `#todo`, `#fixme` or `#prompt` and route it. do not add a construct, a helper or a spelling to work around it.

## a whole program

one module, the shape and the read, so an agent has a model to copy:

```tz
import { form, is, result } from '@belelabestia/tstd';

export form post {
  title: is.string,
  published: is.boolean
}

/** a post from a raw payload, or why it is not one */
export const read = (raw: unknown) => {
  form.model(raw, post) ?! err 'malformed post';

  const found = form.decode(raw, post);
  ok found;
};
```

read it in the order the machine runs: `form` declares the wire shape and the domain shape once; `form.model` proves the payload, and the side quest refuses it when the proof fails; `form.decode` is infallible after the proof, so it carries the post unboxed; `ok` answers.

two things the sample does not say outright. `?!` is `?== false`: it refuses when the guard is false. and `form.model`, `form.decode` and `form.encode` are `tstd` exports, not constructs; the `form` construct is the declaration.
