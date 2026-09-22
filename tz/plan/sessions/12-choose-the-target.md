# 11 choose the target

phase: battle
status: planned
resolves: q4

## why

the next big thing is not a construct; it is a program. the author wants to battle-test tz by building software with it, in order to learn how the language affects the developer, and to prove the language on something that is not a showcase. the first program has to be chosen deliberately, because it decides which parts of the surface get stressed.

## the question

what is the first honest program tz must carry?

candidates, with what each one stresses:

- **a web service.** async, `form` for request shapes, `result` across the boundary, `scope` for connections, `protocol` for request state. the most representative of the stated web-development goal.
- **a cli.** argument parsing, `result` for exits, `form` for config, little async. smaller, faster to first run, weaker coverage of the async and resource surface.
- **a scripting task.** file and process work, `call` and `scope` for foreign boundaries, `result` for failure. closest to the scripting half of the goal, and the least shaped by types.

the target should be small enough to finish a first version, and real enough that a person would use it.

## what this session must produce

- a ruling from the author.
- a one-page brief: what the program does, who it is for, and which tz constructs it stresses.
- the acceptance criteria from session 10 mapped onto the program.

## in scope

- the decision and its brief.

## out of scope

- building it (session 12).

## inputs

- the standard from session 10.
- `../README.md:45`, what the language says it already does.
- the author's goal: web development and scripting.

## steps

1. put the candidates beside the session 10 criteria and show which surface each misses.
2. help the author choose.
3. write the brief.

## acceptance

- the author owns the choice.
- the brief names the constructs under test and the definition of a first version.
- every session 10 criterion is either exercised or explicitly not covered.

## starting prompt

> read `../AGENTS.md` and `../STYLE-KB.md` first, then the roadmap, the session 10 standard, and this file. copy `session-context-template.md` to `context/11-choose-the-target.md`. help the author choose the first real program to build in tz, weigh the candidates (web service, cli, scripting task) against the robustness criteria and the surfaces they leave untested, and write a one-page brief with the constructs under test and the definition of a first version. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/11-choose-the-target.md` before starting.
