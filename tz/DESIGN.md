# typezig design notes

a superset of `typecore`, the subset of typescript that omits the overlap, with `tstd` as its own standard library, out of the box. `tstd` is the seed: the core library that carries every principle, usable in typecore on its own; tz is the language built to optimize that usage to a point typescript alone could never reach. the prototype lives in `tz/`. the spec lives in `tz/TUTORIAL.md`. the journal of decisions lives in `tz/UPDATES.md`. this file is why tz looks like this; if you only want to write tz, read the tutorial instead.

## typecore

`tstd` and tz share a floor: **typecore**, the subset of typescript that omits the overlap. it is a conformance profile, not a file type, so files stay `.ts` and tz stays `.tz`; no extension is spent. the three things stay distinct: typecore is the base dialect, `tstd` is the standard library that works in it, and tz is the language that adds the constructs and enforces the profile.

the profile has two gradients. a spelling the language owns is **banned**: the transpiler refuses it as a diagnostic, and there is no pragma, because a switch that turns a ban off makes the ban list negotiable. a spelling the library owns cannot be banned, because it is the standard library and interop needs it; the editor **warns** instead, naming the tz form. one spelling is the point, and the gradient is how a language and its standard library share a floor without pretending the library is gone.

the profile is one table, `src/typecore.ts`. tz reads it twice, once in the ban pass and once in the editor warning, so the two engines cannot drift; the eslint ruleset that holds plain typescript to typecore reads the same table, because it is a consumer of the profile and not a second definition. shipping that ruleset is scheduled, and its first step is giving the table a home both can reach. the tz pass is then defensive: the profile decides, tz insists.

## hard constraints

typescript keeps every door open: classes, interfaces, enums, namespaces, decorators, generics, `any`, overloads, `switch`, `try`/`catch`, `this`, `new`. nothing is taken away, and the overlap is the problem: when two features do the same job, a team picks one and argues about it, and the type system cannot tell you whether you picked well. the claim here is not that typescript is bad; it is that a smaller consistent subset does the job, and `tstd` is the proof, answering with code instead of an essay: a handful of modules compressed into five principles, each of which becomes a hard rule.

- **master short-circuiting.** guards, early exiting, negative-space programming; handle the exceptional cases first and fall back on the general ones in a funnel, which is narrowing by another name.
- **dry the syntax, not the code.** a static class is a module; a dynamic one is a closure with an `init`; inheritance becomes composition; hierarchies and enums become algebraic types.
- **treat features as such.** narrowing replaces validation libraries; proving a shape and mapping it are separate concerns.
- **maximize type inference.** a function that changes its return type should not break its signature; the callers should adjust, so return types are never declared except in a type guard.
- **distrust what the types cannot say.** a signature is the whole contract, so anything carrying an invisible requirement is confined, not discouraged. a method's `this` requirement is invisible to its type, so a torn-off method typechecks and throws; a throw is invisible the same way. both are converted into a `Result` at exactly two boundaries, `make` and `call`.

the style that falls out is procedural, fallible where it must be, branch-shaped: tagged unions via `branch` and `Union`, guards via `is`, results via `result`, resources via `scope`, wire shapes via `form`, machines via `protocol`, time via `iso`. the `tstd` readme names the ambition well: typescript will not become scala, haskell or gleam, but it can become go or zig once performance and memory are set aside. those patterns are not tz's invention; they are the library's, and they work in typecore. what tz adds is enforcement: a superset of typecore, with the library built in and a few constructs on top, transpiled back to typescript. the transpiler is a lexer, so it refuses the spellings that break the discipline, and both halves typecheck through the same `tsc`. learn the patterns where they are owned, in `../README.md` and the `../src/` specs.

five rules then bind the prototype, and every construct is shaped by them.

1. **one line in, one line out.** every `.tz` line emits exactly one `.ts` line. line numbers are the source map; columns get a per-line shift table, or nothing at all.
2. **never parse typescript.** lex it (strings, templates, comments, regex, braces); do not grammar it. the constructs are found at token positions and their spans are rewritten. everything else is copied.
3. **the emitter has no opinions.** it does not know types, does not know if a value is a `Result`. `tsc` is the typechecker. an emitter that guesses is an emitter that lies.
4. **the output is readable.** it is code a person could have written by hand, because it is exactly the code `src/scope.ts` already writes by hand.
5. **the emitter never writes an import.** a tz file that says `ok` imports `result`, one that uses a side quest imports `is`; the emitter never decides what your module imports. an emitter that decides is an emitter with opinions about your module, and the first time it guesses the wrong `tstd` it writes a bug that reads like a mystery.

