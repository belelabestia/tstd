# 16 onboard people working context

copy this file to `context/<session>.md` at the open of a session and fill it as the session runs. it is the session's memory. the roadmap and the docs change only when the session closes.

## intent

give a person a getting-started path to a running tz program, built from the first-run path actually walked rather than invented, and rule on when and how `@belelabestia/tz` becomes installable (q6). the source of stumbles is the session 15 friction journal plus this session's own walk from an empty directory.

## inputs

- `../sessions/16-onboard-people.md` (the charge, the acceptance).
- `../roadmap.md` (the plan and the ledger, q5 and q6).
- `../context/15-the-first-build.md` (the newcomer's stumbles).
- `../context/12-choose-the-target.md` (the site brief).
- `../context/11-define-robust.md` (the split conditions behind q5).
- `../README.md` (the current entry point).
- `../package.json`, the root `package.json` (what is published, what resolves how).
- `../../TUTORIAL.md`, `../../DESIGN.md`, `../../AGENTS.md`, `../../STYLE-KB.md` (how to write tz).

## the walk

two walks, both from an empty state, both recorded with the exact command and result.

### a, the repo walk (the acceptance path)

a fresh clone via `git archive HEAD` (no `node_modules`, no `dist`), then the tz README's "running it" block, run from `tz/` as it was written.

1. `npm install` in `tz/`: exit 0, 10 packages. it installs tz's own deps and links `@belelabestia/tstd` to `..`, but the root keeps no `node_modules`.
2. `npm run build` in `tz/`: exit 2. the `prebuild` runs `npm --prefix .. run build`, and the root build dies with `error TS2688: Cannot find type definition file for 'node'`, because `@types/node` lives in the root and the root was never installed. **the first documented build command failed.**
3. `npm install` at the root, then `npm run build` in `tz/`: exit 0.
4. `node dist/tzx.js examples/main.tz`: exit 0, five lines.
5. `npm test` in `tz/`: exit 0, 56 decks and examples.

so the acceptance held once a second install happened, and the one document the README was did not say so. this session removes the second install (below) rather than documenting it.

### b, the install walk (q6)

an empty directory, `npm init -y`, then the install.

1. `npm i @belelabestia/tstd` with no `.npmrc`: 404 from `registry.npmjs.org`, the scope is unrouted.
2. with `@belelabestia:registry=https://npm.pkg.github.com`: 401, `authentication token not provided`. the root README documents both the `.npmrc` line and the token need, but a newcomer cannot self-serve the token, so "install" is not a path a person can take alone.
3. `tz` is `private: true` at `0.0.0` with `"@belelabestia/tstd": "file:.."`, so nothing named tz is installable at all. the tools (`tzc`, `tzx`, `tzd`) exist only inside this checkout.

### c, what the walk taught about the shape

a `.tz` program has to live inside the checkout: the loader resolves `@belelabestia/tstd` through `tz/node_modules`, and `tzc` reads `tz/tsconfig.json`. a program written in an empty directory fails with `ERR_MODULE_NOT_FOUND`, and `tzc` beside it with the same `TS2688`. the getting-started path writes the first program inside the checkout, which is where the walk could actually run it.

## decisions

- **2026-10-11. q6: repo-only onboarding, publishing deferred to the q5 split.** tz stays `private` at `0.0.0`; the getting-started path is clone-and-run, and `@belelabestia/tz` becomes installable only once the split conditions hold, at which point it publishes like `tstd`. rejected: publishing a private preview now (a token story for a research prototype that has not split yet); publishing both publicly on npmjs (it forces a versioning and release contract before tz is stable, and `tstd` already lives on github packages).

- **2026-10-11. the getting-started path is `tz/GETTING-STARTED.md`; `tz/README.md` is the map.** the README keeps what tz is, a taste, the inventory and the refusals, and points at the new doc for the first run. rejected: growing the README's running-it block (the README claims to be the map, and a walkthrough and a map are two jobs); a root-level doc (tz is the thing being started, and it is self contained).

- **2026-10-11. tz is self-sufficient through the root build, not through the root install.** the root `tsconfig.build.json` sets `types: []`, so the emitted library no longer requires `@types/node` beside it; `tz/`'s `prebuild` builds `tstd` with the compiler `tz/` already installs, and a fresh clone reaches a green build after a single `npm install` inside `tz/`. rejected: npm workspaces at the root (it would delete the tracked `tz/package-lock.json`, rewrite the root lock, and couple the two packages more tightly just as q5 wants them to separate); documenting the second install at the root (honest, but it is not what self-sufficient asks for).

- **2026-10-11. `GETTING-STARTED.md` joins the coherence walk.** the spec's `docs` list gains it, with `README`, `DESIGN`, `TUTORIAL` and the example name `hello` added to the prose allowlist. rejected: leaving the new teaching doc outside the walk, which would let it drift exactly as the walk exists to prevent.

## evidence

- `npm test` (root): exit 0, 44 pass (43 before the json cycles spec).
- `npm test` (tz): exit 0, 70 src plus 56 decks and examples.
- `npx tsx --test src/**/*.spec.ts` (tz): exit 0, 70 pass.
- `tzc examples constructs`: exit 0.
- `tzd examples constructs`: exit 0.
- `node dist/tzx.js examples/main.tz`: exit 0, five lines.
- fresh clone, repo walk: `npm run build` exit 2 (`TS2688`), then exit 0 after a root `npm install`.
- empty dir, install walk: `npm i @belelabestia/tstd` 404 without `.npmrc`, 401 with it.
- self-sufficiency, fresh clone: with `types: []` in the root build config, `cd tz && npm install && npm run build && npm test` exit 0 with no root install; root `npm run build` and `npm test` stay exit 0.
- `GETTING-STARTED.md`'s two programs, run from a clone: `hello ada`, then `{ branch: 'ok', value: 'hello ada' }`; `tzc` on the second, exit 0.

## open

- a `.tz` program runs only inside a tz checkout (walk c). not a defect to fix here, but it is the next thing a person hits after the first program, and it is where q6 would bite if tz were a package.
- q5 and q6 meet: tz still reaches tstd through `paths` into `../src` and `file:..`, both of which the split forbids.
- the vs code editor path in `GETTING-STARTED.md` is the author's words, untested on this host; the nvim path was not exercised either.

## close

- commits (one decision each):
  - `make tz self sufficient` (root `tsconfig.build.json`)
  - `write the getting started path` (`tz/GETTING-STARTED.md`, `tz/README.md`, `tz/src/coherence.spec.ts`)
  - `record the onboarding session` (`tz/plan/`, `tz/UPDATES.md`, `tz/STATUS.md`)
- `../UPDATES.md` entry: `## 2026-10-11: onboard people`
- roadmap: session 16 flipped to done, q6 resolved; status dashboard: sessions 16/22, onboarding 2/3, the newcomer criterion met.
