# coherence spec plan

a tz spec that walks the code and the docs and reports drift. runs in `npm test`. when a construct is mentioned in docs but not in code, or a construct's role is mislabelled, the spec fails and points at the line.

## motivation

the journal (`tz/UPDATES.md`) catches drift when humans notice. the `if` expression stayed in the docs for several rounds because no one compared the claim against the code. a spec that does the comparison mechanically turns drift into a failing test.

## scope

the spec asserts four things:

1. **backticks**: every backticked identifier in docs is a known construct (keyword, banned keyword, or punctuation).
2. **role claims**: every "the `X` expression" or "the `X` statement" sentence in docs matches the role of `X` in the code.
3. **spec coverage**: every construct in the role list has at least one spec entry in `tz/src/lex.spec.ts` or `tz/src/emit.spec.ts`.
4. **doc coverage**: every construct in the role list is mentioned in `tz/DESIGN.md`.

## truth: code

the spec reads from three source files:

### `tz/src/scan.ts`

export the keyword arrays:

```ts
export const keywords = {
  words: ['return', 'ok', 'err', 'async', 'satisfies', 'as', 'of', 'in', 'typeof', 'new', 'extends'],
  tails: ['if', 'for', 'while'],
  matchers: ['none', 'some', 'true', 'false']
};
```

### `tz/src/ban.ts`

export the ban map and absence list:

```ts
export const banned = ['class', 'function', 'this', 'new', 'interface', 'enum', 'match', 'var', 'namespace', 'module', 'any', 'instanceof', 'yield', 'abstract', 'implements', 'private', 'protected', 'public', 'super', 'throw', 'switch', 'catch', 'finally', 'guard'];
export const absent = ['null', 'undefined'];
```

`new`, `instanceof`, `yield`, `throw` appear in both lists; the union is what matters. `new` is banned as a free keyword but kept inside `make`. the spec handles this by checking role, not just presence.

### `tz/src/emit.ts`

export a role list. each entry: `{ name, role, location }`:

```ts
export const roles: { name: string, role: 'expression' | 'statement' | 'both', handler: string }[] = [
  { name: '=>',            role: 'expression', handler: 'arrow' },
  { name: '?none',         role: 'expression', handler: 'matcher' },
  { name: '?some',         role: 'expression', handler: 'matcher' },
  { name: '?true',         role: 'both',       handler: 'matcher' },
  { name: '?false',        role: 'both',       handler: 'matcher' },
  { name: '?:tag',         role: 'expression', handler: 'matcher' },
  { name: '?literal',      role: 'expression', handler: 'matcher' },
  { name: '?(cond)',       role: 'both',       handler: 'matcher' },
  { name: '? {}',          role: 'both',       handler: 'match' },
  { name: 'if',            role: 'statement',  handler: 'conditional' },
  { name: 'for',           role: 'statement',  handler: 'lift' },
  { name: 'while',         role: 'statement',  handler: 'lift' },
  { name: 'try',           role: 'statement',  handler: 'propagate' },
  { name: 'scope',         role: 'statement',  handler: 'scoping' },
  { name: 'call',          role: 'both',       handler: 'calling' },
  { name: 'form',          role: 'statement',  handler: 'formed' },
  { name: 'protocol',      role: 'statement',  handler: 'protocoled' },
  { name: 'return',        role: 'statement',  handler: 'exit' },
  { name: 'ok',            role: 'statement',  handler: 'exit' },
  { name: 'err',           role: 'statement',  handler: 'exit' },
  { name: 'async',         role: 'statement',  handler: 'exit' },
  { name: 'break',         role: 'statement',  handler: 'exit' },
  { name: 'continue',      role: 'statement',  handler: 'exit' }
];
```

the `handler` field is the function name in `emit.ts` that handles the construct; the spec asserts the handler exists, but the assertion is loose (the function name in `emit.ts` is the ground truth).

## checks

the spec lives at `tz/src/coherence.spec.ts`. four walks.

### 1. backticks

read each doc. extract every backticked identifier with regex:

```ts
const id = /`([a-zA-Z_][a-zA-Z0-9_]*(?:\(\))?)/g;
```

assert each `id` is in:

- `keywords.words ∪ keywords.tails ∪ keywords.matchers`
- `banned`
- `absent`
- `roles` (by `name`)
- a punct list (`=>`, `?`, `:`, `?true`, `?false`, etc. — derived from `lex.ts`'s `puncts`)

report extras as `tz/<file>:<line>: <id> is not a known construct`.

### 2. role claims

read each doc. find sentences matching:

```ts
const exprClaim = /the `([a-zA-Z_]+(?:\(\))?)` expression/;
const stmtClaim = /the `([a-zA-Z_]+(?:\(\))?)` statement/;
```

for each match, look up `id` in `roles`. assert the role is compatible (`expression` or `both` for an expression claim; `statement` or `both` for a statement claim).

report mismatches as `tz/<file>:<line>: <id> is not an expression` (or `a statement`).

this is the check that catches the `if` expression: `if` is in `roles` as `statement`, and "the `if` expression" fails the check.

### 3. spec coverage

for each entry in `roles`, assert it appears in:

- `tz/src/lex.spec.ts` (lex tests), OR
- `tz/src/emit.spec.ts` (emit tests)

matching by name in test descriptions. regex over the spec file:

```ts
const specMatch = /(['"`])([^'"`]*<name>[^'"`]*)\1/g;
```

report orphans as `<name> has no spec`.

### 4. doc coverage

for each entry in `roles`, assert it is mentioned in `tz/DESIGN.md`. matching by backticked identifier.

report orphans as `<name> is not in DESIGN.md`.

## file layout

new file: `tz/src/coherence.spec.ts` (~150-200 lines).

changes to existing files:

- `tz/src/scan.ts`: add `export const keywords = { words, tails, matchers }` near the existing arrays.
- `tz/src/ban.ts`: add `export const banned = Object.keys(instead); export const absent = [...];` near the existing declarations.
- `tz/src/emit.ts`: add `export const roles: { name, role, handler }[] = [...]` at the top.
- `tz/UPDATES.md`: add an `agenda` section above the dated entries pointing at the plan.
- `tz/AGENTS.md` (new): cross-tool onboarding note. not required for the spec itself but useful; flag in the agenda.

## cost

- 3 small exports (~10-15 lines total across `scan.ts`, `ban.ts`, `emit.ts`).
- 1 new spec file (~150-200 lines).
- no LLM, no new dependencies.
- runs in milliseconds as part of `npm test`.

## out of scope

- free-form prose without backticks (manual review catches it; the journal).
- constructs that drift between docs but match code (manual review).
- historical journal entries that mention retired constructs (UPDATES.md is exempt from check 1 — past-tense references are fine).
- the construct matrix at `tz/DESIGN.md:50-71` (uses backticks heavily; the check handles it as a regular doc, but the table cells may need a more lenient regex; flag during implementation).

## acceptance

the spec passes after the immediate `if` expression fixes (already landed) and fails when a new construct is added to docs without code support, or a role is mislabelled.

## when to land

the next session. the work is small (one new file, three exports), reviewable in a single round.