## vocabulary

three constructs, three names; every construct tz adds is one of them, and everything else is typecore.

- **exit**: leaving the scope. `return`, `err`, `ok`, `break`, `continue` all count. `return`, `err` and `ok` carry a value when one is named; `break` and `continue` only leave.
- **arrow capture**: the `=>` form. it captures whatever is returned and stays in scope. an arrow capture is the spell for "produce a value without leaving".
- **side quest**: the `?` family. a side quest tests a value at the position where it stands and decides between an exit and an arrow capture based on what follows. the `?` is the "quest" of "side quest".

the form name never doubles as a role name. `fallback`, `answer`, `decline`, `refuse`, `matcher`, `postfix matcher`, `matcher family`, and `? family` are retired; the three words above cover every spell and every role.

the two earlier spellings we are replacing:

- `matcher` and `side matcher` and `postfix matcher` all named the `?` family. we kept the family and renamed it `side quest`, because the `?` symbol stands for "quest". the name remembers the symbol.
- `=>` was called `answer`, then `fallback`, depending on its role. both words leaked the role into the form. we renamed it `arrow capture`, because `=>` captures whatever is returned and stays in scope. the role stays in prose; the form has one name.

## the constructs

the constructs, in the order they were ruled:

- **the exit family**: `return`, `ok`, `err`, `async` for bodies; `break`, `continue` for loops. one discipline per body: a body uses exactly one of `return`, `ok`, `err`, `async`, or an arrow capture. mixing is refused at the source line.
- **side quests**: `?none`, `?some`, `?==`, `?!=`, `?>`, `?<`, `?>=`, `?<=`, `?&(...)`, `?|(...)`, `?:tag`, `?(cond)`, `?!(cond)`, bare `?` and `?!`, plus the `? {}` block for exhaustive answers. each one tests one thing at the position where it stands. a side quest that finds its match exits or arrow captures; a side quest that misses continues unless the chain ends. a bare `?` and its negation `?!` head that same tail family, so a landing exit rewrites the same way: `cond ?! err 'x'` lands the error `cond ? err` does. an `else` either answers with `=>` or continues the chain with a quest on the locked subject: one chain holds one subject, so a nested chain is composition and a subjectless quest is refused. `?true`, `?false` and `?literal` retired into `?==`; juxtaposed chains join in groups now. a side quest is postfix in syntax and first in execution: the test runs before the subject, and a miss yields the subject. `?(cond)` and `?!(cond)` are the custom quests: the condition is a third party predicate, so the expression on the left is the value the miss yields, not what the condition reads. it is read once, only on the miss, so a bare statement with no land refuses it, and one that repeats the subject is refused because the test would read it twice. a bare boolean with a value `else` is the inverted form of the same quest, so `pred ? => hit else => miss` is refused in favour of `miss ?!(pred) => hit`. a coloned test keeps the subject boxed, for the answer side and the exit side alike, so the payload of the branch that survived a refusal is read with `.value`; `?ok` and `?err` are the only tests that unwrap, because the complement of one branch of a two-member union is always the other branch, and always carries the payload.
- **scope**: `scope (hold) => { ... }`. holds resources and hands them back in reverse. picks `scope.sync` or `scope.async` from the body.
- **protocol**: a union or a machine in one block. a parameter is the only slot in a value that states a type, so one object of functions states one type per key.
- **form**: the wire shape and the domain shape in one block. a field is either a guard (plain), a `{ is, decode, encode }` triple, a triple renamed with `as`, or a `form.nest(...)` of another form.
- **call**: the boundary that does not throw. `call expr`, `call => { ... }`, `await call expr`, `await call => { ... }`. sync or async, expression or block; an `await` inside picks the async variant on its own.
- **make**: the constructor that does not throw. `make => C(...)` spells `make(C, ...)`, so `new` stays off the table and the word stays one spelling. a constructor only syncs, so an `await` adds nothing and is refused.

## the ban list

yes, and this is the part that makes tz a language instead of a preprocessor. a lexer that can find `function` can refuse `class`, the same walk in one table. the table is typecore's, not tz's: the same profile holds plain typescript to the subset through an eslint ruleset, and tz's pass is its defensive half. in tz the refusal is delivered as a syntax error, at zero extra cost, with nothing to configure and no way to switch it off.

