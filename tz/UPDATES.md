# tz updates

a journal of decisions. the spec lives in `tz/TUTORIAL.md`; the design notes live in `tz/DESIGN.md`. entries are dated and written in the order they happened; the latest is at the top.

## agenda

the boolean and exhaustive checks ship; the `void` check now reads types too, so the next item is the editor affordances on the same surface (completions, hover, goto, rename) and a keystroke loop that stops shelling out. the coherence spec runs in `npm test`.

the showcase is now irreducible: every construct in the `roles` list has a deck under `constructs/`, and the whole programs live under `examples/`. phase 0 is closeable. the `?!` tail defect, `cond ?! err 'x'` emitting an unreWritten `err`, is the one item filed out of session 05 and would be the first defect session of phase 1.

three notes the author raised at the close of session 05 are now scheduled. the comment channel is a living protocol, not a phase: comments carrying forward work are part of the no-debt approach, and session 06 writes the protocol rather than deleting the notes. `form` gets an audit (q8, session 14) because its emit is inconsistent, some code written and some emitted along an arbitrary line. a `test` keyword like zig's, in the file it tests and reaching module internals, is explored in session 15 (q9).

## 2026-09-21: a deck for every construct

session 05 was scoped to repair the showcase. the claim it audited, `../README.md:61`, was false twice: the `remote` fixture failed, and six constructs in the `roles` list were never reached at runtime.

the fixture was not the `data:` url the roadmap suspected. node 24 fetch answers all three data urls with 200; what failed was the o8 trap. `remote` emitted `call.async(res.text)`, a `Response` method torn off its `this`, so the call threw and `remote` answered `err`. the fix restores the closure around the method, and an extra `.value` reads the boxed survivor of the coloned refusal.

the author ruled the reorganization. `scratch/` is renamed to `examples/`, holding the whole programs with `examples/signup.spec.tz` as their spec. a sibling `constructs/` holds one deck per construct: a `.spec.tz` of small use cases with walkthrough comments, in the voice of a tstd spec. keeping "real problems" apart from "use cases for one construct" was the point, so they are separate folders, not a merged one.

all 22 decks land: `=>`, `?none`, `?some`, `?:tag`, `?literal`, `?!`, `?(cond)`, `?!(cond)`, `? {}`, `branch`, `try`, `scope`, `call`, `make`, `form`, `protocol`, `return`, `ok`, `err`, `async`, `break`, `continue`. each role in `emit.ts` now names its deck, and two coherence checks require the deck to exist and to contain the construct, so a deleted deck or a dropped construct fails the build, the same way a doc drift already did.

what changed: `git mv scratch examples`, `constructs/*.spec.tz` (22 files), the `deck` field and the two coherence checks, the `remote` closure in `examples/calls.tz`, the example paths in `highlight.spec.ts`, `lsp.spec.ts` and the `test` script, `.gitignore` for both folders' emitted `.ts`, and the README's structure, construct list (`make` was missing) and showcase claim.

what verified: `npm test` in `tz/` is exit 0, 65 src plus 53 scratch (22 decks, 13 examples, the coherence checks); `npm test` at the root is green at 43; `tzc examples constructs` and `tzd examples constructs` both exit 0. the source-face check (emit.spec, DESIGN.md) is untouched.

one defect found and filed rather than fixed: `cond ?! err 'x'` emits `if (cond === false) err 'x';`, an unreWritten `err`, while `cond ? err` and `cond ?== false err` rewrite correctly. the `not` deck uses `?!`'s working forms (a bare trigger and `cond ?! return`) and the defect wants its own session with an emit spec.


## 2026-09-21: the checker tells the truth

q2 is ruled: type the dropped-value check now, not withdraw it. `tzd scratch` was emitting 65 `TZL0003` warnings and every one was false: 56 on `assert.*` and `test(...)`, five on `console.log`, one on an assignment, one on `out.push`. the check shipped at its untyped fallback, where any naked expression statement with no tz head read as a drop, so it cried wolf on every assertion.

