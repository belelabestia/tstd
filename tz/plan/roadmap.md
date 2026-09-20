# the tz roadmap

the plan of action for turning tz from a clever prototype into a trustworthy language: one that runs, one whose docs its author owns, and one proven by a real program.

the governing idea is in `../DESIGN.md`, the language is in `../TUTORIAL.md`, and the history is in `../UPDATES.md`. this file is the future: what we do next, in what order, and why. one session per file under `sessions/`.

## the goal

make tz a compelling option for web development and scripting. that is not a feature, it is evidence plus onboarding. the build must tell the truth, the docs must be owned by their author, and the language must carry a real program before it asks anyone else to try.

## the principles

- **fix before new.** debt first. a green build that runs nothing is worse than a red one, because it lies.
- **green means it runs.** the suite must execute the emitted code, not only typecheck it.
- **the author owns the docs.** no agent prompts parked in artifacts. forward work lives in this plan, and decisions are made by the author, not inferred from a comment.
- **robust is evidence.** a milestone is a program, not a construct. the next language feature is whatever a real build forces.

## the phases

### phase 0, make the build tell the truth

`npm test` is green (43 root, 59 tz) while `tzx scratch/signup.spec.tz` exits 1 with two failing tests. the suite typechecks the emit and tests the emitter, but never runs what it emitted. that gap is the root debt: it is why a showcase defect could sit from 2026-09-13 to today with every light green.

the phase ends when a failing scratch assertion fails the build, the two known runtime failures are fixed, the documented chain defect is fixed, and the editor checker either tells the truth or is silent.

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
| 03 | expression-subject chains | truth | planned | the 2026-09-16 defect |
| 04 | the checker's honesty | truth | planned | q2 |
| 05 | scratch, the showcase | truth | planned | the remote fixture |
| 06 | close the comment channel | ownership | planned | q3 |
| 07 | the teaching dissertation | ownership | planned | tutorial organization |
| 08 | the educational rewrite | ownership | planned | author voice |
| 09 | define robust | battle | planned | q5 |
| 10 | choose the target | battle | planned | q4 |
| 11 | the first build | battle | planned | the dev experience |
| 12 | onboard people | onboarding | planned | q6 |
| 13 | onboard agents | onboarding | planned | the agent contract |

sessions run in order. 08 is blocked by 07, and 12 and 13 are blocked by 11. everything else is unblocked once 01 lands, because a session that fixes a defect needs the harness that catches the defect.

## the questions ledger

- **q1, survivor binding.** after `x ?|(:idle, :loading, :failed) return;`, does a later `x` name the box or the payload? the docs say a coloned test keeps the box; the showcase spec expects the payload. session 02.
- **q2, `TZL0003`.** type the dropped-value check now, or withdraw it until the stable typescript surface lands? session 04.
- **q3, forward-work home.** where does planned work live? this file is the proposed answer; session 06 ratifies it and removes the parked prompts.
- **q4, the target.** what is the first honest program tz must carry? session 10.
- **q5, stable enough to split.** `../DESIGN.md` says tz moves to its own repo with a `git mv` once the prototype is stable. what does stable mean, in measurable terms? session 09.
- **q6, publishing.** `@belelabestia/tz` is private at `0.0.0`. when and how does it become a package someone can install? session 12.

## dependencies outside our control

- the editor affordances (completions, hover, goto, rename) and the in-memory keystroke loop wait on the stable typescript 7.1 programmatic surface. the interim surface is class-based, server-backed, and spawns a binary per run. that is noted, not scheduled.

## parked

these are settled as out of scope until the author raises them:

- new language constructs. the battle test produces candidates; it does not spend them here.
- a linter, a formatter, a bundler, another test framework.
- the editor affordance set above, beyond what already ships in `tzd`.

## how a session runs

1. **open.** copy `session-context-template.md` to `context/<session>.md` and state the intent in one paragraph.
2. **read.** the session file's inputs, plus `../AGENTS.md` and `../STYLE-KB.md` before writing anything.
3. **rule.** any genuine design question goes to the author. the ruling is recorded in the context file with its reasoning, and the rejected alternatives.
4. **work.** implement, then verify: `npm test` in the repo root and in `tz/`, `tzc scratch`, `tzd scratch`, and the `tzx` spec. a type claim is checked by compiling it, not by reading it.
5. **close.** the author reviews. once it passes, commit with one decision per commit, add a dated entry to `../UPDATES.md`, flip the status in the table above, and commit the context file with the session. then push.

## what a green close looks like

at the end of phase 0, `npm test` runs the emitted code and a broken showcase fails the build. at the end of phase 1, no prompt is parked in a doc and the tutorial reads in one voice. at the end of phase 2, a real program runs on tz and the friction is written down. at the end of phase 3, a person and an agent can each start from a document and be productive.
