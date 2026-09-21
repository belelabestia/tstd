# 03 expression-subject chains working context

## intent

settle the 2026-09-16 defect and the questions it opened. two things land here: an arrow-body chain over an expression subject (`f(n) ?== 0 => 'zero' else => 'pos'`) no longer duplicates the subject around the temp; and `?(cond)` / a new `?!(cond)` become first-class custom side quests with a clear rule for what the left expression is. the session closes a defect, adds a spelling, and removes a refusal the author ruled unfounded.

## inputs

- `../UPDATES.md:9`, the defect, and the 2026-09-16 entry that locked the subject.
- `../scratch/chains.tz`, the showcase chains, all named subjects.
- `../src/emit.ts`, `linkBody` (the arrow-body walk), `chain`/`linkOne`/`declining`/`lift` (the four subject sites), `quest`, and the temp and `else` paths.
- `../src/scan.ts`, the `?` matcher tagging, specifically `?(` and `?!`.
- `../src/emit.spec.ts`, the chain cases and the `?(...)` condition cases.
- `../../AGENTS.md` and `../../STYLE-KB.md` before writing anything.

## decisions

- 2026-09-20. **a side quest is postfix in syntax, first in execution.** this is the rule the whole session turns on. `x ?(cond)` does not read as "resolve `x`, then test `cond`". the condition runs first; if the quest refuses, the scope exits and `x` is never evaluated; `x` runs only on the miss, as the value the quest yields. so `auth(id) ?(!isAdmin(id)) err 'no'` is `isAdmin(id) ?! err 'no'; auth(id)`, and the only correct emit is:
  ```
  if ((!isAdmin(id)) === true) return result.err('no');
  const a = auth(id);
  ```
  the statement form that emits `auth(id);` before the test is wrong: it evaluates the subject on the refused path, which the postfix reading forbids. every check of a `?` shape starts here.

- 2026-09-20. **the expression-subject garble is in `linkBody`, not the chain emitters.** `linkOne` returns the right code and its subject span is right; the walk reached the `(` of `f(n)` before the matcher, emitted the group literally, then emitted the matcher's code which spells the same subject again. the fix is `subjectAhead`: a `(`, `[`, object `{` or `=>` that opens a span a later quest's subject covers is skipped by the walk and left to the quest. `subjStart` computes the span, so subject logic stays in one place. rejected: touching `chain`/`linkOne` (already correct), refusing expression subjects (the table always allowed them), and a next-token check (misses nested calls, which the span test catches).

- 2026-09-20. **`?(cond)` is a free boolean, and `?!(cond)` is its negation: the custom side quest.** the parens hold the whole test; the expression on the left is the value the quest is about, not the thing the test reads. this rules a prior refusal unfounded. the author's model: `auth(id) ?(!isAdmin(id)) err 'unauthorized'` is exactly `isAdmin(id) ?! err 'unauthorized' else auth(id)`, so the left expression is only the miss value. rejected: keeping `?(...) tests a name` (the condition is emitted verbatim, the subject's spelling never reaches the test, so the refusal bought nothing); and requiring the condition to mention the subject (the point is a third-party predicate).

- 2026-09-20. **the left expression is the miss value, so it runs only on the miss.** under the postfix reading above, the subject is never evaluated before the test, in any context. captured, the emit is `if (...) return err; const a = auth(id);`. an expression subject with no land has nowhere to yield, so `auth(id) ?(!isAdmin(id)) err 'no'` as a bare statement is refused (`a condition over an expression needs somewhere to yield it; bind it first`); a subject that is a plain name keeps its old statement form. rejected: emitting `const $0 = auth(id)` up front (evaluates the subject on the refused path); emitting `auth(id);` before the test (same inversion); and holding a dead temp the test never reads.

- 2026-09-20. **a value `else` is always the subject of the inverted form: "yield <else>, but if <pred> then <arm> instead".** so `pred ? => hit else => miss` and `pred ?! => hit else => miss` are refused with a pointer at `miss ?!(pred) => hit` and `miss ?(pred) => hit` respectively. the reading is the author's "but if": `pred ?! => a else => b` means yield `b`, but if `pred` is false yield `a` instead, which is `b ?!(pred) => a`. a bare `?`/`?!` with **no** else keeps its own subject (`pred ? => a` emits `pred === true ? a : pred`), and an **exit** else (`else err ...`) or a **chained** else keep their spelling, because those are not plain values. rejected: silently rewriting the two spellings (the repo refuses a second spelling rather than aliasing it); and refusing the no-else, exit-else and chained forms (they are distinct). `scratch/signup.tz` carries the captured custom quest in `guard`.

- 2026-09-20. **a condition that repeats the subject is refused over an expression subject.** `db(m) ?(db(m) > 0)` would hold `$0 = db(m)` while the test re-reads `db(m)`, a hidden second evaluation. the fix is a name: bind it first. message: `a condition cannot test the subject it stands on; bind it first`. rejected: compiling it verbatim (silent double evaluation); and retargeting the condition to the temp (the emitter substitutes single identifiers, not token runs).

- 2026-09-20. **the docs caveat is removed, not narrowed.** no doc sentence states "matchers test names", and the `?(` row now reads as the free boolean it is. the `TUTORIAL.md` and `DESIGN.md` side quest tables gain `?!(cond)` beside `?(cond)`.

## evidence

- the defect, before and after, on `export const label = (n: number) =>\n  f(n) ?== 0 => \`zero\` else => \`pos\`;`:
  ```
  before  f(n)(($0) => $0 === (0) ? `zero` : `pos`)(f(n))
  after   (($0) => $0 === (0) ? `zero` : `pos`)(f(n))
  ```
  chained and nested forms (`g(f(a))`, `f({ a: n })`) hold one subject too.
- the new quest shapes, compiled:
  ```
  x ?(isAdmin(x)) err 'invalid'      if ((isAdmin(x)) === true) return result.err('invalid');
  x ?!(isAdmin(x)) err 'invalid'     if (!((isAdmin(x)) === true)) return result.err('invalid');
  const a = auth(id) ?(!isAdmin(id)) err 'no'  if ((!isAdmin(id)) === true) return ...; const a = auth(id);
  auth(id) ?(!isAdmin(id)) err 'no'  REFUSED: a condition over an expression needs somewhere to yield it; bind it first
  db(m) ?(db(m) > 0)                 REFUSED: a condition cannot test the subject it stands on; bind it first
  p ? => a else => b                 REFUSED: yield the else value and test it with ?!(...) instead
  b ?!(p) => a                       !((p) === true) ? a : b
  p ? => a                           p === true ? a : p
  ```
- the emitted program typechecks: `npx tsc --ignoreConfig --noEmit --strict --target es2022 --moduleResolution bundler --module esnext` over the emitted file: exit 0.
- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 1; 62 src pass (59 plus three new emit cases), 13 scratch with 12 pass and 1 fail, the pre-existing remote fixture at `scratch\signup.spec.ts` (session 05).
- `tzc scratch`: exit 0. `tzd scratch`: exit 0, `TZL0003` warnings only. `tzx` spec: fails only on the session-05 fixture.

## open

none for this session. the `:84` remote fixture belongs to session 05. the `? {}` condition arm keeps the same refusal only through the inline path; a condition arm over an expression subject is a separate question if it ever comes up.

## close

- commit: `add the negated condition quest` and `fix expression-subject chains` (two decisions, two commits)
- `../UPDATES.md` entry: `## 2026-09-20: a condition is a custom side quest`
- roadmap: session 03 flipped to done.