| refused | because | replacement |
| --- | --- | --- |
| `class` | hierarchies, and a method carries a `this` the type never states | a module, or a closure with `init` |
| `function` | arrow consts only | `const f = () => {}` |
| `this` | invisible requirement | an argument |
| `new` | `make` owns every instantiation | `make => C(...)` |
| `try` `catch` `finally` (the ts ones) | a throw is invisible to a signature | `call.sync`, `call.async`, or tz `try` |
| `interface` | `type` covers everything | `type` |
| `enum` | a hierarchy in disguise | `Union` or `protocol` |
| `var` | reassignment is a design decision, `let` states it | `const`, or `let` |
| `namespace` `module` | files are modules | a file |
| `any` | it is not a type, it is the absence of one | `unknown` |
| `instanceof` | there are no classes to be an instance of | a branch test |
| `function*` `yield` | flow hidden in a protocol | a loop |
| `abstract` `implements` `private` `protected` `public` | class vocabulary | gone with `class` |
| `else` after an `if` **statement** | the funnel is the flow | a side quest chain, or a `? {}` block |
| `?:` | one conditional expression is enough | `cond ? => a else => b` |
| `??` | silent about which half it is doing, and cannot hold a statement | `val ?none => dflt` |
| `switch` | a `? {}` block is the same decision; one spelling | `? {}` |
| `throw` | we do not throw | `err` |
| `get x()` `set x()` `x() {}` in an object | a method is a `function` wearing a hat | `x: () => {}` |
| a bare `return;` | every one of them is an exit | a side quest, or end the body |
| `===` `!==` | `==` and `!=` already emit them | `==`, `!=` |
| `== null` `!= undefined` and friends | presence and absence, never which one | `is.some`, `is.none` |
| `async` as a **modifier** | inferred from `await`, so it is a second spelling | nothing, or `async x` |
| `Promise.reject` | a rejection is a throw that happens later | resolve with a `Result` |
| an assignment used as an expression | an assignment is a statement, not a value (`a = b = 2`) | bind the value first, then reassign on its own |

`super` is ruled with the class vocabulary above. `extends` and `constructor` need no rule: they are unreachable once `class` is gone. `extends` stays legal where it is a type operator (`<B extends Protocol<B>>`, conditional types), which is the only place tz can still spell it.

no statement `else`. a boolean with two meaningful cases is an expression, which is where a two-sided choice belongs, and a side quest chain (`? ... else ...`) is exactly that. a statement-level `else` is a funnel that refused to funnel: its `else if` chains are early exits nobody wrote, and `? {}` is there for the case that is really a table.

no `?:`. the side quest chain replaces it, so the ban is about having one spelling, not about the operator. `?.` is untouched (`??` is banned on its own account, see `?none`). the lexer tells a conditional from an optional marker by the token after the `?`: a `:` means an optional (`name?: string`), anything else means a ternary. the one place it cannot tell is a conditional type (`A extends B ? C : D`), so the ban is lifted inside a `type` declaration, and an inline conditional type in a value annotation has to be named first. the style asks for that anyway.

no `throw`. nothing in tz code raises. panics still exist, because the platform still throws (a native constructor, a library, the runtime running out of something), and that is exactly why `scope` has a `panic` branch and `call` and `make` exist at all. the ban makes the meaning exact: a panic is always something you did not write. an error you did write is an `err`.

no `Promise.reject`. `throw` is banned because nothing in tz code raises; a rejection is the same event on a later tick, so it goes with it. a promise in tz always resolves, and an async operation that can fail resolves with a `Result`. the rest of `Promise` is untouched: `Promise.all` and friends are safe precisely because nothing rejects, which is the payoff. `Promise.resolve` stays legal too, it is only bait in return position, where `async x` says it.

two honest notes. this is the first banned member, two tokens rather than a keyword, and aliasing evades it, which is consistent with a check that would rather miss a ban than invent one. and it makes your promises safe, not the platform's: awaiting a foreign promise can still throw and no token check can tell foreign from yours. `call.async` is where you cross, the same way `make` is where a constructor crosses.

the method-shorthand ban is not pedantry. a method carries a `this` requirement its type never states, so a torn-off method typechecks and throws; the object-literal form is the same trap in a smaller hat. it also pays for itself: see the `ok`/`err` discipline check.

## how a ban is checked

a word is banned in keyword position only. the previous significant token decides: after `.` or `?.` it is a property, and a property named `class` is somebody else's json. everything else is a ban.

