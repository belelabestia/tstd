# the tz roadmap

the plan of action for turning tz from a clever prototype into a trustworthy language: one that runs, one whose docs its author owns, and one proven by a real program.

the governing idea is in `../DESIGN.md`, the language is in `../TUTORIAL.md`, and the history is in `../UPDATES.md`. this file is the future: what we do next, in what order, and why. one session per file under `sessions/`.

## the goal

make tz a compelling option for web development and scripting. that is not a feature, it is evidence plus onboarding. the build must tell the truth, the docs must be owned by their author, and the language must carry a real program before it asks anyone else to try.

## the principles

- **fix before new.** debt first. a green build that runs nothing is worse than a red one, because it lies.
- **green means it runs.** the suite must execute the emitted code, not only typecheck it.
- **the docs are the product, not a workbench.** a reader opens `README.md` or `TUTORIAL.md` to learn the language, not to find a note-to-self left mid-sentence. the author decides what planned work becomes; the plan records it, and a parked note is only a capture on its way there.
- **robust is evidence.** a milestone is a program, not a construct. the next language feature is whatever a real build forces.

## the phases

### phase 0, make the build tell the truth

`npm test` is green (43 root, 59 tz) while `tzx scratch/signup.spec.tz` exits 1 with two failing tests. the suite typechecks the emit and tests the emitter, but never runs what it emitted. that gap is the root debt: it is why a showcase defect could sit from 2026-09-13 to today with every light green.

the phase ends when a failing scratch assertion fails the build, the two known runtime failures are fixed, the documented chain defect is fixed, the editor checker either tells the truth or is silent, and the `?!` tail lands its value (session 06).

the showcase is now `examples/` (the whole programs) plus `constructs/` (one use-case deck per construct), and the coherence spec requires a deck for every role, so the "every construct" claim is checked. one defect surfaced while writing the decks: `cond ?! err 'x'` emits an unreWritten `err`. it is filed in the ledger as q7 and becomes session 06, the last truth defect before phase 1's docs work.

### phase 1, docs you own

the teaching docs carried prompts parked as comments: notes to an agent left mid-document, where a reader could meet them. that is a conversation parked in the product. session 07 keeps the channel and gives it a protocol (`#todo`, `#fixme`, `#prompt`, swept at every session close) instead of deleting it, then routes the parked notes. 08 and 09 follow: how the teaching docs are organized, then the rewrite in the author's voice.

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
| 06 | the not tail | truth | done | q7 |
| 07 | the comment protocol | ownership | done | q3 |
| 08 | the teaching dissertation | ownership | done | tutorial organization |
| 09 | the educational rewrite | ownership | planned | author voice |
| 10 | define robust | battle | planned | q5 |
| 11 | choose the target | battle | planned | q4 |
| 12 | the first build | battle | planned | the dev experience |
| 13 | onboard people | onboarding | planned | q6 |
| 14 | onboard agents | onboarding | planned | the agent contract |
| 15 | the form audit | battle | planned | q8 |
| 16 | the in-file test | battle | planned | q9 |
| 17 | the `if` ban | truth | planned | the `if` overlap |

sessions run in order. 09 is blocked by 08, and 13 and 14 are blocked by 12. everything else is unblocked once 01 lands, because a session that fixes a defect needs the harness that catches the defect.

15 and 16 join the construct work of phase 2: 15 audits `form` because the author's charge is that its emit is inconsistent, and 16 explores a `test` keyword written in the file it tests. both are audits first, implementations second, so they may split.

17 is the `if` overlap, ruled in session 08: `switch` is already banned, `if` is not, and every `if` is replaceable by a side quest. it lands a ban-list change, an emit spec, and the sweep of the decks and examples that still write `if` (the clamp funnels, the spec guard clauses).

## the ledger

where a swept note lands. a question is q-numbered; a routed task is t-numbered.

