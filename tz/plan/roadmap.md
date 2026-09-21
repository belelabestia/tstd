# the tz roadmap

the plan of action for turning tz from a clever prototype into a trustworthy language: one that runs, one whose docs its author owns, and one proven by a real program.

the governing idea is in `../DESIGN.md`, the language is in `../TUTORIAL.md`, and the history is in `../UPDATES.md`. this file is the future: what we do next, in what order, and why. one session per file under `sessions/`.

## the goal

make tz a compelling option for web development and scripting. that is not a feature, it is evidence plus onboarding. the build must tell the truth, the docs must be owned by their author, and the language must carry a real program before it asks anyone else to try.

## the principles

- **fix before new.** debt first. a green build that runs nothing is worse than a red one, because it lies.
- **green means it runs.** the suite must execute the emitted code, not only typecheck it.
- **the author owns the docs.** no agent prompts parked in artifacts. forward work lives in this plan, and decisions are made by the author, not inferred from a comment.
<!-- #marco to agent: this point doesn't mean anything. translate it into something a human can understand -->
- **robust is evidence.** a milestone is a program, not a construct. the next language feature is whatever a real build forces.

## the phases

### phase 0, make the build tell the truth

`npm test` is green (43 root, 59 tz) while `tzx scratch/signup.spec.tz` exits 1 with two failing tests. the suite typechecks the emit and tests the emitter, but never runs what it emitted. that gap is the root debt: it is why a showcase defect could sit from 2026-09-13 to today with every light green.

the phase ends when a failing scratch assertion fails the build, the two known runtime failures are fixed, the documented chain defect is fixed, the editor checker either tells the truth or is silent, and the `?!` tail lands its value (session 06).

the showcase is now `examples/` (the whole programs) plus `constructs/` (one use-case deck per construct), and the coherence spec requires a deck for every role, so the "every construct" claim is checked. one defect surfaced while writing the decks: `cond ?! err 'x'` emits an unreWritten `err`. it is filed in the ledger as q7 and becomes session 06, the last truth defect before phase 1's docs work.

### phase 1, docs you own

three `# marco to agent` prompts live inside `../TUTORIAL.md` and `../DESIGN.md`. the coherence spec blanks them on purpose so they do not fail the walk. that is a conversation parked in the product. this phase removes the channel, answers or relocates the prompts, decides how the teaching docs are organized, and rewrites them in the author's voice.

### phase 2, define robust and battle-test

"robust and reliable" is the stated goal and has no testable meaning yet. this phase writes the acceptance criteria, picks the first real program, and builds it. the friction from that build is the only honest source of the next constructs.

### phase 3, onboarding

material that onboards people and agents. derived from the battle test, not invented ahead of it. tz is well suited to agent onboarding because the ban list is already machine-readable.

## the sessions

| # | session | phase | status | resolves |
| --- | --- | --- | --- | --- |
| 01 | run the code in the build | truth | done | the suite runs the showcase |
| 02 | survivor binding | truth | done | q1 |
| 03 | expression-subject chains | truth | done | the 2026-09-16 defect |
| 04 | the checker's honesty | truth | done | q2 |
| 05 | scratch, the showcase | truth | done | the remote fixture |
| 06 | the not tail | truth | planned | q7 |
| 07 | the comment protocol | ownership | planned | q3 |
| 08 | the teaching dissertation | ownership | planned | tutorial organization |
| 09 | the educational rewrite | ownership | planned | author voice |
| 10 | define robust | battle | planned | q5 |
| 11 | choose the target | battle | planned | q4 |
| 12 | the first build | battle | planned | the dev experience |
| 13 | onboard people | onboarding | planned | q6 |
| 14 | onboard agents | onboarding | planned | the agent contract |
| 15 | the form audit | battle | planned | q8 |
| 16 | the in-file test | battle | planned | q9 |

sessions run in order. 09 is blocked by 08, and 13 and 14 are blocked by 12. everything else is unblocked once 01 lands, because a session that fixes a defect needs the harness that catches the defect.

15 and 16 join the construct work of phase 2: 15 audits `form` because the author's charge is that its emit is inconsistent, and 16 explores a `test` keyword written in the file it tests. both are audits first, implementations second, so they may split.

## the questions ledger