the check is deliberately conservative. a missed ban is a style rule that slipped through; a wrong ban is a valid program the compiler refuses. only the second one is a bug, so when in doubt the lexer allows it. `tsc` still runs on the output either way.

there is no pragma. a comment that turns a ban off for one line makes the ban list negotiable, and then the discipline check has to read comments to know what the language is. the escape hatch is a file: code that genuinely needs `class` or `this` for interop lives in a `.ts` file, which tz never touches, and the import boundary says where the hostile part is. a file boundary is visible in a way a comment is not.

## the new words

none of `scope`, `protocol`, `ok` or `err` is reserved in javascript, and two of them are already `tstd` exports: `scope.sync(...)` and `protocol.init(...)` appear in real code today. the syntactically contextual ones are recognised by what follows them:

- `scope` then `(`, its matching `)`, then `=>`
- `protocol` then a name then `{`, with `<S, E>` before the brace when it is generic

the `on:` and `any:` sigils are retired; the one sigil left is `:tag`, and it keeps a token-pair rule on purpose. `{ a: success }` stays an object literal because the colon follows a `{` rather than a value; a general `:tag` sigil everywhere would have cost more, since `{a:success}` would change meaning.

a `:tag` inside a `? {}` arm needs none of that, because an arm cannot start with a `:` for any other reason.

`scope.sync` is followed by `.`, so it stays an identifier. one token of lookahead, no backtracking.

`scope` is the one that wants more than a token, and the parens are what make that bearable: scan to the matching `)`, which is paren depth the lexer already tracks, then look at one more token, and a `=>` is what finds the call that is not one.

`scope` has no residue at all, because the token it needs is `=>` and no call is ever followed by one.

`async` needs no context either, in the other direction. the modifier is banned, so the word in keyword position is always the exit, and after a `.` it is somebody's property.

`ok` and `err` do not get that treatment. they are reserved outright, because they start a statement and a statement can also start with a call, and no follow set can separate `ok (x);` from `ok x;`. two more reserved words is the honest price, and the one that stings is `err`, which is everybody's favourite name for an error binding. use `e`, as the examples here do.

`try` is the exception and needs no context: it is a reserved word already, and with `catch` refused the typescript form is dead, so tz simply takes the word.

## toolchain

the pipeline, in two commands:

- `tzc`: mirrors `tsc`. emits, runs `tsc` on the emit, moves every diagnostic back onto the `.tz` line and column.
- `tzx`: mirrors `tsx`. a node loader hook turns `.tz` into typescript in memory and lets node strip the types, so nothing lands on disk.

### diagnostics

`tsc` on the emitted `.ts`, then rewrite each diagnostic's file and position back to the `.tz`. with one line in, one line out, the line is already correct and only the column shifts. worst case, report the line and underline the whole line: still usable.

do not use the compiler api to typecheck in-memory at first. shell out to `tsc --pretty false`, read the exit code, parse the lines. `AGENTS.md` already says judge a typecheck by its exit code.

### coherence

the journal catches drift when humans notice; the coherence spec does it mechanically, and `src/coherence.spec.ts` is the truth. it walks README.md, DESIGN.md and TUTORIAL.md four times: every backticked identifier is a known construct the lexer, ban list or emitter owns (with a whitelist for the tstd members and variables the docs legitimately backtick). every "the X expression/statement" claim matches the role the handler plays. every construct in the role list has a spec entry in lex.spec.ts or emit.spec.ts. every construct in the role list is mentioned here in DESIGN.md.

### lsp

the cheap path is a proxy, not a language server. a session holds open buffers, transpiles each in memory with `emit`, checks them with the same `tsc` flags `tzc` uses over a temp mirror, and maps every diagnostic back with the line identity and the shift table. `tzd` runs the same session headless. volar was refused: it is a framework and a dependency tree, and the mapping is nearly trivial, so the proxy is hand-rolled on the `typescript` package alone.

the 7.0 package keeps its checker behind an interim client/server surface: the root exports only a version, and 7.1 promises a new and different api, so the classic shape is not worth writing twice. the proxy talks to the interim surface instead, and everything it touches lives in one module behind a narrow seam: positions in, warnings out. one spawn per run opens every buffer in a mirror project widened from the workspace tsconfig, asks the type at each guard and each switch the emitter wrote, and closes; when the stable surface lands only the module is rewritten. the same run still shells out to `tsc` for parity: two readers, one mirror.