the rule is now the author's: every dropped value that carries something must be bound or explicitly discarded, because a branched result must never be lost silently. `TZL0003` resolves the dropped expression through the interim checker and warns unless the value is none: `void`, `undefined`, `null` or `never`. a dropped `Result`, promise, boolean or string warns; an assertion, `console.log`, a declared `void` and a bare assignment are quiet; a type the checker cannot resolve stays silent rather than guessing. to see a `test(...)` promise the mirror now opens a widened project, `.tzd/tsconfig.json` extending the workspace config, so the `node:` types resolve for the spec files.

an assignment is a statement, so its value is incidental and it needs no `void`; that ruling makes an assignment unspellable as an expression, so `ban` now refuses one: `a = b = 2`, `if (a = n)` and `f(a = n)` are refused with `an assignment is a statement; it cannot be an expression`, while `a = n`, `o.x = 1` and `for (let i = 0; ...)` pass.

what changed: the dropped-value detection moved from `lsp.ts` into `check.ts` behind `openCheck.drops`; `checkVoid` is gone; `assigns` moved into `scan.ts`; `expressed` and the assignment refusal in `ban.ts`; a mirror project in `lsp.ts`; the `TZL0003` case in `check.spec.ts` and the assignment cases in `emit.spec.ts`; the `void` and assignment rules in `TUTORIAL.md` and `DESIGN.md`. the showcase voided its fifteen true positives: thirteen `test(...)`, one `ping(...)`, one `out.push(...)`.

what verified: `tzd scratch` exits 0 with no note; `tzc scratch` exits 0; `npm test` in `tz/` is 63 src green plus 13 scratch with 12 pass and the one pre-existing remote fixture at `scratch/signup.spec.tz` (session 05); `npm test` at the root is green at 43.

## 2026-09-20: a condition is a custom side quest

a side quest reads as "but if", and the reading is now the law: the test runs before the subject, a miss yields the subject, and a value written after `else` is the subject of the inverted form. three things landed.

the 2026-09-16 defect is fixed. an arrow-body chain over an expression subject, `f(x) ?== 0 => 'zero' else => 'pos'`, emitted `f(x)(($0) => ...)(f(x))`: `linkBody` reached the `(` of `f(x)` before the matcher, emitted the group literally, then emitted the matcher's code which spells the same subject again. the walk now skips a `(`, `[`, object `{` or `=>` that opens a span a later quest's subject covers, using `subjStart` so the subject logic stays in one place.

`?(cond)` and `?!(cond)` are the custom quests. the condition is a free boolean emitted verbatim; the expression on the left is the value the miss yields, not what the condition reads. the `?(...) tests a name` refusal is gone: it bought nothing, because the condition never reaches the subject. `?!(cond)` is the negation, tagged in the scan and negated in `quest`. when the condition never repeats the subject, the subject is read once, only on the miss: captured it lands after the test, `if (...) return err; const a = auth(id)`, and a bare statement with no land refuses it, because a postfix quest with nowhere to yield has nowhere to put the value. a condition that does repeat the subject is refused, because the test would read it twice.

the inversion closes the family. a bare boolean with a value `else` is refused in favour of the subject-first form: `pred ? => hit else => miss` reads "yield `miss`, but if `pred` then `hit`", which is `miss ?!(pred) => hit`, and `?!` pairs with `?` the same way. a bare condition with no `else` keeps its own subject, `pred ? => a` emitting `pred === true ? a : pred`; an exit `else` stays the funnel and a chained `else` stays composition, since neither is a plain value.

what changed: `subjectAhead` and the four subject sites in `emit.ts`; `condRange`, `condOnly`, `condRepeats`, `repeats`, `elseAfter` and the `?!(cond)` negation; the `?!(` row in `roles`; the `?!(cond)` tag in `scan.ts`; three `emit.spec` cases and two message updates; the side quest tables and the custom-quest rule in `TUTORIAL.md` and `DESIGN.md`; `guard` in `scratch/signup.tz` carries the captured custom quest, with a spec.

