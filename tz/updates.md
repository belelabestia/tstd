**TypeZig Language Evolution: From Line-by-Line Transpiler to Postfix Side-Matchers**

### 1. Initial State & Design Intent

The original TypeZig specification focused on strict constraints to streamline functional TypeScript compilation:

* **Structural Boundaries**: Enforced a strict 1:1 line mapping for source maps, banned classic OOP paradigms (`class`, `this`, `function`, `throw`), and offloaded type checking entirely to `tsc`.


* **Control Flow Split**: Divided control flow strictly between `guard` (used solely for preconditions/declines, returning no values) and `if` (reserved for expressions and continuing flow).


* **Union & Nullish Handlers**: Introduced `match` for identity/branching, `ok`/`err`/`async` for returns, and `any:none` as an explicit replacement for native `??`.



---

### 2. Identifying Overlaps & Friction Points

During hands-on refinement, several design inefficiencies and syntactic redundancies emerged:

* **Verbosity of `any:none`**: The `any:none` operator felt unnecessarily long compared to `??`.
* **Inflexible `guard` Statements**: Statement-level `guard` couldn't perform inline unwrapping inside argument lists (e.g., `fn(table[id])`). Enforcing constraints at the exact point of value initialization proved far more practical.
* **Redundant Control Flow Keywords**: Having separate syntactic forms for `guard`, `if`, `match`, and nullish/tagged-union checks created overlapping responsibilities for basic exits and fallbacks.

---

### 3. Key Design Decisions

#### Decision 1: Unifying Exits vs. Fallbacks

To eliminate ambiguity, execution behavior was tied directly to the presence of `=>`:

* **No `=>` + Exit Keyword (`return`, `err`, `break`, `continue`)**: Scope exit. Execution leaves the current function or loop turn.
* **`=>`**: Inline substitution/fallback. Yields a value in place without exiting the function.

```tz
// Scope Exit (leaves the function)
const user = db.find(id) ?none return;
const user = db.find(id) ?none err 'User not found';

// Inline Fallback (evaluates in place, execution continues)
const port = process.env.PORT ?none => 8080;

```

#### Decision 2: Introducing the `?` Side-Matcher Sigil

To avoid parser ambiguity while preserving lightweight syntax, all postfix matchers use a leading `?` prefix:

* **Presence & Booleans**: `?true`, `?false`, `?none`, `?some`
* **Tagged Unions**: `?:label` (e.g., `?:ok`, `?:err`)

```tz
// In-argument unwrapping with early exit on error
const receipt = processPayment(
  cart[userId] ?none err 'Cart empty',
  token ?none err 'Missing token'
) ?:err (e) err `Payment failed: ${e}`;

```

#### Decision 3: Retiring `guard` and `match`

* **`guard` Retired**: Replaced entirely by postfix boolean matchers (`?false return` / `?false err`).
* **`match` Retired Too**: The bare `? {}` block answers exhaustively over values, branches and conditions, keeps the required `_` arm that asks `tsc` for totality, and binds what a `:tag` arm carries, so `match` is refused outright rather than kept for the closed-world case.

---

### 4. Final Specification Summary

| Construct | Syntax Example | Role & Semantics | Replaces |
| --- | --- | --- | --- |
| **Postfix Exit** | `val ?none err 'msg'`<br>

<br>`cond ?false return` | Early exit from scope on failure state. | `guard`, `if (!cond) return` |
| **Postfix Fallback** | `val ?none => fallback`<br>

<br>`cond ?false => 'guest'` | Substitutes inline value on failure state. | `??`, ternary `?:` |
| **Side-Effect Trigger** | `cond ?true log('ok')` | Executes expression or block on match without exiting. | Single-branch `if (cond)` |
| **Literal Matcher** | `x ?0 => -1` | Strict identity on numbers and quoted strings. | `x == 0 ?true` |
| **Condition Matcher** | `n ?(n < 0) => 0` | Computed boolean tested strictly (`=== true`). | `n < 0 ?true` |
| **Two-Sided Statement** | `cond ?true a else b` | Runs one of two sides, one line or one block each. | Two-branch `if`/`else` |
| **Exhaustive Statement** | `cond ? { true a; false b; }` | Runs one of many sides, chaining with `else if` under conditions. | `if`/`else` chains |
| **Exhaustive Answer** | `x ? { 200 => a, (x > 500) => b, _ => c }` | Total coverage over values, branches, and conditions. | `switch`, `if/else if` chains |