three checks read types and stay unranked, all warnings, and a fourth reads tokens. the boolean check asks what each bare guard and each trigger tests, reading through one call when the guard tests one, and stays silent on comparisons, matcher glue, chain answers, protocol edges and anything it cannot pair back onto a test. the exhaustive check diffs literal arms against union members and tag arms against branch members, through the temp names the emitter introduces, and stays silent on conditions, groups, presence words, an `else`, and anything wider than literals. the `void` check reads the dropped expression's type: a naked expression statement whose value is not none needs `void`, with triggers, `else` sides, declaration interiors, object frames, assignments and `void` itself spared, and a type the checker cannot resolve left silent. an assertion, a console log and a dropped `void` call are therefore quiet, while a dropped `Result`, promise, boolean or string warns. the smell check reads tokens rather than types: it names each library spelling the source still writes (`protocol.init`, `branch`, `result.ok` / `result.err`, `scope.sync` / `scope.async`, `call.sync` / `call.async`, `make`), the way the profile spells them in `src/typecore.ts`, so a tz file that drifts back toward the library form is told. completions, hover, goto and rename wait on the same surface; the keystroke loop shells out per run until a checker can live in memory.

a trigger stays bare under the widened `void` rule, by author ruling: the `?` head already marks the effect explicitly, so `void` is only for naked statements with no tz head.

syntax highlighting is built, and it is not the grammar this said it would be. an include of `source.ts` only reaches the top level of a file, and every word tz adds lives inside a body, so the words are a second grammar injected into `source.tz` at every depth. that is the whole trick: `tz.tmLanguage.json` is three lines and `tz-words.tmLanguage.json` is the keyword patterns plus one region. the region opens when `protocol` is followed by a name or `<`, ends at a closing brace on its own line, and colors the declared name, every branch, and each `=>` target, which typescript leaves white.

the one surprise is that typescript's grammar reads a match arm as an object literal key, so a quoted arm value reaches the injection with no string scope on it and `-comment -string` cannot refuse it. a word with a quote against it is refused instead.

## why not

each of these is a good idea somewhere else, and each one was on the table. they fail the same test: the shape buys a line or a character, and it costs a rule that held everywhere. a rule that holds everywhere is the product, so the trade is never close. one of them is parked rather than refused, and it says so.

### shapes a side quest could have had

**a postfix guard**, in the initialiser, symmetric with `?err`:

```tz
const row = table[id] ?(is.some(row));
```

it works: it emits `const $0 = table[id]; if (!(is.some($0))) return; const row = $0;`, and narrowing flows through `$0`, so `row` lands narrowed. it is refused anyway, because the existing side quest already says the same thing in fewer words:

```tz
const row = table[id] ?none return;
```

`?none` reads presence and absence, and the tail decides what a miss does: exit with an `err` or an `ok`, return a value, or capture a fallback. the postfix guard can only ever leave, so it is the narrow spelling of a decision the language already carries.

`?err` needs the postfix position; that is not a preference. the value you want from it is `.value`, not what the expression produced, so the unwrapping has to happen where the binding happens and there is no statement form that can do it. a side quest that tests a boolean transforms nothing, so its statement form is already complete and a postfix spelling is a second way to say one thing. that is the thing the braced-exiting-`if` ruling removed.

**`if (c) side quest <exit>`**, reading the side quest as the `else` branch in disguise. it is a nice sentence and it costs the language a word that means two things: a construct in one place, a marker in another. `cond ? <exit>` says the same in fewer tokens and one meaning.

**an answering guard**, `const n = parse(raw) ?(is.number(n)) => 0;`, the way `?err` answers with `=>`. this one is not the same as the lines it replaces, so the argument above does not touch it: the two-line spelling needs an extra name for the value being tested.

```tz
const p = parse(raw);
const n = is.number(p) ? => p else 0;
```

it is refused for the partition instead. a side quest never answers is the sentence that makes the flow model readable in one pass, and one saved name does not buy it back.

`?err` answering is not the counter-example it looks like. a failed result cannot be carried forward: you either exit or you substitute, and those are the only two moves, so `?err` needs both forms to be complete. a guarded value is already sitting there usable. choosing against it is not an exit, it is a choice, and a choice is `? => ... else ...`.

### zig's block expression, and `break <expr>`

