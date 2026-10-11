# tz - the typezig prototype

tz is a superset of `typecore`, the subset of typescript that omits the overlap, with its own standard library, out of the box. `tstd` is the seed: the core library that carries every principle, and it works in typecore on its own. tz is the language built to optimize that usage to a point typescript alone could never reach. the design notes are in `tz/DESIGN.md`; the spec is in `tz/TUTORIAL.md`; the journal of decisions is in `tz/UPDATES.md`; the plan of action is in `tz/plan/roadmap.md`. this file is the map: what tz is and where the rest lives, and the first run is in `GETTING-STARTED.md`. if you are an agent, read `AGENTS.md` first: it is the contract for writing tz.

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

## start here

`GETTING-STARTED.md` walks from a fresh clone to a running program: install, a first program, the mental model, and the editor.

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

`constructs/` holds one deck per construct: a `spec.tz` of small use cases with walkthrough comments, so the construct can be read and run on its own. `examples/` holds the modules that solve whole problems, with `examples/signup.spec.tz` as their spec. the current whole program is `examples/site/`: a small web service that serves a home, a cv, the links, a topic list and a page per post from files, with the theme following the topic, and `examples/site/server.spec.tz` boots it and hits every route under `npm test`. `npm test` runs both, `tzc` and `tzd` emit and check both, so a construct that drifts out of the showcase fails the build.

## what is not

the lsp affordances that need a live editor are next: completions, hover, goto and rename, and they wait on the stable typescript surface. the checks themselves already run headless in `tzd`: conditions must be boolean, a `Result` statement must be `void` prefixed, a `? {}` over a union must be exhaustive, and a library spelling is warned with its tz form. none of them belong in the emitter.

`tz` is self contained on purpose, so it can move to its own repo with a `git mv`. it depends on `tstd` the way any consumer does, through the package name.
