# 10 define robust

phase: battle
status: planned
resolves: q5

## why

the end goal is robust and reliable, and neither word has a testable meaning yet. today "done" means `npm test` is green, which phase 0 shows is not the same as the language working. before spending real effort on a real program, the standard has to be written down, or the battle test measures nothing.

the author also wants to know when tz is stable enough to move to its own repo (`../DESIGN.md:162`). that is the same question wearing a deployment hat.

## what this session must produce

acceptance criteria for robustness, each one checkable. candidates, to be cut down and sharpened:

- a real program runs in the build, not only a showcase.
- the checker is silent or right, never noisy.
- a type error lands on the tz line and column a person would edit.
- the editor loop is fast enough to type in, or honestly documented as shelling out.
- the language refuses what it says it refuses, with a diagnostic that names the replacement.
- a newcomer can follow the tutorial to a running program without the docs lying.
- the surface is coherent: one spelling per idea, and no construct doing another's job.

it also answers q5: the measurable meaning of "stable enough to split".

## in scope

- a written standard, one page.
- the definition of "the first build is done".
- q5.

## out of scope

- choosing the program (session 12).
- building it (session 13).

## inputs

- `../README.md`, `../DESIGN.md`, `../UPDATES.md`.
- the phase 0 results.
- the author's intent: robust, reliable, a compelling option.

## steps

1. draft the criteria, each with how it would be measured.
2. mark which are already met, which phase 0 meets, and which the battle test must meet.
3. discuss and settle with the author.
4. write the standard into the session context, and a pointer into `../UPDATES.md`.

## acceptance

- every criterion is checkable by a command or a person in one sitting.
- q5 has an answer.
- the author endorses the standard.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap and this file. copy `session-context-template.md` to `context/11-define-robust.md`. robust and reliable have no testable meaning yet, and the same question hides behind "stable enough to move tz to its own repo". draft acceptance criteria, each checkable, mark what is already met and what the battle test must meet, and settle them with the author. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/10-define-robust.md` before starting.
