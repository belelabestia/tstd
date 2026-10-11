# getting started with tz

a path from a fresh clone to a running program, then the shape of the thing you are writing. every command here was run from an empty checkout before it was written down, so this is the path, not a guess.

## get the code

clone the repo, then install and build inside `tz/`; tz carries its own toolchain, so there is nothing to install at the repo root first.

```
git clone https://github.com/belelabestia/tstd.git
cd tstd/tz
npm install
npm run build
```

`npm test` runs the whole suite: the compiler specs, then every deck and example, so a checkout you can trust is one command away.

```
npm test
```

if you are working on the library rather than on tz, install at the repo root the way `README.md` describes; that is tstd's own checkout, not this one.

## your first program

tz transpiles to typescript, so a `.tz` file runs the way a `.ts` file does and needs no build step of its own. write one anywhere inside the checkout, say `hello.tz`:

```tz
const hello = (name: string) => `hello ${name}`;

console.log(hello('ada'));
```

run it with the loader, which turns `.tz` into typescript in memory and lets node strip the types:

```
node dist/tzx.js hello.tz
```

```
hello ada
```

now say what the program refuses. a side quest tests a value where it stands, and `err` answers with a failure, which is what makes the body fallible:

```tz
import { is, result } from '@belelabestia/tstd';

const hello = (name: unknown) => {
  is.string(name) ?! err 'not a name';

  ok `hello ${name}`;
};

console.log(hello('ada'));
```

```
node dist/tzx.js hello.tz
```

```
{ branch: 'ok', value: 'hello ada' }
```

the emitter never writes an import, so two things are yours to write: a file that says `ok` or `err` imports `result`, one that writes a side quest imports `is`; and a type only import has to say `type`, because the loader leans on node's own type stripping, which cannot tell a type from a value.

`tzc` is the checker, mirroring `tsc`: it emits the `.ts` beside the `.tz`, runs `tsc` on the emit, and moves every diagnostic back onto the `.tz` line it came from. `--out <dir>` mirrors the tree somewhere else and `--no-check` stops after the emit.

```
node dist/tzc.js hello.tz
```

## the mental model

every line is built from three forms.

- **an exit** leaves the scope: `return`, `ok`, `err`, `async`, `break`, `continue`. a body answers one way, so `return` and `ok`/`err` do not mix in one function.
- **an arrow capture** is `=>`. it captures whatever is returned and stays in scope; it replaces `??` and `?:`.
- **a side quest** is the `?` family. it tests a value where it stands and, by what follows it, decides between an exit and a capture. it replaces the early-return `if`, the two-branch `if`/`else`, the ternary and the `switch`.

everything else tz adds is the language form of a `tstd` module: `form`, `protocol`, `scope`, `call`, `make` and `try`, plus the `:tag` construction. `TUTORIAL.md` teaches one construct at a time, and the code is the truth for the whole set.

## set up your editor

`editor/` is a vs code extension with no code in it: a language for `.tz`, a grammar that is one include of `source.ts`, and an injection that adds the words typescript does not have. point your extensions directory at it and reload the window.

```
New-Item -Path "$env:USERPROFILE\.vscode\extensions\typezig" -ItemType Junction -Target .\editor
```

the words are an injection rather than a pattern in the grammar because an include of `source.ts` only reaches the top level of a file, and a side quest is always inside a body. an injection is merged into every rule at every depth instead, and `-comment -string` in its selector keeps it out of prose.

it knows `try`, `scope`, `protocol`, `form`, `call`, `else`, the `ok`, `err`, `async`, `return`, `break` and `continue` exits, the `?none`, `?some`, `?==`, `?:tag` and `?(cond)` side quests plus bare `?` and `?!`, the `:tag` construction, and the `:tag`, `==`, `else` and `(cond)` arms of a `? {}` block. inside a `protocol` declaration it colors the branch names and the `=>` targets, so a machine reads as arrows between names instead of a block of white.

two residues, both wontfix and cosmetic. typescript's grammar reads a `? {}` arm as an object literal key, so a quoted arm value loses string scope and the selector cannot see it; the grammar refuses any word with a quote against it instead. a tz word inside a template hole stays unhighlighted because the whole template is a string to the selector.

`editor/nvim/` is the same shape for nvim, with no code either: a detector and one syntax file. the base is the runtime's regex typescript, because a syntax file is the only engine nvim has that can read tz at all: the tree-sitter typescript parser turns every side quest into an ERROR node and goes grey exactly where the language works. the injection is cluster surgery. the words join every set the base's regions declare they scan, and the few regions that spell their sets out item by item are followed explicitly. two base regions are taken back out of those sets: the ternary, because `?:` is banned in tz and its region would own every `?`, and the template, because the base ends a template at the first inner backtick and would strand every line below a nested one in a string. the replacement nests the only way this engine can: the template holds the hole, the hole holds the tz words and itself, and neither holds a template.

```
vim.opt.rtp:append("~/repo/tstd/tz/editor/nvim")
vim.filetype.add({ extension = { tz = "tz" } })
```

plain nvim needs only the first line: the detector file sets the filetype. the second is for setups whose plugin manager never sources the legacy detector files. one residue, and one improvement over the vs code grammar: a hole gets the tz words and nothing wider, so a plain value inside a hole stays uncoloured, while tz words inside a hole are coloured here but stay unhighlighted in vs code.

## where to go next

- `TUTORIAL.md` is the spec: how to write tz, one construct at a time.
- `DESIGN.md` is the why: the hard constraints, the vocabulary and the refusals.
- `constructs/` is one runnable deck per construct; `examples/` is a whole program, the site under `examples/site/`.
- `AGENTS.md` is the contract, written for an agent and readable by a person.
