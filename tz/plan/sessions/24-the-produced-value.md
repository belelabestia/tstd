# 24 the produced value

phase: truth
status: planned
resolves: q21

## why

session 18 took the arrow out of `call`, `make` and `scope`, because the glyph read as a function expression there. the side quests keep it for now, and for a real reason: a block after `?` can be inline (statements, exits leave the function) or a value (a body, its `return` is its own), and the arrow is the only thing that says which. the author's proposal is to say it with a word instead: a body leaves the function with `return`, and answers the nearest construct body with a produced value (`call { yield v; }`, `x = cond ? { yield v; }`). then the block's role is read from its exit, and the arrow leaves the side quests too, so `=>` is a typescript arrow function and nothing else.

this is not a vocabulary change. it rewrites what `return` means, and it re-explains `ok` and `err`, which answer the nearest body already. session 14 settled the exit family on purpose, so this session rules the family again before anything changes.

## the questions

1. **does the produced value exist.** is there a distinct exit for "answer the nearest construct body", against `return` for "leave the function".
2. **does the arrow survive.** the decisive one. `yield` answers a body, so it takes the arrow's block job (`?err { yield v; }` for `?err => { ... return v; }`), but it cannot substitute a value where no body exists: `const port = env.PORT ?none => '8080';` has nowhere to yield to. so either the arrow stays for the inline value and the chains (the split: `=> expr` is never a block, `yield v;` answers a block, `return v;` leaves the function), or `yield` also stands in a tail (`?none yield '8080'`, `else yield x`) and the arrow goes entirely, leaving `=>` a typescript arrow function and nothing else. the split keeps the chains readable and gives each form one job; removing the arrow trades a glyph for a keyword in expression position and needs the `else` and multi-armed spellings settled. test both against the chain and multi-armed decks.
3. **the word.** `yield` is refused today (`yield: 'a loop'`), so unbanning it is a move; it is also javascript's generator word. a better word if one exists.
4. **the relation to `ok` and `err`.** they answer the nearest body with a `Result` already. is the produced value their plain form, and do the three stay one discipline per body.
5. **the multi-armed `? { }`.** how an arm answers without the arrow, and whether the arrow survives there alone.
6. **the cost.** what moves: the exit family in `src/scan.ts` and `src/emit.ts`, the `yield` row in `src/typecore.ts`, the discipline check, the side-quest capture, every deck and every doc.

## what this session must produce

- a ruling on the produced value, with its word.
- a ruling on the arrow: the split (inline value only) or gone entirely, with the reason.
- the relation between the produced value, `return`, `ok` and `err`.
- the spelling of the boundary bodies, the side-quest captures and the multi-armed arms.
- each rejected alternative and its cost.
- the changes, or the session that makes them.

## in scope

- the exit family, and what each exit answers.
- the side-quest capture arrow and the multi-armed arm's value.
- the boundary bodies' exits, now that the arrow has left them.

## out of scope

- the arrow's removal from `call`, `make` and `scope`, which session 18 landed.
- the struct and the codec (19), the in-file test (20), the construct table (22).

## inputs

- `../context/18-the-arrow-capture.md`: the reflection that filed this session.
- `../context/14-the-async-tail.md`: the exit family the tails were last settled against.
- `../../TUTORIAL.md`: the exits, arrow capture and the tail rule.
- `../../DESIGN.md`: the exit family and the vocabulary.
- `../src/typecore.ts` (the `yield` row), `../src/scan.ts`, `../src/emit.ts` (the `exit` handler and the tail dispatch).
- `../constructs/` and `../examples/`: the decks that would spell the produced value.

## steps

1. state what each exit answers today: `return`, `ok`, `err`, `async`, `break`, `continue`, and where the arrow opens a body.
2. decide whether a produced-value exit exists, and rule the word.
3. work the relation to `ok` and `err`, and the one-discipline rule.
4. test each spelling against the decks, the captures and the multi-armed block.
5. land the change, or write the session that does.

## acceptance

- one rule says what every exit answers, in writing.
- the side-quest capture and the multi-armed arm have a spelling, with the arrow kept or gone.
- every rejected spelling carries its cost.
- `npm test` in `tz/` stays green through any probe.

## starting prompt

> read `../../AGENTS.md` and `../../STYLE-KB.md` first, then the roadmap, the tutorial's exits and the session 18 context, and this file. copy `session-context-template.md` to `context/24-the-produced-value.md`. session 18 took the arrow out of `call`, `make` and `scope` and left it on the side quests; the author proposes to name the value-producing exit instead (`call { yield v; }`, `x = cond ? { yield v; }`) against `return` leaving the function, so the arrow leaves the side quests too. decide whether that exit exists, rule its word, and work its relation to `ok` and `err`, which answer the nearest body already. test each spelling against the decks, then land the change or write the session that does. do not commit until the author reviews.

## context

copy `../session-context-template.md` to `../context/24-the-produced-value.md` before starting.