---

# TypeZig Specification: `form` and `call`

This document defines the language constructs `form` and `call` for TypeZig (`.tz`).

Like `protocol` and `scope`, both constructs adhere strictly to TypeZig's core design constraints: maintaining 1:1 line mapping for source maps, operating with zero runtime type inspection inside the transpiler, requiring no automatic import injections, and compiling directly to hand-written `tstd` patterns.

---

## 1. The `form` Construct

The `form` construct unifies structural data typing, runtime shape verification, and bidirectional transformation (encoding and decoding) into a single, cohesive syntax. It acts as the syntactic frontend for the `form.ts` module in `tstd`.

### Design Goals

* **Eliminate Redundant Declarations**: Replaces the need to separately declare a wire type, a domain type, an `is.Schema` guard, a parser function, and a serializer function.
* **Integrate directly with `form.ts**`: Emits field objects utilizing `form.plain`, inline `Field` objects, and `form.nest`, compiling directly to `form.Encoded<T>` and `form.Decoded<T>`.
* **Zero Transpiler Opinions**: The emitter parses no TypeScript types. It treats field assignments, triples, and renames purely as token structures.



---

### Syntax and Emission

A `form` declaration defines a record of fields, where each field maps a wire guard (`is.TypeGuard`) to an optional domain representation.

```tz
export form user {
  id: is.string,
  created_at: {
    is: iso.timestamp,
    decode: iso.fromTimestamp,
    encode: iso.toTimestamp,
  } as createdAt,
  roles: is.array,
  address: form.nest(addressForm)
}

```

#### Emitted TypeScript Output

```ts
export const user = {
  id: form.plain(is.string),
  created_at: form.as({
    is: iso.timestamp,
    decode: iso.fromTimestamp,
    encode: iso.toTimestamp,
  }, 'createdAt'),
  roles: form.plain(is.array),
  address: form.nest(addressForm)
}; export type UserForm = form.Encoded<typeof user>; export type User = form.Decoded<typeof user>;

```

---

### Field Variations

| Field Type | Syntax Example | Emitted Code |
| --- | --- | --- |
| **Plain (Identity)** | `id: is.string` | `id: form.plain(is.string)` |
| **Transform (Triple)** | `rawKey: { is, decode, encode }` | `rawKey: { is, decode, encode }` |
| **Renamed (Triple)** | `rawKey: { is, decode, encode } as domainKey` | `rawKey: form.as({ is, decode, encode }, 'domainKey')` |
| **Nested Form** | `profile: form.nest(profileForm)` | `profile: form.nest(profileForm)` |

Fields separate with a comma or a semicolon, the way an object literal accepts both; the emit keeps whichever spelling the declaration wrote.

---

### Mechanics & Constraints

1. **Naming and Types**: A `form` declaration named `user` automatically exports two derived types on its closing line:
* **`UserForm`** (or `form.Encoded<typeof user>`): The wire format, representing data ready for JSON or storage.
* **`User`** (or `form.Decoded<typeof user>`): The in-memory domain format.


2. **The `form.plain` Derivation**: Fields holding a bare guard assume identical wire and domain types. They wrap the provided predicate in `form.plain(...)`. A field holding a triple passes through; `as` renames its memory key through `form.as(...)`.
3. **Infallible Decoding Contract**: As established in `form.ts`, `form.decode(raw, user)` is an infallible operation. Shape validation **must** precede decoding using `form.model(raw, user)` paired with a TypeZig side-matcher.



---

### Language Integration & Usage Patterns

```tz
const processPayload = (raw: unknown) => {
  // 1. Guard shape against the encoded form
  form.model(raw, user) ?false err 'malformed wire format';

  // 2. Decode raw wire format into domain model (infallible)
  const u = form.decode(raw, user);

  log(`User created at: ${u.createdAt}`);

  // 3. Encode back to wire format when writing out
  const payload = form.encode(u, user);
  ok payload;
};

```

---

## 2. The `call` Keyword

While `scope` manages resource lifetimes and allocation stack frames, `call` isolates **execution boundaries**. It bridges foreign, non-TypeZig, or throwing JavaScript/TypeScript code into explicit, non-throwing `Result` types without requiring manual closure boilerplate.

