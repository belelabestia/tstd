# 13 the first build

phase: battle
status: planned
resolves: the dev experience

## why

the author wants to feel how tz affects building software, which is the one thing a showcase cannot show. this is the first session of a rolling track: build the target from session 12, and let the friction produce the next construct candidates. the point is not to finish the program; it is to learn where the language fights back.

## what this session must produce

- a running first version of the target, to the brief's definition.
- a friction journal: every place the language was slower, more verbose, or more surprising than it should have been, with the exact code.
- a ranked list of candidate changes, each with the evidence that produced it. these feed future sessions; they are not implemented here.

## in scope

- building the program.
- recording friction honestly, including the parts that turned out to be the author's habit rather than the language's fault.

## out of scope

- fixing the language mid-build. if a defect blocks the build, it is filed and the session routes around it, unless the author rules otherwise.
- onboarding material. that is sessions 14 and 15, extracted after the build.

## inputs

- the target brief from session 12.
- the robustness standard from session 11.
- the tutorial and `../examples/`, for the patterns.

## steps

1. scaffold the target and get one path running end to end.
2. build against the brief, keeping the friction journal current.
3. run the session 11 criteria against the result.
4. rank the candidate changes and hand them to the author.

## acceptance

- the first version runs and does what the brief says.
- the friction journal is specific, with code, not adjectives.
- the candidate list is ranked and evidenced.
- the session 11 criteria are measured and reported, pass or fail.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the session 11 standard, the session 12 brief, and this file. copy `session-context-template.md` to `context/13-the-first-build.md`. build the first version of the target in tz. keep a friction journal with exact code for every place the language fought back, and a ranked, evidenced list of candidate changes. do not fix the language mid-build; file and route around blockers. measure the session 11 criteria and report them. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/13-the-first-build.md` before starting.