what verified: `npm test` in `tz/` runs 62 src plus 13 scratch, all green but the one pre-existing remote fixture at `scratch/signup.spec.ts` (session 05); `npm test` at the root is green at 43; `tzc scratch` exits 0; `tzd scratch` exits 0 with only `TZL0003` warnings; the emitted chains and quests typecheck under `tsc --strict`.

## 2026-09-20: a survivor keeps its box

q1 is ruled: a coloned refusal keeps the subject boxed, so the showcase source was wrong, not the language. `finished` in `scratch/machine.tz` now reads `const rows = x ?|(:idle, :loading, :failed) return; return rows.value;`, and `scratch/signup.spec.tz` passes unchanged.

the box is not a wart. a coloned test names one branch, so the survivor is that branch's complement: `?|(:idle, :loading, :failed)` leaves `done` alone, but `?:loading` on the same union leaves three members, some carrying nothing, and `.value` on those does not typecheck. `?ok` and `?err` are the only tests that may unwrap, because the complement of one branch of a two-member union is always the other branch, and that one always carries the payload. the emitter is syntactic and knows no union, so it can never decide a group's complement. unwrapping the survivor would break the multi-member cases and the chain that reads the same union twice.

what changed: one line in `scratch/machine.tz`; one `emit.spec` case pinning that a group refusal binds `rows = x` while the caller reads `.value`, with the reason in the comment; one sentence in the `tz/TUTORIAL.md` side quest paragraph; one clause in the `tz/DESIGN.md` side quest bullet.

what verified: `npm test` in `tz/` runs 59 src plus 12 scratch, the `finished` assertions pass and the suite stays red on the one pre-existing failure at `scratch/signup.spec.tz:84`, which is session 05's remote fixture; `npm test` at the root is green at 43; `tzc scratch` exits 0; `tzd scratch` exits 0 with only `TZL0003` warnings.

## 2026-09-20: the build runs the showcase

the suite typechecked the emit and tested the emitter, but never ran the emitted program: `node dist/tzx.js --test scratch/signup.spec.tz` exited 1 while both suites stayed green. that gap let a showcase defect sit under green lights, so the fix is the harness, and the two failures are left standing on purpose. they are sessions 02 through 05.

what changed: one line in `tz/package.json`. the `test` script now ends with `tsc -p tsconfig.build.json && node dist/tzx.js --test scratch/**/*.spec.tz`, after the existing `tsc --noEmit` gate and the src suite. the build is required because the loader's `register('./hook.js')` only resolves against the emitted `dist`; the run goes last so the 59 src tests stay visible when the showcase is red; the glob pulls in a future scratch spec for free.

what verified: `npm test` in `tz/` is red, exit 1, the src suite at 59 pass and the scratch suite at 10 pass 2 fail, naming `scratch\signup.spec.tz:60:1` and `:84:1` with the assertion frames at `66:10` and `97:56`. all 11 non-spec scratch `.tz` files run and exit 0, and `main.tz` prints its output. no new dependency, no new framework.

## 2026-09-16: an else quest continues the locked subject

the `chains.tz` fixme asked for `?(n < 0)` where the chain reads `n ?(n < 0)`, and the author ruled the reading, not just the spelling: a bare quest without a subject has nothing to yield on a miss, while a comparison reuses the subject it already holds. so an `else` now carries a quest itself — `else ?< 0 => 'neg'` — and the subject stays locked for the whole chain: one chain, one subject, the miss yields it, the final `else` is optional, and a quest with no chain behind it is refused since a miss would have no value to yield.

rebinding is refused, not missing. `else => b ?== value => 'also yes'` nests a chain with its own subject inside the answer; the outer miss still yields the outer subject, so nesting is composition and each chain answers its own miss. the refusal targets only the shape that would move the fallback mid-chain, and the rule is documented, not just encoded: one chain, one subject, in `tz/TUTORIAL.md` and the `tz/DESIGN.md` side quest bullet.