`break <expr>` is the other way to spell "a block answers", and tz does not take it. `break` means one thing here and should keep meaning it: leave a loop. zig can overload the word because zig labels its blocks (`break :blk v` names which one it leaves); without labels, `break 8080;` inside a loop inside a block is a real question about where control goes and the reader has no token to answer it with. an arrow capture block answers with `return`, which already means "an exit leaves here". a block is an arrow body or an iife, and in both, `return` answers the block. source and emit agree without inventing anything.

a general block expression, `const n = { ... };` in any expression position, is the remaining piece of zig's `break :blk`, and it is parked, not refused. its one real cost: a `{` in expression position becomes a body boundary, so "a function body is a `{` preceded by `=>`" grows a second case and the discipline check has to learn it. cheap, but not free, and the `=>` form covers everything that has come up.

### a `task` keyword

a marker in the signature for fallibility, the way `async` marks suspension, and a rule that `ok` and `err` are only legal inside one. it is the symmetry it looks like, and it is checked exceptions: add a `try` to a leaf and you hand-edit every declaration between there and `main`, which is churn a type system already does for free.

it also has nothing to declare. `ok` and `err` are the marker; they sit in the body instead of the signature, and the body is where the decision happens. under inference the same is true of `async`, so neither lift gets a word, and the one thing a marker could have said that inference cannot, "a promise with no `await`", is `async x`.

what is genuinely lost is reading fallibility off the declaration without opening the body. that belongs to the editor, an inlay hint in step 6, not to every signature in the program.

### postfix `try` and postfix `await`

`db.get(id) try`, chainable, the way rust replaced `try!(x)` with `x?`. the motivation is real, and the two halves of it come apart.

postfix at statement scope is free, and `?err` is the proof: its operand is delimited on the left by the `=` or the statement start, so the emitter scans forward to the `;` and never scans back. `const user = db.get(id) try;` would cost nothing to emit.

chaining is not statement scope, and it is the half that asks for a grammar. `f() try .g() try` makes the emitter find where the left operand starts, and `a() try + b() try` makes it decide how tightly `try` binds. both of those are parsing typescript. chaining also lifts the position restriction, since a `try` in an argument list leaves the enclosing function from inside an argument list, which is what `g(try f())` was refused for.

so the chainable spelling is the one that cannot be had, and the affordable one is paid for in word order: `x ?err` reads "x, on error", where `x try` reads backwards. rust got away with it because `?` is punctuation and punctuation has no word order. the postfix guard above was refused for saying the same thing twice; this one is refused for what it costs the lexer.

`await` is refused ahead of all of that, because it is typescript's token. tz adds words and bans words; it has never respelled one. postfix leaves two spellings for one thing, or bans the prefix, and then the lexer rewrites awaits wherever they appear, `(await f()).y` included, and the one-statement desugar is over. the two only look alike anyway: `await` unwraps a promise the types already track, `try` unwraps a branch and exits.

what survives of the idea is already here. `x try` is `x ?err (e) err e`, so writing the tail out is the postfix spelling, and `try` is its prefix shorthand.

## staging

the work was planned in eight steps; the current state at each is below.

1. **lexer + the simplest constructs.** proves the pipeline and proves line preservation. superseded; the current constructs are the side quests and arrow captures.
2. **the ban list.** a lexer walk with a table; this is what makes the language a language; every later check gets cheaper once `function` and method shorthand are gone. built.
3. **the exit family** (`ok`, `err`, `async`, `try`, `?err`, `?none`) and the one-discipline-per-body check. the inferred lifts and the implied `ok`. the reason the language exists. built.
4. **cli, loader hook, diagnostics mapping.** now it is usable for real code. built.
5. **scope and protocol.** built. `protocol` has a shape function when it has parameters and an inline literal when it does not, because only an inline literal keeps its transition arrays typed as tuples.
6. **the form and call constructs.** built. form and call are sugar over the matching `tstd` modules; both pass through the same one-line-in-one-line-out discipline.
7. **lsp and the type-aware checks.** the conditions must be boolean, the `? {}` must be exhaustive over a union, the `Result`-typed statement must be `void`-prefixed. none belong in the emitter; the lsp is where they live. shipped: `tzd` runs `tzc`-parity diagnostics plus four unranked checks headless (dropped values, non-boolean guards, missing members, library spellings); the editor affordances wait on the stable surface.
8. **the coherence spec.** a walk over the docs against the code, so drift fails the build. built (see `src/coherence.spec.ts`).

the equality rewrite (`==` and `!=` emit the strict ones) and the `Promise.reject` ban ride along with step 2: token rewrites and table rows.
