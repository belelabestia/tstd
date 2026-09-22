# 14 onboard people

phase: onboarding
status: planned
resolves: q6
blocked by: 13

## why

the end goal is a compelling option for other people, and a person cannot adopt a language they cannot start. today the entry point is `../README.md`, which assumes a reader who already knows the repository layout and the toolchain. the battle test from session 13 is the honest source of the getting-started path, because it went through the same stumbles a newcomer would.

this session also answers q6: `@belelabestia/tz` is private at `0.0.0`, so "onboard people" is not real until a person can install something.

## what this session must produce

- a getting-started path: install, first program, run it, the mental model. short, and true to what session 13 actually required.
- the q6 ruling: when and how tz becomes a package someone can install, and what versioning means before it is stable.
- `../README.md` reduced to the entry point role it claims.
- any gap the battle test revealed between what the docs say and what a newcomer must do.

## in scope

- the first-run experience and the publishing decision.
- the README's entry-point responsibilities.

## out of scope

- the tutorial's internal organization, which session 08 settled and session 09 wrote.
- agent onboarding (session 15).

## inputs

- `../README.md`.
- the session 13 friction journal, specifically the newcomer's stumbles.
- `../package.json` and the root `package.json`.
- the tutorial.

## steps

1. walk the path a newcomer walks, from an empty directory, and record every stumble.
2. write the getting-started path from that walk.
3. rule on q6 and record it.
4. trim the README to its entry-point role.

## acceptance

- a person with the repo can reach a running program by following one document.
- q6 has a ruling with a versioning story.
- the README says where to start and nothing it cannot support.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the session 13 friction journal, and this file. copy `session-context-template.md` to `context/14-onboard-people.md`. walk the first-run path from an empty directory and record every stumble, then write a getting-started document true to that walk. rule on when and how tz becomes installable, and trim the README to its entry-point role. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/14-onboard-people.md` before starting.
