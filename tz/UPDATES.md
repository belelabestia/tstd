# tz updates

a journal of decisions. the spec lives in `tz/TUTORIAL.md`; the design notes live in `tz/DESIGN.md`. entries are dated and written in the order they happened; the latest is at the top.

## agenda

the next item is open. the doc-code coherence spec is built (`tz/COHERENCE.md`, `tz/src/coherence.spec.ts`): it walks the lexer, emitter, and ban list as the truth, then walks the docs and asserts that every backticked identifier is a known construct and every role claim (expression vs statement) matches the actual handler. it runs in `npm test`, so drift becomes a failing build. one adaptation from the plan: the docs backtick tstd members and variables as well as constructs, so the backtick walk carries a documented whitelist of those, and the plan's handler names were replaced with the real ones in `emit.ts` (`arrowing`, `matcherTail`, `questioning`, `construct`, `propagate`, `scoping`, `calling`, `making`, `forming`, `protocoling`, `exit`).

## 2026-09-13: conditionals become binary quests

a `?` sits in the middle of a comparison now: it captures the expression on its left and tests it against the right. the operator glues onto the `?`, as in `x ?== 2` or `x ?> 0`, and the operators are exactly the boolean binaries (`==`, `!=`, `>`, `<`, `>=`, `<=`). `==` is mandatory on every test, so `?true`, `?false`, `?5`, `?'hi'` and glued `?=y` all retire in favour of `?== ...`, and a bare `?` means `?== true`. arithmetic and bitwise quests go with them; a modulo case spells `?(...)` or moves the computation left of the `?`.

more than one right half takes one glued combinator plus parens: `x ?&(> 0, < 100)` holds when every half holds, `x ?|(< 0, > 100)` when any half holds. groups nest, a group of one is refused, and a group never mixes `:tag` with comparisons. `?(` stays the escape hatch for a self contained boolean; the combinator tells groups apart from it.

the `? {}` block takes the same heads, arms being alternatives with one `else` for the miss, which replaces `_`. a block of only `==` arms switches on the subject internally; anything mixed cascades. the tutorial carries the full spec.

the emitter follows it now. one shared quest parser feeds every path: single comparisons parenthesise their operand, groups join halves, nesting recurses, and juxtaposed quests are refused with a pointer to groups. the `? {}` block is handled in one place too: the old pure-answer path is gone, captured blocks funnel through a temp, and only `==` arms keep the `switch`. `else` arms are consumed so the statement `else` ban never sees them, and the `==`/`!=` rewrite skips quest operators and arm heads it would otherwise swallow. the scan tags glued operators, groups, and bare `?`, plus operand ends so tails restart, while the ban owns the spacing and retired-shape refusals. scratch, the editor grammar, and the readme walk the new syntax; the one scratch runtime failure is pre-existing on the base.

## 2026-09-13: `?` compares at runtime, against spellings and variables

a `?` matcher is a strict compare now, whatever follows it. a glued template reads as a literal: `` x ?`no row ${id}` `` emits `x === `no row ${id}``, the holes evaluating at runtime, so the old "static spelling, use quotes" refusal is gone. to compare against a variable instead of a spelling, glue an `=` between the `?` and the name: `x ?=y return` emits `x === y`, the name unquoted. the word after the `=` rides glued or spaced, but it has to be a plain name — a matcher, a literal, or a keyword there is refused, because `?=ok` would not know which reading it is.

the scan tags both shapes, the ban only sees the broken ones: a spaced template is told to glue itself, a `?=` with no name or a reserved target gets its own sentence, and the generic refusal points at `?=name`. the emit reuses the literal slice for templates (backticks and holes survive, it is valid js) and pushes the bare name for `?=`. the `? {}` arms already took templates, so only the four statement loops and the scan gate changed, plus the grammar's matcher rules and the tutorial table.

## 2026-09-13: a branch test gets two readings

`?ok` and `?err` are matchers now: they name the `Result` branches the short way and bind the payload unwrapped, `const e = $0.value;`. a coloned `?:tag` keeps the old boxed shape, `const why = $0;`, and that is what makes a chain possible: `status ?:loading ?:err => 'wait, then bail'` reads the same union twice without a temp. the price is that `?:err (why)` binds the whole subject, not the payload; the docs spell the difference, and the scope-panic example reads `why.value`.