what changed: `chain` threads the locked subject through its `else` recursion and skips the temp it did not declare; the callers (`declining` three times, `lift` twice, `linkOne` once) hand theirs down, and `linkOne` extends the range past the answer so the terminator stays in it. a `?` that opens no chain stays refused, and a statement decline keeps refusing a quest after `else` (`one decline per statement`), since tails there are exits, blocks and `=>` answers. the checker skips a chain `?` the way it skips every answer-side quest.

what verified: 5 new `emit.spec` cases (locked comparisons, a locked `?(cond)`, miss yields subject, nested composition, subjectless refusal), the `tick` example rewritten to the locked sketch, `npm test` green at 59 tz plus 43 root, `tzc scratch` clean. docs move one sentence in `DESIGN.md`, one paragraph in `TUTORIAL.md`.

## 2026-09-14: the checker behind the interim surface

"blocked" was a quick probe, not a study, and the challenge was fair. what the 7.0 package actually ships: the root exports only a version, no compiler js, no server js, no bundled declarations; the surface is `unstable/*`, class-based and server-backed, spawning the bundled native binary in about a hundred milliseconds. the published status matches: 7.0 checks exactly like 6.0 by design, there is no stable programmatic api before 7.1, and 7.1 promises a new and different one, so 6.x-shaped code is not worth writing even once. the compat package stays out of the tree: a second compiler for one feature, and the rewrite comes either way.

so the proxy talks to the interim surface now, and everything it touches lives in `src/check.ts` behind a narrow seam: positions in, warnings out, one spawn per run, closed after. when the stable surface lands only that module is rewritten. the same run still shells out to `tsc` for parity: two readers, one mirror.

what ships is `TZL0002` and `TZL0004`, both warnings, emitter untouched. a bare guard and a trigger must test a boolean; comparisons, matcher glue, chain answers and protocol edges are excluded by construction, and a call resolves through one signature to its return type. an answerable ladder must cover every member: literal arms against union members, tag arms against branch members, through the temp names the emitter introduces. anything either check cannot decide stays silent: `else`, conditions, groups, presence words, non-literal members, params, `any` and the error type. `unknown` is flagged; it is not boolean.

what broke taught the shape. a declared boolean arrives as a union of true and false, never an intrinsic, so the first version flagged every boolean guard and only the union walk fixed it. a call's type lives at no offset of its own text: the callee resolves to the function and the closing paren to nothing, hence the signature hop. `==` emits `===`, so the mirror search normalizes before pairing. the subject is held from tokens, never sliced from the line start, because arrow bodies prefix every ladder. chain tails (`n ?< 0 => 'below'`) and protocol edges (`idle => loading`) look exactly like triggers and are excluded, as are decline answers (`?:err =>`). positions pair by text order on test-bearing lines with word boundaries; a guard text hiding inside a string on such a line could still miscarry, none observed.

what verified: 50 tz tests with 4 new, 43 root, `tzc scratch` clean, `tzd scratch` exits 0 with no checker note on scratch. two false `TZL0002` on scratch (a protocol edge, a decline answer) were found by that run and fixed, which is the run earning its keep. docs move none in `README.md`, two paragraphs in `DESIGN.md`, two sentences in `TUTORIAL.md` (total 937 to 941, still under the thousand).

## 2026-09-14: the void ruling and the lsp spike

the 3a question went to the author and triggers stay bare: the `?` head already marks the effect explicitly, so `void` is only for naked statements with no tz head. the ruling is filed in the `tz/DESIGN.md` lsp prose and the `tz/TUTORIAL.md` trigger section.

