# 13 the agent bootstrap working context

## intent

session 13 writes the bootstrap: what an agent needs to write tz at all. the language contract (the three construct names, the ban list and why, the refusals), the toolchain loop, how to verify a change, and what to do when a construct is missing. the author rules on the format and the home; the bootstrap is tested by pointing an agent at it cold and getting a running tz file. session 16 hardens it into the tested contract, folding in the friction the build produces.

## inputs

- `../sessions/13-the-agent-bootstrap.md` (the charge, the acceptance).
- `../context/12-choose-the-target.md` (the target, so the bootstrap names the surface the build will stress).
- `../roadmap.md` (the goal, the phases, the ledger).
- `../../DESIGN.md` (the constructs, the ban list, the constraints).
- `../../TUTORIAL.md` (the spec, how to write tz).
- `../src/ban.ts`, `../src/typecore.ts` (the refusals, the truth).
- `../src/emit.ts` (the roles list, the truth).
- `../src/scan.ts` (the vocabulary, the truth).
- `../../../AGENTS.md`, `../../../STYLE-KB.md` (voice and rules).

## decisions

all dated 2026-10-06, ruled by the author in the session conversation.

- **the bootstrap lives at `tz/AGENTS.md`, with a one-line pointer from `tz/README.md`.** `AGENTS.md` is the repo's convention for agent onboarding, the file moves with tz when it splits to its own repo, and a downstream repo can point its agent straight at it; the README stays the human entry point and only points. rejected: README-only, which mixes the human entry point with agent instructions and grows past its home; a `tz/BOOTSTRAP.md`, which spends a new name where the convention already has one.

- **the bootstrap points at the code and ships one small whole program.** the ban list and the roles are the files, named and not copied, so the bootstrap cannot drift from the code; the model is a whole program because the build target is one, where a construct deck shows a single construct. rejected: copying the ban table and the `roles` list, which drift; shipping a construct deck, which models the wrong size.

## evidence

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 69 src plus 54 decks pass (the coherence walk included).
- `tzc` on the bootstrap's sample program: exit 0.
- the cold test: an agent given only `tz/AGENTS.md` and the files it names wrote a program that `tzc` accepts, exit 0. the agent read the decks and examples the file points at, which is the intended path.
- `tzc examples constructs`: exit 0. `tzd examples constructs`: exit 0.

## open

the cold test produced friction, folded into the bootstrap where it was a plain error and routed here where it is broader than this file.

- folded in: the table/pass split (the refused words are the table, the punctuation and shapes are the pass); the exit discipline (`ok` and `err` are one discipline, so they sit together, and the mix refusal is against `return` or `async`); `extends` and `constructor` are unreachable rather than table rows; the tz/library boundary (`form.model`, `form.decode`, `form.encode` are `tstd` exports); the import rules (a `form` needs `form` and `is`); and `?!` is `?== false`.
- routed: the tutorial and design say "three constructs, everything else is typecore", while the `roles` list holds the leaky set too. the bootstrap now names the leaky constructs and points at `roles` as the truth; the docs should follow (session 16, or a sweep).
- routed: a statement `else` is documented as banned but not enforced by the pass. it is the `if` overlap (session 19), so the bootstrap marks it as documented and not yet enforced.
- for session 16: re-run the cold test with a fresh agent and fold in whatever the build (14) produces.

## close

- commits (planned; the author reviews before any of them land):
  - `bootstrap the agent` (`tz/AGENTS.md` new, `tz/README.md`, `tz/plan/context/13-the-agent-bootstrap.md`, `tz/plan/roadmap.md`, `tz/UPDATES.md`, `tz/STATUS.md`)
- `../../UPDATES.md` entry: `## 2026-10-06: the agent bootstrap`
- roadmap: session 13 flipped to done.