### Design Goals

* **Isolate Throwing Boundaries**: Enforces the TypeZig rule: *"We do not throw. A panic is always something you did not write."*

* **Eliminate Closure Boilerplate**: Replaces manually written arrow functions (`call.sync(() => expr)`) with a clean keyword construct (`call expr` or `call => { ... }`).
* **Explicit Execution Context**: Wraps arbitrary native calls (e.g., `JSON.parse`, foreign SDK calls, filesystem access) cleanly at the token level.



---

### Syntax and Emission

`call` is a keyword construct that transpiles directly into the underlying `call.sync` or `call.async` helper calls.

#### 1. Expression Form

Applies `call.sync` directly to a single throwing expression.

```tz
const raw = try call => JSON.parse(file.readToString());

```

##### Emitted Output

```ts
const $0 = call.sync(() => JSON.parse(file.readToString())); if ($0.branch === 'err') return $0; const raw = $0.value;

```

#### 2. Block Form

Isolates multi-line operations that may throw.

```tz
const raw = try call => {
  const content = file.readToString();
  return JSON.parse(content);
};

```

##### Emitted Output

```ts
const $0 = call.sync(() => {
  const content = file.readToString();
  return JSON.parse(content);
}); if ($0.branch === 'err') return $0; const raw = $0.value;

```

#### 3. Async Form (`await call`)

Combining `await call` targets `call.async` to handle rejecting promises.

```tz
const response = try await call => fetch(url);

```

##### Emitted Output

```ts
const $0 = await call.async(() => fetch(url)); if ($0.branch === 'err') return $0; const response = $0.value;

```

---

### Execution Boundary Matrix

| Mechanism | Syntax Pattern | Transpiled Output | Target Operations |
| --- | --- | --- | --- |
| **Sync Expression** | `call expr` | `call.sync(() => expr)`<br> | Foreign sync throws (`JSON.parse`, `fs.readFileSync`) |
| **Sync Block** | `call => { ... }` | `call.sync(() => { ... })`<br> | Multi-line sync foreign operations |
| **Async Expression** | `await call => expr` | `call.async(() => expr)`<br> | Foreign async rejections (`fetch`, third-party SDKs) |
| **Async Block** | `await call => { ... }` | `call.async(async () => { ... })`<br> | Multi-line async foreign operations |

An `await` inside the closure picks `call.async` and the async closure on its own, with or without the `await` keyword, and the enclosing body lifts to `async` either way.

---

## 3. End-to-End Idiomatic Example

Combining `form`, `call`, `scope`, and postfix side-matchers (`?`) into a complete pipeline:

```tz
export form configForm {
  port: is.number,
  host: is.string
}

const loadConfig = (filePath: string) => scope (hold) => {
  // 1. Read file within scope lifetime tracking
  const file = try hold(openFile(filePath));

  // 2. Isolate external throwing JSON.parse call using expression form
  const raw = try call => JSON.parse(file.readToString());

  // 3. Validate against wire form schema using postfix exit
  form.model(raw, configForm) ?false err `Invalid configuration structure in ${filePath}`;

  // 4. Infallibly decode valid form into domain object
  const config = form.decode(raw, configForm);

  ok config;
};

```

---

## 4. Answers Take `=>`, Chains Take `else`, the `if` Expression Goes Away

The first telling of the `?` family let a bare value answer an expression and juxtaposed the
branches like `match` arms. That reads as parallel and exhaustive while behaving as neither:
after a value there is nothing left to match, so `?false` past one either re-tests the old
subject or silently names a new one, depending on where you stand. The rule that replaces it
is one line: `=>` yields a value, and everything else follows from whether the position can
take one.

* **An expression answers with `=>`.** `S ?m => V` yields `V` on match and `S` itself on miss,
  which is the `??` shape. A bare value after a matcher is refused.
* **A miss branch is spelled `else`.** `S ?m => V else R` is the full conditional, and `R`
  holds another chain, so each subject evaluates only on its own miss. A matcher after a
  consumed tail is refused; chain with `else` or start a new statement.
* **A statement joins its two sides with `else`.** `S ?m { ... } else { ... };` runs one side on
  one subject, one line or one block per side, because a scope is not a value and cannot be
  matched. Juxtaposed blocks are refused, as is a `=>` block as a statement: scopes do not
  take `=>`.
