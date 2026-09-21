# <session> working context

copy this file to `context/<session>.md` at the open of a session and fill it as the session runs. it is the session's memory. the roadmap and the docs change only when the session closes.

## intent

one paragraph: what this session is for, in the author's words.

## inputs

the files read, and why each one. link them with backticks.

## decisions

each decision gets a line: the date, the ruling, the reasoning, and the alternatives rejected. a decision without a rejected alternative is a preference, not a decision.

## evidence

commands run and what came back. exit codes, not impressions. a type claim is checked by compiling it.

- `npm test` (root):
- `npm test` (tz):
- `tzc examples constructs`:
- `tzx` spec:
- `tzd examples constructs`:

## open

anything the session could not settle, and the session or ledger entry it moves to.

## close

the commit message, the `../UPDATES.md` entry heading, and the roadmap status flip.