the spike ships in the plan's order. (1) a session holds open buffers, transpiles each in memory with `emit`, checks them with the same `tsc` flags `tzc` uses over a temp mirror, and maps every diagnostic back with the line identity and the shift table; `tzd` runs the same session headless (`node dist/tzd.js scratch`, warnings do not fail it). parity with `tzc` holds by construction: same emit, same flags, same walk. (2) of the three checks, the `void` one ships at its untyped fallback: any naked expression statement with no tz head is a `TZL0003` warning, with triggers, `else` sides, declaration interiors, object frames and `void` itself spared; boolean conditions and exhaustive `? {}` wait on a checker, with `TZL0002` and `TZL0004` reserved. (3) completions, hover, goto and rename ship nothing. the emitter is untouched: every emit spec passes unmodified.

what broke is the dependency, not the design. typescript 7 exposes no in-process checker at its root, only `version`; the programmatic surface is an unstable client/server tree that spawns a native server, speaks snapshots and projects off tsconfigs, and builds everything from classes. there is no language service to hand a virtual buffer to, so the no-shell-out hot path stays open and the keystroke loop shells out per run. no volar: refused for the usual reason, a framework and a tree. what verified: `tzd scratch` exits 0 with only void warnings, a crafted drop warns on its own line, a `TS2322` lands on its tz line and column, `tzc scratch` stays clean, and `npm test` is green at 46. the coherence whitelist gains `tzd` and `emit` deliberately. docs move one line in `README.md`, two in `DESIGN.md`, none in `TUTORIAL.md` (total 934 to 937, still under the thousand).

## 2026-09-14: docs compact

`tz/NOTES.md` is deleted (it was empty) and `tz/COHERENCE.md` is retired by deletion: the plan is superseded, the four walks move into the `tz/DESIGN.md` coherence section one sentence each, and `src/coherence.spec.ts` stays the truth. the agenda's coherence-build note retires with it, superseded by the 2026-09-12 entry and the spec itself.

the four doc roles are enforced by moving, not copying. the tutorial no longer restates the `tstd` patterns: the 200-line typescript background points at its owner (`../README.md` for the principles, the `../src/` specs for the demonstrations). the keyword ban table lives once in `tz/DESIGN.md` (`src/ban.ts` is the truth) and the tutorial points at it, keeping only the punctuation and shape refusals; the two tables were reconciled cell by cell first (`enum`, `get`/`set`, method shorthand, `===`/`!==`, `??`, `?:`, presence, bare `return`, the `async` modifier, `Promise.reject`, ts `try`). `tzc`/`tzx` and both import rules are told once in `tz/README.md`, once as toolchain in `tz/DESIGN.md`, and in one paragraph from the tutorial. the tutorial's closing section points at `tz/DESIGN.md` for the lsp work and `tz/README.md` for the self containment. the `?!` spacing refusals are pinned in the tutorial's quest-refusal paragraph.

line counts per file, before and after (journal excluded from the total, and it only grows): `README.md` 66 to 66, `DESIGN.md` 220 to 220, `TUTORIAL.md` 884 to 648, `COHERENCE.md` 169 to deleted, `NOTES.md` empty to deleted. total 1339 to 934, under the 1000 the plan asks for.

## 2026-09-14: `?!` means `?== false`

a bare `?!` shortcuts `?== false`, symmetric with `?` for `?== true` and strict (`=== false`, never `!== true`). every tail `?` takes, `?!` takes, while `? {}` arms keep spelling `==` explicitly so `?! {` with arms is refused. `?!` gets its own `roles` row (spelling-keyed, so spec coverage and design mention stay enforced); `?ok`/`?err` stay rowless as `keywords.matchers`, which is the precedent for hand-rolled spellings. the grammar renames `#matcher` to `#side-quest` and `#binary` to `#binary-quest` plus a new `#bare-quest` for `?` and `?!`; both residues stay wontfix and cosmetic.

## 2026-09-13: conditionals become binary quests