- **q1, survivor binding.** after `x ?|(:idle, :loading, :failed) return;`, does a later `x` name the box or the payload? the docs say a coloned test keeps the box; the showcase spec expects the payload. session 02.
- **q2, `TZL0003`.** type the dropped-value check now, or withdraw it until the stable typescript surface lands? session 04.
- **q3, forward-work home.** where does planned work live? resolved in session 07: this file is the home, and the comment protocol feeds it. every parked note is a capture that a sweep routes here.
- **q4, the target.** what is the first honest program tz must carry? session 11.
- **q5, stable enough to split.** `../DESIGN.md` says tz moves to its own repo with a `git mv` once the prototype is stable. what does stable mean, in measurable terms? session 10.
- **q6, publishing.** `@belelabestia/tz` is private at `0.0.0`. when and how does it become a package someone can install? session 13.
- **q7, the `?!` tail.** `cond ?! err 'x'` emitted an unreWritten `err`, while `cond ? err` and `cond ?== false err` rewrote it. found in session 05. resolved in session 06: the tail rewrite was never the hole; the glued `!` of a bare `?!` ate the statement start in `scan.ts`, so the exit pass that rewrites the tail never saw it. making the `!` transparent to the start fixes it, and the working forms stay byte-identical.
- **q8, the form line.** some of `form` is emitted, some is written by hand, and the author charges that the line is arbitrary. where does it belong? session 15, with a `protocol` note if the audit finds an adjacent inconsistency (that would be q12).
- **q9, the in-file test.** a `test` keyword like zig's, in the file it tests, reaching module internals. feasible, and under what house-rule amendment? session 16.
- **q10, the deck `declare`.** `declare` inside a deck produces a false `TZL0002`, while `const` does not; found in session 05 while writing the `?literal` deck, which used `const` instead. a checker false positive over a legitimate declaration. unassigned.
- **q11, the tail comment.** a doc comment inside a `?` tail (`x ? //c\n log(x);`) loses the comment and emits a semicolon; found while drafting `not.spec.tz` and avoided. an emit defect. unassigned.
- **q12, the protocol note.** reserved for a `protocol` inconsistency if session 15's audit uncovers one adjacent to the `form` line.
- **q13, the useless subject.** in `constructs/cond.spec.tz`, `n ?(n % 2 == 0) => 'even' else => 'odd'` answers both sides, so the subject `n` is never yielded and does nothing. the author wants the shape refused. a proposed refusal, not a construct. unassigned.
- **q14, effect against exit and value.** in `examples/signup.tz`, the guard note asks for a strict structural definition that excludes an effect from a union of effect, exit and value, and whether the transpiler and language already hold that principle, should hold it, or could hold it. a design question. unassigned.
- **q15, the `? {}` subject type.** in `constructs/block.spec.tz`, the note says the matched subject of a `? {}` over a `Result` should read as a `Branch<...>`. whether the emit and the editor should name it so. a typing question about the emit. unassigned.

### tasks

- **t1, the arrow deck coverage.** `constructs/arrow.spec.tz` shows the capture after an assignment, a chain and a block; the note wants every use, including after `call` and inside other constructs. a showcase task. unassigned.

## dependencies outside our control

- the editor affordances (completions, hover, goto, rename) and the in-memory keystroke loop wait on the stable typescript 7.1 programmatic surface. the interim surface is class-based, server-backed, and spawns a binary per run. that is noted, not scheduled.

## parked

these are settled as out of scope until the author raises them:

- new language constructs. the battle test produces candidates; it does not spend them here. this does not cover the two the author raised and scheduled: `test` (q9, session 16) and the `form` audit (q8, session 15).
- a linter, a formatter, a bundler, another test framework.
- the editor affordance set above, beyond what already ships in `tzd`.

## the comment protocol

comments that carry forward work are a living channel, not a phase to close. the author leaves a note where the work lives and sweeps the notes on a schedule; that is the no-debt approach, and this file is where the swept work lands.

### the markers

three markers, lowercase, each with the hash sigil, greppable in one pass: `#todo`, `#fixme`, `#prompt`.

- **`#todo`**: a small task. finish it, or route it.
- **`#fixme`**: a defect. a wrong behavior or a false claim.
- **`#prompt`**: a note worth a whole session. the seed of a plan, not a plan.

the old `# marco to agent` spelling is retired; git carries its history.

### the channels

a note may sit in a doc comment (an html comment in the `.md` docs), in the `//` of a spec (`.spec.ts`, `.spec.tz`) or the plan. a `tz/src` module keeps the bare style of `../../AGENTS.md`: forward work there belongs in a spec or this plan, not in the module.

### the sweep

a sweep runs at every session close. it greps the three markers and routes each note one of three ways: do it now, make it a session in the table, or file it in the ledger. once routed, the note is removed from where it sat; the plan is the home, and git keeps the memory.

### the coherence walk

a parked note is not documentation: it names words the language does not own, and a reader should not meet it in a doc. the coherence walk blanks every html comment block in the docs on purpose, so a note can sit there without failing the walk. that blanking is the protocol's mechanism, not an accident to remove.

## how a session runs

1. **open.** copy `session-context-template.md` to `context/<session>.md` and state the intent in one paragraph.
2. **read.** the session file's inputs, plus `../AGENTS.md` and `../STYLE-KB.md` before writing anything.
3. **rule.** any genuine design question goes to the author. the ruling is recorded in the context file with its reasoning, and the rejected alternatives.
4. **work.** implement, then verify: `npm test` in the repo root and in `tz/`, `tzc examples constructs`, `tzd examples constructs`, and the `tzx` spec. a type claim is checked by compiling it, not by reading it.
5. **sweep.** grep `#todo`, `#fixme` and `#prompt` and route each note by the comment protocol, so nothing is left parked when the session closes.
6. **close.** the author reviews. once it passes, commit with one decision per commit, add a dated entry to `../UPDATES.md`, flip the status in the table above, and commit the context file with the session. then push.

## what a green close looks like

at the end of phase 0, `npm test` runs the emitted code and a broken showcase fails the build. at the end of phase 1, no prompt is parked in a doc and the tutorial reads in one voice. at the end of phase 2, a real program runs on tz and the friction is written down. at the end of phase 3, a person and an agent can each start from a document and be productive.
