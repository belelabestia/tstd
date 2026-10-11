# 15 the first build working context

## intent

build the target chosen in session 12, the personal site, as a running first version in tz, and let the friction decide the next constructs. the point is not to finish the program; it is to learn where the language fights back. this file is the session's memory: the friction journal and the ranked candidate list live here.

## inputs

- `../sessions/15-the-first-build.md` (the charge, the acceptance).
- `../roadmap.md` (the plan and the ledger).
- `../context/12-choose-the-target.md` (the brief: the site, the routes, the constructs under test).
- `../context/11-define-robust.md` (the robust standard and the first-build definition).
- `../../TUTORIAL.md`, `../../DESIGN.md`, `../../AGENTS.md` (how to write tz).
- `../../examples/` and `../../constructs/` (the patterns to copy).

## decisions

- **the site lives under `examples/site/`.** the existing globs already walk it, so the battle program joins the build with no new tooling. rejected: a top-level `site/`, which would need every command and glob edited before a line of the program existed.
- **posts carry front matter, parsed by hand.** the brief says markdown for prose, so a post is a `.md` file with a small `key: value` head before a `---` line. rejected: a separate post index, which would split the prose from its metadata and hide the parsing friction the session exists to find.
- **the topic to theme mapping is a lookup, not a `protocol`.** the brief guessed a protocol; a `find` plus a fallback says it in one line, so the page machine carries `protocol` alone. recorded as a hypothesis the problem did not force.

## what was built

one monolith web service, files first, under `examples/site/`:

- `forms.tz`: the `form` declarations for a topic, a post, a link and the cv.
- `render.tz`: markdown-lite to html, the document shell, a list, the not-found page, a theme stylesheet.
- `page.tz`: the `protocol` page machine (singleton against collection) and its view.
- `load.tz`: the content source, held by a `scope`, read with `call`.
- `server.tz`: the http server, the route funnel, the `make`/`call` boundaries.
- `main.tz`: the runnable entry (`tzx examples/site/main.tz`, PORT or 3000).
- `server.spec.tz`: the end-to-end spec, part of `npm test`.
- `content/`: `topics.json`, `links.json`, `cv.json`, and two `posts/*.md`.

routes: `/`, `/cv`, `/links`, `/topics`, `/topics/:id`, `/posts/:slug`, `/theme/:name.css`, 404 otherwise.

## friction journal

every place the language was slower, more verbose, or more surprising than it should have been, with the exact code.

1. **`form` cannot declare an array of a nested form.** the cv sections and the topic list are arrays of records, and a field is a guard or one triple. `is.array` gives `unknown[]`, so the elements arrive untyped. worked around with a hand-written named guard. code: `sections: sectionList` with `const sectionList = (x: unknown): x is Section[] => is.array(x) && x.every(section);`.

2. **a body cannot mix `err` and `return`.** the natural reader ("prove the shape, then hand back the value") wants `form.model(...) ?! err 'x'` followed by `return value`, and the one-discipline rule refuses it. every reader became a fallible body ending in `ok`, which then needs `try` at every call site. code: `topics` ends `ok raw.map(...)` instead of `return raw.map(...)`.

3. **`form.models` proves a list but nothing decodes a list.** `form.model`/`form.decode` pair up, and `form.models` has no `form.decodeModels`, so a proven list is mapped by hand. code: `const topics = (at: string) => { ...; form.models(raw, topic) ?! err '...'; ok raw.map((one) => form.decode(one, topic)); };`.

4. **`scope` needs a close, and a directory read has none.** the brief maps `scope` to the content source, but a `Resource` is `{ open, close, abort }`, and reading a directory holds nothing to give back. code: `const directory = (root: string) => ({ open: () => root, close: (at: string) => void at, abort: (at: string) => void at });`.

5. **`ok` before an object literal is misread.** `ok { root: at }` emitted `return result.ok({ root: at }); return result.ok();`, the second an implied `ok` after the explicit one, which widened the scope's result to `Result<void> | Result<{...}>` and poisoned every reader. binding first fixes it. code: `const content = { ... }; ok content;` instead of `ok { ... };`.

6. **a side quest cannot sit on a call expression.** `content.topics.find(...) ?none return ...` is refused with "bind it before the match". code: `const found = content.topics.find((one) => one.id == id); found ?none return ...;`.

7. **a `? {}` inside a `? { }` trigger block leaves the inner matcher unconsumed.** routing a sub-path inline as `path.startsWith('/topics/') ? { const found = ... ?none return ...; }` failed with "a matcher tests one value in a statement". extracting a helper function fixes it. code: `const topicRoute = (path, content) => { ... }; path.startsWith('/topics/') ? return topicRoute(path, content);`.