- **q1, survivor binding.** after `x ?|(:idle, :loading, :failed) return;`, does a later `x` name the box or the payload? the docs say a coloned test keeps the box; the showcase spec expects the payload. session 02.
- **q2, `TZL0003`.** type the dropped-value check now, or withdraw it until the stable typescript surface lands? session 04.
- **q3, forward-work home.** where does planned work live? this file is the answer; session 07 ratifies it and writes the comment protocol that feeds it.
- **q4, the target.** what is the first honest program tz must carry? session 11.
- **q5, stable enough to split.** `../DESIGN.md` says tz moves to its own repo with a `git mv` once the prototype is stable. what does stable mean, in measurable terms? session 10.
- **q6, publishing.** `@belelabestia/tz` is private at `0.0.0`. when and how does it become a package someone can install? session 13.
- **q7, the `?!` tail.** `cond ?! err 'x'` emits an unreWritten `err`, while `cond ? err` and `cond ?== false err` rewrite it. found in session 05; the deck avoids it. session 06, the last truth defect.
- **q8, the form line.** some of `form` is emitted, some is written by hand, and the author charges that the line is arbitrary. where does it belong? session 15, with a `protocol` note if the audit finds an adjacent inconsistency (that would be q12).
- **q9, the in-file test.** a `test` keyword like zig's, in the file it tests, reaching module internals. feasible, and under what house-rule amendment? session 16.
- **q10, the deck `declare`.** `declare` inside a deck produces a false `TZL0002`, while `const` does not; found in session 05 while writing the `?literal` deck, which used `const` instead. a checker false positive over a legitimate declaration. unassigned.
- **q11, the tail comment.** a doc comment inside a `?` tail (`x ? //c\n log(x);`) loses the comment and emits a semicolon; found while drafting `not.spec.tz` and avoided. an emit defect. unassigned.
- **q12, the protocol note.** reserved for a `protocol` inconsistency if session 15's audit uncovers one adjacent to the `form` line.

## dependencies outside our control

- the editor affordances (completions, hover, goto, rename) and the in-memory keystroke loop wait on the stable typescript 7.1 programmatic surface. the interim surface is class-based, server-backed, and spawns a binary per run. that is noted, not scheduled.

## parked

these are settled as out of scope until the author raises them:

- new language constructs. the battle test produces candidates; it does not spend them here. this does not cover the two the author raised and scheduled: `test` (q9, session 16) and the `form` audit (q8, session 15).
- a linter, a formatter, a bundler, another test framework.
- the editor affordance set above, beyond what already ships in `tzd`.

## the comment protocol

comments that carry forward work are a living channel, not a phase to close. the author will always leave notes where the work lives and sweep through them periodically; that is the no-debt approach, and this file is where the swept work lands. session 07 writes the protocol in full (markers, allowed channels, sweep cadence, and how a coherence walk ignores a parked note on purpose); until then, the standing shape is:

- **a note parked in a doc or a spec is allowed.** source files keep the `//` ban from `../../AGENTS.md`; the channel is doc comments, spec essays, and the plan.
- **sweeping is scheduled, not incidental.** a sweep routes each note: do it now, make it a session here, or file it in the ledger.
- **the plan is the home.** a note is a capture, not a plan; once swept, the work lives in this file.

## how a session runs

1. **open.** copy `session-context-template.md` to `context/<session>.md` and state the intent in one paragraph.
2. **read.** the session file's inputs, plus `../AGENTS.md` and `../STYLE-KB.md` before writing anything.
3. **rule.** any genuine design question goes to the author. the ruling is recorded in the context file with its reasoning, and the rejected alternatives.
4. **work.** implement, then verify: `npm test` in the repo root and in `tz/`, `tzc examples constructs`, `tzd examples constructs`, and the `tzx` spec. a type claim is checked by compiling it, not by reading it.
5. **close.** the author reviews. once it passes, commit with one decision per commit, add a dated entry to `../UPDATES.md`, flip the status in the table above, and commit the context file with the session. then push.

## what a green close looks like

at the end of phase 0, `npm test` runs the emitted code and a broken showcase fails the build. at the end of phase 1, no prompt is parked in a doc and the tutorial reads in one voice. at the end of phase 2, a real program runs on tz and the friction is written down. at the end of phase 3, a person and an agent can each start from a document and be productive.