the rest of the family is untouched: `?none`/`?some` still test presence, `?true`/`?false` still ride the literal path, and a bare `?idle` is still refused — `?:` is refused is the sentence that holds because the coloned reading exists.

## 2026-09-13: `match` and `guard` retire

the last two old-shape words leave the code and the teaching docs. `match` was a construct, retired as a word: the scan neither tags nor bans it, so `match` is a name like any other. `guard` leaves the ban list and the tutorial table; a decline is `?none`/`?false`, a table is `? {}`. the coherence walk found the drift on its own: backticked `match` and `guard` were still sitting in `DESIGN.md` and `TUTORIAL.md` as if they were constructs, and each one failed the backtick check with a line number.

the roles closed in the same pass. `?true`/`?false` no longer have rows (they were already matchers, the literal path was the duplicate), and the `:tag` construction is named `branch` in the role list with handler `construct`, so a spec writes `branch('idle')` and the docs keep spelling `:idle`.

## 2026-09-13: the mechanics of the round

the small fixes the notes asked for, landed together. `hook.ts` throws a plain `Error` now: the loader hook has to throw on the host side, a `Result` it returned would have been swallowed. `absent` exports as a readonly array typed for `includes(string)`. the lexer's `opens` trimmed to twelve words. the awaiter's strip covers the inter-token gap, so `await` never leaves a double space behind. `instanceof` answers "a branch test" in both ban tables.

## 2026-09-12: the side quest is a statement too

the coherence plan's role list called every matcher an expression. that was the plan's own drift, and the spec caught it before the docs ever would: a side quest is both. `?none err ...` is a statement (a postfix exit that leaves the scope), `?none => dflt` is an expression (an arrow capture that stays). the same `?` postfix does either, decided by what follows it. so `?none`, `?some`, `?true`, `?false`, `?:tag`, `?literal` and `?(cond)` all carry `both` in the role list. only `=>` is expression-only, and only the block constructs are statement-only. the gap was in `COHERENCE.md`, not in the code; the code already let a matcher leave or capture.

## 2026-09-12: the coherence spec ships

the journal's own failure drove it: the `if` expression stayed in the docs for several rounds because no one compared the claim against the code. the spec does the comparison mechanically now. four walks over `README.md`, `DESIGN.md` and `TUTORIAL.md`, with the code as the truth:

- every backticked identifier is a known construct (keyword, banned, absent, role, or punct), with a whitelist for the tstd members and variables the docs legitimately backtick.
- every "the `X` expression/statement" claim matches the role the handler plays.
- every construct in the role list has a spec entry in `lex.spec.ts` or `emit.spec.ts`.
- every construct in the role list is mentioned in `DESIGN.md`.

the role list lives in `emit.ts` because that is where the handlers live. a role's `match` field is the spelling a spec file actually writes (`?:` for `?:tag`, `?(` for `?(cond)`, `:err` for `:tag`), because the docs' generic names are not what a spec spells. the plan named handlers that did not exist; the spec asserts against the real ones.

## 2026-09-12: vocabulary closes to three words

three words for one family and two words for one form is too many. the vocabulary closes today.

side quest replaces the matcher family. the family had three names: matcher, side matcher, postfix matcher. they meant the same thing and one of them had to win. the `?` is the "quest" of "side quest", so the name remembers the symbol. the rule was always to remind of the symbol; the previous names didn't.

arrow capture replaces answer and fallback. `=>` was called "answer" sometimes (when it produced a value at the end of an expression) and "fallback" sometimes (when it substituted a value). both words leaked the role into the form, and a form with two names is a form whose role is hard to talk about. arrow capture is the form: it captures whatever is returned and stays in scope. the role lives in prose; the form has one name.

decline and refuse retire too. both meant exit. exit is the only word for leaving the scope now.

the three words: exit, arrow capture, side quest. every form in tz is one of them.

## 2026-09-08: the funnel is built

the early prototype built around `match` (a switch with bindings in expression position) and `guard` (an `if` that exits). two constructs doing nearly the same job; the rework unifies them into the `?` family. a side quest in postfix position decides between an exit and an arrow capture based on what follows.

