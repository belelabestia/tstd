**TypeZig Language Evolution: From Line-by-Line Transpiler to Postfix Side-Matchers**

### 1. Initial State & Design Intent

The original TypeZig specification focused on strict constraints to streamline functional TypeScript compilation:

* **Structural Boundaries**: Enforced a strict 1:1 line mapping for source maps, banned classic OOP paradigms (`class`, `this`, `function`, `throw`), and offloaded type checking entirely to `tsc`.


* **Control Flow Split**: Divided control flow strictly between `guard` (used solely for preconditions/declines, returning no values) and `if` (reserved for expressions and continuing flow).


* **Union & Nullish Handlers**: Introduced `match` for identity/branching, `ok`/`err`/`async` for returns, and `any:none` as a explicit replacement for native `??`.



---

### 2. Identifying Overlaps & Friction Points

During hands-on refinement, several design inefficiencies and syntactic redundancies emerged:

* **Verbosity of `any:none**`: The `any:none` operator felt unnecessarily long compared to `??`.
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

#### Decision 3: Retiring `guard` and Scope-Limiting `match`

* **`guard` Retired**: Replaced entirely by postfix boolean matchers (`?false return` / `?false err`).
* **`match` Retained for Exhaustiveness**: While `?<matcher>` handles linear control flow, unwrapping, and single-branch side effects, `match` blocks remain reserved for closed-world, exhaustive set checks enforced by `tsc`.

---

### 4. Final Specification Summary

| Construct | Syntax Example | Role & Semantics | Replaces |
| --- | --- | --- | --- |
| **Postfix Exit** | `val ?none err 'msg'`<br>

<br>`cond ?false return` | Early exit from scope on failure state. | `guard`, `if (!cond) return` |
| **Postfix Fallback** | `val ?none => fallback`<br>

<br>`cond ?false => 'guest'` | Substitutes inline value on failure state. | `??`, ternary `?:` |
| **Side-Effect Trigger** | `cond ?true => log('ok')` | Executes block/expression on match without exiting. | Single-branch `if (cond)` |
| **Exhaustive Match** | `match (state) { :ok => ... }` | Enforces total coverage over closed unions/enums. | `switch`, `if/else if` chains |


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
* **Zero Transpiler Opinions**: The emitter parses no TypeScript types. It treats field assignments, transformation arrows, and inline conversion blocks purely as token structures.



---

### Syntax and Emission

A `form` declaration defines a record of fields, where each field maps a wire guard (`is.TypeGuard`) to an optional domain representation.

```tz
export form user {
  id: is.string,
  created_at: is.number => createdAt: Date {
    decode: (ms) => new Date(ms),
    encode: (d) => d.getTime(),
  },
  roles: is.array,
  address: form.nest(addressForm)
}

```

#### Emitted TypeScript Output

```ts
export const user = {
  id: form.plain(is.string),
  created_at: {
    is: is.number,
    decode: (ms: number) => new Date(ms),
    encode: (d: Date) => d.getTime(),
  },
  roles: form.plain(is.array),
  address: form.nest(addressForm)
}; export type UserForm = form.Encoded<typeof user>; export type User = form.Decoded<typeof user>;

```

---

### Field Variations

| Field Type | Syntax Example | Emitted Code |
| --- | --- | --- |
| **Plain (Identity)** | `id: is.string` | `id: form.plain(is.string)` |
| **Transform (In-line)** | `rawKey: guard => domainKey: Type { decode: ..., encode: ... }` | `rawKey: { is: guard, decode: ..., encode: ... }` |
| **Nested Form** | `profile: form.nest(profileForm)` | `profile: form.nest(profileForm)` |

---

### Mechanics & Constraints

1. **Naming and Types**: A `form` declaration named `user` automatically exports two derived types on its closing line:
* **`UserForm`** (or `form.Encoded<typeof user>`): The wire format, representing data ready for JSON or storage.
* **`User`** (or `form.Decoded<typeof user>`): The in-memory domain format.


2. **The `form.plain` Derivation**: Fields without a `=>` transform arrow assume identical wire and domain types. They wrap the provided predicate in `form.plain(...)`.
3. **Infallible Decoding Contract**: As established in `form.ts`, `form.decode(raw, user)` is an infallible operation. Shape validation **must** precede decoding using `form.model(raw, user)` paired with a TypeZig side-matcher.



---

### Language Integration & Usage Patterns

```tz
const processPayload = (raw: unknown) => {
  // 1. Guard shape against the encoded form
  form.model(raw, user) ?false err 'malformed wire format';

  // 2. Decode raw wire format into domain model (infallible)
  const u = form.decode(raw, user);

  log(`User created at: ${u.createdAt.toISOString()}`);

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

* **Eliminate Closure Boilerplate**: Replaces manually written arrow functions (`call.sync(() => expr)`) with a clean keyword construct (`call expr` or `call { ... }`).
* **Explicit Execution Context**: Wraps arbitrary native calls (e.g., `JSON.parse`, foreign SDK calls, filesystem access) cleanly at the token level.



---

### Syntax and Emission

`call` is a keyword construct that transpiles directly into the underlying `call.sync` or `call.async` helper calls.

#### 1. Expression Form

Applies `call.sync` directly to a single throwing expression.

```tz
const raw = try call JSON.parse(file.readToString());

```

##### Emitted Output

```ts
const $0 = call.sync(() => JSON.parse(file.readToString())); if ($0.branch === 'err') return $0; const raw = $0.value;

```

#### 2. Block Form

Isolates multi-line operations that may throw.

```tz
const raw = try call {
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
const response = try await call fetch(url);

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
| **Sync Block** | `call { ... }` | `call.sync(() => { ... })`<br> | Multi-line sync foreign operations |
| **Async Expression** | `await call expr` | `call.async(() => expr)`<br> | Foreign async rejections (`fetch`, third-party SDKs) |
| **Async Block** | `await call { ... }` | `call.async(async () => { ... })`<br> | Multi-line async foreign operations |

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
  const raw = try call JSON.parse(file.readToString());

  // 3. Validate against wire form schema using postfix exit
  form.model(raw, configForm) ?false err `Invalid configuration structure in ${filePath}`;

  // 4. Infallibly decode valid form into domain object
  const config = form.decode(raw, configForm);

  ok config;
};

```