* **The `if` expression is refused.** `S ?true => V else R` does its whole job on booleans and
  generalizes past them, so `if (c) a else b` goes and the statement `if` without `else` stays
  as the decline spelling.
* **Truth is strict.** `?true` is `=== true` and `?false` is `=== false`. There is no truthy
  or falsy in `tz`; a non-boolean subject is `tsc`'s call on the right line.

## 5. A Branch Is Built with `:`

The same colon that matches a branch in a `? {}` arm constructs one in value position,
after `(`, `,`, `[`, `=`, `=>`, `:`, `return`, `ok` or `err`:

```tz
const idle = :idle;
const failed = :failed(why);
```

`:tag` emits `branch('tag')` and `:tag(value)` emits `branch('tag', value)`. Exactly one value
or nothing: empty parens and pairs are both refused. It pairs with `?:tag`, which binds what
the constructed branch carries.

## 6. A Wire Key Is Not Always a Memory Key

The first telling of `form` dropped the domain key on the floor, because `tstd`'s `Encoded`
and `Decoded` mapped the same keys on both sides. That half of the pairing is now in the
library: `form.as(field, 'name')` carries the memory key alongside the field, `Decoded`
answers under it, and the two walkers rename both ways. The literal survives through the
generic, the way `branch` keeps its tag. The `tz` transform lowers straight onto it, so a
rename is refused nowhere and guessed nowhere.

## 7. A Binding Names a Value the Tail Uses

`read() ?:err (e) => 'localhost'` used to compile, binding an error nothing read. It no
longer does: a binding nothing uses is refused everywhere one can appear, on matcher tails
and on `? {}` arms alike, so the parens stay off unless they earn their keep. `?none`,
`?true` and `?false` carry nothing and never bound anything; `?some` and `?:tag` bind or
omit. A binding that names a keyword is refused for the same reason a stray `else` is:
it cannot mean what it says.

Two companion rules fell out of the same work. A bound name reaches into template holes,
so `` `failed: ${e}` `` renames with the rest instead of dangling past it. And the binding
lives on the match side: an `else` branch runs on miss, where the bound value names
nothing, so using it there is refused alongside the unused ones.

## 8. The Miss Branch Answers Like Any Matcher Tail

An `else` now obeys the same rule as every matcher tail. `else => expression` yields a
value, `else => { block }` is the catcher that resolves the block's exits inside its own
iife, and an exit declines. a bare value after `else` answers nothing and is refused.
an exit in the final else flips the whole chain to the funnel: the whole body becomes a
decline ladder, a captured chain assigns its value branches to a `let` temp and the
decline branch leaves, and a nested sub-expression refuses, because there is no scope for
the exit there.

the same law now runs through `? {}`, one matcher per arm. and `_` is no longer required:
`tsc` owns totality, so an exhaustive block compiles bare and a missing branch lands as
`| undefined`. `_` stays for the open case, a last resort.

## 9. the funnel, built

all four agreed items shipped. the shape they settled on:

- **the `? {}` funnel.** an arm may decline, and the block is always a switch. captured
  (`const r = out ? {...}`) it is the let-temp switch: answer arms land in a temp and
  decline arms leave the function, then the binding reads the temp. as the whole body
  (`=> out ? {...}`) it is the all-returns switch, returns leaving the function directly.
  nested in an argument the funnel hoists before the statement, no iife. the statement
  form is a switch too (over the subject, over `.branch`, or `switch (true)` for
  conditions), arms running as triggers or declines with explicit exits only.
- **matcher arms.** `?:idle ?:loading return;` are more cases that decline, and the
  remainder (`_` or the survivor) extracts `a.value`. a matcher arm only declines.
- **the narrowing ruling.** a guard on a named subject checks the name directly, no temp:
  `out ?:err return;` emits `if (out.branch === 'err') return;`, so tsc narrows `out`
  across the statement and the manual funnel typechecks. the switch narrows its subject
  per case the same way.
- **`true` and `false` are literals.** `?true`/`?false` ride the literal path, so a
  binds-nothing refusal reads "a literal binds nothing".
- **the multi-tag chain answers on the miss.** `x ?:a ?:b ?:c return else (v) => ...`
  declines on match, `else (v)` binds the survivor, and the miss continues into a new
  subject, mixing declines and fallbacks. exits are explicit everywhere; the emitter adds
  none.