the funnel shipped with it. an arm in a `? {}` block may exit, and the block is always a switch. captured (`const r = out ? {...}`) it is the let-temp switch: answer arms land in a temp and exit arms leave the function, then the binding reads the temp. as the whole body (`=> out ? {...}`) it is the all-exits switch. nested in an argument the funnel hoists before the statement, no iife. the statement form is a switch too (over the subject, over `.branch`, or `switch (true)` for conditions); arms run as triggers or as exits with explicit exits only.

the narrowing ruling shipped with it. a side quest on a named subject tests the name directly, no temp: `out ?:err return;` emits `if (out.branch === 'err') return;`, so `tsc` narrows `out` across the statement and the manual funnel typechecks. the switch narrows its subject per case the same way.

`true` and `false` are literals. `?true` and `?false` ride the literal path, so a binds-nothing refusal reads "a literal binds nothing".

the multi-tag chain answers on the miss. `x ?:a ?:b ?:c return else (v) => ...` exits on match, `else (v)` binds the survivor, and the miss continues into a new subject, mixing exits and arrow captures. exits are explicit everywhere; the emitter adds none.

## 2026-09-06: form and call added

two constructs that close the gap between tstd's wire shape and the tz surface.

form is the frontend for `form.ts`: one block instead of a wire type, a domain type, a guard, a decoder and an encoder. the block emits to the same five derived things; a rename is `as`, a nest is `form.nest`. the conversions borrow their signatures straight from the library, no lambdas and no annotations; a hand-written lambda annotates its parameters the way any signature does.

call is the second boundary that does not throw. `call expr` is `call.sync(() => expr)`; `call => { ... }` is the block form; `await call` picks the async variant. it sits next to `make`: every place typescript can throw is now a boundary the syntax owns.

## 2026-09: protocol as a literal

the protocol ruling landed in tstd earlier (see `STYLE-KB.md` o13); the tz surface got it last. a `protocol` block is the machine-and-union device as a literal: the derived things ride the closing line, and `export protocol` exports the type and the value. a plain block inlines into `protocol.init`; a generic block gets a shape function to bind its parameters. one construct for both union and machine, because a parameter is the only slot in a value that states a type.

## 2026-08: scope as sugar

scope is sugar over `scope.sync` / `scope.async`. the resource body with the reverse-order release. `hold` binds as a parameter, so it carries the lifetime through nesting: `scope (session) => { scope (page) => ... }` reaches two lifetimes with two names, and the line that took a resource says which scope it belongs to. `tzx` picks `scope.sync` or `scope.async` from the body, so there is no `scope async` spelling.

## 2026-08: the side quest family arrives

`on:err` and `any:none` were the first attempts at postfix decision. `on:err` declined on a branch and bound the payload; `any:none` declined on absence and substituted. they generalised into the `?` family: every decision a value can ask is a side quest, and every answer or exit it can give is one of three forms.

the early constructs retired here. `guard` and `match` are gone, replaced by side quests in postfix position. `on:err` is `?:err`; `any:none` is `?none`. the ban list made `function`, `class` and method shorthand disappear, and the discipline check became a function body is exactly a `{` preceded by `=>`.

## 2026-08: result branches renamed

`success` became `ok`; `error` became `err`. you write `ok x` and then you test the tag, and with `success` there you were holding two names for one idea. now the vocabulary closes: `ok x`, `result.ok(x)`, `out.branch == 'ok'`, `x ?:err`, `:err => ...`. one word per concept wherever it appears.

the one cost worth knowing: a tag is data. a stored branch carries `"branch":"err"` on the wire and in the database for as long as the row lives, so unlike a keyword it is not cheap to change later. that was weighed and taken.

## 2026-08: presence guards renamed

`is.present` and `is.absent` became `is.some` and `is.none`. they are the most typed guards in the language and they were the two longest words in the file; `some` and `none` say the same thing in four letters. presence and absence are the same idea either way.

## 2026-07: prototype begins

the prototype moves into `tz/`. the design notes start here. the constraint is one line in, one line out, and the first constructs are `guard` and `match`. the ban list is the second, and it is what makes the language a language. `tzc` and `tzx` arrive next, mirroring `tsc` and `tsx`.

the language is intended to move to its own repo with a `git mv` once the prototype is stable enough. the dependency on `tstd` is the package name, the same way any consumer takes it.
