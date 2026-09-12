# tz updates

a journal of decisions. the spec lives in `tz/TUTORIAL.md`; the design notes live in `tz/DESIGN.md`. entries are dated and written in the order they happened; the latest is at the top.

## agenda

the next item: a doc-code coherence spec. it walks the lexer, emitter, and ban list as the truth, then walks the docs and asserts that every backticked identifier is a known construct and every role claim (expression vs statement) matches the actual handler. the full plan is in `tz/COHERENCE.md`. the spec runs in `npm test`, so drift becomes a failing build.

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
