# 11 define robust working context

## intent

the end goal is that tz is robust and reliable, and neither word has a testable meaning yet. today "done" means `npm test` is green, which phase 0 showed is not the same as the language working. this session writes the standard: acceptance criteria for robustness, each one checkable by a command or a person in one sitting, marked as already met, met by phase 0, or owed to the battle test. it also answers q5, the measurable meaning of "stable enough to move tz to its own repo". the author rules on the separate decisions below before anything is written into `../../UPDATES.md`.

## inputs

- `../sessions/11-define-robust.md` (the charge, the candidates, the acceptance).
- `../context/10-the-core-subset.md` (the core subset, the checker's four checks, the split dependency question).
- `../roadmap.md` (the goal, the principles, q5, the ledger).
- `../../DESIGN.md` (the constraints, the toolchain, the self-containment claim at line 95 in `../../DESIGN.md`: "tz is self contained ... it depends on `tstd` ... through the package name").
- `../../README.md` (the toolchain walk, the editor note, the showcase claim).
- `../../UPDATES.md` (the phase 0 history: sessions 01 to 06).
- `../../../AGENTS.md`, `../../../STYLE-KB.md` (voice and rules).

## the robust standard

a draft, pending the author's ruling. one page; each criterion checkable.

### what the words mean

- **robust**: the build tells the truth about the language. it runs what it emits, the checker is right or silent, a refusal names its replacement, and the surface is coherent.
- **reliable**: the same source gives the same outcome, and every outcome is named. a program either answers or returns the failure its types promised; nothing is dropped, swallowed, or decided silently.

### the criteria

**the build**

1. **the build runs the code, not only typechecks it.** a broken assertion in a showcase fails `npm test`. measured: `tzx --test` over `constructs/` and `examples/` is part of `npm test`; breaking one assertion turns the suite red. *met (session 01).*
2. **a diagnostic lands where a person would edit.** a type error in a `.tz` file is reported on the `.tz` line; the column is exact or the whole line is underlined. measured: a crafted `TS2322` lands on the `.tz` line and column. *met (session 04).*

**the checker and the refusals**

3. **the checker is silent or right, never noisy.** `tzd` emits no warning on code the author accepts, and every warning it does emit points at a real defect. measured: `tzd examples constructs` exits 0 clean; a crafted defect warns on its own line. *met (sessions 04, 10).*
4. **a refusal names its replacement.** every row of the ban table produces a diagnostic that says what to write instead. measured: `ban.spec.ts` covers each row; `tzc` on a banned word names the replacement. *met.*

**the surface**

5. **one spelling per idea.** the coherence walk passes: a deck per role, a doc mention per construct, no construct doing another's job. measured: `coherence.spec.ts`, 6/6. *met, with one named open: the `if` overlap (session 18).*
6. **the editor loop is honest.** either a keystroke checks without spawning, or the docs say plainly that it shells out per run (about a hundred milliseconds). measured: `../../DESIGN.md` and `../../README.md` name the interim surface and the waits. *met by honest documentation.*

**the program**

7. **a real program runs on tz.** a whole problem, not a construct deck, running in the build with its own spec. measured: the battle program runs end to end under `npm test`. *the battle test must meet this (session 13).*
8. **a newcomer can follow the tutorial to a running program without a line that lies.** measured: one walk of `../../TUTORIAL.md` to a running program; every lie found is a defect. *the battle test must meet this; phase 3 (session 14) sharpens it.*

### the first build is done when

- the program is a whole problem: it takes input from outside (argv, stdin, a socket) and produces output a person can use.
- it runs in the build: an end-to-end spec executes it under `npm test`.
- it exercises the leaky group at least once (`scope`, `call`, `form`, `protocol`, `make`) and the core constructs by use, not by comment.
- its friction is written down: every place tz made the work harder is a ledger entry, because that friction is the only honest source of the next construct.

### q5: stable enough to split

a `git mv tz/` to its own repo only when tz stops needing the working tree it was born in. three conditions, all measurable:

1. **the dependency is a version, not a path.** tz reaches `tstd` through the package entry alone: no `paths` mapping into `../src`, no `file:..` dependency. checkable: read `tz/package.json` and `tz/tsconfig.json`; neither holds a path to the parent.
2. **the suite is green from the split.** a fresh clone of `tz/` alone, against a tagged `tstd` from the registry, passes `npm test` with no change to either side. checkable: clone, install, test.
3. **the surface has stopped moving.** the ban table, the role list and the emitted shapes hold unchanged across one full `tstd` release while the battle program is built. checkable: the diff between two `tstd` tags touches neither `src/ban.ts`'s table nor `emit.ts`'s role list.

all three met means stable enough to split.

## decisions

all dated 2026-09-23, all ruled in review before any edit.

- **the standard keeps two words.** robust is the build telling the truth (it runs, the checker is right or silent, a refusal names its replacement, the surface is coherent); reliable is the same source giving the same named outcome, with nothing dropped, swallowed, or decided silently. rejected: folding both into one undifferentiated "robust", which loses "failure is named" as a criterion of its own, and the two words are the author's own framing of the goal.

- **q5 is three conditions.** version-not-path, green-from-split, surface-stopped-moving. rejected: a two-condition test that drops "surface-stopped-moving" (a green isolated suite says the build works, not that the language has settled, and a split that lands mid-move exports a moving target); rejected: "the prototype feels done", which is not checkable.

- **the newcomer criterion is in the standard now.** criterion 8 lists "a newcomer can follow the tutorial to a running program without a line that lies", marked owed to the battle test and sharpened in session 14. rejected: deferring it wholly to phase 3, which would drop onboarding from the stated goal at the moment the standard is written.

- **the standard lives in this context file.** session 11 owns the one page; `../../UPDATES.md` gets a pointer and the `../roadmap.md` sessions table flips. rejected: a new doc in the tree (`tz/ROBUST.md`), which the roadmap does not ask for and which the coherence walk would then have to cover, adding a standing doc for a one-time ruling.

## evidence

no code changed, so the evidence is the standing green suite, unchanged.

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 69 src plus 54 decks and examples pass.
- `tzc examples constructs`: exit 0.
- `tzx` spec (part of `npm test`): 54 pass.
- `tzd examples constructs`: exit 0, no warnings.

## open

- none. the four rulings are in **decisions**, and the standard is endorsed as written. the standard is restated in `../../UPDATES.md` at length, so the journal carries it without a new doc.

## close

- commits (planned; the author reviews before any of them land):
  - `define robust` (`tz/plan/context/11-define-robust.md`, `tz/plan/roadmap.md`, `tz/UPDATES.md`)
- `../../UPDATES.md` entry: `## 2026-09-23: define robust`
- roadmap: session 11 flipped to done.