8. **`call` around an overloaded node function picks the wrong overload.** `try call => readFileSync(file, 'utf8')` typed the result `string | NonSharedBuffer`, and `try call => readdirSync(dir)` resolved to the `withFileTypes` overload, returning `Dirent[]`. wrapping in a closure block fixes the inference. code: `const files = try call => { return readdirSync(join(at, 'posts')); };`.

9. **a boolean value chain is refused.** `parts.length > 1 ? => parts[1] else => ''` is refused with "yield the else value and test it with `?!(...)` instead", a rewrite that reads backwards. the workaround binds the boolean and uses `? {}`. code: `const more = parts.length > 1; const body = more ? { == true => parts[1], == false => '' };`.

10. **a dropped promise needs `void`.** `await once(server, 'listening')` is a naked statement whose value carries, so it reads `void await once(server, 'listening');`.

11. **`result.err` is warned, and `:err(...)` then needs `branch`.** the editor pushes `result.err(x)` to `:err(x)`, which emits `branch('err', x)`, so the file must also import `branch`. code: `:panic (why) => :err(...)`, with `import { branch, ... }`.

12. **a subdirectory in `examples/` silently dropped a spec.** the `npm test` glob `examples/**/*.spec.tz` is expanded by the shell first, where `**` is `*`, so once `examples/site/` existed the shell matched only the subdir and `examples/signup.spec.tz` stopped running. quoting the globs hands them to `tzx`'s own `globSync`. code: `'constructs/**/*.spec.tz' 'examples/**/*.spec.tz'`.

13. **an object literal as a `? {}` arm capture mis-emits.** the review rewrote the four route comparisons into one block, and `== '/' => { status: 200, html: home(content) }` in the function's answer position emitted `return (() => { status: 200, ... })();`, the object read as the arrow's body, failing the check with `TS1005`. a scratch file, checked and deleted. the arm must say `({ ... })`, the same paren the answer position forces on any object in an `=>` capture.

14. **the table cannot hold the prefix routes, and cannot sit mid-body.** a `(cond)` arm that repeats the lifted subject is refused, "the subject is lifted; elide it or bind the inner value first", so `path ? { (path.startsWith(...)) => ... }` is refused by design and the three `startsWith` quests stay above the block; and a block whose arms capture values must be the answer, since a mid-body one is refused with "an expression must always be captured; a ? {} arm runs an expression or a block", also by design. the route reads as three prefix quests then one total `==` table with the 404 in the `else`; the order is behaviour-preserving because an exact path and a prefix path never both match the same input.

## candidate changes

ranked, each with the friction that produced it. none implemented here.

1. **a `form` field for an array of a form.** the strongest. friction 1 and 3 both want it: `topics: form.list(topic)` would declare the guard and the decode for a list, and retire the hand-written `sectionList` and the `raw.map(decode)` loop.
2. **a reader that narrows then returns, without going fallible.** friction 2. `form.model(...) ?! err` wants a `return` after it; today every reader turns fallible and every caller needs `try`. a ruling is needed on whether that is the price of one discipline or a gap.
3. **`ok { ... }` must not be read as a block, and neither must an arm's `=> { ... }`.** friction 5 and 13. both write a `{` where a value belongs and the emit reads a block instead: `ok` emits a second `ok` and widens the type, an arm emits `(() => { ... })()`, and both failures surface at the check, not on the line. a defect, not a preference.
4. **a matcher on a call expression.** friction 6 and 7. `find(...) ?none return` is the shape a person writes first, and both the binding rule and the nested-block case make them route around it.
5. **`call` should preserve an overloaded function's own return type.** friction 8. `call.sync(readFileSync, ...)` picks a union or the wrong overload; the closure-block workaround is boilerplate the boundary should absorb.
6. **the boolean value chain.** friction 9. `cond ? => a else => b` is refused in favour of a rewrite that reads backwards; binding plus `? {}` is the honest form today.

## evidence

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 70 src plus 56 decks and examples (55 before, plus the site spec). the site spec boots the server and hits every route.
- `tzc examples constructs`: exit 0 (walks `examples/site/`).
- `tzd examples constructs`: exit 0, no warnings.
- `timeout 3 node dist/tzx.js examples/site/main.tz`: prints `site listening on 3000`, then the timeout.

## open

- the cv sections guard is hand-written; candidate 1 would retire it.
- `form.decode` for a list is hand-written; same candidate.
- the two settled-ish questions from session 12 stay open: the content source shape (front matter chosen, but unproven at scale) and whether the cv is authored in-repo or imported from `belelabestia-it`.

## close

- commit (planned; the author reviews before it lands):
  - `build the site` (`tz/examples/site/`, `tz/package.json`, `tz/.gitignore`, `tz/plan/`, `tz/UPDATES.md`, `tz/STATUS.md`)
- `../UPDATES.md` entry: `## 2026-10-06: build the site`
- roadmap: session 15 flipped to done.