a `?` sits in the middle of a comparison now: it captures the expression on its left and tests it against the right. the operator glues onto the `?`, as in `x ?== 2` or `x ?> 0`, and the operators are exactly the boolean binaries (`==`, `!=`, `>`, `<`, `>=`, `<=`). `==` is mandatory on every test, so `?true`, `?false`, `?5`, `?'hi'` and glued `?=y` all retire in favour of `?== ...`, and a bare `?` means `?== true`. arithmetic and bitwise quests go with them; a modulo case spells `?(...)` or moves the computation left of the `?`.

more than one right half takes one glued combinator plus parens: `x ?&(> 0, < 100)` holds when every half holds, `x ?|(< 0, > 100)` when any half holds. groups nest, a group of one is refused, and a group never mixes `:tag` with comparisons. `?(` stays the escape hatch for a self contained boolean; the combinator tells groups apart from it.

the `? {}` block takes the same heads, arms being alternatives with one `else` for the miss, which replaces `_`. a block of only `==` arms switches on the subject internally; anything mixed cascades. the tutorial carries the full spec.

the emitter follows it now. one shared quest parser feeds every path: single comparisons parenthesise their operand, groups join halves, nesting recurses, and juxtaposed quests are refused with a pointer to groups. the `? {}` block is handled in one place too: the old pure-answer path is gone, captured blocks funnel through a temp, and only `==` arms keep the `switch`. `else` arms are consumed so the statement `else` ban never sees them, and the `==`/`!=` rewrite skips quest operators and arm heads it would otherwise swallow. the scan tags glued operators, groups, and bare `?`, plus operand ends so tails restart, while the ban owns the spacing and retired-shape refusals. scratch, the editor grammar, and the readme walk the new syntax; the one scratch runtime failure is pre-existing on the base.

## 2026-09-13: `?` compares at runtime, against spellings and variables

superseded by the binary quests entry above, kept for history: glued templates and `?=name` are refused now, compare with `?== ...`.

a `?` matcher is a strict compare now, whatever follows it. a glued template reads as a literal: `` x ?`no row ${id}` `` emits `x === `no row ${id}``, the holes evaluating at runtime, so the old "static spelling, use quotes" refusal is gone. to compare against a variable instead of a spelling, glue an `=` between the `?` and the name: `x ?=y return` emits `x === y`, the name unquoted. the word after the `=` rides glued or spaced, but it has to be a plain name — a matcher, a literal, or a keyword there is refused, because `?=ok` would not know which reading it is.

the scan tags both shapes, the ban only sees the broken ones: a spaced template is told to glue itself, a `?=` with no name or a reserved target gets its own sentence, and the generic refusal points at `?=name`. the emit reuses the literal slice for templates (backticks and holes survive, it is valid js) and pushes the bare name for `?=`. the `? {}` arms already took templates, so only the four statement loops and the scan gate changed, plus the grammar's matcher rules and the tutorial table.

## 2026-09-13: a branch test gets two readings

`?ok` and `?err` are matchers now: they name the `Result` branches the short way and bind the payload unwrapped, `const e = $0.value;`. a coloned `?:tag` keeps the old boxed shape, `const why = $0;`, and that is what makes a chain possible: `status ?:loading ?:err => 'wait, then bail'` reads the same union twice without a temp. the price is that `?:err (why)` binds the whole subject, not the payload; the docs spell the difference, and the scope-panic example reads `why.value`.

the rest of the family is untouched: `?none`/`?some` still test presence, and a bare `?idle` is still refused — `?:` is refused is the sentence that holds because the coloned reading exists. superseded in part by the binary quests entry above: `?true`/`?false` retire into `?==`, and juxtaposed chains join in groups.

## 2026-09-13: `match` and `guard` retire

the last two old-shape words leave the code and the teaching docs. `match` was a construct, retired as a word: the scan neither tags nor bans it, so `match` is a name like any other. `guard` leaves the ban list and the tutorial table; a decline is `?none` (or `?== false` since the binary quests entry above), a table is `? {}`. the coherence walk found the drift on its own: backticked `match` and `guard` were still sitting in `DESIGN.md` and `TUTORIAL.md` as if they were constructs, and each one failed the backtick check with a line number.

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
